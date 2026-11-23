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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="relative z-10 w-full sm:max-w-xl max-h-[88dvh] flex flex-col rounded-t-[32px] sm:rounded-[32px] bg-[#F2F2F7] border border-white shadow-[0_24px_64px_rgba(15,23,42,0.22)] overflow-hidden"
          >
            <div className="flex justify-center pt-2.5 pb-1 shrink-0 bg-white/80">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0 pb-6">
              <div className="bg-white/80 px-4 pb-4">
                <div className="relative h-52 sm:h-60 rounded-[24px] overflow-hidden shadow-sm">
                  <SafeImage
                    src={spot.coverUrl}
                    alt={spot.name}
                    fallbackGradient={spot.fallbackGradient}
                    emoji={getCategoryMeta(spot.category).emoji}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15" />

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="关闭详情"
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center text-[#1D1D1F] shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/90 text-[#1D1D1F] mb-1.5 shadow-sm">
                        {getCategoryMeta(spot.category).emoji}{' '}
                        {getCategoryMeta(spot.category).label}
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold text-white leading-tight tracking-tight drop-shadow">
                        {spot.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 text-[#FF9500] text-xs font-bold shrink-0 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-[#FF9500] text-[#FF9500]" />
                      {spot.rating.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 mt-4 space-y-4">
                {/* 坐标与快捷操作 */}
                <div className="bg-white rounded-[22px] p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span className="font-medium">
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
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatCoord(spot.lng)}, {formatCoord(spot.lat)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleLike(spot.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        spot.likedByMe
                          ? 'bg-rose-50 text-[#FF3B30] border-rose-200'
                          : 'bg-[#F2F2F7] text-slate-600 border-transparent hover:bg-slate-200/70'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          spot.likedByMe ? 'fill-[#FF3B30] text-[#FF3B30]' : ''
                        }`}
                      />
                      {spot.likes}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateHint(spot)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#0066D6] transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      出发去这里
                    </button>
                  </div>
                </div>

                {/* 安利理由 */}
                <div className="bg-white rounded-[22px] p-4 shadow-sm">
                  <p className="text-sm text-[#1D1D1F] leading-relaxed">
                    “{spot.recommendation}”
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {spot.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F2F2F7] text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 一键更新此刻安静度 */}
                <div className="bg-white rounded-[22px] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F]">
                      <Volume2 className="w-4 h-4 text-[#34C759]" />
                      一键更新此刻安静度
                    </div>
                    <span className="text-[11px] text-slate-400">
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
                          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl text-xs font-semibold border transition-all ${
                            active
                              ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                              : 'bg-[#F2F2F7] text-slate-600 border-transparent hover:bg-slate-200/70'
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

                {/* 同学打卡评价 */}
                <div className="bg-white rounded-[22px] p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-1.5">
                      <MessageCircleHeart className="w-4 h-4 text-[#AF52DE]" />
                      同学打卡 ({spot.reviews.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      分享此刻感受
                    </span>
                  </div>

                  <form onSubmit={handleSubmitReview} className="space-y-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {MOOD_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSelectedMood(tag)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                            selectedMood === tag
                              ? 'bg-[#007AFF] text-white'
                              : 'bg-[#F2F2F7] text-slate-600'
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
                        className="flex-1 bg-[#F2F2F7] rounded-full px-4 py-2 text-xs text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                      />
                      <button
                        type="submit"
                        disabled={!reviewText.trim()}
                        className="w-9 h-9 rounded-full bg-[#007AFF] text-white flex items-center justify-center disabled:opacity-35 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2.5 pt-1">
                    {spot.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="rounded-2xl bg-[#F2F2F7]/80 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                          <span className="font-semibold text-[#1D1D1F]">
                            {rev.author}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-white text-slate-600 text-[10px] font-medium">
                              {rev.moodTag}
                            </span>
                            <span className="text-slate-400">{rev.createdAt}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {rev.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
