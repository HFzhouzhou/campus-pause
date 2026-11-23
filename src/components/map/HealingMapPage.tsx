import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Crosshair,
  Layers,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { HealingSpot, QuietStatus, SpotCategory } from '../../types';
import { SPOT_CATEGORIES, spotsService } from '../../services/spotsService';
import { CAMPUS_CENTER, formatCoord } from '../../utils/geo';
import { soundEngine, triggerHaptic } from '../../utils/audio';
import { AMapCanvas } from './AMapCanvas';
import { FallbackVectorMap } from './FallbackVectorMap';
import { SpotCarousel } from './SpotCarousel';
import { SpotDetailDrawer } from './SpotDetailDrawer';
import { AddSpotModal } from './AddSpotModal';

interface HealingMapPageProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'warm') => void;
}

export const HealingMapPage: React.FC<HealingMapPageProps> = ({
  onShowToast,
}) => {
  const hasAmapKey = Boolean(import.meta.env.VITE_AMAP_KEY?.trim());

  const [spots, setSpots] = useState<HealingSpot[]>(() => spotsService.getAll());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SpotCategory | 'all'>(
    'all'
  );
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(
    () => spotsService.getAll()[0]?.id ?? null
  );
  const [detailSpotId, setDetailSpotId] = useState<string | null>(null);

  // 地图引擎状态：高德 2.0 优先，未配置 Key 或加载失败无缝降级为交互式暗黑矢量地图
  const [engineMode, setEngineMode] = useState<'amap' | 'vector'>(
    hasAmapKey ? 'amap' : 'vector'
  );
  const [fallbackReason, setFallbackReason] = useState<string>(
    hasAmapKey ? '' : '未配置高德 Key · 矢量演示引擎'
  );
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');

  // 地图控制信号
  const [focusTarget, setFocusTarget] = useState<{
    lng: number;
    lat: number;
    seq: number;
  } | null>(null);
  const [zoomTrigger, setZoomTrigger] = useState<{
    delta: number;
    seq: number;
  } | null>(null);
  const [centerCoords, setCenterCoords] = useState(CAMPUS_CENTER);

  // UGC 选点 & 弹窗
  const [isPickMode, setIsPickMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredSpots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return spots.filter((spot) => {
      const catMatch =
        activeCategory === 'all' || spot.category === activeCategory;
      const queryMatch =
        !q ||
        spot.name.toLowerCase().includes(q) ||
        spot.recommendation.toLowerCase().includes(q) ||
        spot.tags.some((t) => t.toLowerCase().includes(q));
      return catMatch && queryMatch;
    });
  }, [spots, activeCategory, searchQuery]);

  const detailSpot = useMemo(
    () => spots.find((s) => s.id === detailSpotId) ?? null,
    [spots, detailSpotId]
  );

  const handleAmapFailed = useCallback((reason: string) => {
    setEngineMode('vector');
    setFallbackReason(`${reason} · 已无缝切换矢量地图`);
  }, []);

  const handleAmapLoaded = useCallback(() => {
    setFallbackReason('');
  }, []);

  const focusOnCoords = useCallback((lng: number, lat: number) => {
    setFocusTarget({ lng, lat, seq: Date.now() + Math.random() });
  }, []);

  const handleSelectSpotFromMap = useCallback(
    (spotId: string) => {
      setSelectedSpotId(spotId);
      const found = spots.find((s) => s.id === spotId);
      if (found) {
        focusOnCoords(found.lng, found.lat);
      }
      soundEngine.playPop(520);
      triggerHaptic(12);
    },
    [spots, focusOnCoords]
  );

  const handleSelectFromCard = useCallback(
    (spot: HealingSpot) => {
      setSelectedSpotId(spot.id);
      focusOnCoords(spot.lng, spot.lat);
    },
    [focusOnCoords]
  );

  const handleToggleLike = useCallback((spotId: string) => {
    const next = spotsService.toggleLike(spotId);
    setSpots(next);
    soundEngine.playPop(640);
    triggerHaptic(15);
  }, []);

  const handleUpdateQuietStatus = useCallback(
    (spotId: string, status: QuietStatus) => {
      const next = spotsService.updateQuietStatus(spotId, status);
      setSpots(next);
      soundEngine.playPop(700);
      onShowToast('已更新此刻实时安静度，感谢分享状态 ✨', 'success');
    },
    [onShowToast]
  );

  const handleAddReview = useCallback(
    (spotId: string, content: string, moodTag: string) => {
      const next = spotsService.addReview(spotId, content, moodTag);
      setSpots(next);
      soundEngine.playPop(740);
      onShowToast('你的匿名治愈足迹已留在地图上', 'warm');
    },
    [onShowToast]
  );

  const handleEnterPickMode = () => {
    setIsPickMode(true);
    setDetailSpotId(null);
    onShowToast('拖动地图对准准星，或直接点击地图任意位置选点', 'info');
  };

  const handlePickClick = useCallback((coords: { lng: number; lat: number }) => {
    setCenterCoords(coords);
    soundEngine.playPop(600);
    triggerHaptic(18);
  }, []);

  const handleAddSpotSubmit = (data: {
    name: string;
    category: SpotCategory;
    lng: number;
    lat: number;
    coverUrl: string;
    fallbackGradient: string;
    quietStatus: QuietStatus;
    rating: number;
    recommendation: string;
    tags: string[];
  }) => {
    const created = spotsService.addSpot(data);
    setSpots(spotsService.getAll());
    setActiveCategory('all');
    setSearchQuery('');
    setSelectedSpotId(created.id);
    setIsAddModalOpen(false);
    setIsPickMode(false);
    focusOnCoords(created.lng, created.lat);
    soundEngine.playCelebrationChime();
    triggerHaptic([20, 30, 40]);
    onShowToast(`🎉 已成功点亮新治愈地标「${created.name}」！`, 'success');
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0B0F19]">
      {/* 全屏地图画布（高德 2.0 或 交互式暗黑矢量地图无缝兜底） */}
      <div className="absolute inset-0">
        {engineMode === 'amap' ? (
          <AMapCanvas
            spots={filteredSpots}
            selectedSpotId={selectedSpotId}
            mapStyle={mapStyle}
            isPickMode={isPickMode}
            focusTarget={focusTarget}
            zoomTrigger={zoomTrigger}
            onSelectSpot={handleSelectSpotFromMap}
            onCenterChange={setCenterCoords}
            onPickClick={handlePickClick}
            onLoadFailed={handleAmapFailed}
            onLoaded={handleAmapLoaded}
          />
        ) : (
          <FallbackVectorMap
            spots={filteredSpots}
            selectedSpotId={selectedSpotId}
            mapStyle={mapStyle}
            isPickMode={isPickMode}
            focusTarget={focusTarget}
            zoomTrigger={zoomTrigger}
            onSelectSpot={handleSelectSpotFromMap}
            onCenterChange={setCenterCoords}
            onPickClick={handlePickClick}
          />
        )}
      </div>

      {/* 顶部微暗渐变罩增强 HUD 可读性 */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[#0B0F19]/80 via-[#0B0F19]/30 to-transparent z-10" />

      {/* 顶部悬浮 HUD：品牌徽标 + 搜索框 + 分类筛选胶囊 */}
      <div className="absolute top-3 left-0 right-0 z-20 px-3 sm:px-5 pointer-events-none">
        <div className="max-w-5xl mx-auto space-y-2.5">
          {/* 第一行：毛玻璃搜索栏 + 右上角低调地图引擎提示 */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex-1 hud-glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-glass">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-violet-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              </div>
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜落日天台、流浪猫、极静自习角落..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 右上角低调引擎模式切换/状态提示 */}
            <button
              type="button"
              onClick={() => {
                if (engineMode === 'vector' && hasAmapKey) {
                  setEngineMode('amap');
                  onShowToast('正在切换回高德实时地图引擎', 'info');
                } else if (engineMode === 'amap') {
                  setEngineMode('vector');
                  setFallbackReason('手动预览 · 矢量暗黑模式');
                  onShowToast('已切换为交互式矢量校园地图', 'info');
                } else {
                  onShowToast(
                    '当前为离线矢量演示模式：在 .env.local 配置 VITE_AMAP_KEY 即可启用高德实景地图',
                    'info'
                  );
                }
              }}
              title={fallbackReason || '高德 JS API 2.0 已连接'}
              className="hidden sm:inline-flex items-center gap-1.5 hud-glass rounded-full px-3 py-2 text-[11px] text-slate-300 hover:text-white border border-white/10 shrink-0 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  engineMode === 'amap'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]'
                    : 'bg-amber-400 shadow-[0_0_8px_#FBBF24]'
                }`}
              />
              <span>
                {engineMode === 'amap' ? '高德 2.0 实景' : '矢量兜底模式'}
              </span>
            </button>
          </div>

          {/* 移动端超轻量右上角状态角标 + 分类筛选胶囊 */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {SPOT_CATEGORIES.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      triggerHaptic(10);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-md border ${
                      active
                        ? 'bg-emerald-400/25 text-emerald-100 border-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.25)]'
                        : 'bg-slate-900/70 text-slate-300 border-white/10 hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="mr-1">{cat.emoji}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 手机端右上角低调矢量兜底提示（紧贴分类栏下方右侧） */}
      {engineMode === 'vector' && (
        <button
          type="button"
          onClick={() =>
            onShowToast(
              '当前使用交互式矢量校园地图（支持缩放/拖拽/选点），配置 VITE_AMAP_KEY 可切换高德实景',
              'info'
            )
          }
          className="sm:hidden absolute top-[104px] right-3 z-20 hud-glass rounded-full px-2.5 py-1 text-[10px] text-slate-300 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          矢量校园地图
        </button>
      )}

      {/* 右侧 DJI Fly 风格悬浮控件（图层切换 / 缩放 / 复位校园中心） */}
      <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
        {/* 暗黑 / 卫星图层切换 */}
        <button
          type="button"
          onClick={() => {
            setMapStyle((s) => (s === 'dark' ? 'satellite' : 'dark'));
            soundEngine.playPop(580);
            onShowToast(
              mapStyle === 'dark' ? '已切换至卫星航拍视图' : '已切换至暗黑极简视图',
              'info'
            );
          }}
          title="切换暗黑 / 卫星图层"
          className={`w-10 h-10 rounded-xl hud-glass flex flex-col items-center justify-center gap-0.5 transition-colors ${
            mapStyle === 'satellite'
              ? 'border-emerald-400/50 text-emerald-300'
              : 'text-slate-200 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[9px] leading-none">
            {mapStyle === 'satellite' ? '卫星' : '暗黑'}
          </span>
        </button>

        {/* 缩放控制组 */}
        <div className="hud-glass rounded-xl overflow-hidden flex flex-col divide-y divide-white/10">
          <button
            type="button"
            onClick={() =>
              setZoomTrigger({ delta: 1, seq: Date.now() + Math.random() })
            }
            aria-label="放大地图"
            className="w-10 h-9 flex items-center justify-center text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setZoomTrigger({ delta: -1, seq: Date.now() + Math.random() })
            }
            aria-label="缩小地图"
            className="w-10 h-9 flex items-center justify-center text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* 回到校园中心 */}
        <button
          type="button"
          onClick={() => {
            focusOnCoords(CAMPUS_CENTER.lng, CAMPUS_CENTER.lat);
            soundEngine.playPop(620);
          }}
          title="回到校园中心"
          className="w-10 h-10 rounded-xl hud-glass flex items-center justify-center text-sky-300 hover:bg-white/10 transition-colors"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      {/* 选点模式：屏幕中心固定准星 (Crosshair) */}
      <AnimatePresence>
        {isPickMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <div className="relative flex flex-col items-center -translate-y-4">
              <div className="px-3 py-1 rounded-full hud-glass-strong text-[11px] text-emerald-300 font-mono mb-2 border border-emerald-400/40 shadow-glow-mint">
                {formatCoord(centerCoords.lng)}, {formatCoord(centerCoords.lat)}
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400/70 animate-ping opacity-35" />
                <Crosshair className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部区域：常规模式显示「+ 标记治愈点」悬浮按钮 + DJI Fly 底部卡片流；选点模式显示确认条 */}
      <div className="absolute bottom-[82px] sm:bottom-[86px] left-0 right-0 z-20 pointer-events-none">
        {isPickMode ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto max-w-md mx-auto px-4"
          >
            <div className="hud-glass-strong rounded-2xl p-3.5 border border-emerald-400/35 shadow-glass space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  选点模式：拖动准星或轻点地图
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {formatCoord(centerCoords.lng)}, {formatCoord(centerCoords.lat)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPickMode(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10"
                >
                  取消选点
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex-[1.7] py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-glow-mint"
                >
                  <Check className="w-4 h-4" />
                  确认此位置并填写信息
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {/* 右下角醒目 UGC 悬浮按钮「+ 标记治愈点」 */}
            <div className="flex justify-end px-4 sm:px-6">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEnterPickMode}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-semibold text-xs sm:text-sm shadow-[0_6px_26px_rgba(52,211,153,0.45)] border border-emerald-200/60"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                标记治愈点
              </motion.button>
            </div>

            {/* 底部横向滑动卡片流 */}
            <div className="pointer-events-auto">
              <SpotCarousel
                spots={filteredSpots}
                selectedSpotId={selectedSpotId}
                onSelectFromCard={handleSelectFromCard}
                onOpenDetail={(spot) => setDetailSpotId(spot.id)}
                onToggleLike={handleToggleLike}
              />
            </div>
          </div>
        )}
      </div>

      {/* 点位详情抽屉 */}
      <SpotDetailDrawer
        spot={detailSpot}
        onClose={() => setDetailSpotId(null)}
        onToggleLike={handleToggleLike}
        onUpdateQuietStatus={handleUpdateQuietStatus}
        onAddReview={handleAddReview}
        onNavigateHint={(spot) => {
          setDetailSpotId(null);
          focusOnCoords(spot.lng, spot.lat);
          onShowToast(`已锁定路线指引：前往「${spot.name}」，慢步走过去吧 🌿`, 'success');
        }}
      />

      {/* UGC 新增点位弹窗 */}
      <AddSpotModal
        open={isAddModalOpen}
        coords={centerCoords}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSpotSubmit}
      />
    </div>
  );
};
