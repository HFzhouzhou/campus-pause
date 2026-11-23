const engine = require('../../utils/microstepEngine');
const auth = require('../../utils/auth');

function formatClock(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

Page({
  data: {
    statusBarHeight: 20,
    user: null,
    authVisible: false,
    authReason: '',
    profileVisible: false,

    quickScenarios: engine.QUICK_SCENARIOS,
    promptInput: '',
    history: [],
    activePlan: null,
    completedCount: 0,
    progressPercent: 0,

    // 专注倒计时
    timerStep: null,
    timerRemaining: 600,
    timerText: '10:00',
    timerRunning: false,
    timerDone: false,

    // 微调步骤
    editingStep: null,
    editTitle: '',
    editDetail: '',
  },

  onLoad() {
    const app = getApp();
    const history = engine.getHistory();
    this.setData({
      statusBarHeight: (app && app.globalData && app.globalData.statusBarHeight) || 20,
      user: auth.getCurrentUser(),
    });
    this.syncPlans(history, history[0] ? history[0].id : null);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.setData({ user: auth.getCurrentUser() });
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
  },

  noop() {},

  requireAuth(reason, action) {
    if (auth.getCurrentUser()) {
      action();
      return;
    }
    this._pendingAction = action;
    this.setData({ authVisible: true, authReason: reason });
  },
  openAuthManual() {
    this._pendingAction = null;
    this.setData({ authVisible: true, authReason: '' });
  },
  closeAuth() {
    this._pendingAction = null;
    this.setData({ authVisible: false });
  },
  onAuthSuccess(e) {
    this.setData({ user: e.detail.user, authVisible: false });
    if (this._pendingAction) {
      const fn = this._pendingAction;
      this._pendingAction = null;
      setTimeout(fn, 150);
    }
  },
  openProfile() {
    this.setData({ profileVisible: true });
  },
  closeProfile() {
    this.setData({ profileVisible: false });
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
    const text = e.currentTarget.dataset.text;
    this.setData({ promptInput: text });
    this.onGenerate();
  },

  onGenerate() {
    const prompt = (this.data.promptInput || '').trim();
    if (!prompt) return;
    this.requireAuth('拆解 10 分钟微行动并保存进度', () => {
      wx.vibrateShort({ type: 'medium' });
      const { plan, history } = engine.createBreakdown(prompt);
      this.syncPlans(history, plan.id);
      wx.showToast({ title: '已切分为 3 个 10 分钟微步骤 ✨', icon: 'none' });
    });
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

  // ===== 10 分钟微行动专注计时器 =====
  openTimer(e) {
    if (!this.data.activePlan) return;
    const stepId = e.currentTarget.dataset.id;
    const step = this.data.activePlan.steps.find((s) => s.id === stepId);
    if (!step) return;

    const secs = (step.durationMinutes || 10) * 60;
    this.setData({
      timerStep: step,
      timerRemaining: secs,
      timerText: formatClock(secs),
      timerRunning: true,
      timerDone: false,
    });
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
    this.setData({ timerRunning: false, timerDone: true, timerRemaining: 0, timerText: '00:00' });
  },

  closeTimer() {
    if (this._timer) clearInterval(this._timer);
    this.setData({ timerStep: null, timerRunning: false });
  },

  // ===== 自定义微调步骤 =====
  openEditStep(e) {
    if (!this.data.activePlan) return;
    const step = this.data.activePlan.steps.find((s) => s.id === e.currentTarget.dataset.id);
    if (!step) return;
    this.setData({
      editingStep: step,
      editTitle: step.title,
      editDetail: step.detail,
    });
  },
  closeEditStep() {
    this.setData({ editingStep: null });
  },
  onEditTitle(e) {
    this.setData({ editTitle: e.detail.value || '' });
  },
  onEditDetail(e) {
    this.setData({ editDetail: e.detail.value || '' });
  },
  saveEditStep() {
    if (!this.data.activePlan || !this.data.editingStep) return;
    const nextHistory = engine.updateStepContent(
      this.data.activePlan.id,
      this.data.editingStep.id,
      this.data.editTitle,
      this.data.editDetail
    );
    this.syncPlans(nextHistory, this.data.activePlan.id);
    this.setData({ editingStep: null });
    wx.showToast({ title: '微步骤已更新 ✨', icon: 'none' });
  },
});
