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
  },

  observers: {
    'visible, user'(visible, user) {
      if (visible && user) {
        this.setData({
          nickname: user.nickname || '',
          avatarUrl: user.avatarUrl || auth.PRESET_AVATARS[0],
          uploading: false,
        });
      }
    },
  },

  methods: {
    noop() {},
    onClose() {
      this.triggerEvent('close');
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
