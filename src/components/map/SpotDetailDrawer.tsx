import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Heart,
  MapPin,
  MessageCircleHeart,
  Navigation,
  Send,
  Star,
  Volume2,
  X,
} from 'lucide-react';
import { HealingSpot, QuietStatus } from '../../types';
import { getCategoryMeta, QUIET_STATUS_META } from '../../services/spotsService';
import {
  CAMPUS_CENTER,
  calculateDistanceMeters,
  formatCoord,
  formatDistance,
} from '../../utils/geo';
import { SafeImage } from '../common/SafeImage';

interface SpotDetailDrawerProps {
  spot: HealingSpot | null;
  onClose: () => void;
  onToggleLike: (spotId: string) => void;
  onUpdateQuietStatus: (spotId: string, status: QuietStatus) => void;
  onAddReview: (spotId: string, content: string, moodTag: string) => void;
  onNavigateHint: (spot: HealingSpot) => void;
}

const MOOD_TAGS = ['被治愈到了', '很安静好呆', '晚风超舒服', '电量+50%'];

export const SpotDetailDrawer: React.FC<SpotDetailDrawerProps> = ({
  spot,
  onClose,
  onToggleLike,
  onUpdateQuietStatus,
  onAddReview,
  onNavigateHint,
}) => {
  const [reviewText, setReviewText] = useState('');
  const [selectedMood, setSelectedMood] = useState(MOOD_TAGS[0]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spot || !reviewText.trim()) return;
    onAddReview(spot.id, reviewText.trim(), selectedMood);
    setReviewText('');
  };

  return (
    <AnimatePresence>
      {spot && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 max-w-2xl mx-auto max-h-[88vh] flex flex-col rounded-t-[34px] liquid-glass-elevated overflow-hidden"
          >
            <div className="flex justify-center pt-3 pb-1.5 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/25" />
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 pb-8">
              <div className="relative h-56 sm:h-64 mx-4 mt-1 rounded-[24px] overflow-hidden border border-white/15">
                <SafeImage
                  src={spot.coverUrl}
                  alt={spot.name}
                  fallbackGradient={spot.fallbackGradient}
                  emoji={getCategoryMeta(spot.category).emoji}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭详情"
                  className="absolute top-3 right-3 w-9 h-9 rounded-full liquid-dock flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-black/50 backdrop-blur-md text-white/95 border border-white/15 mb-1.5">
                      {getCategoryMeta(spot.category).emoji}{' '}
                      {getCategoryMeta(spot.category).label}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-white leading-tight tracking-tight">
                      {spot.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-amber-300 text-xs font-semibold shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    {spot.rating.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-5 mt-4 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-white/65">
                    <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                    <span>
                      距校区中心{' '}
                      {formatDistance(
                        calculateDistanceMeters(
                          CAMPUS_CENTER.lng,
                          CAMPUS_CENTER.lat,
                          spot.lng,
                          spot.lat
                        )
                      )}
                    </span>
                    <span className="text-white/25">·</span>
                    <span className="font-mono text-[11px] text-white/45">
                      {formatCoord(spot.lng)}, {formatCoord(spot.lat)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleLike(spot.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        spot.likedByMe
                          ? 'bg-rose-400/20 text-rose-200 border-rose-300/40'
                          : 'bg-white/[0.07] text-white/80 border-white/12 hover:bg-white/[0.12]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          spot.likedByMe ? 'fill-rose-400 text-rose-400' : ''
                        }`}
                      />
                      {spot.likes}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateHint(spot)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-950 hover:bg-white/90 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      出发去这里
                    </button>
                  </div>
                </div>

                <div className="rounded-[22px] bg-white/[0.06] border border-white/12 p-4">
                  <p className="text-sm text-white/90 leading-relaxed">
                    “{spot.recommendation}”
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {spot.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/[0.07] text-white/70 border border-white/10"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] bg-white/[0.06] border border-white/12 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white/85">
                      <Volume2 className="w-4 h-4 text-emerald-300" />
                      一键更新此刻安静度
                    </div>
                    <span className="text-[11px] text-white/45">
                      {spot.quietUpdatedAt}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'very_quiet', label: '很安静' },
                        { id: 'moderate', label: '人不多' },
                        { id: 'crowded', label: '有点吵' },
                      ] as { id: QuietStatus; label: string }[]
                    ).map((opt) => {
                      const active = spot.quietStatus === opt.id;
                      const meta = QUIET_STATUS_META[opt.id];
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onUpdateQuietStatus(spot.id, opt.id)}
                          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl text-xs font-medium border transition-all ${
                            active
                              ? 'bg-white text-slate-950 border-white font-semibold'
                              : 'bg-white/[0.05] text-white/70 border-white/10 hover:bg-white/[0.1]'
                          }`}
                        >
                          {active ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`}
                            />
                          )}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <MessageCircleHeart className="w-4 h-4 text-violet-300" />
                      同学匿名打卡 ({spot.reviews.length})
                    </h3>
                    <span className="text-[11px] text-white/45">
                      全程匿名 · 温柔足迹
                    </span>
                  </div>

                  <form
                    onSubmit={handleSubmitReview}
                    className="rounded-[22px] bg-white/[0.05] border border-white/12 p-3.5 mb-3 space-y-2.5"
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {MOOD_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSelectedMood(tag)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] border transition-colors ${
                            selectedMood === tag
                              ? 'bg-white text-slate-950 border-white font-medium'
                              : 'bg-white/[0.06] text-white/65 border-white/10'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="留下一句此刻的感受，给下一个路过的同学…"
                        className="flex-1 bg-black/35 border border-white/12 rounded-full px-4 py-2 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-white/35"
                      />
                      <button
                        type="submit"
                        disabled={!reviewText.trim()}
                        className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center disabled:opacity-35 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2.5">
                    {spot.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="rounded-[20px] bg-white/[0.05] border border-white/[0.08] p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                          <span className="font-medium text-white/80">
                            {rev.author}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px]">
                              {rev.moodTag}
                            </span>
                            <span className="text-white/40">{rev.createdAt}</span>
                          </div>
                        </div>
                        <p className="text-xs text-white/80 leading-relaxed">
                          {rev.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
