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
    menuTop: 24,
    menuHeight: 32,
    menuRightSpace: 104,
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
    cipherRemaining: '30:00',
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
    submittingCreate: false,

    // 管理员编辑搭子弹窗
    editVisible: false,
    editId: '',
    eTitle: '',
    eCategory: 'walk',
    eLocation: '',
    eCipher: '',
    eHostAlias: '',
    eDuration: 30,
    eMaxPeople: 3,
    eIsSilent: true,
    eResetTimer: false,
    eNote: '',
    savingEdit: false,

    // 管理员编辑频道消息弹窗
    editMsgVisible: false,
    editMsgId: '',
    editMsgBuddyId: '',
    editMsgSender: '',
    editMsgText: '',
  },

  onLoad() {
    const app = getApp();
    const g = (app && app.globalData) || {};
    this.setData({
      menuTop: g.menuTop || 24,
      menuHeight: g.menuHeight || 32,
      menuRightSpace: g.menuRightSpace || 104,
      user: auth.getCurrentUser(),
    });
    this.refreshList(true);
    this.syncServerBuddies(true);
  },

  onShow() {
    this.syncTabBar();
    this.setData({ user: auth.getCurrentUser() });
    auth.refreshCurrentUser().then((fresh) => {
      if (fresh) this.setData({ user: fresh });
    });
    this.syncServerBuddies(true);
    this.startClock();
  },

  onHide() {
    if (this._clock) clearInterval(this._clock);
  },

  onUnload() {
    if (this._clock) clearInterval(this._clock);
  },

  noop() {},

  syncTabBar() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const hasModal = Boolean(
        this.data.activeCipherBuddy ||
          this.data.createVisible ||
          this.data.editVisible ||
          this.data.editMsgVisible ||
          this.data.authVisible ||
          this.data.profileVisible
      );
      this.getTabBar().setData({ selected: 3, hidden: hasModal });
    }
  },

  async syncServerBuddies(updateCipher = false) {
    try {
      await buddyStore.syncFromServer();
      this.refreshList(updateCipher);
    } catch (e) {
      // 保留本地缓存
    }
  },

  openAdminConsole() {
    wx.vibrateShort({ type: 'light' });
    wx.navigateTo({ url: '/pages/admin/admin?tab=buddies' });
  },

  /** 每秒仅轻量化刷新倒计时字段，避免重建整个弹窗对象导致聊天区抖动 */
  startClock() {
    if (this._clock) clearInterval(this._clock);
    this._clock = setInterval(() => {
      const now = Date.now();
      const patch = {};
      this.data.filteredBuddies.forEach((b, idx) => {
        patch[`filteredBuddies[${idx}].remainingText`] = formatCountdown(b.expiresAt, now);
        patch[`filteredBuddies[${idx}].isExpired`] = b.expiresAt <= now;
      });
      if (this.data.activeCipherBuddy) {
        patch.cipherRemaining = formatCountdown(this.data.activeCipherBuddy.expiresAt, now);
      }
      if (Object.keys(patch).length > 0) {
        this.setData(patch);
      }
    }, 1000);
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
    this.syncServerBuddies(true);
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
    this.syncServerBuddies(true);
  },

  refreshList(updateCipher) {
    const now = Date.now();
    const raw = buddyStore.getAll();
    const cat = this.data.activeCategory;
    const me = auth.getCurrentUser();

    const decorate = (b) => {
      const catMeta =
        buddyStore.BUDDY_CATEGORIES.find((c) => c.id === b.category) ||
        buddyStore.BUDDY_CATEGORIES[0];
      return {
        ...b,
        catEmoji: catMeta.emoji || '✨',
        hostInitial: (b.hostAlias || '同').slice(0, 1),
        remainingText: formatCountdown(b.expiresAt, now),
        isExpired: b.expiresAt <= now,
        isFull: b.joinedCount >= b.maxPeople && !b.joinedByMe,
        quickMessages: (b.quickMessages || []).map((m) => ({
          ...m,
          isMe:
            Boolean(m.isMe) ||
            (m.sender || '').startsWith('我') ||
            Boolean(me && m.senderUid && m.senderUid === me.uid),
        })),
      };
    };

    const filtered = raw
      .filter((b) => cat === 'all' || b.category === cat)
      .map(decorate);

    const payload = { rawBuddies: raw, filteredBuddies: filtered };
    if (updateCipher) {
      const cipher = this.data.activeCipherId
        ? raw.filter((b) => b.id === this.data.activeCipherId).map(decorate)[0] || null
        : null;
      payload.activeCipherBuddy = cipher;
      payload.cipherRemaining = cipher ? cipher.remainingText : '00:00';
    }
    this.setData(payload, () => this.syncTabBar());
  },

  onSelectCategory(e) {
    wx.vibrateShort({ type: 'light' });
    this.setData({ activeCategory: e.currentTarget.dataset.id });
    this.refreshList(false);
  },

  onJoinTap(e) {
    const id = e.currentTarget.dataset.id;
    const target = this.data.filteredBuddies.find((b) => b.id === id);
    if (!target || target.isExpired) return;
    if (target.joinedByMe) {
      this.setData({ activeCipherId: id });
      this.refreshList(true);
      return;
    }
    if (target.isFull) {
      wx.showToast({ title: '这个搭子已经满员啦～', icon: 'none' });
      return;
    }

    this.requireAuth('举手加入搭子并解锁接头暗号', async () => {
      try {
        await buddyStore.toggleJoin(id);
        wx.vibrateShort({ type: 'medium' });
        this.setData({ activeCipherId: id });
        this.refreshList(true);
        wx.showToast({ title: '举手成功，查看暗号 ✨', icon: 'none' });
      } catch (err) {
        wx.showToast({ title: err.message || '加入失败', icon: 'none' });
      }
    });
  },

  closeCipher() {
    this.setData(
      { activeCipherId: '', activeCipherBuddy: null, msgDraft: '' },
      () => this.syncTabBar()
    );
  },

  onMsgInput(e) { this.setData({ msgDraft: e.detail.value || '' }); },

  async onSendQuickPhrase(e) {
    const text = e.currentTarget.dataset.text;
    if (!this.data.activeCipherId || !text) return;
    try {
      await buddyStore.sendQuickMessage(this.data.activeCipherId, text);
      wx.vibrateShort({ type: 'light' });
      this.refreshList(true);
    } catch (err) {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    }
  },

  async onSendCustomMsg() {
    const text = (this.data.msgDraft || '').trim();
    if (!this.data.activeCipherId || !text) return;
    try {
      await buddyStore.sendQuickMessage(this.data.activeCipherId, text);
      this.setData({ msgDraft: '' });
      this.refreshList(true);
    } catch (err) {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    }
  },

  async onLeaveBuddy() {
    if (!this.data.activeCipherId) return;
    try {
      await buddyStore.toggleJoin(this.data.activeCipherId);
      this.closeCipher();
      this.refreshList(false);
      wx.showToast({ title: '已悄悄退出，毫无负担～', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  onOpenCreate() {
    this.requireAuth('发起 30 分钟限时搭子', () => {
      this.setData({ createVisible: true }, () => this.syncTabBar());
    });
  },

  closeCreate() {
    this.setData({ createVisible: false }, () => this.syncTabBar());
  },

  onFTitle(e) { this.setData({ fTitle: e.detail.value || '' }); },
  onFCategory(e) { this.setData({ fCategory: e.currentTarget.dataset.id }); },
  onFLocation(e) { this.setData({ fLocation: e.detail.value || '' }); },
  onFCipher(e) { this.setData({ fCipher: e.detail.value || '' }); },
  onFDuration(e) { this.setData({ fDuration: Number(e.currentTarget.dataset.val) }); },
  onFMaxPeople(e) { this.setData({ fMaxPeople: Number(e.currentTarget.dataset.val) }); },
  onFSilent(e) { this.setData({ fIsSilent: Boolean(e.detail.value) }); },
  onFNote(e) { this.setData({ fNote: e.detail.value || '' }); },

  async onSubmitCreate() {
    if (this.data.submittingCreate) return;
    if (!this.data.fTitle.trim() || !this.data.fLocation.trim()) {
      wx.showToast({ title: '请填写活动名称和集合点', icon: 'none' });
      return;
    }
    this.setData({ submittingCreate: true });
    try {
      const user = auth.getCurrentUser();
      const { created } = await buddyStore.createBuddy({
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
      this.refreshList(true);
      wx.vibrateLong();
      wx.showToast({ title: '🎉 限时搭子已上线', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '发布失败', icon: 'none' });
    } finally {
      this.setData({ submittingCreate: false });
    }
  },

  // ==================== 管理员专属：编辑/删除搭子与频道消息 ====================

  openEditBuddy(e) {
    const user = auth.getCurrentUser();
    if (!auth.isAdmin(user)) return;
    const id = e.currentTarget.dataset.id;
    const b = this.data.rawBuddies.find((item) => item.id === id);
    if (!b) return;
    wx.vibrateShort({ type: 'light' });
    this.setData(
      {
        editVisible: true,
        editId: b.id,
        eTitle: b.title || '',
        eCategory: b.category || 'walk',
        eLocation: b.location || '',
        eCipher: b.cipher || '',
        eHostAlias: b.hostAlias || '',
        eDuration: b.durationMinutes || 30,
        eMaxPeople: b.maxPeople || 3,
        eIsSilent: Boolean(b.isSilent),
        eResetTimer: false,
        eNote: b.vibeNote || '',
      },
      () => this.syncTabBar()
    );
  },

  closeEditBuddy() {
    this.setData({ editVisible: false }, () => this.syncTabBar());
  },

  onETitle(e) { this.setData({ eTitle: e.detail.value || '' }); },
  onECategory(e) { this.setData({ eCategory: e.currentTarget.dataset.id }); },
  onELocation(e) { this.setData({ eLocation: e.detail.value || '' }); },
  onECipher(e) { this.setData({ eCipher: e.detail.value || '' }); },
  onEHost(e) { this.setData({ eHostAlias: e.detail.value || '' }); },
  onEDuration(e) { this.setData({ eDuration: Number(e.currentTarget.dataset.val) }); },
  onEMaxPeople(e) { this.setData({ eMaxPeople: Number(e.currentTarget.dataset.val) }); },
  onESilent(e) { this.setData({ eIsSilent: Boolean(e.detail.value) }); },
  onEResetTimer(e) { this.setData({ eResetTimer: Boolean(e.detail.value) }); },
  onENote(e) { this.setData({ eNote: e.detail.value || '' }); },

  async onSubmitEditBuddy() {
    if (this.data.savingEdit) return;
    if (!this.data.eTitle.trim() || !this.data.eLocation.trim()) {
      wx.showToast({ title: '请填写活动名称和集合点', icon: 'none' });
      return;
    }
    this.setData({ savingEdit: true });
    try {
      await buddyStore.updateBuddy(this.data.editId, {
        title: this.data.eTitle,
        category: this.data.eCategory,
        location: this.data.eLocation,
        cipher: this.data.eCipher,
        hostAlias: this.data.eHostAlias,
        durationMinutes: this.data.eDuration,
        maxPeople: this.data.eMaxPeople,
        isSilent: this.data.eIsSilent,
        vibeNote: this.data.eNote,
        resetCountdown: this.data.eResetTimer,
      });
      this.setData({ editVisible: false }, () => this.syncTabBar());
      this.refreshList(true);
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: '搭子内容已更新 ✨', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ savingEdit: false });
    }
  },

  onDeleteBuddy() {
    const id = this.data.editId;
    if (!id) return;
    wx.showModal({
      title: '删除限时搭子',
      content: '确认永久删除这条用户发布的搭子吗？',
      confirmColor: '#FF3B30',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await buddyStore.deleteBuddy(id);
          this.setData(
            {
              editVisible: false,
              activeCipherId: this.data.activeCipherId === id ? '' : this.data.activeCipherId,
              activeCipherBuddy:
                this.data.activeCipherId === id ? null : this.data.activeCipherBuddy,
            },
            () => this.syncTabBar()
          );
          this.refreshList(true);
          wx.showToast({ title: '已删除该搭子', icon: 'none' });
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  openEditMsg(e) {
    const user = auth.getCurrentUser();
    if (!auth.isAdmin(user) || !this.data.activeCipherBuddy) return;
    const mid = e.currentTarget.dataset.id;
    const msg = (this.data.activeCipherBuddy.quickMessages || []).find((m) => m.id === mid);
    if (!msg) return;
    this.setData(
      {
        editMsgVisible: true,
        editMsgId: msg.id,
        editMsgBuddyId: this.data.activeCipherBuddy.id,
        editMsgSender: msg.sender || '',
        editMsgText: msg.text || '',
      },
      () => this.syncTabBar()
    );
  },

  closeEditMsg() {
    this.setData({ editMsgVisible: false }, () => this.syncTabBar());
  },

  onEditMsgSender(e) { this.setData({ editMsgSender: e.detail.value || '' }); },
  onEditMsgText(e) { this.setData({ editMsgText: e.detail.value || '' }); },

  async onSaveEditMsg() {
    if (!this.data.editMsgText.trim()) {
      wx.showToast({ title: '消息内容不能为空', icon: 'none' });
      return;
    }
    try {
      await buddyStore.updateQuickMessage(this.data.editMsgBuddyId, this.data.editMsgId, {
        sender: this.data.editMsgSender,
        text: this.data.editMsgText,
      });
      this.setData({ editMsgVisible: false }, () => this.syncTabBar());
      this.refreshList(true);
      wx.showToast({ title: '消息已更新 ✨', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  },

  onDeleteMsg(e) {
    const user = auth.getCurrentUser();
    if (!auth.isAdmin(user) || !this.data.activeCipherBuddy) return;
    const mid = e.currentTarget.dataset.id;
    const bid = this.data.activeCipherBuddy.id;
    wx.showModal({
      title: '删除频道消息',
      content: '确认删除这条频道消息？',
      confirmColor: '#FF3B30',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await buddyStore.deleteQuickMessage(bid, mid);
          this.refreshList(true);
          wx.showToast({ title: '已删除消息', icon: 'none' });
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      },
    });
  },
});
