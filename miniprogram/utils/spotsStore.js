const { requestApi, isFallbackableError, uploadSpotImage } = require('./api');
const auth = require('./auth');

const STORAGE_KEY = 'cp_mp_spots_gxufl_v2';
const LIKES_KEY = 'cp_mp_spot_likes_v1';

const SPOT_CATEGORIES = [
  { id: 'all', label: '全部', emoji: '✦', accent: '#007AFF' },
  { id: 'sunset', label: '绝美落日', emoji: '🌅', accent: '#FF9500' },
  { id: 'cats', label: '流浪猫基地', emoji: '🐱', accent: '#F97316' },
  { id: 'quiet', label: '极静自习', emoji: '🤫', accent: '#AF52DE' },
  { id: 'lawn', label: '躺平草坪', emoji: '🌿', accent: '#34C759' },
  { id: 'rooftop', label: '吹风天台', emoji: '🌬️', accent: '#0EA5E9' },
];

const QUIET_META = {
  very_quiet: { label: '此刻很安静', color: '#15803D', bg: '#ECFDF5', dot: '#34C759' },
  moderate: { label: '人不多·舒适', color: '#B45309', bg: '#FFFBEB', dot: '#FF9500' },
  crowded: { label: '稍微有点吵', color: '#BE123C', bg: '#FFF1F2', dot: '#FF3B30' },
};

const PRESET_PHOTOS = [
  { id: 'sunset', label: '橘子海落日', url: '/assets/spots/sunset.png' },
  { id: 'cats', label: '晒太阳校猫', url: '/assets/spots/cats.png' },
  { id: 'library', label: '图书馆静区', url: '/assets/spots/library.png' },
  { id: 'lawn', label: '微风绿草坪', url: '/assets/spots/lawn.png' },
  { id: 'rooftop', label: '观风晚霞台', url: '/assets/spots/rooftop.png' },
];

