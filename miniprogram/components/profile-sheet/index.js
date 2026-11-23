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
    presetAvatars: auth.PRESET_AVATARS,
  },

  observers: {
    'visible, user'(visible, user) {
      if (visible && user) {
        this.setData({
          nickname: user.nickname || '',
          avatarUrl: user.avatarUrl || auth.PRESET_AVATARS[0],
        });
      }
    },
  },

  methods: {
    noop() {},
    onClose() {
      this.triggerEvent('close');
    },
    onChooseAvatar(e) {
      if (e.detail && e.detail.avatarUrl) {
        this.setData({ avatarUrl: e.detail.avatarUrl });
      }
    },
    selectPreset(e) {
      this.setData({ avatarUrl: e.currentTarget.dataset.url });
    },
    onNickInput(e) {
      this.setData({ nickname: e.detail.value || '' });
    },
    async onSave() {
      if (!this.data.nickname.trim()) {
        wx.showToast({ title: '昵称不能为空', icon: 'none' });
        return;
      }
      const updated = await auth.updateProfile({
        nickname: this.data.nickname,
        avatarUrl: this.data.avatarUrl,
      });
      wx.showToast({ title: '资料已更新 ✨', icon: 'none' });
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
