import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Heart, MapPin, Star } from 'lucide-react';
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
  referenceCoords: { lng: number; lat: number } | null;
  onSelectFromCard: (spot: HealingSpot) => void;
  onOpenDetail: (spot: HealingSpot) => void;
  onToggleLike: (spotId: string) => void;
}

export const SpotCarousel: React.FC<SpotCarouselProps> = ({
  spots,
  selectedSpotId,
  referenceCoords,
  onSelectFromCard,
  onOpenDetail,
  onToggleLike,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const ignoreScrollUntilRef = useRef<number>(0);
  const scrollTimerRef = useRef<number | null>(null);

  const origin = referenceCoords ?? CAMPUS_CENTER;

  // 地图选中点位时平滑滚动居中，屏蔽期间的 onScroll 回环避免跳动 bug
  useEffect(() => {
    if (!selectedSpotId) return;
    const cardEl = cardRefs.current[selectedSpotId];
    if (cardEl && scrollRef.current) {
      ignoreScrollUntilRef.current = Date.now() + 550;
      cardEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedSpotId]);

  const handleScroll = () => {
    if (Date.now() < ignoreScrollUntilRef.current || !scrollRef.current) return;
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);

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
        ignoreScrollUntilRef.current = Date.now() + 300;
        onSelectFromCard(closestSpot);
      }
    }, 140);
  };

  if (spots.length === 0) {
    return (
      <div className="px-4">
        <div className="liquid-glass-elevated rounded-[24px] p-4 text-center text-xs text-white/75 max-w-sm mx-auto">
          暂无匹配该分类的治愈点，点上方「+ 标记治愈点」分享你的校园秘密角落
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
          origin.lng,
          origin.lat,
          spot.lng,
          spot.lat
        );

        return (
          <motion.div
            key={spot.id}
            ref={(el) => {
              cardRefs.current[spot.id] = el;
            }}
            onClick={() => {
              ignoreScrollUntilRef.current = Date.now() + 500;
              onSelectFromCard(spot);
            }}
            whileTap={{ scale: 0.985 }}
            className={`snap-center shrink-0 w-[85vw] max-w-[344px] liquid-glass-elevated rounded-[26px] p-3 cursor-pointer transition-all duration-300 ${
              isSelected
                ? 'border-white/30 shadow-[0_18px_42px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.38)]'
                : 'border-white/12 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex gap-3 items-center">
              {/* 左侧圆角封面 */}
              <div className="relative w-[86px] h-[86px] rounded-[18px] overflow-hidden shrink-0 border border-white/15">
                <SafeImage
                  src={spot.coverUrl}
                  alt={spot.name}
                  fallbackGradient={spot.fallbackGradient}
                  emoji={catMeta.emoji}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md text-[10px] font-medium text-white/95 border border-white/15">
                  {catMeta.emoji} {catMeta.label}
                </span>
              </div>

              {/* 右侧信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[14px] font-semibold text-white truncate tracking-tight">
                    {spot.name}
                  </h3>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-300 shrink-0">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    {spot.rating.toFixed(1)}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-white/65">
                    <MapPin className="w-3 h-3 text-white/45" />
                    {formatDistance(distMeters)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${quietMeta.pillClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${quietMeta.dotClass}`} />
                    {quietMeta.label}
                  </span>
                </div>

                <p className="mt-1.5 text-[11.5px] text-white/68 line-clamp-2 leading-[1.45]">
                  {spot.recommendation}
                </p>
              </div>
            </div>

            {/* 底部轻量操作栏 */}
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.09] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(spot.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  spot.likedByMe
                    ? 'bg-rose-400/20 text-rose-200 border-rose-300/35'
                    : 'bg-white/[0.06] text-white/75 hover:bg-white/[0.12] border-white/10'
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
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold bg-white text-slate-950 hover:bg-white/90 transition-colors shadow-sm"
              >
                去这里 · 详情
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