const INITIAL_SPOTS = [
  {
    id: 'gxufl-1',
    markerId: 1,
    name: '明德楼西侧观景连廊',
    category: 'sunset',
    longitude: 108.51512,
    latitude: 22.80088,
    coverUrl: '/assets/spots/sunset.png',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '6分钟前更新',
    rating: 4.9,
    recommendation:
      '南宁傍晚 18:10 的橘子海晚霞洒在蓝白欧式立面上美到失语，下完语种课来这里吹风放空最治愈。',
    likes: 218,
    likedByMe: false,
    tags: ['欧式落日', '微风连廊', '出片秘境'],
    authorName: '官方精选',
    reviews: [
      {
        id: 'rev-1',
        author: '小语种晚风人',
        content: '刚考完专四模拟上来发呆十五分钟，晚霞把尖顶染成粉金色，焦虑一下散了一半。',
        createdAt: '今天 18:20',
        moodTag: '被晚霞接住了',
      },
    ],
  },
  {
    id: 'gxufl-2',
    markerId: 2,
    name: '化龙池欧式廊桥撸猫角',
    category: 'cats',
    longitude: 108.51655,
    latitude: 22.80122,
    coverUrl: '/assets/spots/cats.png',
    quietStatus: 'moderate',
    quietUpdatedAt: '12分钟前更新',
    rating: 4.9,
    recommendation:
      '湖边树荫下常驻几只超亲人的校猫，午后看着水面波光一边摸呼噜噜的大橘，电量瞬间回血。',
    likes: 264,
    likedByMe: false,
    tags: ['亲人校猫', '湖畔树荫', '允许摸头'],
    authorName: '官方精选',
    reviews: [
      {
        id: 'rev-2',
        author: '常备猫条同学',
        content: '今天大橘和三花都在桥头石阶晒太阳，蹭了我半天帆布包，太治愈啦！',
        createdAt: '今天 15:10',
        moodTag: '电量满格',
      },
    ],
  },
  {
    id: 'gxufl-3',
    markerId: 3,
    name: '五合图书馆 4F 靠窗静区',
    category: 'quiet',
    longitude: 108.51624,
    latitude: 22.80205,
    coverUrl: '/assets/spots/library.png',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '刚刚更新',
    rating: 5.0,
    recommendation:
      '窗外正对整片绿树与尖顶轮廓，有独立台灯与插座，适合戴耳机静静整理思绪或背单词。',
    likes: 175,
    likedByMe: false,
    tags: ['极度安静', '靠窗采光', '有插座'],
    authorName: '官方精选',
    reviews: [
      {
        id: 'rev-3',
        author: '考研上岸中',
        content: '空调温度刚刚好，抬头能看到远处的云，在这里心率都会变慢。',
        createdAt: '今天 14:40',
        moodTag: '心率平稳',
      },
    ],
  },
  {
    id: 'gxufl-4',
    markerId: 4,
    name: '天鹅湖西岸斜坡绿草坪',
    category: 'lawn',
    longitude: 108.51468,
    latitude: 22.79972,
    coverUrl: '/assets/spots/lawn.png',
    quietStatus: 'moderate',
    quietUpdatedAt: '19分钟前更新',
    rating: 4.8,
    recommendation:
      '南宁的晚风混着青草香，傍晚买杯柠檬茶坐在斜坡上看天色变暗，合法暂停二十分钟。',
    likes: 193,
    likedByMe: false,
    tags: ['合法躺平', '湖面晚风', '青草香'],
    authorName: '官方精选',
    reviews: [
      {
        id: 'rev-4',
        author: '偷得浮生半日闲',
        content: '不看手机光发呆二十分钟，感觉脑袋里打结的线都松开了。',
        createdAt: '今天 17:30',
        moodTag: '精神放风',
      },
    ],
  },
  {
    id: 'gxufl-5',
    markerId: 5,
    name: '致达楼高层观风露台',
    category: 'rooftop',
    longitude: 108.51718,
    latitude: 22.80015,
    coverUrl: '/assets/spots/rooftop.png',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '10分钟前更新',
    rating: 4.9,
    recommendation:
      '视野开阔能俯瞰整个五合欧式建筑群灯火，晚上 21:00 后上来吹南宁晚风，呼吸瞬间通畅。',
    likes: 207,
    likedByMe: false,
    tags: ['俯瞰校园', '夜景绝美', '晚风自由'],
    authorName: '官方精选',
    reviews: [
      {
        id: 'rev-5',
        author: '改完PPT的人',
        content: '站在栏杆边看楼下暖黄色路灯，突然觉得明天也没那么难熬了。',
        createdAt: '昨晚 21:45',
        moodTag: '世界静音',
      },
    ],
  },
  {
    id: 'gxufl-6',
    markerId: 6,
    name: '田径场西侧最高排看台',
    category: 'sunset',
    longitude: 108.51755,
    latitude: 22.80215,
    coverUrl: '/assets/spots/track.png',
    quietStatus: 'moderate',
    quietUpdatedAt: '24分钟前更新',
    rating: 4.7,
    recommendation:
      '坐在最高一排石阶看操场夜跑和远处粉色天际线，社恐不用参与也能沾到满满生命力。',
    likes: 146,
    likedByMe: false,
    tags: ['粉色天空', '社恐友好', '夜跑白噪音'],
    authorName: '官方精选',
    reviews: [],
  },
  {
    id: 'gxufl-7',
    markerId: 7,
    name: '五合南门钟楼林荫长椅',
    category: 'quiet',
    longitude: 108.51586,
    latitude: 22.79758,
    coverUrl: '/assets/spots/gate.png',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '31分钟前更新',
    rating: 4.8,
    recommendation:
      '橙红尖塔城堡大门旁的绿荫角落，早八前或晚归时坐五分钟深呼吸，自带电影滤镜感。',
    likes: 132,
    likedByMe: false,
    tags: ['城堡大门', '林荫长椅', '雨天避世'],
    authorName: '官方精选',
    reviews: [],
  },
];

function getLikedMap() {
  try {
    return wx.getStorageSync(LIKES_KEY) || {};
  } catch (e) {
    return {};
  }
}

function saveLikedMap(map) {
  wx.setStorageSync(LIKES_KEY, map);
}

function applyLikedState(list) {
  const likedMap = getLikedMap();
  return (list || []).map((s) => ({
    ...s,
    likedByMe: Boolean(likedMap[s.id]),
    tags: Array.isArray(s.tags) ? s.tags : [],
    reviews: Array.isArray(s.reviews) ? s.reviews : [],
  }));
}

function getCategoryMeta(catId) {
  return SPOT_CATEGORIES.find((c) => c.id === catId) || SPOT_CATEGORIES[0];
}

function getAll() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    wx.setStorageSync(STORAGE_KEY, INITIAL_SPOTS);
    return applyLikedState(INITIAL_SPOTS);
  }
  return applyLikedState(stored);
}

