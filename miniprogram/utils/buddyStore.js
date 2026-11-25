const { requestApi, isFallbackableError } = require('./api');
const auth = require('./auth');

const STORAGE_KEY = 'cp_mp_buddies_v1';

const BUDDY_CATEGORIES = [
  { id: 'all', label: '全部搭子', emoji: '✦' },
  { id: 'walk', label: '暴走散步', emoji: '🚶' },
  { id: 'eat', label: '干饭不尴尬', emoji: '🍜' },
  { id: 'study', label: '静音监督', emoji: '🎧' },
  { id: 'sunset', label: '发呆看云', emoji: '🌅' },
];

const QUICK_CIPHER_MESSAGES = [
  '我到集合点啦，挥个手就行',
  '戴降噪耳机，点头开启静音模式',
  '30分钟后各回各家，不用客气～',
  '正在路上，3分钟到！',
];

function buildInitialBuddies() {
  const now = Date.now();
  return [
    {
      id: 'buddy-1',
      title: '田径场暴走不说话搭子（30分钟）',
      category: 'walk',
      location: '五合田径场西侧看台入口',
      durationMinutes: 30,
      expiresAt: now + 26 * 60 * 1000,
      maxPeople: 3,
      joinedCount: 1,
      joinedByMe: false,
      hostAlias: '低电量步行者',
      cipher: '穿深灰卫衣 + 戴头戴式耳机',
      vibeNote: '刚上完满课想迈开腿放空，全程可以零交流，走满 4 圈各自解散。',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: true,
      quickMessages: [
        {
          id: 'qm-1',
          sender: '低电量步行者',
          text: '我在看台口栏杆旁，到了直接一起开走～',
          time: '3分钟前',
        },
      ],
    },
    {
      id: 'buddy-2',
      title: '食堂干饭不尴尬搭子',
      category: 'eat',
      location: '五合食堂二楼靠窗区',
      durationMinutes: 30,
      expiresAt: now + 19 * 60 * 1000,
      maxPeople: 2,
      joinedCount: 1,
      joinedByMe: false,
      hostAlias: '干饭要紧同学',
      cipher: '桌角放一杯冰柠檬茶',
      vibeNote: '互相帮忙占座干饭，吃饭期间各自刷手机完全 OK，绝不尬聊！',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: false,
      quickMessages: [
        {
          id: 'qm-2',
          sender: '干饭要紧同学',
          text: '我先去占个二人位，各自点想吃的就好！',
          time: '5分钟前',
        },
      ],
    },
    {
      id: 'buddy-3',
      title: '五合图书馆静音互相监督搭子',
      category: 'study',
      location: '图书馆 4F 靠窗长桌',
      durationMinutes: 30,
      expiresAt: now + 29 * 60 * 1000,
      maxPeople: 4,
      joinedCount: 2,
      joinedByMe: false,
      hostAlias: '专四冲刺中',
      cipher: '桌面立一张薄荷绿便利贴',
      vibeNote: '手机统一反扣桌面 30 分钟，谁也不许偷刷短视频，到点点头收工！',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: true,
      quickMessages: [
        {
          id: 'qm-3',
          sender: '专四冲刺中',
          text: '已反扣手机开始计时，来了直接坐对面就行。',
          time: '2分钟前',
        },
      ],
    },
    {
      id: 'buddy-4',
      title: '明德楼连廊发呆看落日搭子',
      category: 'sunset',
      location: '明德楼西侧观景连廊',
      durationMinutes: 30,
      expiresAt: now + 22 * 60 * 1000,
      maxPeople: 3,
      joinedCount: 1,
      joinedByMe: false,
      hostAlias: '南宁晚霞观测员',
      cipher: '拿两杯冰美式（多出来一杯随缘）',
      vibeNote: '今天南宁云层超适合出橘子海晚霞，欢迎并排吹风不寒暄。',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: true,
      quickMessages: [
        {
          id: 'qm-4',
          sender: '南宁晚霞观测员',
          text: '西边天空已经开始泛金黄色了！',
          time: '刚刚',
        },
      ],
    },
  ];
}

