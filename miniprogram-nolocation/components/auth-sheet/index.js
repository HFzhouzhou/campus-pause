const auth = require('../../utils/auth');

Component({
  options: {
    styleIsolation: 'apply-shared',
  },

  properties: {
    visible: { type: Boolean, value: false },
    reason: { type: String, value: '' },
  },

  data: {
    step: 'main', // 'main' | 'wechat_profile'
    mode: 'wechat',
    email: '',
    code: '',
    nickname: '',
    wxNickName: '',
    wxAvatarUrl: auth.PRESET_AVATARS[0],
    hasCustomAvatar: false,
    uploadingAvatar: false,
    presetAvatars: auth.PRESET_AVATARS,
    loggedUser: null,
    countdown: 0,
    sending: false,
    submitting: false,
    errorMsg: '',
  },

  observers: {
    visible(v) {
      if (!v) {
        this.setData({ step: 'main', errorMsg: '', submitting: false });
      }
    },
  },

  lifetimes: {
    detached() {
      if (this._timer) clearInterval(this._timer);
    },
  },

  methods: {
    noop() {},
    onMaskTap() {
      if (this.data.step === 'wechat_profile') {
        this.onSkipProfile();
      } else {
        this.onClose();
      }
    },
    onClose() {
      this.setData({ errorMsg: '', step: 'main' });
      this.triggerEvent('close');
    },
    switchMode(e) {
      this.setData({ mode: e.currentTarget.dataset.mode, errorMsg: '' });
    },

    /** 微信官方选择头像回调：立刻预览并自动上传到 HTTPS 服务器永久保存 */
    async onChooseAvatar(e) {
      const tempPath = e.detail && e.detail.avatarUrl;
      if (!tempPath) return;
      this.setData({
        wxAvatarUrl: tempPath,
        hasCustomAvatar: true,
        uploadingAvatar: true,
        errorMsg: '',
      });
      const permanentUrl = await auth.uploadLocalAvatar(tempPath);
      this.setData({
        wxAvatarUrl: permanentUrl || tempPath,
        uploadingAvatar: false,
      });
      wx.vibrateShort({ type: 'light' });
    },

    onSelectPresetAvatar(e) {
      this.setData({
        wxAvatarUrl: e.currentTarget.dataset.url,
        hasCustomAvatar: true,
      });
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

    /** 微信一键登录：老用户秒登，新用户自动切至头像昵称 1 秒同步页 */
    async onWeChatOneTap(e) {
      if (this.data.submitting || this.data.uploadingAvatar) return;
      const formNick = (e && e.detail && e.detail.value && e.detail.value.wxNickName) || '';
      const nickToUse = (formNick || this.data.wxNickName || '').trim();
      if (nickToUse && nickToUse !== this.data.wxNickName) {
        this.setData({ wxNickName: nickToUse });
      }
      this.setData({ submitting: true, errorMsg: '' });
      try {
        const res = await auth.loginWithWeChat({
          nickName: nickToUse,
          avatarUrl: this.data.hasCustomAvatar ? this.data.wxAvatarUrl : '',
        });
        wx.vibrateShort({ type: 'medium' });

        // 如果用户还没自定义微信头像/昵称（微信官方已回收静默获取），自动弹出 1 步同步引导
        const alreadyFilled = Boolean(nickToUse && this.data.hasCustomAvatar);
        if (res.needsProfile && !alreadyFilled) {
          this.setData({
            step: 'wechat_profile',
            loggedUser: res.user,
            wxAvatarUrl: this.data.hasCustomAvatar
              ? this.data.wxAvatarUrl
              : res.user.avatarUrl,
            wxNickName: nickToUse || '',
          });
          return;
        }

        wx.showToast({ title: `欢迎回来，${res.user.nickname}`, icon: 'none' });
        this.triggerEvent('success', { user: res.user });
      } catch (err) {
        this.setData({
          errorMsg: err.message || '微信登录失败，请检查网络或切换邮箱验证码登录',
        });
      } finally {
        this.setData({ submitting: false });
      }
    },

    /** Step 2 表单提交（使用 form-type="submit" 确保 100% 捕获微信键盘自动填充的昵称） */
    async onCompleteWeChatProfile(e) {
      if (this.data.submitting || this.data.uploadingAvatar) return;
      const formNick = (e.detail && e.detail.value && e.detail.value.nickname) || '';
      const finalNick = (formNick || this.data.wxNickName || '').trim();

      this.setData({ submitting: true, errorMsg: '' });
      try {
        const updated = await auth.updateProfile({
          nickname: finalNick || (this.data.loggedUser && this.data.loggedUser.nickname) || '五合同学',
          avatarUrl: this.data.wxAvatarUrl,
        });
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: `欢迎你，${updated.nickname} ✨`, icon: 'none' });
        this.setData({ step: 'main' });
        this.triggerEvent('success', { user: updated });
      } catch (err) {
        this.setData({ errorMsg: err.message || '保存失败，请重试' });
      } finally {
        this.setData({ submitting: false });
      }
    },

    onSkipProfile() {
      const user = this.data.loggedUser || auth.getCurrentUser();
      this.setData({ step: 'main' });
      if (user) {
        wx.showToast({ title: `欢迎你，${user.nickname}`, icon: 'none' });
        this.triggerEvent('success', { user });
      } else {
        this.onClose();
      }
    },

    async onSendCode() {
      if (this.data.sending || this.data.countdown > 0) return;
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
      if (this.data.submitting || !this.data.email || this.data.code.length < 6) return;
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
  },
});
