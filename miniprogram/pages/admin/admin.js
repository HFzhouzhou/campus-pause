const auth = require('../../utils/auth');
const adminStore = require('../../utils/adminStore');
const spotsStore = require('../../utils/spotsStore');
const ventStore = require('../../utils/ventStore');
const buddyStore = require('../../utils/buddyStore');
const geo = require('../../utils/geo');

Page({
  data: {
    menuTop: 24,
    menuHeight: 32,
    menuRightSpace: 104,
    user: null,
    authorized: false,
    isSuperAdmin: false,
    offlineMode: false,
    loading: false,

    activeTab: 'spots', // 'spots' | 'buddies' | 'bubbles' | 'admins'
    stats: {
      spotsCount: 0,
      reviewsCount: 0,
      bubblesCount: 0,
      buddiesCount: 0,
      messagesCount: 0,
      usersCount: 0,
      adminsCount: 0,
      pendingAdminGrantsCount: 0,
    },

    // 搜索关键词
    spotQuery: '',
    buddyQuery: '',
    userQuery: '',

    // 列表数据
    spots: [],
    filteredSpots: [],
    buddies: [],
    filteredBuddies: [],
    bubbles: [],

    // 管理员管理（仅超级管理员）
    admins: [],
    pendingGrants: [],
    users: [],
    newAdminEmail: '',
    newAdminNote: '',
    addingAdmin: false,
    bindingWx: false,

    // 选项常量
    spotCategories: spotsStore.SPOT_CATEGORIES.filter((c) => c.id !== 'all'),
    presetPhotos: spotsStore.PRESET_PHOTOS,
    buddyCategories: buddyStore.BUDDY_CATEGORIES.filter((c) => c.id !== 'all'),
    bubbleTones: ventStore.BUBBLE_TONES,

    // 1) 编辑地点弹窗
    spotModalVisible: false,
    editSpotId: '',
    editSpotCover: '',
    editSpotName: '',
    editSpotCat: 'sunset',
    editSpotRating: 5,
    editSpotQuiet: 'very_quiet',
    editSpotLng: '',
    editSpotLat: '',
    editSpotAuthor: '',
    editSpotTagsText: '',
    editSpotReason: '',
    savingSpot: false,

    // 2) 地点打卡管理弹窗 & 编辑单条打卡
    reviewsModalVisible: false,
    activeReviewSpot: null,
    editReviewModalVisible: false,
    editReviewId: '',
    editReviewSpotId: '',
    editReviewAuthor: '',
    editReviewMood: '',
    editReviewContent: '',

    // 3) 编辑搭子弹窗
    buddyModalVisible: false,
    editBuddyId: '',
    editBuddyTitle: '',
    editBuddyCat: 'walk',
    editBuddyLocation: '',
    editBuddyCipher: '',
    editBuddyHost: '',
    editBuddyDuration: 30,
    editBuddyMaxPeople: 3,
    editBuddySilent: true,
    editBuddyNote: '',
    editBuddyResetTimer: false,
    savingBuddy: false,

    // 4) 搭子频道消息管理弹窗 & 编辑单条消息
    messagesModalVisible: false,
    activeMsgBuddy: null,
    editMsgModalVisible: false,
    editMsgId: '',
    editMsgBuddyId: '',
    editMsgSender: '',
    editMsgText: '',

    // 5) 编辑/新增共鸣泡泡弹窗
    bubbleModalVisible: false,
    editBubbleId: '',
    editBubbleTag: '',
    editBubbleTone: 'lavender',
    editBubbleAuthor: '',
    editBubbleContent: '',
    savingBubble: false,
  },

  onLoad(options) {
    const app = getApp();
    const g = (app && app.globalData) || {};
    const initialTab = options && options.tab ? options.tab : 'spots';
    this.setData({
      menuTop: g.menuTop || 24,
      menuHeight: g.menuHeight || 32,
      menuRightSpace: g.menuRightSpace || 104,
      activeTab: initialTab,
    });
  },

  async onShow() {
    const freshUser = await auth.refreshCurrentUser(true);
    const user = freshUser || auth.getCurrentUser();
    const isSuper = auth.isSuperAdmin(user);
    const authorized = auth.isAdmin(user);
    let nextTab = this.data.activeTab;
    if (nextTab === 'admins' && !isSuper) {
      nextTab = 'spots';
    }
    this.setData({
      user,
      authorized,
      isSuperAdmin: isSuper,
      activeTab: nextTab,
    });
    if (authorized) {
      await this.loadAllData();
    }
  },

  noop() {},

  onGoBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      wx.switchTab({ url: '/pages/map/map' });
    }
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'admins' && !this.data.isSuperAdmin) return;
    wx.vibrateShort({ type: 'light' });
    this.setData({ activeTab: tab });
    if (tab === 'admins') {
      this.loadAdminDirectory();
    }
  },

  async loadAllData() {
    this.setData({ loading: true });
    try {
      const [spotRes, buddyRes, bubbleRes, overviewRes] = await Promise.all([
        spotsStore.syncFromServer(),
        buddyStore.syncFromServer(),
        ventStore.syncFromServer(),
        adminStore.fetchOverview(),
      ]);

      const decoratedSpots = (spotRes.list || []).map((s) => this.decorateSpot(s));
      const decoratedBuddies = (buddyRes.list || []).map((b) => this.decorateBuddy(b));
      const offlineMode = Boolean(overviewRes.offlineMode || !spotRes.synced);

      this.setData({
        spots: decoratedSpots,
        buddies: decoratedBuddies,
        bubbles: bubbleRes.list || [],
        stats: overviewRes.stats || this.data.stats,
        offlineMode,
      });
      this.applySpotFilter();
      this.applyBuddyFilter();

      if (this.data.isSuperAdmin) {
        await this.loadAdminDirectory();
      }
    } catch (err) {
      wx.showToast({ title: err.message || '加载管理数据失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadAdminDirectory() {
    if (!this.data.isSuperAdmin) return;
    try {
      const res = await adminStore.fetchAdmins(this.data.userQuery);
      this.setData({
        admins: res.admins || [],
        pendingGrants: res.pendingGrants || [],
        users: res.users || [],
        offlineMode: Boolean(res.offlineMode),
      });
    } catch (err) {
      wx.showToast({ title: err.message || '读取管理员列表失败', icon: 'none' });
    }
  },

  decorateSpot(s) {
    const cat = spotsStore.getCategoryMeta(s.category);
    const qm = spotsStore.QUIET_META[s.quietStatus] || spotsStore.QUIET_META.very_quiet;
    return {
      ...s,
      catEmoji: cat.emoji,
      catLabel: cat.label,
      quietLabel: qm.label,
      coordText: `${geo.formatCoord(s.longitude)}, ${geo.formatCoord(s.latitude)}`,
      reviewCount: (s.reviews && s.reviews.length) || 0,
    };
  },

  decorateBuddy(b) {
    const cat =
      buddyStore.BUDDY_CATEGORIES.find((c) => c.id === b.category) ||
      buddyStore.BUDDY_CATEGORIES[0];
    return {
      ...b,
      catEmoji: cat.emoji || '✨',
      catLabel: cat.label || '搭子',
      msgCount: (b.quickMessages && b.quickMessages.length) || 0,
    };
  },

  // ==================== 1. 地图地点与打卡管理 ====================

  onSpotSearch(e) {
    this.setData({ spotQuery: e.detail.value || '' }, () => this.applySpotFilter());
  },

  applySpotFilter() {
    const q = (this.data.spotQuery || '').trim().toLowerCase();
    const filtered = this.data.spots.filter((s) => {
      if (!q) return true;
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.recommendation || '').toLowerCase().includes(q) ||
        (s.authorName || '').toLowerCase().includes(q)
      );
    });
    this.setData({ filteredSpots: filtered });
  },

  openEditSpot(e) {
    const id = e.currentTarget.dataset.id;
    const spot = this.data.spots.find((s) => s.id === id);
    if (!spot) return;
    this.setData({
      spotModalVisible: true,
      editSpotId: spot.id,
      editSpotCover: spot.coverUrl,
      editSpotName: spot.name,
      editSpotCat: spot.category,
      editSpotRating: Math.round(Number(spot.rating || 5)),
      editSpotQuiet: spot.quietStatus || 'very_quiet',
      editSpotLng: String(spot.longitude),
      editSpotLat: String(spot.latitude),
      editSpotAuthor: spot.authorName || '五合探索者',
      editSpotTagsText: (spot.tags || []).join('，'),
      editSpotReason: spot.recommendation || '',
    });
  },

  closeSpotModal() {
    this.setData({ spotModalVisible: false });
  },

  onChooseEditSpotPhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempPath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (tempPath) {
          this.setData({ editSpotCover: tempPath });
        }
      },
    });
  },

  onPickSpotPreset(e) {
    this.setData({ editSpotCover: e.currentTarget.dataset.url });
  },
  onEditSpotName(e) { this.setData({ editSpotName: e.detail.value || '' }); },
  onEditSpotCat(e) { this.setData({ editSpotCat: e.currentTarget.dataset.id }); },
  onEditSpotStar(e) { this.setData({ editSpotRating: Number(e.currentTarget.dataset.star) }); },
  onEditSpotQuiet(e) { this.setData({ editSpotQuiet: e.currentTarget.dataset.status }); },
  onEditSpotLng(e) { this.setData({ editSpotLng: e.detail.value || '' }); },
  onEditSpotLat(e) { this.setData({ editSpotLat: e.detail.value || '' }); },
  onEditSpotAuthor(e) { this.setData({ editSpotAuthor: e.detail.value || '' }); },
  onEditSpotTags(e) { this.setData({ editSpotTagsText: e.detail.value || '' }); },
  onEditSpotReason(e) { this.setData({ editSpotReason: e.detail.value || '' }); },

  onJumpMapReposition(e) {
    const id = (e && e.currentTarget && e.currentTarget.dataset.id) || this.data.editSpotId;
    if (!id) return;
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.pendingEditSpot = { id, openPick: true };
    }
    this.setData({ spotModalVisible: false });
    wx.switchTab({ url: '/pages/map/map' });
  },

  async onSaveEditSpot() {
    if (this.data.savingSpot) return;
    const name = (this.data.editSpotName || '').trim();
    const reason = (this.data.editSpotReason || '').trim();
    const lng = parseFloat(this.data.editSpotLng);
    const lat = parseFloat(this.data.editSpotLat);

    if (!name || !reason) {
      wx.showToast({ title: '地点名称和安利理由不能为空', icon: 'none' });
      return;
    }
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      wx.showToast({ title: '请输入合法的经纬度坐标', icon: 'none' });
      return;
    }

    this.setData({ savingSpot: true });
    try {
      const res = await spotsStore.updateSpot(this.data.editSpotId, {
        name,
        category: this.data.editSpotCat,
        longitude: lng,
        latitude: lat,
        coverUrl: this.data.editSpotCover,
        quietStatus: this.data.editSpotQuiet,
        rating: this.data.editSpotRating,
        recommendation: reason,
        tags: this.data.editSpotTagsText,
        authorName: this.data.editSpotAuthor,
      });
      const decorated = (res.list || []).map((s) => this.decorateSpot(s));
      this.setData({ spots: decorated, spotModalVisible: false }, () => this.applySpotFilter());
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: '地点已更新 ✨', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ savingSpot: false });
    }
  },

  onDeleteSpot(e) {
    const id = e.currentTarget.dataset.id;
    const spot = this.data.spots.find((s) => s.id === id);
    if (!spot) return;
    wx.showModal({
      title: '删除地图地点',
      content: `确认删除「${spot.name}」及其全部打卡内容？删除后不可恢复。`,
      confirmColor: '#FF3B30',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          const res = await spotsStore.deleteSpot(id);
          const decorated = (res.list || []).map((s) => this.decorateSpot(s));
          this.setData(
            {
              spots: decorated,
              'stats.spotsCount': decorated.length,
            },
            () => this.applySpotFilter()
          );
          wx.showToast({ title: '地点已删除', icon: 'none' });
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  openSpotReviews(e) {
    const id = e.currentTarget.dataset.id;
    const spot = this.data.spots.find((s) => s.id === id);
    if (!spot) return;
    this.setData({ reviewsModalVisible: true, activeReviewSpot: spot });
  },

  closeReviewsModal() {
    this.setData({ reviewsModalVisible: false, activeReviewSpot: null });
  },

  openEditReview(e) {
    const revId = e.currentTarget.dataset.id;
    const spot = this.data.activeReviewSpot;
    if (!spot) return;
    const rev = (spot.reviews || []).find((r) => r.id === revId);
    if (!rev) return;
    this.setData({
      editReviewModalVisible: true,
      editReviewId: rev.id,
      editReviewSpotId: spot.id,
      editReviewAuthor: rev.author || '',
      editReviewMood: rev.moodTag || '被治愈到了',
      editReviewContent: rev.content || '',
    });
  },

  closeEditReviewModal() {
    this.setData({ editReviewModalVisible: false });
  },

  onEditRevAuthor(e) { this.setData({ editReviewAuthor: e.detail.value || '' }); },
  onEditRevMood(e) { this.setData({ editReviewMood: e.detail.value || '' }); },
  onEditRevContent(e) { this.setData({ editReviewContent: e.detail.value || '' }); },

  async onSaveEditReview() {
    const content = (this.data.editReviewContent || '').trim();
    if (!content) {
      wx.showToast({ title: '打卡内容不能为空', icon: 'none' });
      return;
    }
    try {
      const res = await spotsStore.updateReview(
        this.data.editReviewSpotId,
        this.data.editReviewId,
        {
          author: this.data.editReviewAuthor,
          moodTag: this.data.editReviewMood,
          content,
        }
      );
      const decorated = (res.list || []).map((s) => this.decorateSpot(s));
      const updatedSpot = decorated.find((s) => s.id === this.data.editReviewSpotId) || null;
      this.setData(
        {
          spots: decorated,
          activeReviewSpot: updatedSpot,
          editReviewModalVisible: false,
        },
        () => this.applySpotFilter()
      );
      wx.showToast({ title: '打卡内容已更新 ✨', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    }
  },

  onDeleteReview(e) {
    const revId = e.currentTarget.dataset.id;
    const spot = this.data.activeReviewSpot;
    if (!spot) return;
    wx.showModal({
      title: '删除打卡记录',
      content: '确认删除这条用户打卡内容吗？',
      confirmColor: '#FF3B30',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          const res = await spotsStore.deleteReview(spot.id, revId);
          const decorated = (res.list || []).map((s) => this.decorateSpot(s));
          const updatedSpot = decorated.find((s) => s.id === spot.id) || null;
          const totalReviews = decorated.reduce((sum, s) => sum + s.reviewCount, 0);
          this.setData(
            {
              spots: decorated,
              activeReviewSpot: updatedSpot,
              'stats.reviewsCount': totalReviews,
            },
            () => this.applySpotFilter()
          );
          wx.showToast({ title: '已删除该打卡', icon: 'none' });
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  // ==================== 2. 限时搭子与频道消息管理 ====================

  onBuddySearch(e) {
    this.setData({ buddyQuery: e.detail.value || '' }, () => this.applyBuddyFilter());
  },

  applyBuddyFilter() {
    const q = (this.data.buddyQuery || '').trim().toLowerCase();
    const filtered = this.data.buddies.filter((b) => {
      if (!q) return true;
      return (
        (b.title || '').toLowerCase().includes(q) ||
        (b.location || '').toLowerCase().includes(q) ||
        (b.hostAlias || '').toLowerCase().includes(q) ||
        (b.vibeNote || '').toLowerCase().includes(q)
      );
    });
    this.setData({ filteredBuddies: filtered });
  },

  openEditBuddy(e) {
    const id = e.currentTarget.dataset.id;
    const b = this.data.buddies.find((item) => item.id === id);
    if (!b) return;
    this.setData({
      buddyModalVisible: true,
      editBuddyId: b.id,
      editBuddyTitle: b.title || '',
      editBuddyCat: b.category || 'walk',
      editBuddyLocation: b.location || '',
      editBuddyCipher: b.cipher || '',
      editBuddyHost: b.hostAlias || '',
      editBuddyDuration: b.durationMinutes || 30,
      editBuddyMaxPeople: b.maxPeople || 3,
      editBuddySilent: Boolean(b.isSilent),
      editBuddyNote: b.vibeNote || '',
      editBuddyResetTimer: false,
    });
  },

  closeBuddyModal() {
    this.setData({ buddyModalVisible: false });
  },

  onEditBTitle(e) { this.setData({ editBuddyTitle: e.detail.value || '' }); },
  onEditBCat(e) { this.setData({ editBuddyCat: e.currentTarget.dataset.id }); },
  onEditBLoc(e) { this.setData({ editBuddyLocation: e.detail.value || '' }); },
  onEditBCipher(e) { this.setData({ editBuddyCipher: e.detail.value || '' }); },
  onEditBHost(e) { this.setData({ editBuddyHost: e.detail.value || '' }); },
  onEditBDuration(e) { this.setData({ editBuddyDuration: Number(e.currentTarget.dataset.val) }); },
  onEditBMax(e) { this.setData({ editBuddyMaxPeople: Number(e.currentTarget.dataset.val) }); },
  onEditBSilent(e) { this.setData({ editBuddySilent: Boolean(e.detail.value) }); },
  onEditBReset(e) { this.setData({ editBuddyResetTimer: Boolean(e.detail.value) }); },
  onEditBNote(e) { this.setData({ editBuddyNote: e.detail.value || '' }); },

  async onSaveEditBuddy() {
    if (this.data.savingBuddy) return;
    if (!this.data.editBuddyTitle.trim() || !this.data.editBuddyLocation.trim()) {
      wx.showToast({ title: '活动名称和集合点不能为空', icon: 'none' });
      return;
    }
    this.setData({ savingBuddy: true });
    try {
      const res = await buddyStore.updateBuddy(this.data.editBuddyId, {
        title: this.data.editBuddyTitle,
        category: this.data.editBuddyCat,
        location: this.data.editBuddyLocation,
        cipher: this.data.editBuddyCipher,
        hostAlias: this.data.editBuddyHost,
        durationMinutes: this.data.editBuddyDuration,
        maxPeople: this.data.editBuddyMaxPeople,
        isSilent: this.data.editBuddySilent,
        vibeNote: this.data.editBuddyNote,
        resetCountdown: this.data.editBuddyResetTimer,
      });
      const decorated = (res.list || []).map((b) => this.decorateBuddy(b));
      this.setData({ buddies: decorated, buddyModalVisible: false }, () =>
        this.applyBuddyFilter()
      );
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: '搭子内容已更新 ✨', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ savingBuddy: false });
    }
  },

  onDeleteBuddy(e) {
    const id = e.currentTarget.dataset.id;
    const b = this.data.buddies.find((item) => item.id === id);
    if (!b) return;
    wx.showModal({
      title: '删除限时搭子',
      content: `确认删除「${b.title}」及其频道消息吗？`,
      confirmColor: '#FF3B30',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          const res = await buddyStore.deleteBuddy(id);
          const decorated = (res.list || []).map((item) => this.decorateBuddy(item));
          this.setData(
            {
              buddies: decorated,
              'stats.buddiesCount': decorated.length,
            },
            () => this.applyBuddyFilter()
          );
          wx.showToast({ title: '已删除该搭子', icon: 'none' });
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  openBuddyMessages(e) {
    const id = e.currentTarget.dataset.id;
    const b = this.data.buddies.find((item) => item.id === id);
    if (!b) return;
    this.setData({ messagesModalVisible: true, activeMsgBuddy: b });
  },

  closeMessagesModal() {
    this.setData({ messagesModalVisible: false, activeMsgBuddy: null });
  },

  openEditMessage(e) {
    const mid = e.currentTarget.dataset.id;
    const b = this.data.activeMsgBuddy;
    if (!b) return;
    const m = (b.quickMessages || []).find((item) => item.id === mid);
    if (!m) return;
    this.setData({
      editMsgModalVisible: true,
      editMsgId: m.id,
      editMsgBuddyId: b.id,
      editMsgSender: m.sender || '',
      editMsgText: m.text || '',
    });
  },

  closeEditMsgModal() {
    this.setData({ editMsgModalVisible: false });
  },

  onEditMsgSender(e) { this.setData({ editMsgSender: e.detail.value || '' }); },
  onEditMsgText(e) { this.setData({ editMsgText: e.detail.value || '' }); },

  async onSaveEditMsg() {
    if (!this.data.editMsgText.trim()) {
      wx.showToast({ title: '消息内容不能为空', icon: 'none' });
      return;
    }
    try {
      const res = await buddyStore.updateQuickMessage(
        this.data.editMsgBuddyId,
        this.data.editMsgId,
        { sender: this.data.editMsgSender, text: this.data.editMsgText }
      );
      const decorated = (res.list || []).map((item) => this.decorateBuddy(item));
      const active = decorated.find((item) => item.id === this.data.editMsgBuddyId) || null;
      this.setData(
        { buddies: decorated, activeMsgBuddy: active, editMsgModalVisible: false },
        () => this.applyBuddyFilter()
      );
      wx.showToast({ title: '消息已更新 ✨', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  },

  onDeleteMessage(e) {
    const mid = e.currentTarget.dataset.id;
    const b = this.data.activeMsgBuddy;
    if (!b) return;
    wx.showModal({
      title: '删除频道消息',
      content: '确认删除这条临时频道消息？',
      confirmColor: '#FF3B30',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          const res = await buddyStore.deleteQuickMessage(b.id, mid);
          const decorated = (res.list || []).map((item) => this.decorateBuddy(item));
          const active = decorated.find((item) => item.id === b.id) || null;
          const totalMsgs = decorated.reduce((sum, item) => sum + item.msgCount, 0);
          this.setData(
            { buddies: decorated, activeMsgBuddy: active, 'stats.messagesCount': totalMsgs },
            () => this.applyBuddyFilter()
          );
          wx.showToast({ title: '已删除该消息', icon: 'none' });
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  // ==================== 3. 共鸣泡泡管理 ====================

  openAddBubble() {
    this.setData({
      bubbleModalVisible: true,
      editBubbleId: '',
      editBubbleTag: '校园日常',
      editBubbleTone: 'lavender',
      editBubbleAuthor: '五合匿名泡泡',
      editBubbleContent: '',
    });
  },

  openEditBubble(e) {
    const id = e.currentTarget.dataset.id;
    const b = this.data.bubbles.find((item) => item.id === id);
    if (!b) return;
    this.setData({
      bubbleModalVisible: true,
      editBubbleId: b.id,
      editBubbleTag: b.tag || '',
      editBubbleTone: b.tone || 'lavender',
      editBubbleAuthor: b.authorName || '五合匿名泡泡',
      editBubbleContent: b.content || '',
    });
  },

  closeBubbleModal() {
    this.setData({ bubbleModalVisible: false });
  },

  onEditBubbleTag(e) { this.setData({ editBubbleTag: e.detail.value || '' }); },
  onEditBubbleTone(e) { this.setData({ editBubbleTone: e.currentTarget.dataset.tone }); },
  onEditBubbleAuthor(e) { this.setData({ editBubbleAuthor: e.detail.value || '' }); },
  onEditBubbleContent(e) { this.setData({ editBubbleContent: e.detail.value || '' }); },

  async onSaveBubble() {
    if (this.data.savingBubble) return;
    const content = (this.data.editBubbleContent || '').trim();
    if (!content) {
      wx.showToast({ title: '泡泡内容不能为空', icon: 'none' });
      return;
    }
    this.setData({ savingBubble: true });
    try {
      let res;
      if (this.data.editBubbleId) {
        res = await ventStore.updateBubble(this.data.editBubbleId, {
          content,
          tag: this.data.editBubbleTag || '低电量时刻',
          tone: this.data.editBubbleTone,
          authorName: this.data.editBubbleAuthor || '五合匿名泡泡',
        });
      } else {
        res = await ventStore.addBubble({
          content,
          tag: this.data.editBubbleTag || '校园日常',
          tone: this.data.editBubbleTone,
          authorName: this.data.editBubbleAuthor || '五合匿名泡泡',
        });
      }
      const list = res.list || [];
      this.setData({
        bubbles: list,
        bubbleModalVisible: false,
        'stats.bubblesCount': list.length,
      });
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: this.data.editBubbleId ? '泡泡已更新 ✨' : '泡泡已发布 ✨', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ savingBubble: false });
    }
  },

  onDeleteBubble(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除共鸣泡泡',
      content: '确认删除这条共鸣泡泡吗？',
      confirmColor: '#FF3B30',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          const res = await ventStore.deleteBubble(id);
          const list = res.list || [];
          this.setData({ bubbles: list, 'stats.bubblesCount': list.length });
          wx.showToast({ title: '泡泡已删除', icon: 'none' });
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  // ==================== 4. 超级管理员专属：管理员管理 ====================

  onNewAdminEmail(e) { this.setData({ newAdminEmail: e.detail.value || '' }); },
  onNewAdminNote(e) { this.setData({ newAdminNote: e.detail.value || '' }); },
  onUserQueryInput(e) { this.setData({ userQuery: e.detail.value || '' }); },

  async onBindMyWeChat() {
    if (this.data.bindingWx) return;
    this.setData({ bindingWx: true });
    try {
      const res = await auth.bindWeChat();
      this.setData({ user: res.user });
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: res.message || '绑定微信成功 ✨', icon: 'none', duration: 2400 });
      if (this.data.isSuperAdmin) {
        await this.loadAdminDirectory();
      }
    } catch (err) {
      wx.showToast({ title: err.message || '绑定微信失败', icon: 'none', duration: 2600 });
    } finally {
      this.setData({ bindingWx: false });
    }
  },

  onUnbindMyWeChat() {
    if (this.data.bindingWx) return;
    wx.showModal({
      title: '解除微信绑定',
      content: '解绑后将无法用当前微信一键登录该管理员账号（仍可用邮箱登录），确认解绑吗？',
      confirmColor: '#FF3B30',
      success: async (r) => {
        if (!r.confirm) return;
        this.setData({ bindingWx: true });
        try {
          const res = await auth.unbindWeChat();
          this.setData({ user: res.user });
          wx.showToast({ title: res.message || '已解除微信绑定', icon: 'none' });
          if (this.data.isSuperAdmin) {
            await this.loadAdminDirectory();
          }
        } catch (err) {
          wx.showToast({ title: err.message || '解绑失败', icon: 'none' });
        } finally {
          this.setData({ bindingWx: false });
        }
      },
    });
  },

  onSearchUsers() {
    this.loadAdminDirectory();
  },

  async onAddAdminByEmail() {
    if (this.data.addingAdmin) return;
    const email = (this.data.newAdminEmail || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      wx.showToast({ title: '请输入正确的邮箱地址', icon: 'none' });
      return;
    }
    this.setData({ addingAdmin: true });
    try {
      const res = await adminStore.addAdmin({
        email,
        note: this.data.newAdminNote,
      });
      this.setData({ newAdminEmail: '', newAdminNote: '' });
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: res.message || '已新增管理员 ✨', icon: 'none', duration: 2400 });
      await this.loadAdminDirectory();
    } catch (err) {
      wx.showToast({ title: err.message || '新增失败', icon: 'none' });
    } finally {
      this.setData({ addingAdmin: false });
    }
  },

  async onPromoteUser(e) {
    const uid = e.currentTarget.dataset.uid;
    const nickname = e.currentTarget.dataset.name || '该用户';
    wx.showModal({
      title: '任命管理员',
      content: `确认将「${nickname}」设为管理员？管理员将拥有编辑用户发布的地图地点与全站内容的权限。`,
      success: async (r) => {
        if (!r.confirm) return;
        try {
          const res = await adminStore.addAdmin({ uid });
          wx.showToast({ title: res.message || '已设为管理员 ✨', icon: 'none' });
          await this.loadAdminDirectory();
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      },
    });
  },

  onRevokeAdmin(e) {
    const { uid, email, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '撤销管理员权限',
      content: `确认撤销「${name || email}」的管理员权限吗？`,
      confirmColor: '#FF3B30',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          const res = await adminStore.removeAdmin({ uid: uid || '', email: email || '' });
          wx.showToast({ title: res.message || '已撤销管理员权限', icon: 'none' });
          await this.loadAdminDirectory();
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      },
    });
  },
});
