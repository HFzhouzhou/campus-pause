export type TabId = 'map' | 'vent' | 'anxiety' | 'buddy';

export type SpotCategory =
  | 'sunset'
  | 'cats'
  | 'quiet'
  | 'lawn'
  | 'rooftop';

export type QuietStatus = 'very_quiet' | 'moderate' | 'crowded';

export interface UserProfile {
  uid: string;
  email?: string;
  nickname: string;
  avatarUrl: string;
  authProvider: 'email' | 'wechat_miniprogram';
  /** 预留：后续微信小程序 wx.login 换取的 openid */
  wxOpenId?: string;
  /** 预留：微信开放平台 unionid，用于打通 Web 与小程序同一账号 */
  wxUnionId?: string;
  schoolName: string;
  createdAt: string;
}

/** 预留：微信小程序头像昵称授权回调数据结构 (<button open-type="chooseAvatar"> + <input type="nickname">) */
export interface WeChatProfilePayload {
  nickName?: string;
  avatarUrl?: string;
  wxCode?: string;
}

export interface SpotReview {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  moodTag: string;
}

export interface HealingSpot {
  id: string;
  name: string;
  category: SpotCategory;
  lng: number;
  lat: number;
  coverUrl: string;
  fallbackGradient: string;
  quietStatus: QuietStatus;
  quietUpdatedAt: string;
  rating: number; // 1 - 5
  recommendation: string;
  likes: number;
  likedByMe?: boolean;
  tags: string[];
  reviews: SpotReview[];
  isUserCreated?: boolean;
}

export interface CategoryMeta {
  id: SpotCategory | 'all';
  label: string;
  emoji: string;
  accentHex: string;
  badgeClass: string;
}

export interface VentBubble {
  id: string;
  content: string;
  tag: string;
  createdAt: string;
  hugs: number;
  empathy: number;
  huggedByMe?: boolean;
  empathizedByMe?: boolean;
  tone: 'mint' | 'amber' | 'lavender';
}

export interface MicroStepItem {
  id: string;
  title: string;
  detail: string;
  durationMinutes: number;
  completed: boolean;
}

export interface AnxietyBreakdown {
  id: string;
  prompt: string;
  empathyNote: string;
  steps: MicroStepItem[];
  createdAt: string;
  source: 'llm' | 'fallback';
}

export type BuddyCategory = 'walk' | 'eat' | 'study' | 'sunset' | 'chat_free';

export interface BuddyActivity {
  id: string;
  title: string;
  category: BuddyCategory;
  location: string;
  durationMinutes: number;
  expiresAt: number; // timestamp ms
  maxPeople: number;
  joinedCount: number;
  joinedByMe?: boolean;
  hostAlias: string;
  hostAvatar?: string;
  cipher: string;
  vibeNote: string;
  boundaryTag: string;
  isSilent: boolean;
  quickMessages: { id: string; sender: string; text: string; time: string }[];
}

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'warm';
}
