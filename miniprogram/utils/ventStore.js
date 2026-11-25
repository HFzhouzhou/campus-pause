const { requestApi, isFallbackableError } = require('./api');
const auth = require('./auth');

const STORAGE_KEY = 'cp_mp_vent_bubbles_v1';
const REACTS_KEY = 'cp_mp_vent_reacts_v1';

const QUICK_VENT_TAGS = [
  '高数看不懂了',
  '小组作业全是我做',
  '专四单词背不完',
  '秋招 0 Offer',
  '早八好想隐身',
  '论文改到第8版',
];

const BUBBLE_TONES = [
  { id: 'lavender', label: '薰衣草紫' },
  { id: 'amber', label: '晚霞琥珀' },
  { id: 'mint', label: '治愈薄荷' },
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
    content:
      '小组 Pre 明天早八上台，四个组员三个已读不回，我现在还在图书馆改第 6 版 PPT…真的好想直接隐身。',
    tag: '小组作业全是我做',
    createdAt: '6分钟前',
    hugs: 42,
    empathy: 67,
    huggedByMe: false,
    empathizedByMe: false,
    tone: 'lavender',
    authorName: '五合匿名泡泡',
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
    authorName: '五合匿名泡泡',
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
    authorName: '五合匿名泡泡',
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
    authorName: '五合匿名泡泡',
  },
];

function getReactsMap() {
  try {
    return wx.getStorageSync(REACTS_KEY) || { hugs: {}, empathy: {} };
  } catch (e) {
    return { hugs: {}, empathy: {} };
  }
}

function saveReactsMap(map) {
  wx.setStorageSync(REACTS_KEY, map);
}

function applyReacts(list) {
  const r = getReactsMap();
  return (list || []).map((b) => ({
    ...b,
    authorName: b.authorName || '五合匿名泡泡',
    huggedByMe: Boolean(r.hugs && r.hugs[b.id]),
    empathizedByMe: Boolean(r.empathy && r.empathy[b.id]),
  }));
}

function saveBubbles(list) {
  const clean = applyReacts(list);
  wx.setStorageSync(STORAGE_KEY, clean);
  return clean;
}

function getBubbles() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    wx.setStorageSync(STORAGE_KEY, INITIAL_BUBBLES);
    return applyReacts(INITIAL_BUBBLES);
  }
  return applyReacts(stored);
}

async function syncFromServer() {
  try {
    const res = await requestApi('/content/bubbles', 'GET', {}, auth.getToken());
    if (res && Array.isArray(res.bubbles)) {
      return { list: saveBubbles(res.bubbles), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }
  return { list: getBubbles(), synced: false };
}

async function addBubble(payload) {
  const token = auth.getToken();
  const reqBody = {
    content: (payload.content || '').trim(),
    tag: (payload.tag || '低电量时刻').trim(),
    tone: payload.tone || 'lavender',
    authorName: (payload.authorName || '五合匿名泡泡').trim(),
  };
  try {
    const res = await requestApi('/content/bubbles', 'POST', reqBody, token);
    if (res && Array.isArray(res.bubbles)) {
      return { bubble: res.bubble, list: saveBubbles(res.bubbles), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const created = {
    id: `vb-${Date.now()}`,
    content: reqBody.content,
    tag: reqBody.tag,
    tone: reqBody.tone,
    authorName: reqBody.authorName,
    createdAt: '刚刚',
    hugs: 0,
    empathy: 0,
    huggedByMe: false,
    empathizedByMe: false,
  };
  const next = saveBubbles([created, ...getBubbles()]);
  return { bubble: created, list: next, synced: false };
}

async function updateBubble(id, patch) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可编辑共鸣泡泡');
  }

  const reqBody = {
    id,
    content: (patch.content || '').trim(),
    tag: (patch.tag || '').trim(),
    tone: patch.tone,
    authorName: (patch.authorName || '').trim(),
  };
  try {
    const res = await requestApi('/content/bubbles/update', 'POST', reqBody, token);
    if (res && Array.isArray(res.bubbles)) {
      return { list: saveBubbles(res.bubbles), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getBubbles().map((b) =>
    b.id === id
      ? {
          ...b,
          content: reqBody.content || b.content,
          tag: reqBody.tag || b.tag,
          tone: reqBody.tone || b.tone,
          authorName: reqBody.authorName || b.authorName,
        }
      : b
  );
  return { list: saveBubbles(next), synced: false };
}

async function deleteBubble(id) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可删除共鸣泡泡');
  }

  try {
    const res = await requestApi('/content/bubbles/delete', 'POST', { id }, token);
    if (res && Array.isArray(res.bubbles)) {
      return { list: saveBubbles(res.bubbles), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getBubbles().filter((b) => b.id !== id);
  return { list: saveBubbles(next), synced: false };
}

function toggleHug(id) {
  const r = getReactsMap();
  r.hugs = r.hugs || {};
  const nextFlag = !r.hugs[id];
  r.hugs[id] = nextFlag;
  saveReactsMap(r);

  const next = getBubbles().map((b) => {
    if (b.id !== id) return b;
    return { ...b, huggedByMe: nextFlag, hugs: Math.max(0, b.hugs + (nextFlag ? 1 : -1)) };
  });
  saveBubbles(next);

  const token = auth.getToken();
  if (token) {
    requestApi(
      '/content/bubbles/react',
      'POST',
      { id, field: 'hugs', delta: nextFlag ? 1 : -1 },
      token
    )
      .then((res) => {
        if (res && Array.isArray(res.bubbles)) saveBubbles(res.bubbles);
      })
      .catch(() => {});
  }
  return next;
}

function toggleEmpathy(id) {
  const r = getReactsMap();
  r.empathy = r.empathy || {};
  const nextFlag = !r.empathy[id];
  r.empathy[id] = nextFlag;
  saveReactsMap(r);

  const next = getBubbles().map((b) => {
    if (b.id !== id) return b;
    return {
      ...b,
      empathizedByMe: nextFlag,
      empathy: Math.max(0, b.empathy + (nextFlag ? 1 : -1)),
    };
  });
  saveBubbles(next);

  const token = auth.getToken();
  if (token) {
    requestApi(
      '/content/bubbles/react',
      'POST',
      { id, field: 'empathy', delta: nextFlag ? 1 : -1 },
      token
    )
      .then((res) => {
        if (res && Array.isArray(res.bubbles)) saveBubbles(res.bubbles);
      })
      .catch(() => {});
  }
  return next;
}

module.exports = {
  QUICK_VENT_TAGS,
  BUBBLE_TONES,
  detectHighRiskEmotion,
  getBubbles,
  syncFromServer,
  addBubble,
  updateBubble,
  deleteBubble,
  toggleHug,
  toggleEmpathy,
};
