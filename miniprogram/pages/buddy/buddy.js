const buddyStore = require('../../utils/buddyStore');
const auth = require('../../utils/auth');

function formatCountdown(expiresAt, now) {
  const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const m = String(Math.floor(diff / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${m}:${s}`;
}

Page({
  data: {
    statusBarHeight: 20,
    user: null,
    authVisible: false,
    authReason: '',
    profileVisible: false,

    categories: buddyStore.BUDDY_CATEGORIES,
    selectableCategories: buddyStore.BUDDY_CATEGORIES.filter((c) => c.id !== 'all'),
    quickMessages: buddyStore.QUICK_CIPHER_MESSAGES,
    activeCategory: 'all',

    rawBuddies: [],
    filteredBuddies: [],

    activeCipherId: '',
    activeCipherBuddy: null,
    msgDraft: '',

    createVisible: false,
    fTitle: '',
    fCategory: 'walk',
    fLocation: '',
    fCipher: '',
    fDuration: 30,
    fMaxPeople: 2,
    fIsSilent: true,
    fNote: '',
  },

  onLoad() {
    const app = getApp();
    this.setData({
      statusBarHeight: (app && app.globalData && app.globalData.statusBarHeight) || 20,
      user: auth.getCurrentUser(),
    });
    this.refreshList();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.setData({ user: auth.getCurrentUser() });
    this.startClock();
  },

  onHide() {
    if (this._clock) clearInterval(this._clock);
  },

  onUnload() {
    if (this._clock) clearInterval(this._clock);
  },

  noop() {},

  startClock() {
    if (this._clock) clearInterval(this._clock);
    this._clock = setInterval(() => this.refreshList(), 1000);
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

  refreshList() {
    const now = Date.now();
    const raw = buddyStore.getAll();
    const cat = this.data.activeCategory;

    const decorate = (b) => ({
      ...b,
      remainingText: formatCountdown(b.expiresAt, now),
      isExpired: b.expiresAt <= now,
      isFull: b.joinedCount >= b.maxPeople && !b.joinedByMe,
      quickMessages: (b.quickMessages || []).map((m) => ({
        ...m,
        isMe: (m.sender || '').startsWith('我'),
      })),
    });

    const filtered = raw
      .filter((b) => cat === 'all' || b.category === cat)
      .map(decorate);

    const activeCipherBuddy = this.data.activeCipherId
      ? raw.filter((b) => b.id === this.data.activeCipherId).map(decorate)[0] || null
      : null;

    this.setData({
      rawBuddies: raw,
      filteredBuddies: filtered,
      activeCipherBuddy,
    });
  },

  onSelectCategory(e) {
    wx.vibrateShort({ type: 'light' });
    this.setData({ activeCategory: e.currentTarget.dataset.id });
    this.refreshList();
  },

  onJoinTap(e) {
    const id = e.currentTarget.dataset.id;
    const target = this.data.filteredBuddies.find((b) => b.id === id);
    if (!target || target.isExpired) return;
    if (target.joinedByMe) {
      this.setData({ activeCipherId: id });
      this.refreshList();
      return;
    }
    if (target.isFull) {
      wx.showToast({ title: '这个搭子已经满员啦～', icon: 'none' });
      return;
    }

    this.requireAuth('举手加入搭子并解锁接头暗号', () => {
      buddyStore.toggleJoin(id);
      wx.vibrateShort({ type: 'medium' });
      this.setData({ activeCipherId: id });
      this.refreshList();
      wx.showToast({ title: '举手成功，查看暗号 ✨', icon: 'none' });
    });
  },

  closeCipher() {
    this.setData({ activeCipherId: '', activeCipherBuddy: null, msgDraft: '' });
  },

  onMsgInput(e) {
    this.setData({ msgDraft: e.detail.value || '' });
  },

  onSendQuickPhrase(e) {
    const text = e.currentTarget.dataset.text;
    if (!this.data.activeCipherId || !text) return;
    buddyStore.sendQuickMessage(this.data.activeCipherId, text);
    wx.vibrateShort({ type: 'light' });
    this.refreshList();
  },

  onSendCustomMsg() {
    const text = (this.data.msgDraft || '').trim();
    if (!this.data.activeCipherId || !text) return;
    buddyStore.sendQuickMessage(this.data.activeCipherId, text);
    this.setData({ msgDraft: '' });
    this.refreshList();
  },

  onLeaveBuddy() {
    if (!this.data.activeCipherId) return;
    buddyStore.toggleJoin(this.data.activeCipherId);
    this.closeCipher();
    this.refreshList();
    wx.showToast({ title: '已悄悄退出，毫无负担～', icon: 'none' });
  },

  // ===== 发起 30 分钟限时搭子 =====
  onOpenCreate() {
    this.requireAuth('发起 30 分钟限时搭子', () => {
      this.setData({ createVisible: true });
    });
  },

  closeCreate() {
    this.setData({ createVisible: false });
  },

  onFTitle(e) { this.setData({ fTitle: e.detail.value || '' }); },
  onFCategory(e) { this.setData({ fCategory: e.currentTarget.dataset.id }); },
  onFLocation(e) { this.setData({ fLocation: e.detail.value || '' }); },
  onFCipher(e) { this.setData({ fCipher: e.detail.value || '' }); },
  onFDuration(e) { this.setData({ fDuration: Number(e.currentTarget.dataset.val) }); },
  onFMaxPeople(e) { this.setData({ fMaxPeople: Number(e.currentTarget.dataset.val) }); },
  onFSilent(e) { this.setData({ fIsSilent: Boolean(e.detail.value) }); },
  onFNote(e) { this.setData({ fNote: e.detail.value || '' }); },

  onSubmitCreate() {
    if (!this.data.fTitle.trim() || !this.data.fLocation.trim()) {
      wx.showToast({ title: '请填写活动名称和集合点', icon: 'none' });
      return;
    }
    const user = auth.getCurrentUser();
    const { created } = buddyStore.createBuddy({
      title: this.data.fTitle,
      category: this.data.fCategory,
      location: this.data.fLocation,
      durationMinutes: this.data.fDuration,
      maxPeople: this.data.fMaxPeople,
      cipher: this.data.fCipher,
      vibeNote: this.data.fNote,
      isSilent: this.data.fIsSilent,
      hostAlias: user ? user.nickname : '五合同学',
    });

    this.setData({
      createVisible: false,
      fTitle: '',
      fLocation: '',
      fCipher: '',
      fNote: '',
      activeCipherId: created.id,
    });
    this.refreshList();
    wx.vibrateLong();
    wx.showToast({ title: '🎉 限时搭子已上线', icon: 'none' });
  },
});
