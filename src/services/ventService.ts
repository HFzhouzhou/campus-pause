import { VentBubble } from '../types';
import { readStorage, writeStorage } from './storage';

const STORAGE_KEY = 'vent_bubbles';

export const QUICK_VENT_TAGS = [
  '高数看不懂了',
  '小组作业全是我做',
  '秋招 0 Offer',
  '导员凌晨发消息',
  '论文查重率爆表',
  '室友外放打游戏',
];

/**
 * 隐形心理安全兜底关键词检测
 * 注意：仅在客户端本地温和触发暖光关怀卡片，不弹窗惊吓、不上报隐私
 */
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
  '扛不住想死',
];

export function detectHighRiskEmotion(text: string): boolean {
  const normalized = text.replace(/\s+/g, '');
  return HIGH_RISK_KEYWORDS.some((kw) => normalized.includes(kw));
}

const INITIAL_BUBBLES: VentBubble[] = [
  {
    id: 'vb-1',
    content: '小组 Pre 明天早八上台，四个组员三个已读不回，我现在还在图书馆改第 6 版 PPT…真的好想直接隐身。',
    tag: '小组作业全是我做',
    createdAt: '6分钟前',
    hugs: 42,
    empathy: 67,
    tone: 'lavender',
  },
  {
    id: 'vb-2',
    content: '秋招投了 84 份简历，收到 3 个面试全挂在二面，看着室友晒大厂 offer，假装祝福完躲进阳台深呼吸。',
    tag: '秋招 0 Offer',
    createdAt: '18分钟前',
    hugs: 89,
    empathy: 112,
    tone: 'amber',
  },
  {
    id: 'vb-3',
    content: '高数线代双杀，一道中值定理盯了四十分钟完全没思路，感觉脑子变成了一锅浆糊。',
    tag: '高数看不懂了',
    createdAt: '31分钟前',
    hugs: 35,
    empathy: 78,
    tone: 'mint',
  },
  {
    id: 'vb-4',
    content: '其实也没发生什么大事，就是连着上了三天满课，突然电量掉到 1%，想找个没人的地方安静发呆一小时。',
    tag: '低电量时刻',
    createdAt: '52分钟前',
    hugs: 64,
    empathy: 95,
    tone: 'lavender',
  },
  {
    id: 'vb-5',
    content: '导师发来一句“逻辑再理一下，明天聊聊”，四个字让我瞬间胃痛。',
    tag: '论文焦虑',
    createdAt: '1小时前',
    hugs: 53,
    empathy: 84,
    tone: 'amber',
  },
];

export const ventService = {
  /** 获取校园匿名共鸣墙气泡（无评论区，杜绝二次内耗） */
  getBubbles(): VentBubble[] {
    const stored = readStorage<VentBubble[] | null>(STORAGE_KEY, null);
    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEY, INITIAL_BUBBLES);
      return INITIAL_BUBBLES;
    }
    return stored;
  },

  /** 抱抱 +1 */
  toggleHug(id: string): VentBubble[] {
    const next = this.getBubbles().map((b) => {
      if (b.id !== id) return b;
      const huggedByMe = !b.huggedByMe;
      return {
        ...b,
        huggedByMe,
        hugs: Math.max(0, b.hugs + (huggedByMe ? 1 : -1)),
      };
    });
    writeStorage(STORAGE_KEY, next);
    return next;
  },

  /** 同感 +1 */
  toggleEmpathy(id: string): VentBubble[] {
    const next = this.getBubbles().map((b) => {
      if (b.id !== id) return b;
      const empathizedByMe = !b.empathizedByMe;
      return {
        ...b,
        empathizedByMe,
        empathy: Math.max(0, b.empathy + (empathizedByMe ? 1 : -1)),
      };
    });
    writeStorage(STORAGE_KEY, next);
    return next;
  },
};
