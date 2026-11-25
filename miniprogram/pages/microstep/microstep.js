const engine = require('../../utils/microstepEngine');
const auth = require('../../utils/auth');

function formatClock(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
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

    quickScenarios: engine.QUICK_SCENARIOS,
    promptInput: '',
    isStreaming: false,
    streamStage: '正在定位任务卡点…',
    streamProgress: 0,
    streamPreview: '',
    history: [],
    activePlan: null,
    completedCount: 0,
    progressPercent: 0,

    timerStep: null,
    timerRemaining: 600,
    timerText: '10:00',
    timerRunning: false,
    timerDone: false,

    editingStep: null,
    editTitle: '',
    editDetail: '',
  },

  onLoad() {
    const app = getApp();
    const g = (app && app.globalData) || {};
    let history = engine.getHistory();
    // 首次进入预置一个逼真示例计划，让页面信息充实、上手即体验
    if (history.length === 0) {
      const init = engine.createBreakdown('专四/四六级单词听力背不完');
      history = init.history;
    }

    this.setData({
      menuTop: g.menuTop || 24,
      menuHeight: g.menuHeight || 32,
      menuRightSpace: g.menuRightSpace || 104,
      user: auth.getCurrentUser(),
    });
    this.syncPlans(history, history[0] ? history[0].id : null);
  },

  onShow() {
    this.syncTabBar();
    this.setData({ user: auth.getCurrentUser() });
    auth.refreshCurrentUser().then((fresh) => {
      if (fresh) this.setData({ user: fresh });
    });
  },

  openAdminConsole() {
    wx.vibrateShort({ type: 'light' });
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
    if (this._streamTimer) clearInterval(this._streamTimer);
  },

  noop() {},

  syncTabBar() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const hasModal = Boolean(
        this.data.timerStep ||
          this.data.editingStep ||
          this.data.authVisible ||
          this.data.profileVisible
      );
      this.getTabBar().setData({ selected: 2, hidden: hasModal });
    }
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
  },

  syncPlans(history, activeId) {
    const active = history.find((p) => p.id === activeId) || history[0] || null;
    const completedCount = active ? active.steps.filter((s) => s.completed).length : 0;
    const total = active ? Math.max(1, active.steps.length) : 1;
    this.setData({
      history,
      activePlan: active,
      completedCount,
      progressPercent: Math.round((completedCount / total) * 100),
    });
  },

  onPromptInput(e) {
    this.setData({ promptInput: e.detail.value || '' });
  },

  onTapScenario(e) {
    if (this.data.isStreaming) return;
    const text = e.currentTarget.dataset.text;
    this.setData({ promptInput: text });
    this.onGenerate();
  },

  onGenerate() {
    const prompt = (this.data.promptInput || '').trim();
    if (!prompt || this.data.isStreaming) return;
    this.requireAuth('拆解 10 分钟微行动并保存进度', () => {
      this.runStreamingBreakdown(prompt);
    });
  },

  /** 类流式打字机逐字拆解动效（纯本地规则引擎驱动，兼顾仪式感与零备案风险） */
  runStreamingBreakdown(prompt) {
    if (this._streamTimer) clearInterval(this._streamTimer);
    wx.vibrateShort({ type: 'medium' });

    const { plan, history } = engine.createBreakdown(prompt);
    const fullScript = [
      `💭 共鸣安抚：${plan.empathyNote}`,
      `01 · ${plan.steps[0].title}（10 分钟）`,
      `02 · ${plan.steps[1].title}（10 分钟）`,
      `03 · ${plan.steps[2].title}（10 分钟）`,
    ].join('\n');

    let cursor = 0;
    const totalLen = fullScript.length;
    this.setData({
      isStreaming: true,
      streamStage: '正在识别焦虑卡点…',
      streamProgress: 10,
      streamPreview: '',
    });

    this._streamTimer = setInterval(() => {
      cursor = Math.min(totalLen, cursor + 3);
      const ratio = cursor / Math.max(1, totalLen);
      const pct = Math.min(98, Math.round(12 + ratio * 86));
      let stage = '正在识别焦虑卡点…';
      if (ratio > 0.35 && ratio <= 0.72) {
        stage = '正在切分 3 个 10 分钟微行动…';
      } else if (ratio > 0.72) {
        stage = '正在封装专注行动清单…';
      }

      this.setData({
        streamPreview: fullScript.slice(0, cursor),
        streamProgress: pct,
        streamStage: stage,
      });

      if (cursor >= totalLen) {
        clearInterval(this._streamTimer);
        this._streamTimer = null;
        setTimeout(() => {
          this.setData({
            isStreaming: false,
            streamProgress: 100,
            streamPreview: '',
          });
          this.syncPlans(history, plan.id);
          wx.vibrateShort({ type: 'light' });
          wx.showToast({ title: '已切分为 3 个 10 分钟微步骤 ✨', icon: 'none' });
        }, 180);
      }
    }, 28);
  },

  onSelectHistory(e) {
    this.syncPlans(this.data.history, e.currentTarget.dataset.id);
  },

  onToggleStep(e) {
    if (!this.data.activePlan) return;
    const stepId = e.currentTarget.dataset.id;
    const nextHistory = engine.toggleStepCompleted(this.data.activePlan.id, stepId);
    wx.vibrateShort({ type: 'light' });
    this.syncPlans(nextHistory, this.data.activePlan.id);
  },

  openTimer(e) {
    if (!this.data.activePlan) return;
    const stepId = e.currentTarget.dataset.id;
    const step = this.data.activePlan.steps.find((s) => s.id === stepId);
    if (!step) return;

    const secs = (step.durationMinutes || 10) * 60;
    this.setData(
      {
        timerStep: step,
        timerRemaining: secs,
        timerText: formatClock(secs),
        timerRunning: true,
        timerDone: false,
      },
      () => this.syncTabBar()
    );
    this.startTimerTick();
  },

  startTimerTick() {
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => {
      if (!this.data.timerRunning || this.data.timerDone) return;
      const next = this.data.timerRemaining - 1;
      if (next <= 0) {
        this.finishTimerNow();
      } else {
        this.setData({ timerRemaining: next, timerText: formatClock(next) });
      }
    }, 1000);
  },

  toggleTimerRun() {
    this.setData({ timerRunning: !this.data.timerRunning });
  },

  onQuickDemo5s() {
    this.setData({ timerRemaining: 5, timerText: '00:05', timerRunning: true });
  },

  finishTimerNow() {
    if (this._timer) clearInterval(this._timer);
    wx.vibrateLong();
    const step = this.data.timerStep;
    if (step && this.data.activePlan && !step.completed) {
      const nextHistory = engine.toggleStepCompleted(this.data.activePlan.id, step.id);
      this.syncPlans(nextHistory, this.data.activePlan.id);
    }
    this.setData({
      timerRunning: false,
      timerDone: true,
      timerRemaining: 0,
      timerText: '00:00',
    });
  },

  closeTimer() {
    if (this._timer) clearInterval(this._timer);
    this.setData({ timerStep: null, timerRunning: false }, () => this.syncTabBar());
  },

  openEditStep(e) {
    if (!this.data.activePlan) return;
    const step = this.data.activePlan.steps.find((s) => s.id === e.currentTarget.dataset.id);
    if (!step) return;
    this.setData(
      {
        editingStep: step,
        editTitle: step.title,
        editDetail: step.detail,
      },
      () => this.syncTabBar()
    );
  },
  closeEditStep() {
    this.setData({ editingStep: null }, () => this.syncTabBar());
  },
  onEditTitle(e) { this.setData({ editTitle: e.detail.value || '' }); },
  onEditDetail(e) { this.setData({ editDetail: e.detail.value || '' }); },
  saveEditStep() {
    if (!this.data.activePlan || !this.data.editingStep) return;
    const nextHistory = engine.updateStepContent(
      this.data.activePlan.id,
      this.data.editingStep.id,
      this.data.editTitle,
      this.data.editDetail
    );
    this.syncPlans(nextHistory, this.data.activePlan.id);
    this.setData({ editingStep: null }, () => this.syncTabBar());
    wx.showToast({ title: '微步骤已更新 ✨', icon: 'none' });
  },
});
