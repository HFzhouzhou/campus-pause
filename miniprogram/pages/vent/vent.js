const ventStore = require('../../utils/ventStore');
const auth = require('../../utils/auth');

Page({
  data: {
    statusBarHeight: 20,
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
    this.setData({
      statusBarHeight: (app && app.globalData && app.globalData.statusBarHeight) || 20,
      user: auth.getCurrentUser(),
      bubbles: ventStore.getBubbles(),
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.setData({ user: auth.getCurrentUser() });
  },

  onUnload() {
    if (this._shoutTimer) clearInterval(this._shoutTimer);
    if (this._bubbleTimer) clearInterval(this._bubbleTimer);
  },

  requireAuth(reason, action) {
    if (auth.getCurrentUser()) {
      action();
      return;
    }
    this._pendingAction = action;
    this.setData({ authVisible: true, authReason: reason });
  },

  openAuthManual() {
    this._pendingAction = null;
    this.setData({ authVisible: true, authReason: '' });
  },
  closeAuth() {
    this._pendingAction = null;
    this.setData({ authVisible: false });
  },
  onAuthSuccess(e) {
    this.setData({ user: e.detail.user, authVisible: false });
    if (this._pendingAction) {
      const fn = this._pendingAction;
      this._pendingAction = null;
      setTimeout(fn, 150);
    }
  },
  openProfile() {
    this.setData({ profileVisible: true });
  },
  closeProfile() {
    this.setData({ profileVisible: false });
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

    this.setData({ shredding: true, shredSnapshot: text });
    wx.vibrateLong();

    setTimeout(() => {
      this.setData({ shredding: false, ventText: '', shredSnapshot: '' });
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
    const tel = e.currentTarget.dataset.tel;
    wx.makePhoneCall({ phoneNumber: tel });
  },

  // ===== 长按泡泡蓄力抱抱 =====
  startBubbleHold(e) {
    const id = e.currentTarget.dataset.id;
    this._bubbleCompleted = false;
    this.setData({ holdingBubbleId: id, holdProgress: 10 });
    wx.vibrateShort({ type: 'light' });

    if (this._bubbleTimer) clearInterval(this._bubbleTimer);
    this._bubbleTimer = setInterval(() => {
      const next = Math.min(100, this.data.holdProgress + 9);
      this.setData({ holdProgress: next });
      if (next >= 100 && !this._bubbleCompleted) {
        this._bubbleCompleted = true;
        clearInterval(this._bubbleTimer);
        this.setData({ holdingBubbleId: '', holdProgress: 0, burstBubbleId: id });
        wx.vibrateLong();
        setTimeout(() => this.setData({ burstBubbleId: '' }), 550);

        this.requireAuth('给同校泡泡送出暖心抱抱', () => {
          const target = this.data.bubbles.find((b) => b.id === id);
          const list = target && !target.huggedByMe ? ventStore.toggleHug(id) : this.data.bubbles;
          this.setData({ bubbles: list });
          wx.showToast({ title: '满格抱抱已送达 🫂', icon: 'none' });
        });
      }
    }, 50);
  },

  endBubbleHold() {
    if (this._bubbleTimer) clearInterval(this._bubbleTimer);
    if (!this._bubbleCompleted && this.data.holdingBubbleId) {
      wx.showToast({ title: '长按泡泡蓄满进度送出抱抱 🫂', icon: 'none' });
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