function saveAll(list) {
  wx.setStorageSync(STORAGE_KEY, list);
  return list;
}

function getAll() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  const now = Date.now();
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    const fresh = buildInitialBuddies();
    return saveAll(fresh);
  }
  const hasActive = stored.some((b) => b.expiresAt > now + 60 * 1000);
  if (!hasActive) {
    const refreshed = stored.map((b, idx) => ({
      ...b,
      expiresAt: now + (18 + ((idx * 4) % 12)) * 60 * 1000,
    }));
    return saveAll(refreshed);
  }
  return stored;
}

async function syncFromServer() {
  try {
    const res = await requestApi('/content/buddies', 'GET', {}, auth.getToken());
    if (res && Array.isArray(res.buddies)) {
      return { list: saveAll(res.buddies), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }
  return { list: getAll(), synced: false };
}

async function createBuddy(input) {
  const token = auth.getToken();
  const reqBody = {
    title: input.title.trim(),
    category: input.category,
    location: input.location.trim(),
    durationMinutes: Number(input.durationMinutes || 30),
    maxPeople: Number(input.maxPeople || 2),
    cipher: (input.cipher || '').trim() || '挥挥手机亮屏示意',
    vibeNote: (input.vibeNote || '').trim() || '主打轻松无压，30分钟一起充个电，到点自由散场。',
    isSilent: Boolean(input.isSilent),
  };

  try {
    const res = await requestApi('/content/buddies', 'POST', reqBody, token);
    if (res && res.buddy && Array.isArray(res.buddies)) {
      const list = saveAll(res.buddies);
      return { created: res.buddy, list, synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const created = {
    id: `buddy-ugc-${Date.now()}`,
    title: reqBody.title,
    category: reqBody.category,
    location: reqBody.location,
    durationMinutes: reqBody.durationMinutes,
    expiresAt: Date.now() + reqBody.durationMinutes * 60 * 1000,
    maxPeople: reqBody.maxPeople,
    joinedCount: 1,
    joinedByMe: true,
    hostAlias: input.hostAlias || '五合同学',
    cipher: reqBody.cipher,
    vibeNote: reqBody.vibeNote,
    boundaryTag: '活动结束自动解散 · 不强制加微信',
    isSilent: reqBody.isSilent,
    quickMessages: [
      {
        id: `qm-${Date.now()}`,
        sender: input.hostAlias || '五合同学',
        text: `临时频道已开启，暗号：${reqBody.cipher}`,
        time: '刚刚',
      },
    ],
  };
  const next = saveAll([created, ...getAll()]);
  return { created, list: next, synced: false };
}

async function updateBuddy(id, patch) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可编辑搭子内容');
  }

  const reqBody = {
    id,
    title: (patch.title || '').trim(),
    category: patch.category,
    location: (patch.location || '').trim(),
    durationMinutes: Number(patch.durationMinutes || 30),
    maxPeople: Number(patch.maxPeople || 2),
    hostAlias: (patch.hostAlias || '').trim(),
    cipher: (patch.cipher || '').trim(),
    vibeNote: (patch.vibeNote || '').trim(),
    isSilent: Boolean(patch.isSilent),
    resetCountdown: Boolean(patch.resetCountdown),
  };

  try {
    const res = await requestApi('/content/buddies/update', 'POST', reqBody, token);
    if (res && Array.isArray(res.buddies)) {
      return { buddy: res.buddy, list: saveAll(res.buddies), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getAll().map((b) => {
    if (b.id !== id) return b;
    const duration = reqBody.durationMinutes || b.durationMinutes;
    return {
      ...b,
      title: reqBody.title || b.title,
      category: reqBody.category || b.category,
      location: reqBody.location || b.location,
      durationMinutes: duration,
      maxPeople: reqBody.maxPeople || b.maxPeople,
      hostAlias: reqBody.hostAlias || b.hostAlias,
      cipher: reqBody.cipher || b.cipher,
      vibeNote: reqBody.vibeNote !== undefined ? reqBody.vibeNote : b.vibeNote,
      isSilent: reqBody.isSilent,
      expiresAt: reqBody.resetCountdown ? Date.now() + duration * 60 * 1000 : b.expiresAt,
    };
  });
  const saved = saveAll(next);
  return { buddy: saved.find((b) => b.id === id) || null, list: saved, synced: false };
}

async function deleteBuddy(id) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可删除搭子');
  }

  try {
    const res = await requestApi('/content/buddies/delete', 'POST', { id }, token);
    if (res && Array.isArray(res.buddies)) {
      return { list: saveAll(res.buddies), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  return { list: saveAll(getAll().filter((b) => b.id !== id)), synced: false };
}

async function toggleJoin(id) {
  const token = auth.getToken();
  try {
    const res = await requestApi('/content/buddies/join', 'POST', { id }, token);
    if (res && Array.isArray(res.buddies)) {
      return saveAll(res.buddies);
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getAll().map((b) => {
    if (b.id !== id) return b;
    if (b.joinedByMe) {
      return { ...b, joinedByMe: false, joinedCount: Math.max(1, b.joinedCount - 1) };
    }
    if (b.joinedCount >= b.maxPeople) return b;
    return { ...b, joinedByMe: true, joinedCount: b.joinedCount + 1 };
  });
  return saveAll(next);
}

async function sendQuickMessage(id, text) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  try {
    const res = await requestApi(
      '/content/buddies/message',
      'POST',
      { buddyId: id, text: text.trim() },
      token
    );
    if (res && Array.isArray(res.buddies)) {
      return saveAll(res.buddies);
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getAll().map((b) => {
    if (b.id !== id) return b;
    return {
      ...b,
      quickMessages: [
        ...(b.quickMessages || []),
        {
          id: `qm-${Date.now()}`,
          sender: (me && me.nickname) || '我（已举手）',
          isMe: true,
          text: text.trim(),
          time: '刚刚',
        },
      ],
    };
  });
  return saveAll(next);
}

async function updateQuickMessage(buddyId, msgId, patch) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可编辑频道消息');
  }

  try {
    const res = await requestApi(
      '/content/buddies/message/update',
      'POST',
      { id: msgId, text: (patch.text || '').trim(), sender: (patch.sender || '').trim() },
      token
    );
    if (res && Array.isArray(res.buddies)) {
      return { list: saveAll(res.buddies), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getAll().map((b) => {
    if (buddyId && b.id !== buddyId) return b;
    return {
      ...b,
      quickMessages: (b.quickMessages || []).map((m) =>
        m.id === msgId
          ? {
              ...m,
              text: (patch.text || m.text).trim(),
              sender: (patch.sender || m.sender).trim(),
            }
          : m
      ),
    };
  });
  return { list: saveAll(next), synced: false };
}

async function deleteQuickMessage(buddyId, msgId) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可删除频道消息');
  }

  try {
    const res = await requestApi(
      '/content/buddies/message/delete',
      'POST',
      { id: msgId },
      token
    );
    if (res && Array.isArray(res.buddies)) {
      return { list: saveAll(res.buddies), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getAll().map((b) => {
    if (buddyId && b.id !== buddyId) return b;
    return {
      ...b,
      quickMessages: (b.quickMessages || []).filter((m) => m.id !== msgId),
    };
  });
  return { list: saveAll(next), synced: false };
}

module.exports = {
  BUDDY_CATEGORIES,
  QUICK_CIPHER_MESSAGES,
  getAll,
  syncFromServer,
  createBuddy,
  updateBuddy,
  deleteBuddy,
  toggleJoin,
  sendQuickMessage,
  updateQuickMessage,
  deleteQuickMessage,
};
