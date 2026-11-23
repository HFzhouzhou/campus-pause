const STORAGE_KEY = 'cp_mp_vent_bubbles_v1';

const QUICK_VENT_TAGS = [
  '高数看不懂了',
  '小组作业全是我做',
  '专四单词背不完',
  '秋招 0 Offer',
  '早八好想隐身',
  '论文改到第8版',
];

const HIGH_RISK_KEYWORDS = [
  '不想活',
  '撑不住了',
  '想跳楼',
  '想死',
  '自杀',
  '轻生',
  '活不下去',
  '结束生命',
  '好想消失',
  '告别世界',
  '不想醒来',
  '活着没意义',
];

function detectHighRiskEmotion(text) {
  const normalized = (text || '').replace(/\s+/g, '');
  return HIGH_RISK_KEYWORDS.some((kw) => normalized.includes(kw));
}

const INITIAL_BUBBLES = [
  {
    id: 'vb-1',
    content: '小组 Pre 明天早八上台，四个组员三个已读不回，我现在还在图书馆改第 6 版 PPT…真的好想直接隐身。',
    tag: '小组作业全是我做',
    createdAt: '6分钟前',
    hugs: 42,
    empathy: 67,
    huggedByMe: false,
    empathizedByMe: false,
    tone: 'lavender',
  },
  {
    id: 'vb-2',
    content: '投了 80 多份实习简历，收到 3 个面试全挂在二面，躲进阳台吹了十分钟南宁晚风才缓过来。',
    tag: '秋招 0 Offer',
    createdAt: '18分钟前',
    hugs: 89,
    empathy: 112,
    huggedByMe: false,
    empathizedByMe: false,
    tone: 'amber',
  },
  {
    id: 'vb-3',
    content: '连着上了三天满课，今天突然电量掉到 1%，什么大事也没发生，就想安静发呆半小时。',
    tag: '低电量时刻',
    createdAt: '35分钟前',
    hugs: 64,
    empathy: 95,
    huggedByMe: false,
    empathizedByMe: false,
    tone: 'mint',
  },
  {
    id: 'vb-4',
    content: '专四听力刚练完一套错了一半，合上真题的那一刻觉得脑子变成了一锅浆糊。',
    tag: '专四焦虑',
    createdAt: '52分钟前',
    hugs: 53,
    empathy: 81,
    huggedByMe: false,
    empathizedByMe: false,
    tone: 'lavender',
  },
];

function getBubbles() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    wx.setStorageSync(STORAGE_KEY, INITIAL_BUBBLES);
    return INITIAL_BUBBLES;
  }
  return stored;
}

function toggleHug(id) {
  const next = getBubbles().map((b) => {
    if (b.id !== id) return b;
    const huggedByMe = !b.huggedByMe;
    return { ...b, huggedByMe, hugs: Math.max(0, b.hugs + (huggedByMe ? 1 : -1)) };
  });
  wx.setStorageSync(STORAGE_KEY, next);
  return next;
}

function toggleEmpathy(id) {
  const next = getBubbles().map((b) => {
    if (b.id !== id) return b;
    const empathizedByMe = !b.empathizedByMe;
    return { ...b, empathizedByMe, empathy: Math.max(0, b.empathy + (empathizedByMe ? 1 : -1)) };
  });
  wx.setStorageSync(STORAGE_KEY, next);
  return next;
}

module.exports = {
  QUICK_VENT_TAGS,
  detectHighRiskEmotion,
  getBubbles,
  toggleHug,
  toggleEmpathy,
};
