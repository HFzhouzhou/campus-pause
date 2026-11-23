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
    emoji: '✨',
    accentHex: '#34D399',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  {
    id: 'sunset',
    label: '绝美落日',
    emoji: '🌅',
    accentHex: '#FBBF24',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  },
  {
    id: 'cats',
    label: '流浪猫基地',
    emoji: '🐱',
    accentHex: '#FB923C',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  },
  {
    id: 'quiet',
    label: '极静自习',
    emoji: '🤫',
    accentHex: '#A78BFA',
    badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
  },
  {
    id: 'lawn',
    label: '躺平草坪',
    emoji: '🌿',
    accentHex: '#34D399',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  {
    id: 'rooftop',
    label: '吹风天台',
    emoji: '🌬️',
    accentHex: '#38BDF8',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  },
];

export const QUIET_STATUS_META: Record<
  QuietStatus,
  { label: string; dotClass: string; pillClass: string }
> = {
  very_quiet: {
    label: '此刻很安静',
    dotClass: 'bg-emerald-400',
    pillClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
  moderate: {
    label: '人不多·舒适',
    dotClass: 'bg-amber-400',
    pillClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  crowded: {
    label: '稍微有点吵',
    dotClass: 'bg-rose-400',
    pillClass: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  },
};

export function getCategoryMeta(cat: SpotCategory | 'all'): CategoryMeta {
  return SPOT_CATEGORIES.find((c) => c.id === cat) ?? SPOT_CATEGORIES[0];
}

/**
 * 预置 7 个极具真实大学生活气息的校园治愈点位
 * 坐标围绕 CAMPUS_CENTER (116.310905, 39.992806) 分布，真实高德地图与矢量兜底地图通用
 */
const INITIAL_SPOTS: HealingSpot[] = [
  {
    id: 'spot-1',
    name: '理科楼 5F 西侧连廊天台',
    category: 'sunset',
    lng: 116.3082,
    lat: 39.9946,
    coverUrl:
      'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #F59E0B 0%, #9333EA 52%, #0F172A 100%)',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '8分钟前更新',
    rating: 4.9,
    recommendation:
      '每天 17:45 橘子海晚霞刚好落进教学楼缝隙里，几乎没人知道这里有长椅，戴降噪耳机发呆绝配。',
    likes: 186,
    tags: ['橘子海晚霞', '有插座长椅', '几乎无人'],
    reviews: [
      {
        id: 'rev-1',
        author: '匿名·物理系夜猫',
        content: '刚考完数理方程上来吹了二十分钟风，看着云从金黄变成暗紫，突然觉得挂科也没那么可怕了。',
        createdAt: '今天 18:12',
        moodTag: '被晚霞接住了',
      },
      {
        id: 'rev-2',
        author: '匿名·耳机党',
        content: '风挺大记得带外套，靠最西边柱子那儿完全背风！',
        createdAt: '昨天 17:55',
        moodTag: '私藏机位',
      },
    ],
  },
  {
    id: 'spot-2',
    name: '旧图书馆后门紫藤架猫窝',
    category: 'cats',
    lng: 116.3134,
    lat: 39.9939,
    coverUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #FB923C 0%, #B45309 55%, #1E293B 100%)',
    quietStatus: 'moderate',
    quietUpdatedAt: '15分钟前更新',
    rating: 4.8,
    recommendation:
      '校宠“学分”大橘和三花常驻晒太阳！带一根猫条就能收获 15 分钟无条件呼噜声疗愈。',
    likes: 243,
    tags: ['三只亲人猫', '允许摸肚皮', '午后阳光'],
    reviews: [
      {
        id: 'rev-3',
        author: '匿名·常备冻干人',
        content: '大橘今天心情超好，直接翻肚皮躺我帆布包上了，一周的组会怨气清零！',
        createdAt: '今天 14:20',
        moodTag: '电量满格',
      },
      {
        id: 'rev-4',
        author: '匿名·文学院路人',
        content: '下午三点光斑洒在地上，猫都在打呼噜，特别像日剧场景。',
        createdAt: '2天前',
        moodTag: '瞬间融化',
      },
    ],
  },
  {
    id: 'spot-3',
    name: '新馆 4F 建筑期刊夹层窗边',
    category: 'quiet',
    lng: 116.3106,
    lat: 39.9951,
    coverUrl:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #8B5CF6 0%, #3730A3 58%, #0B0F19 100%)',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '刚刚更新',
    rating: 5.0,
    recommendation:
      '全校隐藏最深的单人面窗位，抬头就是整排银杏树梢，没有卷王狂敲键盘，只有纸页翻动声。',
    likes: 152,
    tags: ['单人隔断', '双USB快充', '银杏窗景'],
    reviews: [
      {
        id: 'rev-5',
        author: '匿名·考研筑梦中',
        content: '不用大清早抢座！下午两点来居然还有空位，暖黄台灯太有安全感了。',
        createdAt: '今天 15:40',
        moodTag: '心率平稳',
      },
    ],
  },
  {
    id: 'spot-4',
    name: '南湖西岸斜坡大草坪',
    category: 'lawn',
    lng: 116.3076,
    lat: 39.9908,
    coverUrl:
      'https://images.unsplash.com/photo-1501854155220-e28231c1f165?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #34D399 0%, #047857 55%, #064E3B 100%)',
    quietStatus: 'moderate',
    quietUpdatedAt: '22分钟前更新',
    rating: 4.7,
    recommendation:
      '坡度刚刚好能当天然枕头，傍晚看湖面波光发呆，或者铺件外套合法躺平半小时。',
    likes: 198,
    tags: ['可合法躺平', '湖面微风', '周末有吉他声'],
    reviews: [
      {
        id: 'rev-6',
        author: '匿名·翘掉无效社团',
        content: '什么都不干、不刷手机、光看云飘过 20 分钟，比睡两小时还解乏。',
        createdAt: '今天 16:45',
        moodTag: '精神放风',
      },
    ],
  },
  {
    id: 'spot-5',
    name: '艺术学院顶楼露台观星台',
    category: 'rooftop',
    lng: 116.3145,
    lat: 39.9912,
    coverUrl:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #38BDF8 0%, #4F46E5 55%, #0B0F19 100%)',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '12分钟前更新',
    rating: 4.9,
    recommendation:
      '晚上 21:00 后最惊艳，能俯瞰整片教学区灯火和远处高架车流，大声叹口气也没人听见。',
    likes: 214,
    tags: ['夜景绝佳', '晚风自由', '适合放空'],
    reviews: [
      {
        id: 'rev-7',
        author: '匿名·改完第9版PPT',
        content: '把电脑合上上来吹十分钟晚风，看着楼下操场夜跑的小光点，呼吸顺畅多了。',
        createdAt: '昨晚 22:08',
        moodTag: '世界静音',
      },
    ],
  },
  {
    id: 'spot-6',
    name: '东区植物园玻璃暖房角落',
    category: 'quiet',
    lng: 116.3125,
    lat: 39.9896,
    coverUrl:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #10B981 0%, #0F766E 55%, #0B0F19 100%)',
    quietStatus: 'very_quiet',
    quietUpdatedAt: '35分钟前更新',
    rating: 4.8,
    recommendation:
      '下雨天避世天花板！满屋子蕨类和湿润草木香，听雨点砸在玻璃穹顶上超级助眠解压。',
    likes: 139,
    tags: ['雨天首选', '草木香气', '天然白噪音'],
    reviews: [
      {
        id: 'rev-8',
        author: '匿名·雨天爱好者',
        content: '戴着耳机假装在森林里，其实只是躲避早八后的疲惫，太治愈了。',
        createdAt: '3天前',
        moodTag: '氧气充足',
      },
    ],
  },
  {
    id: 'spot-7',
    name: '体育馆西看台最高排石阶',
    category: 'sunset',
    lng: 116.3091,
    lat: 39.9923,
    coverUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    fallbackGradient:
      'linear-gradient(135deg, #FBBF24 0%, #EC4899 55%, #1E1B4B 100%)',
    quietStatus: 'moderate',
    quietUpdatedAt: '18分钟前更新',
    rating: 4.6,
    recommendation:
      '买杯三食堂冰柠檬水坐最高一排，看操场上奔跑的人和粉色天空，不参与也能沾到一点活力。',
    likes: 117,
    tags: ['俯瞰操场', '粉色晚霞', '社恐友好'],
    reviews: [
      {
        id: 'rev-9',
        author: '匿名·冰美式续命',
        content: '在最高排完全没人打扰，看下面大家踢球跑步莫名很安心。',
        createdAt: '今天 17:30',
        moodTag: '低电量充电',
      },
    ],
  },
];

export const spotsService = {
  /** 获取全部治愈点位（后续可替换为云开发 collection('healing_spots').get()） */
  getAll(): HealingSpot[] {
    const stored = readStorage<HealingSpot[] | null>(STORAGE_KEY, null);
    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEY, INITIAL_SPOTS);
      return INITIAL_SPOTS;
    }
    return stored;
  },

  /** 新增 UGC 治愈点位 */
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

  /** 点赞 / 取消点赞 */
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

  /** 一键实时更新“此刻安静度” */
  updateQuietStatus(spotId: string, status: QuietStatus): HealingSpot[] {
    const next = this.getAll().map((spot) =>
      spot.id === spotId
        ? { ...spot, quietStatus: status, quietUpdatedAt: '刚刚更新' }
        : spot
    );
    writeStorage(STORAGE_KEY, next);
    return next;
  },

  /** 添加一条匿名打卡评价 */
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