function saveAll(list) {
  const clean = applyLikedState(list);
  wx.setStorageSync(STORAGE_KEY, clean);
  return clean;
}

async function syncFromServer() {
  try {
    const res = await requestApi('/content/spots', 'GET', {}, auth.getToken());
    if (res && Array.isArray(res.spots)) {
      return { list: saveAll(res.spots), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }
  return { list: getAll(), synced: false };
}

async function addSpot(payload, authorName = '五合探索者') {
  const token = auth.getToken();
  const coverUrl = await uploadSpotImage(payload.coverUrl, token);
  const reqBody = {
    name: payload.name,
    category: payload.category,
    longitude: Number(payload.longitude),
    latitude: Number(payload.latitude),
    coverUrl,
    rating: Number(payload.rating || 5),
    recommendation: payload.recommendation,
  };

  try {
    const res = await requestApi('/content/spots', 'POST', reqBody, token);
    if (res && res.spot && Array.isArray(res.spots)) {
      const likedMap = getLikedMap();
      likedMap[res.spot.id] = true;
      saveLikedMap(likedMap);
      const list = saveAll(res.spots);
      const created = list.find((s) => s.id === res.spot.id) || res.spot;
      return { created, list, synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const list = getAll();
  const maxMarkerId = list.reduce((m, s) => Math.max(m, s.markerId || 0), 10);
  const created = {
    id: `spot-ugc-${Date.now()}`,
    markerId: maxMarkerId + 1,
    name: reqBody.name,
    category: reqBody.category,
    longitude: reqBody.longitude,
    latitude: reqBody.latitude,
    coverUrl: reqBody.coverUrl || PRESET_PHOTOS[0].url,
    quietStatus: reqBody.rating >= 4 ? 'very_quiet' : reqBody.rating === 3 ? 'moderate' : 'crowded',
    quietUpdatedAt: '刚刚标记',
    rating: reqBody.rating || 5,
    recommendation: reqBody.recommendation,
    likes: 1,
    likedByMe: true,
    authorName,
    tags: ['五合私藏', reqBody.rating >= 4 ? '极度安静' : '轻松放空', '同学标记'],
    reviews: [
      {
        id: `rev-${Date.now()}`,
        author: authorName,
        content: reqBody.recommendation,
        createdAt: '刚刚',
        moodTag: '新发现秘境',
      },
    ],
  };
  const likedMap = getLikedMap();
  likedMap[created.id] = true;
  saveLikedMap(likedMap);
  const next = saveAll([created, ...list]);
  return { created, list: next, synced: false };
}

async function updateSpot(spotId, patch) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可编辑地图地点');
  }

  const finalCover = patch.coverUrl
    ? await uploadSpotImage(patch.coverUrl, token)
    : undefined;
  const reqBody = {
    id: spotId,
    name: patch.name,
    category: patch.category,
    longitude: Number(patch.longitude),
    latitude: Number(patch.latitude),
    coverUrl: finalCover,
    quietStatus: patch.quietStatus,
    rating: Number(patch.rating || 5),
    recommendation: patch.recommendation,
    tags: patch.tags,
    authorName: patch.authorName,
  };

  try {
    const res = await requestApi('/content/spots/update', 'POST', reqBody, token);
    if (res && Array.isArray(res.spots)) {
      const list = saveAll(res.spots);
      const updated = list.find((s) => s.id === spotId) || res.spot;
      return { spot: updated, list, synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const parsedTags = Array.isArray(patch.tags)
    ? patch.tags
    : typeof patch.tags === 'string'
    ? patch.tags
        .split(/[,，、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    : null;

  const next = getAll().map((s) => {
    if (s.id !== spotId) return s;
    return {
      ...s,
      name: (patch.name || s.name).trim(),
      category: patch.category || s.category,
      longitude: Number.isFinite(Number(patch.longitude)) ? Number(patch.longitude) : s.longitude,
      latitude: Number.isFinite(Number(patch.latitude)) ? Number(patch.latitude) : s.latitude,
      coverUrl: finalCover || s.coverUrl,
      quietStatus: patch.quietStatus || s.quietStatus,
      rating: Number.isFinite(Number(patch.rating)) ? Number(patch.rating) : s.rating,
      recommendation: (patch.recommendation || s.recommendation).trim(),
      tags: parsedTags || s.tags,
      authorName: (patch.authorName || s.authorName || '五合探索者').trim(),
    };
  });
  const saved = saveAll(next);
  return { spot: saved.find((s) => s.id === spotId) || null, list: saved, synced: false };
}

async function deleteSpot(spotId) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可删除地图地点');
  }

  try {
    const res = await requestApi('/content/spots/delete', 'POST', { id: spotId }, token);
    if (res && Array.isArray(res.spots)) {
      return { list: saveAll(res.spots), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getAll().filter((s) => s.id !== spotId);
  return { list: saveAll(next), synced: false };
}

function toggleLike(spotId) {
  const likedMap = getLikedMap();
  const nextLiked = !likedMap[spotId];
  likedMap[spotId] = nextLiked;
  saveLikedMap(likedMap);

  const next = getAll().map((s) => {
    if (s.id !== spotId) return s;
    return {
      ...s,
      likedByMe: nextLiked,
      likes: Math.max(0, Number(s.likes || 0) + (nextLiked ? 1 : -1)),
    };
  });
  saveAll(next);

  const token = auth.getToken();
  if (token) {
    requestApi('/content/spots/like', 'POST', { id: spotId, liked: nextLiked }, token)
      .then((res) => {
        if (res && Array.isArray(res.spots)) saveAll(res.spots);
      })
      .catch(() => {});
  }
  return next;
}

async function updateQuietStatus(spotId, status) {
  const token = auth.getToken();
  try {
    const res = await requestApi(
      '/content/spots/quiet',
      'POST',
      { id: spotId, quietStatus: status },
      token
    );
    if (res && Array.isArray(res.spots)) {
      return saveAll(res.spots);
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getAll().map((s) =>
    s.id === spotId ? { ...s, quietStatus: status, quietUpdatedAt: '刚刚更新' } : s
  );
  return saveAll(next);
}

async function addReview(spotId, content, moodTag, authorName = '五合同学') {
  const token = auth.getToken();
  try {
    const res = await requestApi(
      '/content/reviews',
      'POST',
      { spotId, content: content.trim(), moodTag },
      token
    );
    if (res && Array.isArray(res.spots)) {
      return saveAll(res.spots);
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const rev = {
    id: `rev-${Date.now()}`,
    spotId,
    author: authorName,
    content: content.trim(),
    createdAt: '刚刚',
    moodTag,
  };
  const next = getAll().map((s) =>
    s.id === spotId ? { ...s, reviews: [rev, ...(s.reviews || [])] } : s
  );
  return saveAll(next);
}

async function updateReview(spotId, reviewId, patch) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可编辑用户打卡');
  }

  try {
    const res = await requestApi(
      '/content/reviews/update',
      'POST',
      {
        id: reviewId,
        content: patch.content,
        moodTag: patch.moodTag,
        author: patch.author,
      },
      token
    );
    if (res && Array.isArray(res.spots)) {
      return { list: saveAll(res.spots), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getAll().map((s) => {
    if (spotId && s.id !== spotId) return s;
    return {
      ...s,
      reviews: (s.reviews || []).map((r) =>
        r.id === reviewId
          ? {
              ...r,
              content: (patch.content || r.content).trim(),
              moodTag: (patch.moodTag || r.moodTag).trim(),
              author: (patch.author || r.author).trim(),
            }
          : r
      ),
    };
  });
  return { list: saveAll(next), synced: false };
}

async function deleteReview(spotId, reviewId) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isAdmin(me)) {
    throw new Error('仅管理员或超级管理员可删除用户打卡');
  }

  try {
    const res = await requestApi('/content/reviews/delete', 'POST', { id: reviewId }, token);
    if (res && Array.isArray(res.spots)) {
      return { list: saveAll(res.spots), synced: true };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const next = getAll().map((s) => {
    if (spotId && s.id !== spotId) return s;
    return {
      ...s,
      reviews: (s.reviews || []).filter((r) => r.id !== reviewId),
    };
  });
  return { list: saveAll(next), synced: false };
}

module.exports = {
  SPOT_CATEGORIES,
  QUIET_META,
  PRESET_PHOTOS,
  getCategoryMeta,
  getAll,
  syncFromServer,
  addSpot,
  updateSpot,
  deleteSpot,
  toggleLike,
  updateQuietStatus,
  addReview,
  updateReview,
  deleteReview,
};
