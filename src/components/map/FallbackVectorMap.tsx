import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { HealingSpot } from '../../types';
import { getCategoryMeta } from '../../services/spotsService';
import { CAMPUS_CENTER } from '../../utils/geo';

interface FallbackVectorMapProps {
  spots: HealingSpot[];
  selectedSpotId: string | null;
  mapStyle: 'dark' | 'satellite';
  isPickMode: boolean;
  focusTarget: { lng: number; lat: number; seq: number } | null;
  zoomTrigger: { delta: number; seq: number } | null;
  onSelectSpot: (spotId: string) => void;
  onCenterChange: (coords: { lng: number; lat: number }) => void;
  onPickClick: (coords: { lng: number; lat: number }) => void;
}

// 坐标映射：将校园经纬度范围映射到 1600x1200 矢量地图画布
const WORLD_W = 1600;
const WORLD_H = 1200;
const LNG_SPAN = 0.014; // 东西跨度 ~1.2km
const LAT_SPAN = 0.0105; // 南北跨度 ~1.1km

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

  // 响应外部缩放按钮
  useEffect(() => {
    if (!zoomTrigger) return;
    setScale((prev) => {
      const next = clampScale(prev + (zoomTrigger.delta > 0 ? 0.25 : -0.25));
      emitCenter(offset, next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomTrigger]);

  // 响应卡片点击 / 点位聚焦平移居中
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
    if (Math.hypot(dx, dy) > 5) {
      start.moved = true;
    }
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

    // 选点模式下单击地图直接拾取坐标并居中
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
          ? 'radial-gradient(circle at 50% 45%, #162624 0%, #0d161b 55%, #070b12 100%)'
          : 'radial-gradient(circle at 50% 40%, #121B2E 0%, #0B0F19 68%, #070A12 100%)',
      }}
    >
      {/* 居中可拖拽缩放的世界画布 */}
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
        {/* 矢量校园地形底图 SVG */}
        <svg
          viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
          className="w-full h-full pointer-events-none"
        >
          <defs>
            <pattern
              id="hud-grid"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke={isSat ? 'rgba(52,211,153,0.08)' : 'rgba(148,163,184,0.07)'}
                strokeWidth="1"
              />
            </pattern>
            <radialGradient id="lake-grad" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor={isSat ? '#0d5c63' : '#133b5c'} />
              <stop offset="100%" stopColor={isSat ? '#082c36' : '#0b2239'} />
            </radialGradient>
            <linearGradient id="lawn-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={isSat ? '#14532d' : '#0f2d27'} />
              <stop offset="100%" stopColor={isSat ? '#064e3b' : '#0b201e'} />
            </linearGradient>
            <linearGradient id="bldg-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isSat ? '#263547' : '#1b263b'} />
              <stop offset="100%" stopColor={isSat ? '#1a2533' : '#111827'} />
            </linearGradient>
          </defs>

          {/* 网格 */}
          <rect width={WORLD_W} height={WORLD_H} fill="url(#hud-grid)" />

          {/* 校园生态绿地（南湖草坪 + 东区植物园） */}
          <path
            d="M 240 650 Q 340 560 540 620 T 680 860 Q 520 960 320 900 Z"
            fill="url(#lawn-grad)"
            stroke="rgba(52,211,153,0.22)"
            strokeWidth="1.5"
          />
          <ellipse
            cx="1040"
            cy="920"
            rx="190"
            ry="115"
            fill="url(#lawn-grad)"
            stroke="rgba(52,211,153,0.2)"
            strokeWidth="1.5"
          />

          {/* 南湖水域 */}
          <path
            d="M 390 730 C 440 670, 580 680, 610 760 C 640 840, 520 880, 440 855 C 370 830, 350 780, 390 730 Z"
            fill="url(#lake-grad)"
            stroke="rgba(56,189,248,0.35)"
            strokeWidth="2"
          />

          {/* 校园主干道 & 银杏大道 */}
          <g
            fill="none"
            stroke={isSat ? 'rgba(226,232,240,0.2)' : 'rgba(148,163,184,0.18)'}
            strokeLinecap="round"
          >
            <path d="M 120 560 Q 800 535 1480 570" strokeWidth="18" />
            <path d="M 790 120 Q 770 600 810 1090" strokeWidth="18" />
            <path d="M 430 220 Q 470 550 410 980" strokeWidth="11" />
            <path d="M 1130 200 Q 1160 600 1120 1020" strokeWidth="11" />
            <path d="M 320 340 Q 820 315 1280 350" strokeWidth="10" />
            <path d="M 350 860 Q 820 820 1290 870" strokeWidth="10" />
          </g>

          {/* 道路中心荧光虚线 */}
          <g
            fill="none"
            stroke="rgba(52,211,153,0.16)"
            strokeDasharray="10 14"
            strokeWidth="1.5"
          >
            <path d="M 120 560 Q 800 535 1480 570" />
            <path d="M 790 120 Q 770 600 810 1090" />
          </g>

          {/* 操场跑道 */}
          <g transform="translate(565, 595)">
            <rect
              x="0"
              y="0"
              width="148"
              height="84"
              rx="42"
              fill={isSat ? '#3f1d28' : '#261826'}
              stroke="rgba(251,191,36,0.35)"
              strokeWidth="2"
            />
            <rect
              x="16"
              y="14"
              width="116"
              height="56"
              rx="28"
              fill={isSat ? '#14532d' : '#102a24'}
              stroke="rgba(52,211,153,0.28)"
              strokeWidth="1.5"
            />
          </g>

          {/* 校园建筑轮廓 */}
          <g
            fill="url(#bldg-grad)"
            stroke="rgba(148,163,184,0.26)"
            strokeWidth="1.5"
          >
            {/* 理科楼 */}
            <rect x="440" y="340" width="135" height="90" rx="10" />
            <rect x="462" y="430" width="90" height="24" rx="5" />
            {/* 新图书馆 */}
            <rect x="705" y="290" width="165" height="108" rx="14" />
            {/* 旧图书馆 & 紫藤架 */}
            <rect x="1020" y="405" width="130" height="86" rx="10" />
            {/* 艺术学院 */}
            <rect x="1150" y="705" width="136" height="92" rx="12" />
            {/* 三食堂 */}
            <rect x="655" y="750" width="118" height="72" rx="10" />
            {/* 植物园玻璃暖房 */}
            <circle
              cx="985"
              cy="945"
              r="44"
              fill="rgba(16,185,129,0.14)"
              stroke="rgba(52,211,153,0.45)"
            />
          </g>

          {/* 校园建筑中文地标文字 */}
          <g
            fill="rgba(203,213,225,0.52)"
            fontSize="13"
            fontWeight="500"
            textAnchor="middle"
          >
            <text x="508" y="390">理科楼</text>
            <text x="788" y="348">新图书馆</text>
            <text x="1085" y="452">旧图书馆</text>
            <text x="640" y="642">南操场</text>
            <text x="505" y="782" fill="rgba(125,211,252,0.7)">南湖</text>
            <text x="355" y="730" fill="rgba(110,231,183,0.68)">西岸草坪</text>
            <text x="1218" y="756">艺术学院</text>
            <text x="985" y="950" fill="rgba(110,231,183,0.75)">玻璃暖房</text>
            <text x="714" y="790">三食堂</text>
            <text x="800" y="528" fontSize="11" fill="rgba(148,163,184,0.45)">
              银杏大道 · Campus Pause
            </text>
          </g>

          {/* 模拟我的位置脉冲点（校园中心） */}
          <g transform={`translate(${WORLD_W / 2}, ${WORLD_H / 2})`}>
            <circle r="24" fill="rgba(56,189,248,0.12)" />
            <circle r="11" fill="rgba(56,189,248,0.25)" />
            <circle
              r="5.5"
              fill="#38BDF8"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          </g>
        </svg>

        {/* 自定义呼吸发光视觉点位 (Custom Markers) */}
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
                if (!isPickMode) {
                  onSelectSpot(spot.id);
                }
              }}
              style={{
                left: x,
                top: y,
                zIndex: isSelected ? 35 : 15,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
            >
              <motion.div
                animate={{ scale: isSelected ? 1.2 : 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                className="relative flex flex-col items-center"
              >
                {/* 呼吸发光外圈 */}
                <span
                  className="marker-ring-breathe absolute -inset-2 rounded-full pointer-events-none"
                  style={{
                    backgroundColor: `${meta.accentHex}26`,
                    border: `1.5px solid ${meta.accentHex}`,
                    boxShadow: `0 0 22px ${meta.accentHex}75`,
                  }}
                />
                {/* 圆形缩略图气泡 */}
                <div
                  className="relative w-11 h-11 rounded-full overflow-hidden shadow-glass flex items-center justify-center transition-all"
                  style={{
                    background: spot.fallbackGradient,
                    border: isSelected
                      ? '2.5px solid #FFFFFF'
                      : `2px solid ${meta.accentHex}`,
                  }}
                >
                  <img
                    src={spot.coverUrl}
                    alt={spot.name}
                    className="w-full h-full object-cover opacity-90"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#0B0F19] border border-white/25 text-[11px] flex items-center justify-center shadow">
                    {meta.emoji}
                  </span>
                </div>

                {/* 选中态悬浮名牌 */}
                <div
                  className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-slate-900/90 text-white border border-white/20 shadow-glass opacity-100 translate-y-0'
                      : 'bg-slate-900/75 text-slate-200 border border-white/10 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0'
                  }`}
                >
                  {spot.name}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
