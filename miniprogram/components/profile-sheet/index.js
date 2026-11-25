const auth = require('../../utils/auth');

Component({
  options: {
    styleIsolation: 'apply-shared',
  },

  properties: {
    visible: { type: Boolean, value: false },
    user: { type: Object, value: null },
  },

  data: {
    nickname: '',
    avatarUrl: '',
    uploading: false,
    presetAvatars: auth.PRESET_AVATARS,

    // 微信 / 邮箱双向绑定状态
    bindingWx: false,
    bindEmailOpen: false,
    bindEmailVal: '',
    bindCodeVal: '',
    bindCountdown: 0,
    sendingBindCode: false,
    submittingBindEmail: false,
    bindError: '',
  },

  lifetimes: {
    detached() {
      if (this._bindTimer) {
        clearInterval(this._bindTimer);
        this._bindTimer = null;
      }
    },
  },

  observers: {
    'visible, user'(visible, user) {
      if (visible && user) {
        this.setData({
          nickname: user.nickname || '',
          avatarUrl: user.avatarUrl || auth.PRESET_AVATARS[0],
          uploading: false,
        });
      } else if (!visible) {
        this.setData({
          bindEmailOpen: false,
          bindEmailVal: '',
          bindCodeVal: '',
          bindError: '',
          bindingWx: false,
          submittingBindEmail: false,
        });
      }
    },
  },

  methods: {
    noop() {},
    onClose() {
      this.triggerEvent('close');
    },
    onOpenAdminConsole() {
      this.onClose();
      wx.vibrateShort({ type: 'light' });
      wx.navigateTo({ url: '/pages/admin/admin' });
    },
    async onChooseAvatar(e) {
      const tempPath = e.detail && e.detail.avatarUrl;
      if (!tempPath) return;
      this.setData({ avatarUrl: tempPath, uploading: true });
      const permanentUrl = await auth.uploadLocalAvatar(tempPath);
      this.setData({ avatarUrl: permanentUrl || tempPath, uploading: false });
      wx.vibrateShort({ type: 'light' });
    },
    selectPreset(e) {
      this.setData({ avatarUrl: e.currentTarget.dataset.url });
    },
    onNickInput(e) {
      this.setData({ nickname: e.detail.value || '' });
    },

    /** 邮箱账号（含超管/管理员）一键绑定当前微信 */
    async onBindWeChat() {
      if (this.data.bindingWx) return;
      this.setData({ bindingWx: true, bindError: '' });
      try {
        const res = await auth.bindWeChat();
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: res.message || '绑定微信成功 ✨', icon: 'none', duration: 2400 });
        this.triggerEvent('updated', { user: res.user });
      } catch (err) {
        this.setData({ bindError: err.message || '绑定微信失败，请重试' });
        wx.showToast({ title: err.message || '绑定失败', icon: 'none' });
      } finally {
        this.setData({ bindingWx: false });
      }
    },

    /** 解除微信绑定（需已绑定邮箱） */
    onUnbindWeChat() {
      if (this.data.bindingWx) return;
      wx.showModal({
        title: '解除微信绑定',
        content: '解绑后将无法用此微信一键登录当前账号（仍可使用邮箱验证码登录），确定解绑吗？',
        confirmColor: '#FF3B30',
        success: async (r) => {
          if (!r.confirm) return;
          this.setData({ bindingWx: true, bindError: '' });
          try {
            const res = await auth.unbindWeChat();
            wx.showToast({ title: res.message || '已解除微信绑定', icon: 'none' });
            this.triggerEvent('updated', { user: res.user });
          } catch (err) {
            this.setData({ bindError: err.message || '解绑失败' });
            wx.showToast({ title: err.message || '解绑失败', icon: 'none' });
          } finally {
            this.setData({ bindingWx: false });
          }
        },
      });
    },

    /** 微信登录用户展开/收起绑定邮箱表单 */
    onToggleBindEmail() {
      this.setData({
        bindEmailOpen: !this.data.bindEmailOpen,
        bindError: '',
      });
    },
    onBindEmailInput(e) {
      this.setData({ bindEmailVal: e.detail.value || '', bindError: '' });
    },
    onBindCodeInput(e) {
      this.setData({
        bindCodeVal: (e.detail.value || '').replace(/\D/g, '').slice(0, 6),
        bindError: '',
      });
    },

    async onSendBindCode() {
      if (this.data.sendingBindCode || this.data.bindCountdown > 0) return;
      const email = (this.data.bindEmailVal || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.setData({ bindError: '请输入正确的邮箱地址' });
        return;
      }
      this.setData({ sendingBindCode: true, bindError: '' });
      try {
        await auth.sendEmailCode(email);
        wx.showToast({ title: '验证码已发至邮箱', icon: 'success' });
        this.setData({ bindCountdown: 60 });
        if (this._bindTimer) clearInterval(this._bindTimer);
        this._bindTimer = setInterval(() => {
          const next = this.data.bindCountdown - 1;
          if (next <= 0) {
            clearInterval(this._bindTimer);
            this._bindTimer = null;
            this.setData({ bindCountdown: 0 });
          } else {
            this.setData({ bindCountdown: next });
          }
        }, 1000);
      } catch (err) {
        this.setData({ bindError: err.message || '验证码发送失败' });
      } finally {
        this.setData({ sendingBindCode: false });
      }
    },

    async onConfirmBindEmail() {
      if (this.data.submittingBindEmail) return;
      const email = (this.data.bindEmailVal || '').trim().toLowerCase();
      const code = (this.data.bindCodeVal || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.setData({ bindError: '请输入正确的邮箱地址' });
        return;
      }
      if (code.length < 6) {
        this.setData({ bindError: '请输入 6 位邮箱验证码' });
        return;
      }

      this.setData({ submittingBindEmail: true, bindError: '' });
      try {
        const res = await auth.bindEmail(email, code);
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: res.message || '邮箱绑定成功 ✨', icon: 'none', duration: 2400 });
        this.setData({
          bindEmailOpen: false,
          bindEmailVal: '',
          bindCodeVal: '',
        });
        this.triggerEvent('updated', { user: res.user });
      } catch (err) {
        this.setData({ bindError: err.message || '绑定失败，请重试' });
      } finally {
        this.setData({ submittingBindEmail: false });
      }
    },

    async onSave(e) {
      if (this.data.uploading) return;
      const formNick = (e.detail && e.detail.value && e.detail.value.nickname) || '';
      const finalNick = (formNick || this.data.nickname || '').trim();
      if (!finalNick) {
        wx.showToast({ title: '昵称不能为空', icon: 'none' });
        return;
      }
      const updated = await auth.updateProfile({
        nickname: finalNick,
        avatarUrl: this.data.avatarUrl,
      });
      wx.showToast({ title: '资料已同步 ✨', icon: 'none' });
      this.triggerEvent('updated', { user: updated });
      this.onClose();
    },
    onLogout() {
      auth.logout();
      wx.showToast({ title: '已退出登录', icon: 'none' });
      this.triggerEvent('logout');
      this.onClose();
    },
  },
});
