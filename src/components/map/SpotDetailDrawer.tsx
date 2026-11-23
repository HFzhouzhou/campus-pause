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
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* 滑出详情抽屉 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-50 max-w-2xl mx-auto max-h-[88vh] flex flex-col rounded-t-3xl bg-[#0F1626] border-t border-x border-white/15 shadow-2xl overflow-hidden"
          >
            {/* 顶部拖拽指示条 */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 pb-6">
              {/* 高清大图封面 */}
              <div className="relative h-56 sm:h-64 mx-4 mt-1 rounded-2xl overflow-hidden border border-white/10">
                <SafeImage
                  src={spot.coverUrl}
                  alt={spot.name}
                  fallbackGradient={spot.fallbackGradient}
                  emoji={getCategoryMeta(spot.category).emoji}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-black/30" />

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭详情"
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/75 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-black/55 backdrop-blur-md text-white border border-white/15 mb-1.5">
                      {getCategoryMeta(spot.category).emoji}{' '}
                      {getCategoryMeta(spot.category).label}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                      {spot.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-semibold shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    {spot.rating.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-5 mt-4 space-y-5">
                {/* 坐标、距离与快捷行动 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      距校园中心{' '}
                      {formatDistance(
                        calculateDistanceMeters(
                          CAMPUS_CENTER.lng,
                          CAMPUS_CENTER.lat,
                          spot.lng,
                          spot.lat
                        )
                      )}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatCoord(spot.lng)}, {formatCoord(spot.lat)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleLike(spot.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        spot.likedByMe
                          ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      出发去这里
                    </button>
                  </div>
                </div>

                {/* 推荐理由 + 标签 */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
                  <p className="text-sm text-slate-200 leading-relaxed">
                    “{spot.recommendation}”
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {spot.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 text-slate-300 border border-white/10"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 一键实时更新“此刻安静度” */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
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
                          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium border transition-all ${
                            active
                              ? `${meta.pillClass} shadow-sm scale-[1.01]`
                              : 'bg-white/[0.03] text-slate-400 border-white/10 hover:text-slate-200 hover:bg-white/[0.07]'
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

                {/* 学生匿名打卡评价流 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <MessageCircleHeart className="w-4 h-4 text-violet-300" />
                      同学匿名打卡 ({spot.reviews.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      全程匿名 · 仅留温柔足迹
                    </span>
                  </div>

                  {/* 快速打卡输入框 */}
                  <form
                    onSubmit={handleSubmitReview}
                    className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 mb-3 space-y-2.5"
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {MOOD_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSelectedMood(tag)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] border transition-colors ${
                            selectedMood === tag
                              ? 'bg-violet-500/25 text-violet-200 border-violet-400/40'
                              : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
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
                        placeholder="留下一句此刻的感受，给下一个路过的同学..."
                        className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/50"
                      />
                      <button
                        type="submit"
                        disabled={!reviewText.trim()}
                        className="px-3 py-2 rounded-xl bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-400/30 disabled:opacity-40 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>

                  {/* 评价列表 */}
                  <div className="space-y-2.5">
                    {spot.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                          <span className="font-medium text-slate-300">
                            {rev.author}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/20 text-[10px]">
                              {rev.moodTag}
                            </span>
                            <span className="text-slate-500">
                              {rev.createdAt}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-200/90 leading-relaxed">
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
