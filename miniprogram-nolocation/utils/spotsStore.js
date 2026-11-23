const STORAGE_KEY = 'cp_mp_spots_gxufl_v2';

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

// 全部采用 0ms 秒开的本地高颜值治愈氛围封面（国内任何校园网永不裂图、永不白屏）
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
    recommendation: '南宁傍晚 18:10 的橘子海晚霞洒在蓝白欧式立面上美到失语，下完语种课来这里吹风放空最治愈。',
    likes: 218,
    likedByMe: false,
    tags: ['欧式落日', '微风连廊', '出片秘境'],
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
    recommendation: '湖边树荫下常驻几只超亲人的校猫，午后看着水面波光一边摸呼噜噜的大橘，电量瞬间回血。',
    likes: 264,
    likedByMe: false,
    tags: ['亲人校猫', '湖畔树荫', '允许摸头'],
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
    recommendation: '窗外正对整片绿树与尖顶轮廓，有独立台灯与插座，适合戴耳机静静整理思绪或背单词。',
    likes: 175,
    likedByMe: false,
    tags: ['极度安静', '靠窗采光', '有插座'],
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
    recommendation: '南宁的晚风混着青草香，傍晚买杯柠檬茶坐在斜坡上看天色变暗，合法暂停二十分钟。',
    likes: 193,
    likedByMe: false,
    tags: ['合法躺平', '湖面晚风', '青草香'],
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
    recommendation: '视野开阔能俯瞰整个五合欧式建筑群灯火，晚上 21:00 后上来吹南宁晚风，呼吸瞬间通畅。',
    likes: 207,
    likedByMe: false,
    tags: ['俯瞰校园', '夜景绝美', '晚风自由'],
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
    recommendation: '坐在最高一排石阶看操场夜跑和远处粉色天际线，社恐不用参与也能沾到满满生命力。',
    likes: 146,
    likedByMe: false,
    tags: ['粉色天空', '社恐友好', '夜跑白噪音'],
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
    recommendation: '橙红尖塔城堡大门旁的绿荫角落，早八前或晚归时坐五分钟深呼吸，自带电影滤镜感。',
    likes: 132,
    likedByMe: false,
    tags: ['城堡大门', '林荫长椅', '雨天避世'],
    reviews: [],
  },
];

function getCategoryMeta(catId) {
  return SPOT_CATEGORIES.find((c) => c.id === catId) || SPOT_CATEGORIES[0];
}

function getAll() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    wx.setStorageSync(STORAGE_KEY, INITIAL_SPOTS);
    return INITIAL_SPOTS;
  }
  return stored;
}

function saveAll(list) {
  wx.setStorageSync(STORAGE_KEY, list);
  return list;
}

function addSpot(payload, authorName = '五合探索者') {
  const list = getAll();
  const maxMarkerId = list.reduce((m, s) => Math.max(m, s.markerId || 0), 10);
  const created = {
    id: `spot-ugc-${Date.now()}`,
    markerId: maxMarkerId + 1,
    name: payload.name,
    category: payload.category,
    longitude: payload.longitude,
    latitude: payload.latitude,
    coverUrl: payload.coverUrl || PRESET_PHOTOS[0].url,
    quietStatus: payload.rating >= 4 ? 'very_quiet' : payload.rating === 3 ? 'moderate' : 'crowded',
    quietUpdatedAt: '刚刚标记',
    rating: payload.rating || 5,
    recommendation: payload.recommendation,
    likes: 1,
    likedByMe: true,
    tags: ['五合私藏', payload.rating >= 4 ? '极度安静' : '轻松放空', '同学标记'],
    reviews: [
      {
        id: `rev-${Date.now()}`,
        author: authorName,
        content: payload.recommendation,
        createdAt: '刚刚',
        moodTag: '新发现秘境',
      },
    ],
  };
  const next = [created, ...list];
  saveAll(next);
  return { created, list: next };
}

function toggleLike(spotId) {
  const next = getAll().map((s) => {
    if (s.id !== spotId) return s;
    const likedByMe = !s.likedByMe;
    return { ...s, likedByMe, likes: Math.max(0, s.likes + (likedByMe ? 1 : -1)) };
  });
  return saveAll(next);
}

function updateQuietStatus(spotId, status) {
  const next = getAll().map((s) =>
    s.id === spotId ? { ...s, quietStatus: status, quietUpdatedAt: '刚刚更新' } : s
  );
  return saveAll(next);
}

function addReview(spotId, content, moodTag, authorName = '五合同学') {
  const rev = {
    id: `rev-${Date.now()}`,
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

module.exports = {
  SPOT_CATEGORIES,
  QUIET_META,
  PRESET_PHOTOS,
  getCategoryMeta,
  getAll,
  addSpot,
  toggleLike,
  updateQuietStatus,
  addReview,
};
