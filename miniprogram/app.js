const auth = require('./utils/auth');

App({
  globalData: {
    statusBarHeight: 20,
    navBarHeight: 64,
    user: null,
  },

  onLaunch() {
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const statusBarHeight = win.statusBarHeight || 20;
      this.globalData.statusBarHeight = statusBarHeight;
      this.globalData.navBarHeight = statusBarHeight + 44;
    } catch (e) {
      this.globalData.statusBarHeight = 20;
      this.globalData.navBarHeight = 64;
    }

    this.globalData.user = auth.getCurrentUser();
  },
});
