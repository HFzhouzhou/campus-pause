import { BuddyActivity, BuddyCategory } from '../types';
import { readStorage, writeStorage } from './storage';

const STORAGE_KEY = 'buddy_activities';

export const BUDDY_CATEGORIES: {
  id: BuddyCategory | 'all';
  label: string;
  emoji: string;
}[] = [
  { id: 'all', label: '全部搭子', emoji: '✨' },
  { id: 'walk', label: '暴走散步', emoji: '🚶' },
  { id: 'eat', label: '干饭不尴尬', emoji: '🍜' },
  { id: 'study', label: '静音监督', emoji: '🎧' },
  { id: 'sunset', label: '发呆看云', emoji: '🌅' },
];

export const QUICK_CIPHER_MESSAGES = [
  '我到集合点啦，挥个手就行',
  '戴降噪耳机，点头示意开启静音模式',
  '30分钟后各回各家，不用客气～',
  '正在路上，3分钟到！',
];

function buildInitialBuddies(): BuddyActivity[] {
  const now = Date.now();
  return [
    {
      id: 'buddy-1',
      title: '南操场暴走不说话搭子（30分钟）',
      category: 'walk',
      location: '南操场主席台左侧单杠',
      durationMinutes: 30,
      expiresAt: now + 26 * 60 * 1000,
      maxPeople: 3,
      joinedCount: 1,
      hostAlias: '低电量步行者',
      cipher: '穿深灰卫衣 + 戴头戴式耳机',
      vibeNote: '刚上完满课想迈开腿放空，全程可以零交流，走满 4 圈各自解散。',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: true,
      quickMessages: [
        {
          id: 'qm-1',
          sender: '低电量步行者',
          text: '我在主席台左边栏杆靠着，到了直接一起开走就好～',
          time: '3分钟前',
        },
      ],
    },
    {
      id: 'buddy-2',
      title: '三食堂干饭不尴尬搭子',
      category: 'eat',
      location: '三食堂二楼麻辣烫窗口旁',
      durationMinutes: 30,
      expiresAt: now + 19 * 60 * 1000,
      maxPeople: 2,
      joinedCount: 1,
      hostAlias: '干饭要紧同学',
      cipher: '桌角放一瓶乌龙茶',
      vibeNote: '想吃双人烤鱼或互相帮忙占座，吃饭期间各自刷手机完全 OK，绝不尬聊！',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: false,
      quickMessages: [
        {
          id: 'qm-2',
          sender: '干饭要紧同学',
          text: '我先去占个靠窗二人位，想吃啥窗口直接各自点！',
          time: '5分钟前',
        },
      ],
    },
    {
      id: 'buddy-3',
      title: '图书馆静音互相监督搭子',
      category: 'study',
      location: '新图 3F 东区靠窗长桌',
      durationMinutes: 30,
      expiresAt: now + 29 * 60 * 1000,
      maxPeople: 4,
      joinedCount: 2,
      hostAlias: '拖延症克星',
      cipher: '桌面立一张绿色便利贴',
      vibeNote: '手机统一反扣桌面 30 分钟，谁也不许偷刷短视频，到点点头收工！',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: true,
      quickMessages: [
        {
          id: 'qm-3',
          sender: '拖延症克星',
          text: '已经反扣手机进入番茄钟，来了直接坐对面就行。',
          time: '2分钟前',
        },
      ],
    },
    {
      id: 'buddy-4',
      title: '理科楼天台发呆看日落搭子',
      category: 'sunset',
      location: '理科楼 5F 西侧连廊',
      durationMinutes: 30,
      expiresAt: now + 22 * 60 * 1000,
      maxPeople: 3,
      joinedCount: 1,
      hostAlias: '橘子海观测员',
      cipher: '拿两杯冰美式（多出来一杯随缘）',
      vibeNote: '今天云层超适合出晚霞，一个人看有点安静过头，欢迎并排吹风不寒暄。',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: true,
      quickMessages: [
        {
          id: 'qm-4',
          sender: '橘子海观测员',
          text: '风不大，西边天空已经开始泛金黄色了！',
          time: '刚刚',
        },
      ],
    },
    {
      id: 'buddy-5',
      title: '旧图后门喂猫散步 30 分钟',
      category: 'walk',
      location: '旧图书馆后门紫藤架下',
      durationMinutes: 30,
      expiresAt: now + 24 * 60 * 1000,
      maxPeople: 2,
      joinedCount: 1,
      hostAlias: '猫条批发商',
      cipher: '背帆布包挂小鸭子挂件',
      vibeNote: '带了半包冻干，找个同样想摸猫充能的人一起蹲大橘，社恐极其友好。',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: false,
      quickMessages: [
        {
          id: 'qm-5',
          sender: '猫条批发商',
          text: '三花和学分大橘都在紫藤架下面晒肚皮！',
          time: '6分钟前',
        },
      ],
    },
  ];
}

