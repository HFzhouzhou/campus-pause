const auth = require('./utils/auth');

App({
  globalData: {
    statusBarHeight: 20,
    menuTop: 24,
    menuHeight: 32,
    menuRightSpace: 100,
    navBarTotalHeight: 68,
    user: null,
    pendingEditSpot: null,
  },

  onLaunch() {
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const statusBarHeight = win.statusBarHeight || 20;
      const screenWidth = win.windowWidth || 375;

      let menuTop = statusBarHeight + 6;
      let menuHeight = 32;
      let menuRightSpace = 104;

      if (wx.getMenuButtonBoundingClientRect) {
        const rect = wx.getMenuButtonBoundingClientRect();
        if (rect && rect.height) {
          menuTop = rect.top;
          menuHeight = rect.height;
          menuRightSpace = screenWidth - rect.left + 10;
        }
      }

      this.globalData.statusBarHeight = statusBarHeight;
      this.globalData.menuTop = menuTop;
      this.globalData.menuHeight = menuHeight;
      this.globalData.menuRightSpace = menuRightSpace;
      this.globalData.navBarTotalHeight = menuTop + menuHeight + 8;
    } catch (e) {
      // keep safe defaults
    }

    this.globalData.user = auth.getCurrentUser();
    auth.refreshCurrentUser(true).then((fresh) => {
      if (fresh) this.globalData.user = fresh;
    });
  },
});
