Component({
  data: {
    selected: 0,
    hidden: false,
    list: [
      {
        pagePath: '/pages/map/map',
        text: '治愈地图',
        iconPath: '/assets/icons/map.png',
        selectedIconPath: '/assets/icons/map-active.png',
      },
      {
        pagePath: '/pages/vent/vent',
        text: '情绪粉碎',
        iconPath: '/assets/icons/vent.png',
        selectedIconPath: '/assets/icons/vent-active.png',
      },
      {
        pagePath: '/pages/microstep/microstep',
        text: '微步拆解',
        iconPath: '/assets/icons/steps.png',
        selectedIconPath: '/assets/icons/steps-active.png',
      },
      {
        pagePath: '/pages/buddy/buddy',
        text: '限时搭子',
        iconPath: '/assets/icons/buddy.png',
        selectedIconPath: '/assets/icons/buddy-active.png',
      },
    ],
  },
  methods: {
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset;
      if (index === this.data.selected) return;
      wx.vibrateShort({ type: 'light' });
      wx.switchTab({ url: path });
    },
  },
});
