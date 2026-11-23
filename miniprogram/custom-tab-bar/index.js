Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/map/map', text: '治愈地图', icon: '🧭' },
      { pagePath: '/pages/vent/vent', text: '情绪粉碎', icon: '🫧' },
      { pagePath: '/pages/microstep/microstep', text: '微步拆解', icon: '✦' },
      { pagePath: '/pages/buddy/buddy', text: '限时搭子', icon: '🤝' },
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
