import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Navigation, Star } from 'lucide-react';
import { HealingSpot } from '../../types';
import { getCategoryMeta, QUIET_STATUS_META } from '../../services/spotsService';
import {
  CAMPUS_CENTER,
  calculateDistanceMeters,
  formatDistance,
} from '../../utils/geo';
import { SafeImage } from '../common/SafeImage';

interface SpotCarouselProps {
  spots: HealingSpot[];
  selectedSpotId: string | null;
  onSelectFromCard: (spot: HealingSpot) => void;
  onOpenDetail: (spot: HealingSpot) => void;
  onToggleLike: (spotId: string) => void;
}

export const SpotCarousel: React.FC<SpotCarouselProps> = ({
  spots,
  selectedSpotId,
  onSelectFromCard,
  onOpenDetail,
  onToggleLike,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const programmaticScrollRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);

  // 点击地图点位时，自动平滑滚动到对应卡片
  useEffect(() => {
    if (!selectedSpotId) return;
    const cardEl = cardRefs.current[selectedSpotId];
    if (cardEl && scrollRef.current) {
      programmaticScrollRef.current = true;
      cardEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 450);
    }
  }, [selectedSpotId]);

  // 滑动卡片时，自动探测居中卡片并联动地图平移居中
  const handleScroll = () => {
    if (programmaticScrollRef.current || !scrollRef.current) return;
    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      const container = scrollRef.current;
      if (!container) return;
      const containerCenter =
        container.getBoundingClientRect().left + container.clientWidth / 2;

      let closestSpot: HealingSpot | null = null;
      let minDist = Infinity;

      for (const spot of spots) {
        const el = cardRefs.current[spot.id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const dist = Math.abs(cardCenter - containerCenter);
        if (dist < minDist) {
          minDist = dist;
          closestSpot = spot;
        }
      }

      if (closestSpot && closestSpot.id !== selectedSpotId) {
        onSelectFromCard(closestSpot);
      }
    }, 110);
  };

  if (spots.length === 0) {
    return (
      <div className="px-4">
        <div className="hud-glass rounded-2xl p-4 text-center text-sm text-slate-300 max-w-md mx-auto">
          附近暂无匹配该筛选的治愈点，点右下角「+ 标记治愈点」分享你的秘密基地吧 ✨
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 sm:px-6 py-1"
    >
      {spots.map((spot) => {
        const isSelected = spot.id === selectedSpotId;
        const catMeta = getCategoryMeta(spot.category);
        const quietMeta = QUIET_STATUS_META[spot.quietStatus];
        const distMeters = calculateDistanceMeters(
          CAMPUS_CENTER.lng,
          CAMPUS_CENTER.lat,
          spot.lng,
          spot.lat
        );

        return (
          <motion.div
            key={spot.id}
            ref={(el) => {
              cardRefs.current[spot.id] = el;
            }}
            onClick={() => onSelectFromCard(spot)}
            whileTap={{ scale: 0.985 }}
            className={`snap-center shrink-0 w-[84vw] max-w-[348px] hud-glass-strong rounded-2xl p-3 cursor-pointer transition-all duration-300 ${
              isSelected
                ? 'border-emerald-400/50 shadow-[0_10px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(52,211,153,0.16)] -translate-y-0.5'
                : 'border-white/10 opacity-90 hover:opacity-100'
            }`}
          >
            <div className="flex gap-3">
              {/* 左侧实景封面图 */}
              <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-white/10">
                <SafeImage
                  src={spot.coverUrl}
                  alt={spot.name}
                  fallbackGradient={spot.fallbackGradient}
                  emoji={catMeta.emoji}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-sm text-[10px] font-medium text-white border border-white/10">
                  {catMeta.emoji} {catMeta.label}
                </span>
              </div>

              {/* 右侧信息 */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {spot.name}
                    </h3>
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-300 shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      {spot.rating.toFixed(1)}
                    </span>
                  </div>

                  {/* 距离 + 实时安静度 */}
                  <div className="mt-1.5 flex items-center flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {formatDistance(distMeters)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${quietMeta.pillClass}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${quietMeta.dotClass}`}
                      />
                      {quietMeta.label}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] text-slate-300/90 line-clamp-2 leading-relaxed">
                    {spot.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* 底部操作条 */}
            <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(spot.id);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                  spot.likedByMe
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    spot.likedByMe ? 'fill-rose-400 text-rose-400' : ''
                  }`}
                />
                <span>{spot.likes}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail(spot);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-200 border border-emerald-400/40 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                去这里 / 查看详情
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
