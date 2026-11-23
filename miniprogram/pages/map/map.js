const spotsStore = require('../../utils/spotsStore');
const auth = require('../../utils/auth');
const api = require('../../utils/api');
const geo = require('../../utils/geo');

Page({
  data: {
    menuTop: 24,
    menuHeight: 32,
    menuRightSpace: 104,
    user: null,
    authVisible: false,
    authReason: '',
    profileVisible: false,

    mapLng: geo.CAMPUS_CENTER.longitude,
    mapLat: geo.CAMPUS_CENTER.latitude,
    mapScale: 16.5,
    isSatellite: false,
    hasUserGps: false,
    userCoords: null,

    categories: spotsStore.SPOT_CATEGORIES,
    selectableCategories: spotsStore.SPOT_CATEGORIES.filter((c) => c.id !== 'all'),
    presetPhotos: spotsStore.PRESET_PHOTOS,
    activeCategory: 'all',
    searchQuery: '',
    poiResults: [],

    allSpots: [],
    filteredSpots: [],
    markers: [],
    currentCardIndex: 0,
    selectedSpotId: '',

    detailSpot: null,
    reviewDraft: '',

    isPickMode: false,
    pickLng: geo.CAMPUS_CENTER.longitude,
    pickLat: geo.CAMPUS_CENTER.latitude,
    pickCoordText: `${geo.formatCoord(geo.CAMPUS_CENTER.longitude)}, ${geo.formatCoord(geo.CAMPUS_CENTER.latitude)}`,
    geoSuggestionName: '',
    geoSuggestionAddress: '',

    addModalVisible: false,
    ugcCoverUrl: spotsStore.PRESET_PHOTOS[0].url,
    ugcName: '',
    ugcCategory: 'sunset',
    ugcRating: 5,
    ugcReason: '',
  },

  onLoad() {
    const app = getApp();
    const g = (app && app.globalData) || {};
    this.mapCtx = wx.createMapContext('campusMap', this);
    this.setData({
      menuTop: g.menuTop || 24,
      menuHeight: g.menuHeight || 32,
      menuRightSpace: g.menuRightSpace || 104,
      user: auth.getCurrentUser(),
    });
    this.refreshSpots();
    this.requestCampusLocation(false);
  },

  onShow() {
    this.syncTabBar();
    this.setData({ user: auth.getCurrentUser() });
  },

  noop() {},

  /** 任意弹窗打开时自动隐藏自定义底部栏，防止 custom-tab-bar 覆盖弹窗按钮！ */
  syncTabBar() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const hasModal = Boolean(
        this.data.detailSpot ||
          this.data.addModalVisible ||
          this.data.authVisible ||
          this.data.profileVisible
      );
      this.getTabBar().setData({ selected: 0, hidden: hasModal });
    }
  },

  requireAuth(reason, action) {
    const user = auth.getCurrentUser();
    if (user) {
      action();
      return;
    }
    this._pendingAction = action;
    this.setData({ authVisible: true, authReason: reason }, () => this.syncTabBar());
  },

  openAuthManual() {
    this._pendingAction = null;
    this.setData({ authVisible: true, authReason: '' }, () => this.syncTabBar());
  },

  closeAuth() {
    this._pendingAction = null;
    this.setData({ authVisible: false }, () => this.syncTabBar());
  },

  onAuthSuccess(e) {
    const user = e.detail.user;
    this.setData({ user, authVisible: false }, () => this.syncTabBar());
    if (this._pendingAction) {
      const fn = this._pendingAction;
      this._pendingAction = null;
      setTimeout(fn, 160);
    }
  },

  openProfile() {
    this.setData({ profileVisible: true }, () => this.syncTabBar());
  },

  closeProfile() {
    this.setData({ profileVisible: false }, () => this.syncTabBar());
  },

  onProfileUpdated(e) {
    this.setData({ user: e.detail.user });
  },

  onLogout() {
    this.setData({ user: null });
  },

  requestCampusLocation(forcePan) {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const coords = { longitude: res.longitude, latitude: res.latitude };
        const dist = geo.calculateDistanceMeters(
          geo.CAMPUS_CENTER.longitude,
          geo.CAMPUS_CENTER.latitude,
          coords.longitude,
          coords.latitude
        );
        const insideCampus = dist <= 4500;
        this.setData({ userCoords: coords, hasUserGps: true });
        if (forcePan || insideCampus) {
          this.setData({ mapLng: coords.longitude, mapLat: coords.latitude, mapScale: 17 });
        } else if (!forcePan) {
          wx.showToast({ title: '已定位，默认展示广外五合校区', icon: 'none' });
        }
        this.refreshSpots();
      },
      fail: () => {
        if (forcePan) {
          wx.showToast({ title: '请在设置中开启位置权限', icon: 'none' });
        }
      },
    });
  },

  decorateSpot(spot) {
    const origin = this.data.userCoords || geo.CAMPUS_CENTER;
    const cat = spotsStore.getCategoryMeta(spot.category);
    const qm = spotsStore.QUIET_META[spot.quietStatus] || spotsStore.QUIET_META.very_quiet;
    const dist = geo.calculateDistanceMeters(
      origin.longitude,
      origin.latitude,
      spot.longitude,
      spot.latitude
    );
    return {
      ...spot,
      catEmoji: cat.emoji,
      catLabel: cat.label,
      catAccent: cat.accent,
      ratingText: Number(spot.rating || 5).toFixed(1),
      distanceText: geo.formatDistance(dist),
      quietLabel: qm.label,
      quietColor: qm.color,
      quietBg: qm.bg,
      quietDot: qm.dot,
    };
  },

  refreshSpots(preferId) {
    const raw = spotsStore.getAll();
    const q = (this.data.searchQuery || '').trim().toLowerCase();
    const activeCat = this.data.activeCategory;

    const filtered = raw
      .filter((s) => {
        const catOk = activeCat === 'all' || s.category === activeCat;
        const qOk =
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.recommendation.toLowerCase().includes(q);
        return catOk && qOk;
      })
      .map((s) => this.decorateSpot(s));

    let nextSelectedId = preferId || this.data.selectedSpotId;
    let nextIdx = filtered.findIndex((s) => s.id === nextSelectedId);
    if (nextIdx < 0) {
      nextIdx = 0;
      nextSelectedId = filtered[0] ? filtered[0].id : '';
    }

    const markers = filtered.map((s) => {
      const active = s.id === nextSelectedId;
      return {
        id: s.markerId,
        latitude: s.latitude,
        longitude: s.longitude,
        iconPath: active ? '/assets/pin-active.png' : '/assets/pin.png',
        width: active ? 38 : 30,
        height: active ? 38 : 30,
        anchor: { x: 0.5, y: 0.5 },
        callout: {
          content: `${s.catEmoji} ${s.name}`,
          color: active ? '#FFFFFF' : '#1D1D1F',
          fontSize: active ? 12 : 11,
          borderRadius: 16,
          bgColor: active ? '#007AFF' : '#FFFFFF',
          padding: 7,
          display: active ? 'ALWAYS' : 'BYCLICK',
          textAlign: 'center',
        },
      };
    });

    const detailSpot = this.data.detailSpot
      ? filtered.find((s) => s.id === this.data.detailSpot.id) || null
      : null;

    this.setData({
      allSpots: raw,
      filteredSpots: filtered,
      markers,
      selectedSpotId: nextSelectedId,
      currentCardIndex: nextIdx,
      detailSpot,
    });
  },

  onSelectCategory(e) {
    wx.vibrateShort({ type: 'light' });
    this.setData({ activeCategory: e.currentTarget.dataset.id });
    this.refreshSpots();
  },

  onSearchInput(e) {
    const val = e.detail.value || '';
    this.setData({ searchQuery: val });
    this.refreshSpots();

    if (this._poiTimer) clearTimeout(this._poiTimer);
    if (!val.trim()) {
      this.setData({ poiResults: [] });
      return;
    }
    this._poiTimer = setTimeout(async () => {
      const list = await api.searchCampusPoi(val);
      this.setData({ poiResults: list });
    }, 320);
  },

  clearSearch() {
    this.setData({ searchQuery: '', poiResults: [] });
    this.refreshSpots();
  },

  onSelectPoi(e) {
    const poi = this.data.poiResults[e.currentTarget.dataset.index];
    if (!poi) return;
    this.setData({
      poiResults: [],
      searchQuery: '',
      mapLng: poi.longitude,
      mapLat: poi.latitude,
      mapScale: 17.5,
      pickLng: poi.longitude,
      pickLat: poi.latitude,
      geoSuggestionName: poi.name,
      geoSuggestionAddress: poi.address,
    });
    wx.showToast({ title: `已定位至 ${poi.name}`, icon: 'none' });
  },

  onMarkerTap(e) {
    if (this.data.isPickMode) return;
    const markerId = e.detail.markerId;
    const found = this.data.filteredSpots.find((s) => s.markerId === markerId);
    if (!found) return;
    wx.vibrateShort({ type: 'light' });
    this.setData({ mapLng: found.longitude, mapLat: found.latitude });
    this.refreshSpots(found.id);
  },

  onSwiperChange(e) {
    if (e.detail.source !== 'touch') return;
    const idx = e.detail.current;
    const spot = this.data.filteredSpots[idx];
    if (!spot) return;
    this.setData({
      currentCardIndex: idx,
      mapLng: spot.longitude,
      mapLat: spot.latitude,
    });
    this.refreshSpots(spot.id);
  },

  toggleSatellite() {
    wx.vibrateShort({ type: 'light' });
    const next = !this.data.isSatellite;
    this.setData({ isSatellite: next });
    wx.showToast({ title: next ? '已切换高清卫星图' : '已切换标准视图', icon: 'none' });
  },

  zoomIn() {
    if (this.mapCtx && this.mapCtx.getScale) {
      this.mapCtx.getScale({
        success: (res) => {
          this.setData({ mapScale: Math.min(20, Math.round(res.scale || this.data.mapScale) + 1) });
        },
        fail: () => {
          this.setData({ mapScale: Math.min(20, this.data.mapScale + 1) });
        },
      });
    } else {
      this.setData({ mapScale: Math.min(20, this.data.mapScale + 1) });
    }
  },

  zoomOut() {
    if (this.mapCtx && this.mapCtx.getScale) {
      this.mapCtx.getScale({
        success: (res) => {
          this.setData({ mapScale: Math.max(12, Math.round(res.scale || this.data.mapScale) - 1) });
        },
        fail: () => {
          this.setData({ mapScale: Math.max(12, this.data.mapScale - 1) });
        },
      });
    } else {
      this.setData({ mapScale: Math.max(12, this.data.mapScale - 1) });
    }
  },

  onLocateMe() {
    wx.vibrateShort({ type: 'light' });
    this.requestCampusLocation(true);
  },

  onBackToCampus() {
    wx.vibrateShort({ type: 'light' });
    this.setData({
      mapLng: geo.CAMPUS_CENTER.longitude,
      mapLat: geo.CAMPUS_CENTER.latitude,
      mapScale: 16.5,
    });
    wx.showToast({ title: '已回到广外五合校区', icon: 'none' });
  },

  openSpotDetail(e) {
    const id = e.currentTarget.dataset.id;
    const found = this.data.filteredSpots.find((s) => s.id === id);
    if (found) {
      this.setData({ detailSpot: found, reviewDraft: '' }, () => this.syncTabBar());
    }
  },

  closeSpotDetail() {
    this.setData({ detailSpot: null }, () => this.syncTabBar());
  },

  onToggleLike(e) {
    const id = e.currentTarget.dataset.id;
    this.requireAuth('点赞收藏校园治愈点', () => {
      spotsStore.toggleLike(id);
      wx.vibrateShort({ type: 'light' });
      this.refreshSpots(id);
    });
  },

  onUpdateQuiet(e) {
    const status = e.currentTarget.dataset.status;
    if (!this.data.detailSpot) return;
    const spotId = this.data.detailSpot.id;
    this.requireAuth('更新此刻实时安静度', () => {
      spotsStore.updateQuietStatus(spotId, status);
      wx.vibrateShort({ type: 'light' });
      this.refreshSpots(spotId);
      wx.showToast({ title: '已更新此刻安静度 ✨', icon: 'none' });
    });
  },

  onReviewInput(e) {
    this.setData({ reviewDraft: e.detail.value || '' });
  },

  onSubmitReview() {
    const text = (this.data.reviewDraft || '').trim();
    if (!text || !this.data.detailSpot) return;
    const spotId = this.data.detailSpot.id;
    this.requireAuth('发布校园打卡感受', () => {
      const user = auth.getCurrentUser();
      spotsStore.addReview(spotId, text, '被治愈到了', user ? user.nickname : '五合同学');
      this.setData({ reviewDraft: '' });
      this.refreshSpots(spotId);
      wx.showToast({ title: '打卡已留存在地图上 ✨', icon: 'none' });
    });
  },

  onOpenNativeNav() {
    const spot = this.data.detailSpot;
    if (!spot) return;
    wx.openLocation({
      latitude: spot.latitude,
      longitude: spot.longitude,
      name: spot.name,
      address: '广西外国语学院（五合校区）',
      scale: 18,
    });
  },

  onEnterPickMode() {
    this.requireAuth('标记新的校园治愈点', () => {
      this.setData(
        {
          isPickMode: true,
          detailSpot: null,
          geoSuggestionName: '',
          geoSuggestionAddress: '',
        },
        () => this.syncTabBar()
      );
      this.updatePickCoords(this.data.mapLng, this.data.mapLat);
    });
  },

  cancelPickMode() {
    this.setData({ isPickMode: false });
  },

  onRegionChange(e) {
    if (!this.data.isPickMode || e.type !== 'end') return;
    this.mapCtx.getCenterLocation({
      success: (res) => {
        this.updatePickCoords(res.longitude, res.latitude);
      },
    });
  },

  onMapTap(e) {
    if (!this.data.isPickMode) {
      if (this.data.poiResults.length > 0) {
        this.setData({ poiResults: [] });
      }
      return;
    }
    if (!e.detail) return;
    const { longitude, latitude } = e.detail;
    if (longitude && latitude) {
      this.setData({ mapLng: longitude, mapLat: latitude });
      this.updatePickCoords(longitude, latitude);
    }
  },

  updatePickCoords(lng, lat) {
    this.setData({
      pickLng: lng,
      pickLat: lat,
      pickCoordText: `${geo.formatCoord(lng)}, ${geo.formatCoord(lat)}`,
    });
    if (this._regeoTimer) clearTimeout(this._regeoTimer);
    this._regeoTimer = setTimeout(async () => {
      const info = await api.reverseGeocode(lng, lat);
      if (info) {
        this.setData({
          geoSuggestionName: info.name,
          geoSuggestionAddress: info.address,
        });
      }
    }, 350);
  },

  confirmPickLocation() {
    this.setData(
      {
        addModalVisible: true,
        ugcName: this.data.ugcName || this.data.geoSuggestionName || '',
      },
      () => this.syncTabBar()
    );
  },

  closeAddModal() {
    this.setData({ addModalVisible: false }, () => this.syncTabBar());
  },

  onChooseSpotPhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempPath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!tempPath) return;
        this.setData({ ugcCoverUrl: tempPath });
        // 持久化到本地用户目录，避免重启小程序后临时图失效白屏
        try {
          const fs = wx.getFileSystemManager();
          fs.saveFile({
            tempFilePath: tempPath,
            success: (saved) => {
              if (saved && saved.savedFilePath) {
                this.setData({ ugcCoverUrl: saved.savedFilePath });
              }
            },
          });
        } catch (e) {
          // 降级保留临时路径
        }
      },
    });
  },

  onSelectPresetPhoto(e) {
    this.setData({ ugcCoverUrl: e.currentTarget.dataset.url });
  },

  onUgcName(e) { this.setData({ ugcName: e.detail.value || '' }); },
  onUgcCat(e) { this.setData({ ugcCategory: e.currentTarget.dataset.id }); },
  onUgcStar(e) { this.setData({ ugcRating: Number(e.currentTarget.dataset.star) }); },
  onUgcReason(e) { this.setData({ ugcReason: e.detail.value || '' }); },

  onSubmitAddSpot() {
    if (!this.data.ugcName.trim() || !this.data.ugcReason.trim()) {
      wx.showToast({ title: '请填写地点名称和安利理由', icon: 'none' });
      return;
    }
    const user = auth.getCurrentUser();
    const { created } = spotsStore.addSpot(
      {
        name: this.data.ugcName.trim(),
        category: this.data.ugcCategory,
        longitude: this.data.pickLng,
        latitude: this.data.pickLat,
        coverUrl: this.data.ugcCoverUrl,
        rating: this.data.ugcRating,
        recommendation: this.data.ugcReason.trim(),
      },
      user ? user.nickname : '五合探索者'
    );

    this.setData(
      {
        addModalVisible: false,
        isPickMode: false,
        activeCategory: 'all',
        ugcName: '',
        ugcReason: '',
        mapLng: created.longitude,
        mapLat: created.latitude,
      },
      () => this.syncTabBar()
    );
    this.refreshSpots(created.id);
    wx.vibrateLong();
    wx.showToast({ title: `🎉 已点亮「${created.name}」`, icon: 'none' });
  },
});
