import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { HealingSpot } from '../../types';
import { getCategoryMeta } from '../../services/spotsService';
import { CAMPUS_CENTER } from '../../utils/geo';

interface FallbackVectorMapProps {
  spots: HealingSpot[];
  selectedSpotId: string | null;
  mapStyle: 'light' | 'satellite';
  isPickMode: boolean;
  focusTarget: { lng: number; lat: number; seq: number } | null;
  zoomTrigger: { delta: number; seq: number } | null;
  onSelectSpot: (spotId: string) => void;
  onCenterChange: (coords: { lng: number; lat: number }) => void;
  onPickClick: (coords: { lng: number; lat: number }) => void;
}

const WORLD_W = 1600;
const WORLD_H = 1200;
const LNG_SPAN = 0.01;
const LAT_SPAN = 0.0085;

function coordsToWorld(lng: number, lat: number) {
  const x = WORLD_W / 2 + ((lng - CAMPUS_CENTER.lng) / LNG_SPAN) * WORLD_W;
  const y = WORLD_H / 2 - ((lat - CAMPUS_CENTER.lat) / LAT_SPAN) * WORLD_H;
  return { x, y };
}

function worldToCoords(x: number, y: number) {
  const lng = CAMPUS_CENTER.lng + ((x - WORLD_W / 2) / WORLD_W) * LNG_SPAN;
  const lat = CAMPUS_CENTER.lat - ((y - WORLD_H / 2) / WORLD_H) * LAT_SPAN;
  return { lng, lat };
}

