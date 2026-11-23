const ventStore = require('../../utils/ventStore');
const auth = require('../../utils/auth');

Page({
  data: {
    menuTop: 24,
    menuHeight: 32,
    menuRightSpace: 104,
    user: null,
    authVisible: false,
    authReason: '',
    profileVisible: false,

    quickTags: ventStore.QUICK_VENT_TAGS,
    ventText: '',
    shouting: false,
    shoutPercent: 0,
    shoutDb: 48,
    shredding: false,
    shredSnapshot: '',
    showCareCard: false,
    careBooked: false,

    bubbles: [],
    holdingBubbleId: '',
    holdProgress: 0,
    burstBubbleId: '',
  },

  onLoad() {
    const app = getApp();
    const g = (app && app.globalData) || {};
    this.setData({
      menuTop: g.menuTop || 24,
      menuHeight: g.menuHeight || 32,
      menuRightSpace: g.menuRightSpace || 104,
      user: auth.getCurrentUser(),
      bubbles: ventStore.getBubbles(),
    });
  },

  onShow() {
    this.syncTabBar();
    this.setData({ user: auth.getCurrentUser() });
  },

  onUnload() {
    this.clearAllTimers();
  },

  clearAllTimers() {
    if (this._shoutTimer) clearInterval(this._shoutTimer);
    if (this._bubbleDelay) clearTimeout(this._bubbleDelay);
    if (this._bubbleTimer) clearInterval(this._bubbleTimer);
  },

  syncTabBar() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const hasModal = Boolean(
        this.data.authVisible || this.data.profileVisible || this.data.shredding
      );
      this.getTabBar().setData({ selected: 1, hidden: hasModal });
    }
  },

  requireAuth(reason, action) {
    if (auth.getCurrentUser()) {
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
    this.setData({ user: e.detail.user, authVisible: false }, () => this.syncTabBar());
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

  onAddQuickTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const prev = (this.data.ventText || '').trim();
    wx.vibrateShort({ type: 'light' });
    this.setData({ ventText: prev ? `${prev}，${tag}` : `${tag}！` });
  },

  onVentInput(e) {
    this.setData({ ventText: e.detail.value || '' });
  },

  startShout() {
    this.setData({ shouting: true, shoutPercent: 15, shoutDb: 58 });
    wx.vibrateShort({ type: 'light' });
    if (this._shoutTimer) clearInterval(this._shoutTimer);
    this._shoutTimer = setInterval(() => {
      const next = Math.min(100, this.data.shoutPercent + 6);
      this.setData({ shoutPercent: next, shoutDb: Math.round(45 + next * 0.68) });
      if (next % 18 === 0) wx.vibrateShort({ type: 'light' });
    }, 65);
  },

  endShout() {
    if (!this.data.shouting) return;
    if (this._shoutTimer) clearInterval(this._shoutTimer);
    const level = this.data.shoutPercent;
    this.setData({ shouting: false, shoutPercent: 0 });
    wx.vibrateShort({ type: 'medium' });
    wx.showToast({
      title: level > 70 ? '满格声波已排空 🌬️' : '长叹已散入晚风里～',
      icon: 'none',
    });
  },

  onShred() {
    const text = (this.data.ventText || '').trim();
    if (!text || this.data.shredding) return;
    const isHighRisk = ventStore.detectHighRiskEmotion(text);

    this.setData({ shredding: true, shredSnapshot: text }, () => this.syncTabBar());
    wx.vibrateLong();

    setTimeout(() => {
      this.setData({ shredding: false, ventText: '', shredSnapshot: '' }, () =>
        this.syncTabBar()
      );
      if (isHighRisk) {
        this.setData({ showCareCard: true });
      } else {
        wx.showToast({ title: '情绪已粉碎归零 🌿', icon: 'none' });
      }
    }, 1250);
  },

  dismissCare() {
    this.setData({ showCareCard: false });
  },

  onBookCare() {
    this.setData({ careBooked: true });
    wx.showToast({ title: '已生成匿名绿色通道 #PAU-24H', icon: 'none' });
  },

  onCallHotline(e) {
    wx.makePhoneCall({ phoneNumber: e.currentTarget.dataset.tel });
  },

  // ===== 长按泡泡蓄力抱抱（智能区分滑动滚动 vs 长按蓄力！） =====
  startBubbleHold(e) {
    const id = e.currentTarget.dataset.id;
    const touch = e.touches && e.touches[0];
    this._touchStartY = touch ? touch.clientY : 0;
    this._touchMoved = false;
    this._bubbleCompleted = false;
    this._chargingStarted = false;

    if (this._bubbleDelay) clearTimeout(this._bubbleDelay);
    if (this._bubbleTimer) clearInterval(this._bubbleTimer);

    // 延迟 180ms 再启动蓄力，避免正常上下滑动页面时误触发！
    this._bubbleDelay = setTimeout(() => {
      if (this._touchMoved) return;
      this._chargingStarted = true;
      this.setData({ holdingBubbleId: id, holdProgress: 12 });
      wx.vibrateShort({ type: 'light' });

      this._bubbleTimer = setInterval(() => {
        const next = Math.min(100, this.data.holdProgress + 10);
        this.setData({ holdProgress: next });
        if (next >= 100 && !this._bubbleCompleted) {
          this._bubbleCompleted = true;
          clearInterval(this._bubbleTimer);
          this.setData({ holdingBubbleId: '', holdProgress: 0, burstBubbleId: id });
          wx.vibrateLong();
          setTimeout(() => this.setData({ burstBubbleId: '' }), 550);

          this.requireAuth('给同校泡泡送出暖心抱抱', () => {
            const target = this.data.bubbles.find((b) => b.id === id);
            const list =
              target && !target.huggedByMe ? ventStore.toggleHug(id) : this.data.bubbles;
            this.setData({ bubbles: list });
            wx.showToast({ title: '满格抱抱已送达 🫂', icon: 'none' });
          });
        }
      }, 48);
    }, 180);
  },

  moveBubbleHold(e) {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    if (Math.abs(touch.clientY - (this._touchStartY || 0)) > 10) {
      this._touchMoved = true;
      if (this._bubbleDelay) clearTimeout(this._bubbleDelay);
      if (this._bubbleTimer) clearInterval(this._bubbleTimer);
      if (this.data.holdingBubbleId) {
        this.setData({ holdingBubbleId: '', holdProgress: 0 });
      }
    }
  },

  endBubbleHold() {
    if (this._bubbleDelay) clearTimeout(this._bubbleDelay);
    if (this._bubbleTimer) clearInterval(this._bubbleTimer);
    if (!this._touchMoved && !this._bubbleCompleted && this._chargingStarted) {
      wx.showToast({ title: '继续长按蓄满暖光就能送出抱抱 🫂', icon: 'none' });
    }
    this.setData({ holdingBubbleId: '', holdProgress: 0 });
  },

  onTapEmpathy(e) {
    const id = e.currentTarget.dataset.id;
    this.requireAuth('点亮情绪同感', () => {
      wx.vibrateShort({ type: 'light' });
      this.setData({ bubbles: ventStore.toggleEmpathy(id) });
    });
  },
});
