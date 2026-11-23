import {
  CategoryMeta,
  HealingSpot,
  QuietStatus,
  SpotCategory,
  SpotReview,
} from '../types';
import { readStorage, writeStorage } from './storage';

const STORAGE_KEY = 'healing_spots';

export const SPOT_CATEGORIES: CategoryMeta[] = [
  {
    id: 'all',
    label: '全部',
    emoji: '✦',
    accentHex: '#34D399',
    badgeClass: 'bg-white/10 text-white border-white/20',
  },
  {
    id: 'sunset',
    label: '绝美落日',
    emoji: '🌅',
    accentHex: '#FBBF24',
    badgeClass: 'bg-amber-400/15 text-amber-200 border-amber-300/25',
  },
  {
    id: 'cats',
    label: '流浪猫基地',
    emoji: '🐱',
    accentHex: '#FB923C',
    badgeClass: 'bg-orange-400/15 text-orange-200 border-orange-300/25',
  },
  {
    id: 'quiet',
    label: '极静自习',
    emoji: '🤫',
    accentHex: '#A78BFA',
    badgeClass: 'bg-violet-400/15 text-violet-200 border-violet-300/25',
  },
  {
    id: 'lawn',
    label: '躺平草坪',
    emoji: '🌿',
    accentHex: '#34D399',
    badgeClass: 'bg-emerald-400/15 text-emerald-200 border-emerald-300/25',
  },
  {
    id: 'rooftop',
    label: '吹风天台',
    emoji: '🌬️',
    accentHex: '#38BDF8',
    badgeClass: 'bg-sky-400/15 text-sky-200 border-sky-300/25',
  },
];

export const QUIET_STATUS_META: Record<
  QuietStatus,
  { label: string; dotClass: string; pillClass: string }
> = {
  very_quiet: {
    label: '此刻很安静',
    dotClass: 'bg-emerald-400',
    pillClass: 'bg-emerald-400/15 text-emerald-200 border-emerald-300/25',
  },
  moderate: {
    label: '人不多·舒适',
    dotClass: 'bg-amber-400',
    pillClass: 'bg-amber-400/15 text-amber-200 border-amber-300/25',
  },
  crowded: {
    label: '稍微有点吵',
    dotClass: 'bg-rose-400',
    pillClass: 'bg-rose-400/15 text-rose-200 border-rose-300/25',
  },
};

export function getCategoryMeta(cat: SpotCategory | 'all'): CategoryMeta {
  return SPOT_CATEGORIES.find((c) => c.id === cat) ?? SPOT_CATEGORIES[0];
}

/**
 * 预置 7 个广西外国语学院五合校区（108.515971, 22.800697）真实氛围治愈点位
 */