export const buddyService = {
  getAll(): BuddyActivity[] {
    const stored = readStorage<BuddyActivity[] | null>(STORAGE_KEY, null);
    const now = Date.now();
    if (!stored || stored.length === 0) {
      const fresh = buildInitialBuddies();
      writeStorage(STORAGE_KEY, fresh);
      return fresh;
    }
    // 若预置卡片已全部过期，自动刷新倒计时确保随时演示都有鲜活倒计时
    const hasActive = stored.some((b) => b.expiresAt > now + 60 * 1000);
    if (!hasActive) {
      const refreshed = stored.map((b, idx) => ({
        ...b,
        expiresAt: now + (18 + ((idx * 4) % 12)) * 60 * 1000,
      }));
      writeStorage(STORAGE_KEY, refreshed);
      return refreshed;
    }
    return stored;
  },

  createBuddy(input: {
    title: string;
    category: BuddyCategory;
    location: string;
    durationMinutes: number;
    maxPeople: number;
    cipher: string;
    vibeNote: string;
    isSilent: boolean;
  }): BuddyActivity {
    const aliasPool = ['匿名发起人', '暂停一下同学', '限时同路人', '轻社交人类'];
    const hostAlias = aliasPool[Math.floor(Math.random() * aliasPool.length)];
    const created: BuddyActivity = {
      id: `buddy-ugc-${Date.now()}`,
      title: input.title.trim(),
      category: input.category,
      location: input.location.trim(),
      durationMinutes: input.durationMinutes,
      expiresAt: Date.now() + input.durationMinutes * 60 * 1000,
      maxPeople: input.maxPeople,
      joinedCount: 1,
      joinedByMe: true,
      hostAlias,
      cipher: input.cipher.trim() || '挥挥手机亮屏示意',
      vibeNote:
        input.vibeNote.trim() || '主打轻松无压，30分钟一起充个电，到点自由散场。',
      boundaryTag: '活动结束自动解散 · 不强制加微信',
      isSilent: input.isSilent,
      quickMessages: [
        {
          id: `qm-${Date.now()}`,
          sender: hostAlias,
          text: `临时频道已开启，暗号：${input.cipher.trim() || '挥挥手机亮屏示意'}`,
          time: '刚刚',
        },
      ],
    };
    const next = [created, ...this.getAll()];
    writeStorage(STORAGE_KEY, next);
    return created;
  },

  toggleJoin(id: string): { list: BuddyActivity[]; updated?: BuddyActivity } {
    let updated: BuddyActivity | undefined;
    const next = this.getAll().map((b) => {
      if (b.id !== id) return b;
      if (b.joinedByMe) {
        updated = {
          ...b,
          joinedByMe: false,
          joinedCount: Math.max(1, b.joinedCount - 1),
        };
        return updated;
      }
      if (b.joinedCount >= b.maxPeople) {
        updated = b;
        return b;
      }
      updated = {
        ...b,
        joinedByMe: true,
        joinedCount: b.joinedCount + 1,
      };
      return updated;
    });
    writeStorage(STORAGE_KEY, next);
    return { list: next, updated };
  },

  sendQuickMessage(id: string, text: string): { list: BuddyActivity[]; updated?: BuddyActivity } {
    let updated: BuddyActivity | undefined;
    const next = this.getAll().map((b) => {
      if (b.id !== id) return b;
      updated = {
        ...b,
        quickMessages: [
          ...b.quickMessages,
          {
            id: `qm-${Date.now()}`,
            sender: '我（已举手）',
            text,
            time: '刚刚',
          },
        ],
      };
      return updated;
    });
    writeStorage(STORAGE_KEY, next);
    return { list: next, updated };
  },
};
