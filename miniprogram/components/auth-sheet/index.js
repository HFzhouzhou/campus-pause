const auth = require('../../utils/auth');

Component({
  properties: {
    visible: { type: Boolean, value: false },
    reason: { type: String, value: '' },
  },

  data: {
    mode: 'email',
    email: '',
    code: '',
    nickname: '',
    wxNickName: '',
    wxAvatarUrl: auth.PRESET_AVATARS[0],
    countdown: 0,
    sending: false,
    submitting: false,
    errorMsg: '',
  },

  lifetimes: {
    detached() {
      if (this._timer) clearInterval(this._timer);
    },
  },

  methods: {
    noop() {},
    onMaskTap() {
      this.onClose();
    },
    onClose() {
      this.setData({ errorMsg: '' });
      this.triggerEvent('close');
    },
    switchMode(e) {
      this.setData({ mode: e.currentTarget.dataset.mode, errorMsg: '' });
    },
    onChooseAvatar(e) {
      if (e.detail && e.detail.avatarUrl) {
        this.setData({ wxAvatarUrl: e.detail.avatarUrl });
      }
    },
    onWxNickInput(e) {
      this.setData({ wxNickName: e.detail.value || '' });
    },
    onEmailInput(e) {
      this.setData({ email: e.detail.value || '' });
    },
    onCodeInput(e) {
      this.setData({ code: (e.detail.value || '').replace(/\D/g, '').slice(0, 6) });
    },
    onNickInput(e) {
      this.setData({ nickname: e.detail.value || '' });
    },

    async onSendCode() {
      const email = this.data.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.setData({ errorMsg: '请输入正确的邮箱地址' });
        return;
      }
      this.setData({ sending: true, errorMsg: '' });
      try {
        await auth.sendEmailCode(email);
        wx.showToast({ title: '验证码已发至邮箱', icon: 'success' });
        this.setData({ countdown: 60 });
        if (this._timer) clearInterval(this._timer);
        this._timer = setInterval(() => {
          const next = this.data.countdown - 1;
          if (next <= 0) {
            clearInterval(this._timer);
            this._timer = null;
            this.setData({ countdown: 0 });
          } else {
            this.setData({ countdown: next });
          }
        }, 1000);
      } catch (err) {
        this.setData({ errorMsg: err.message || '验证码发送失败' });
      } finally {
        this.setData({ sending: false });
      }
    },

    async onEmailLogin() {
      this.setData({ submitting: true, errorMsg: '' });
      try {
        const user = await auth.verifyEmailAndLogin(
          this.data.email,
          this.data.code,
          this.data.nickname
        );
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: `欢迎回来，${user.nickname}`, icon: 'none' });
        this.setData({ code: '' });
        this.triggerEvent('success', { user });
      } catch (err) {
        this.setData({ errorMsg: err.message || '验证失败' });
      } finally {
        this.setData({ submitting: false });
      }
    },

    async onWeChatLogin() {
      this.setData({ submitting: true, errorMsg: '' });
      try {
        const user = await auth.loginWithWeChat({
          nickName: this.data.wxNickName,
          avatarUrl: this.data.wxAvatarUrl,
        });
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: `欢迎回来，${user.nickname}`, icon: 'none' });
        this.triggerEvent('success', { user });
      } catch (err) {
        this.setData({
          errorMsg: err.message || '请在服务器配置好小程序 AppID/AppSecret 后重试，或先用邮箱验证码登录',
        });
      } finally {
        this.setData({ submitting: false });
      }
    },
  },
});