export const FallbackVectorMap: React.FC<FallbackVectorMapProps> = ({
  spots,
  selectedSpotId,
  mapStyle,
  isPickMode,
  focusTarget,
  zoomTrigger,
  onSelectSpot,
  onCenterChange,
  onPickClick,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1.05);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startOffsetX: number;
    startOffsetY: number;
    moved: boolean;
  } | null>(null);

  const clampScale = (s: number) => Math.min(2.35, Math.max(0.62, s));

  const emitCenter = useCallback(
    (nextOffset: { x: number; y: number }, nextScale: number) => {
      const worldCenterX = WORLD_W / 2 - nextOffset.x / nextScale;
      const worldCenterY = WORLD_H / 2 - nextOffset.y / nextScale;
      onCenterChange(worldToCoords(worldCenterX, worldCenterY));
    },
    [onCenterChange]
  );

  useEffect(() => {
    if (!zoomTrigger) return;
    setScale((prev) => {
      const next = clampScale(prev + (zoomTrigger.delta > 0 ? 0.25 : -0.25));
      emitCenter(offset, next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomTrigger]);

  useEffect(() => {
    if (!focusTarget) return;
    const { x, y } = coordsToWorld(focusTarget.lng, focusTarget.lat);
    const nextOffset = {
      x: (WORLD_W / 2 - x) * scale,
      y: (WORLD_H / 2 - y) * scale,
    };
    setOffset(nextOffset);
    emitCenter(nextOffset, scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-spot-marker="true"]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.clientX;
    const dy = e.clientY - start.clientY;
    if (Math.hypot(dx, dy) > 5) start.moved = true;
    const maxPan = 650 * scale;
    const nextOffset = {
      x: Math.max(-maxPan, Math.min(maxPan, start.startOffsetX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, start.startOffsetY + dy)),
    };
    setOffset(nextOffset);
    emitCenter(nextOffset, scale);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setIsDragging(false);

    if (start && !start.moved && isPickMode && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const clickOffsetX = e.clientX - (rect.left + rect.width / 2);
      const clickOffsetY = e.clientY - (rect.top + rect.height / 2);
      const worldX = WORLD_W / 2 + (clickOffsetX - offset.x) / scale;
      const worldY = WORLD_H / 2 + (clickOffsetY - offset.y) / scale;
      const coords = worldToCoords(worldX, worldY);
      const nextOffset = {
        x: (WORLD_W / 2 - worldX) * scale,
        y: (WORLD_H / 2 - worldY) * scale,
      };
      setOffset(nextOffset);
      onCenterChange(coords);
      onPickClick(coords);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setScale((prev) => {
      const next = clampScale(prev + delta);
      emitCenter(offset, next);
      return next;
    });
  };

  const isSat = mapStyle === 'satellite';

  return (
    <div
      ref={viewportRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none touch-none ${
        isPickMode
          ? 'cursor-crosshair'
          : isDragging
          ? 'cursor-grabbing'
          : 'cursor-grab'
      }`}
      style={{
        background: isSat
          ? 'radial-gradient(circle at 50% 45%, #1d352d 0%, #142228 60%, #0c131a 100%)'
          : '#ECEFF4',
      }}
    >
      <div
        className="absolute top-1/2 left-1/2 origin-center"
        style={{
          width: WORLD_W,
          height: WORLD_H,
          marginLeft: -WORLD_W / 2,
          marginTop: -WORLD_H / 2,
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transition: isDragging
            ? 'none'
            : 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <svg
          viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
          className="w-full h-full pointer-events-none"
        >
          <path
            d="M 420 630 Q 560 560 720 640 T 820 840 Q 640 900 470 830 Z"
            fill={isSat ? '#1f4e37' : '#D5F0D8'}
          />
          <path
            d="M 790 500 C 860 450, 960 480, 975 550 C 990 620, 890 650, 820 620 C 760 595, 750 540, 790 500 Z"
            fill={isSat ? '#1a5670' : '#BFE2FF'}
          />
          <g
            fill="none"
            stroke={isSat ? 'rgba(255,255,255,0.22)' : '#FFFFFF'}
            strokeLinecap="round"
          >
            <path d="M 160 1050 Q 800 1030 1460 1060" strokeWidth="24" />
            <path d="M 790 180 Q 785 600 795 1050" strokeWidth="18" />
            <path d="M 380 580 Q 800 560 1240 590" strokeWidth="14" />
          </g>
          <g transform="translate(970, 325)">
            <rect
              x="0"
              y="0"
              width="168"
              height="94"
              rx="47"
              fill={isSat ? '#6e3439' : '#F6C6BD'}
            />
            <rect
              x="18"
              y="16"
              width="132"
              height="62"
              rx="31"
              fill={isSat ? '#1f4e37' : '#CBEBC6'}
            />
          </g>
          <g
            fill={isSat ? '#2b394a' : '#DFE5EE'}
            stroke={isSat ? 'rgba(255,255,255,0.16)' : '#CFD7E3'}
            strokeWidth="1.5"
          >
            <rect x="595" y="520" width="142" height="92" rx="12" />
            <rect x="765" y="340" width="160" height="104" rx="14" />
            <rect x="935" y="640" width="136" height="86" rx="12" />
            <rect x="735" y="965" width="110" height="54" rx="10" />
          </g>
          <g
            fill={isSat ? 'rgba(255,255,255,0.72)' : '#64748B'}
            fontSize="13"
            fontWeight="600"
            textAnchor="middle"
          >
            <text x="666" y="570">明德楼</text>
            <text x="845" y="396">五合图书馆</text>
            <text x="880" y="558">化龙池</text>
            <text x="1054" y="376">田径场</text>
            <text x="1003" y="688">致达楼</text>
            <text x="600" y="750">天鹅湖草坪</text>
            <text x="790" y="996">五合南门钟楼</text>
          </g>
        </svg>

        {spots.map((spot) => {
          const { x, y } = coordsToWorld(spot.lng, spot.lat);
          const meta = getCategoryMeta(spot.category);
          const isSelected = spot.id === selectedSpotId;

          return (
            <button
              key={spot.id}
              type="button"
              data-spot-marker="true"
              onClick={(e) => {
                e.stopPropagation();
                if (!isPickMode) onSelectSpot(spot.id);
              }}
              style={{
                left: x,
                top: y,
                zIndex: isSelected ? 35 : 15,
              }}
              className="absolute -translate-x-1/2 -translate-y-full focus:outline-none"
            >
              <motion.div
                animate={{ scale: isSelected ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className="relative flex flex-col items-center"
              >
                <div className="relative">
                  <span
                    className="marker-ring-breathe absolute -inset-1.5 rounded-full pointer-events-none"
                    style={{
                      backgroundColor: `${meta.accentHex}28`,
                      border: `1.5px solid ${meta.accentHex}88`,
                    }}
                  />
                  <div
                    className="relative w-11 h-11 rounded-full p-[3px] bg-white shadow-lg"
                    style={{
                      boxShadow: isSelected
                        ? `0 8px 22px rgba(15,23,42,0.22), 0 0 0 2px ${meta.accentHex}`
                        : '0 6px 16px rgba(15,23,42,0.18)',
                    }}
                  >
                    <div
                      className="w-full h-full rounded-full overflow-hidden"
                      style={{ background: spot.fallbackGradient }}
                    >
                      <img
                        src={spot.coverUrl}
                        alt={spot.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div
                  className="w-0 h-0 -mt-[1px] border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent"
                  style={{
                    borderTopColor: isSelected ? meta.accentHex : '#FFFFFF',
                  }}
                />
                {isSelected && (
                  <div className="mt-1 px-2.5 py-0.5 rounded-full bg-white/95 shadow-md text-[11px] font-semibold text-[#1D1D1F] whitespace-nowrap">
                    {meta.emoji} {spot.name}
                  </div>
                )}
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