const INITIAL_SPOTS: HealingSpot[] = [
  {
    id: 'gxufl-1',
    name: '明德楼西侧观景连廊',
    category: 'sunset',
    lng: 108.51512,
    lat: 22.80088,
    coverUrl:
      'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #F59E0B 0%, #9333EA 52%, #0F172A 100%)',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '6分钟前更新',
    rating: 4.9,
    recommendation:
      '南宁傍晚 18:10 的橘子海晚霞洒在蓝白欧式立面上美到失语，下完语种课来这里吹风放空最治愈。',
    likes: 218,
    tags: ['欧式落日', '微风连廊', '出片秘境'],
    reviews: [
      {
        id: 'rev-1',
        author: '匿名·小语种晚风人',
        content: '刚考完专四模拟上来发呆十五分钟，晚霞把尖顶染成粉金色，焦虑一下散了一半。',
        createdAt: '今天 18:20',
        moodTag: '被晚霞接住了',
      },
      {
        id: 'rev-2',
        author: '匿名·耳机隐身中',
        content: '风很温柔，西边拐角几乎没人走动，戴上降噪耳机像在另一个世界。',
        createdAt: '昨天 18:05',
        moodTag: '私藏机位',
      },
    ],
  },
  {
    id: 'gxufl-2',
    name: '化龙池欧式廊桥撸猫角',
    category: 'cats',
    lng: 108.51655,
    lat: 22.80122,
    coverUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #FB923C 0%, #B45309 55%, #1E293B 100%)',
    quietStatus: 'moderate',
    quietUpdatedAt: '12分钟前更新',
    rating: 4.9,
    recommendation:
      '湖边树荫下常驻几只超亲人的校猫，午后看着水面波光一边摸呼噜噜的大橘，电量瞬间回血。',
    likes: 264,
    tags: ['亲人校猫', '湖畔树荫', '允许摸头'],
    reviews: [
      {
        id: 'rev-3',
        author: '匿名·常备猫条同学',
        content: '今天大橘和三花都在桥头石阶晒太阳，蹭了我半天帆布包，太治愈啦！',
        createdAt: '今天 15:10',
        moodTag: '电量满格',
      },
    ],
  },
  {
    id: 'gxufl-3',
    name: '五合图书馆 4F 靠窗静区',
    category: 'quiet',
    lng: 108.51624,
    lat: 22.80205,
    coverUrl:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #8B5CF6 0%, #3730A3 58%, #0B0F19 100%)',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '刚刚更新',
    rating: 5.0,
    recommendation:
      '窗外正对整片绿树与尖顶轮廓，有独立台灯与插座，适合戴耳机静静整理思绪或背单词。',
    likes: 175,
    tags: ['极度安静', '靠窗采光', '有电源插座'],
    reviews: [
      {
        id: 'rev-4',
        author: '匿名·考研上岸中',
        content: '空调温度刚刚好，抬头能看到远处的云，在这里心率都会变慢。',
        createdAt: '今天 14:40',
        moodTag: '心率平稳',
      },
    ],
  },
  {
    id: 'gxufl-4',
    name: '天鹅湖西岸斜坡绿草坪',
    category: 'lawn',
    lng: 108.51468,
    lat: 22.79972,
    coverUrl:
      'https://images.unsplash.com/photo-1501854155220-e28231c1f165?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #34D399 0%, #047857 55%, #064E3B 100%)',
    quietStatus: 'moderate',
    quietUpdatedAt: '19分钟前更新',
    rating: 4.8,
    recommendation:
      '南宁的晚风混着青草香，傍晚买杯柠檬茶坐在斜坡上看天色变暗，合法暂停二十分钟。',
    likes: 193,
    tags: ['合法躺平', '湖面晚风', '青草香气'],
    reviews: [
      {
        id: 'rev-5',
        author: '匿名·偷得浮生半日闲',
        content: '不看手机光发呆二十分钟，感觉脑袋里打结的线都松开了。',
        createdAt: '今天 17:30',
        moodTag: '精神放风',
      },
    ],
  },
  {
    id: 'gxufl-5',
    name: '致达楼高层观风露台',
    category: 'rooftop',
    lng: 108.51718,
    lat: 22.80015,
    coverUrl:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #38BDF8 0%, #4F46E5 55%, #0B0F19 100%)',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '10分钟前更新',
    rating: 4.9,
    recommendation:
      '视野开阔能俯瞰整个五合欧式建筑群灯火，晚上 21:00 后上来吹南宁晚风，呼吸瞬间通畅。',
    likes: 207,
    tags: ['俯瞰校园', '夜景绝美', '晚风自由'],
    reviews: [
      {
        id: 'rev-6',
        author: '匿名·改完PPT的人',
        content: '站在栏杆边看楼下暖黄色路灯，突然觉得明天也没那么难熬了。',
        createdAt: '昨晚 21:45',
        moodTag: '世界静音',
      },
    ],
  },
  {
    id: 'gxufl-6',
    name: '田径场西侧最高排看台',
    category: 'sunset',
    lng: 108.51755,
    lat: 22.80215,
    coverUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #FBBF24 0%, #EC4899 55%, #1E1B4B 100%)',
    quietStatus: 'moderate',
    quietUpdatedAt: '24分钟前更新',
    rating: 4.7,
    recommendation:
      '坐在最高一排石阶看操场夜跑和远处粉色天际线，社恐不用参与也能沾到满满生命力。',
    likes: 146,
    tags: ['粉色天空', '社恐友好', '夜跑白噪音'],
    reviews: [
      {
        id: 'rev-7',
        author: '匿名·冰美式续命',
        content: '最高排几乎没人，听着下面微弱的风声和脚步声特别安心。',
        createdAt: '今天 19:10',
        moodTag: '低电量充电',
      },
    ],
  },
  {
    id: 'gxufl-7',
    name: '五合南门钟楼林荫长椅',
    category: 'quiet',
    lng: 108.51586,
    lat: 22.79758,
    coverUrl:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #10B981 0%, #0F766E 55%, #0B0F19 100%)',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '31分钟前更新',
    rating: 4.8,
    recommendation:
      '橙红尖塔城堡大门旁的绿荫角落，早八前或晚归时坐五分钟深呼吸，自带电影滤镜感。',
    likes: 132,
    tags: ['城堡大门', '林荫长椅', '雨天避世'],
    reviews: [
      {
        id: 'rev-8',
        author: '匿名·五合散步员',
        content: '下雨后树叶特别香，坐这儿听五分钟歌再去上课整个人都平静了。',
        createdAt: '2天前',
        moodTag: '氧气充足',
      },
    ],
  },
];

