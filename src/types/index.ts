export type TabId = 'map' | 'vent' | 'anxiety' | 'buddy';

export type SpotCategory =
  | 'sunset'
  | 'cats'
  | 'quiet'
  | 'lawn'
  | 'rooftop';

export type QuietStatus = 'very_quiet' | 'moderate' | 'crowded';

export interface SpotReview {
  id: string;
  author: string;
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
  cipher: string; // e.g., "穿黑色卫衣拿冰美式"
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