export const spotsService = {
  getAll(): HealingSpot[] {
    const stored = readStorage<HealingSpot[] | null>(STORAGE_KEY, null);
    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEY, INITIAL_SPOTS);
      return INITIAL_SPOTS;
    }
    return stored;
  },

  addSpot(
    payload: Omit<
      HealingSpot,
      'id' | 'likes' | 'reviews' | 'quietUpdatedAt' | 'isUserCreated'
    >
  ): HealingSpot {
    const list = this.getAll();
    const created: HealingSpot = {
      ...payload,
      id: `spot-ugc-${Date.now()}`,
      likes: 1,
      likedByMe: true,
      quietUpdatedAt: '刚刚标记',
      isUserCreated: true,
      reviews: [
        {
          id: `rev-${Date.now()}`,
          author: '匿名·首发探索者',
          content: payload.recommendation,
          createdAt: '刚刚',
          moodTag: '新发现秘境',
        },
      ],
    };
    const next = [created, ...list];
    writeStorage(STORAGE_KEY, next);
    return created;
  },

  toggleLike(spotId: string): HealingSpot[] {
    const next = this.getAll().map((spot) => {
      if (spot.id !== spotId) return spot;
      const likedByMe = !spot.likedByMe;
      return {
        ...spot,
        likedByMe,
        likes: Math.max(0, spot.likes + (likedByMe ? 1 : -1)),
      };
    });
    writeStorage(STORAGE_KEY, next);
    return next;
  },

  updateQuietStatus(spotId: string, status: QuietStatus): HealingSpot[] {
    const next = this.getAll().map((spot) =>
      spot.id === spotId
        ? { ...spot, quietStatus: status, quietUpdatedAt: '刚刚更新' }
        : spot
    );
    writeStorage(STORAGE_KEY, next);
    return next;
  },

  addReview(spotId: string, content: string, moodTag: string): HealingSpot[] {
    const aliasPool = [
      '匿名·晚风收藏家',
      '匿名·低电量同学',
      '匿名·耳机隐身人',
      '匿名·暂停5分钟',
      '匿名·落日巡航员',
    ];
    const newRev: SpotReview = {
      id: `rev-${Date.now()}`,
      author: aliasPool[Math.floor(Math.random() * aliasPool.length)],
      content: content.trim(),
      createdAt: '刚刚',
      moodTag,
    };
    const next = this.getAll().map((spot) =>
      spot.id === spotId ? { ...spot, reviews: [newRev, ...spot.reviews] } : spot
    );
    writeStorage(STORAGE_KEY, next);
    return next;
  },
};
