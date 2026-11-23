import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Check,
  Crosshair,
  GraduationCap,
  Layers,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { HealingSpot, QuietStatus, SpotCategory } from '../../types';
import { SPOT_CATEGORIES, spotsService } from '../../services/spotsService';
import { CAMPUS_CENTER, CAMPUS_INFO, formatCoord } from '../../utils/geo';
import { soundEngine, triggerHaptic } from '../../utils/audio';
import { AMapCanvas, AMapCanvasHandle, PoiResult } from './AMapCanvas';
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
  const amapHandleRef = useRef<AMapCanvasHandle | null>(null);

  const [spots, setSpots] = useState<HealingSpot[]>(() => spotsService.getAll());
  const [searchQuery, setSearchQuery] = useState('');
  const [poiResults, setPoiResults] = useState<PoiResult[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const [activeCategory, setActiveCategory] = useState<SpotCategory | 'all'>(
    'all'
  );
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(
    () => spotsService.getAll()[0]?.id ?? null
  );
  const [detailSpotId, setDetailSpotId] = useState<string | null>(null);

  // 默认优先加载真实高德地图 JS API 2.0；仅网络异常或未配 Key 时降级矢量兜底
  const [engineMode, setEngineMode] = useState<'amap' | 'vector'>(
    hasAmapKey ? 'amap' : 'vector'
  );
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');

  // 定位状态
  const [userCoords, setUserCoords] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'ready' | 'campus'>(
    'locating'
  );

  // 地图控制信号
  const [focusTarget, setFocusTarget] = useState<{
    lng: number;
    lat: number;
    zoom?: number;
    seq: number;
  } | null>(null);
  const [zoomTrigger, setZoomTrigger] = useState<{
    delta: number;
    seq: number;
  } | null>(null);
  const [centerCoords, setCenterCoords] = useState(CAMPUS_CENTER);

  // UGC 选点 + 高德逆地理编码反查推荐名
  const [isPickMode, setIsPickMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [geoSuggestion, setGeoSuggestion] = useState<{
    name: string;
    address: string;
  } | null>(null);

  // 高德 PlaceSearch 校园建筑实时搜索（防抖 300ms）
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || engineMode !== 'amap') {
      setPoiResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const results = await amapHandleRef.current?.searchCampusPoi(q);
      setPoiResults(results ?? []);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, engineMode]);

  // 选点模式下拖动准星后自动反查高德地址（防抖 350ms）
  useEffect(() => {
    if (!isPickMode || engineMode !== 'amap') return;
    const timer = window.setTimeout(async () => {
      const info = await amapHandleRef.current?.reverseGeocode(
        centerCoords.lng,
        centerCoords.lat
      );
      if (info) setGeoSuggestion(info);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [isPickMode, centerCoords.lng, centerCoords.lat, engineMode]);

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

  const focusOnCoords = useCallback(
    (lng: number, lat: number, zoom?: number) => {
      setFocusTarget({ lng, lat, zoom, seq: Date.now() + Math.random() });
    },
    []
  );

  const handleAmapFailed = useCallback(
    (reason: string) => {
      setEngineMode('vector');
      setGpsStatus('campus');
      onShowToast(`${reason}，已自动切换至矢量校园地图`, 'info');
    },
    [onShowToast]
  );

  const handleAmapLoaded = useCallback(() => {
    setGpsStatus('locating');
  }, []);

  const handleUserLocation = useCallback(
    (coords: { lng: number; lat: number }, insideCampus: boolean) => {
      setUserCoords(coords);
      setGpsStatus('ready');
      if (insideCampus) {
        onShowToast('已精准定位至你的校内位置 ✨', 'success');
      } else {
        onShowToast(
          '已获取实时定位，当前默认展示广西外国语学院五合校区（点定位图标可跳转当前位置）',
          'info'
        );
      }
    },
    [onShowToast]
  );

  const handleLocationError = useCallback(
    (msg: string) => {
      setGpsStatus('campus');
      onShowToast(msg, 'info');
    },
    [onShowToast]
  );

  const handleSelectSpotFromMap = useCallback(
    (spotId: string) => {
      setSelectedSpotId(spotId);
      const found = spots.find((s) => s.id === spotId);
      if (found) focusOnCoords(found.lng, found.lat);
      soundEngine.playPop(540);
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
    setSpots(spotsService.toggleLike(spotId));
    soundEngine.playPop(640);
    triggerHaptic(15);
  }, []);

  const handleUpdateQuietStatus = useCallback(
    (spotId: string, status: QuietStatus) => {
      setSpots(spotsService.updateQuietStatus(spotId, status));
      soundEngine.playPop(700);
      onShowToast('已更新此刻实时安静度 ✨', 'success');
    },
    [onShowToast]
  );

  const handleAddReview = useCallback(
    (spotId: string, content: string, moodTag: string) => {
      setSpots(spotsService.addReview(spotId, content, moodTag));
      soundEngine.playPop(740);
      onShowToast('你的匿名治愈足迹已留在地图上', 'warm');
    },
    [onShowToast]
  );

  const handleEnterPickMode = () => {
    setIsPickMode(true);
    setDetailSpotId(null);
    setGeoSuggestion(null);
    onShowToast('轻点地图任意建筑，或拖动中央准星锁定坐标', 'info');
  };

  const handlePickClick = useCallback((coords: { lng: number; lat: number }) => {
    setCenterCoords(coords);
    soundEngine.playPop(600);
    triggerHaptic(16);
  }, []);

  const handleSelectPoi = (poi: PoiResult) => {
    setSearchFocused(false);
    setPoiResults([]);
    setSearchQuery('');
    setCenterCoords({ lng: poi.lng, lat: poi.lat });
    focusOnCoords(poi.lng, poi.lat, 17.6);
    setGeoSuggestion({ name: poi.name, address: poi.address });
    onShowToast(`已定位至「${poi.name}」，点右下角可将其标记为治愈点`, 'info');
  };

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
    setGeoSuggestion(null);
    focusOnCoords(created.lng, created.lat, 17.4);
    soundEngine.playCelebrationChime();
    triggerHaptic([20, 30, 40]);
    onShowToast(`🎉 已在五合校区点亮「${created.name}」`, 'success');
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#06080f]">
      {/* 全屏高德 JS API 2.0 地图（断网/异常时无缝降级矢量地图） */}
      <div className="absolute inset-0">
        {engineMode === 'amap' ? (
          <AMapCanvas
            ref={amapHandleRef}
            spots={filteredSpots}
            selectedSpotId={selectedSpotId}
            mapStyle={mapStyle}
            isPickMode={isPickMode}
            focusTarget={focusTarget}
            zoomTrigger={zoomTrigger}
            onSelectSpot={handleSelectSpotFromMap}
            onCenterChange={setCenterCoords}
            onPickClick={handlePickClick}
            onUserLocation={handleUserLocation}
            onLocationError={handleLocationError}
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

      {/* 顶部柔和暗角，让液态玻璃搜索栏更通透清晰 */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/55 via-black/15 to-transparent z-10" />

      {/* 顶部 Apple Liquid Glass 悬浮搜索与分类栏 */}
      <div className="absolute top-3 left-0 right-0 z-30 px-3.5 sm:px-5 pointer-events-none">
        <div className="max-w-4xl mx-auto space-y-2.5">
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* 液态玻璃搜索框 + 实时 POI 下拉 */}
            <div className="relative flex-1">
              <div className="liquid-dock rounded-full px-4 py-2.5 flex items-center gap-2.5">
                <Search className="w-4 h-4 text-white/60 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => window.setTimeout(() => setSearchFocused(false), 180)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索广外五合校区建筑、落日、图书馆…"
                  className="w-full bg-transparent text-[13px] sm:text-sm text-white placeholder:text-white/45 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setPoiResults([]);
                    }}
                    className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* 高德 PlaceSearch 校园建筑搜索结果下拉 */}
              <AnimatePresence>
                {searchFocused && poiResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="absolute top-full left-0 right-0 mt-2 liquid-glass-elevated rounded-[22px] p-1.5 z-40 divide-y divide-white/[0.07]"
                  >
                    {poiResults.map((poi) => (
                      <button
                        key={poi.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectPoi(poi)}
                        className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-white/[0.08] flex items-center gap-2.5 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-white truncate">
                            {poi.name}
                          </div>
                          <div className="text-[11px] text-white/45 truncate">
                            {poi.address}
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 右上角：校区徽章 + 引擎状态 */}
            <button
              type="button"
              onClick={() => {
                focusOnCoords(CAMPUS_CENTER.lng, CAMPUS_CENTER.lat, 16.6);
                onShowToast(`已回到 ${CAMPUS_INFO.name}`, 'info');
              }}
              className="hidden sm:inline-flex items-center gap-1.5 liquid-dock rounded-full px-3.5 py-2.5 text-xs text-white/90 hover:text-white shrink-0 transition-transform active:scale-95"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  engineMode === 'amap'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]'
                    : 'bg-amber-400'
                }`}
              />
              <span className="font-medium">{CAMPUS_INFO.shortName}</span>
            </button>
          </div>

          {/* 横向液态玻璃分类筛选胶囊 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto">
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
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active
                      ? 'bg-white text-slate-950 shadow-[0_4px_16px_rgba(255,255,255,0.28)]'
                      : 'liquid-glass text-white/80 hover:text-white'
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

      {/* 手机端左上角极简校区状态标签 */}
      <button
        type="button"
        onClick={() => {
          focusOnCoords(CAMPUS_CENTER.lng, CAMPUS_CENTER.lat, 16.6);
          onShowToast(`已回到 ${CAMPUS_INFO.name}`, 'info');
        }}
        className="sm:hidden absolute top-[102px] left-3.5 z-20 liquid-glass rounded-full px-2.5 py-1 text-[10.5px] text-white/85 flex items-center gap-1.5"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            engineMode === 'amap' ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
        {CAMPUS_INFO.shortName}
        {gpsStatus === 'ready' && (
          <span className="text-white/45">· GPS</span>
        )}
      </button>

      {/* 右侧 Apple Liquid Glass 悬浮地图控件（暗黑/卫星切换、缩放、定位、回校园） */}
      <div className="absolute right-3.5 sm:right-5 top-[156px] sm:top-1/2 sm:-translate-y-1/2 z-20 flex flex-col gap-2">
        {/* 暗黑 / 卫星图层切换 */}
        <button
          type="button"
          onClick={() => {
            const next = mapStyle === 'dark' ? 'satellite' : 'dark';
            setMapStyle(next);
            soundEngine.playPop(580);
            onShowToast(
              next === 'satellite' ? '已切换高清卫星图' : '已切换暗黑标准图',
              'info'
            );
          }}
          title="切换暗黑图 / 卫星图"
          className={`w-10 h-10 rounded-2xl liquid-dock flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
            mapStyle === 'satellite' ? 'text-emerald-300' : 'text-white/90'
          }`}
        >
          <Layers className="w-[17px] h-[17px]" />
          <span className="text-[9px] leading-none font-medium">
            {mapStyle === 'satellite' ? '卫星' : '暗黑'}
          </span>
        </button>

        {/* 缩放组 */}
        <div className="liquid-dock rounded-2xl overflow-hidden flex flex-col divide-y divide-white/12">
          <button
            type="button"
            onClick={() =>
              setZoomTrigger({ delta: 1, seq: Date.now() + Math.random() })
            }
            aria-label="放大"
            className="w-10 h-9 flex items-center justify-center text-white/90 hover:bg-white/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setZoomTrigger({ delta: -1, seq: Date.now() + Math.random() })
            }
            aria-label="缩小"
            className="w-10 h-9 flex items-center justify-center text-white/90 hover:bg-white/10 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* 申请定位权限 / 定位到我的实时位置 */}
        <button
          type="button"
          onClick={() => {
            if (engineMode === 'amap') {
              onShowToast('正在请求当前位置定位…', 'info');
              amapHandleRef.current?.locateUser(true);
            } else {
              focusOnCoords(CAMPUS_CENTER.lng, CAMPUS_CENTER.lat);
            }
            soundEngine.playPop(620);
          }}
          title="定位到我的位置"
          className="w-10 h-10 rounded-2xl liquid-dock flex items-center justify-center text-sky-300 hover:bg-white/10 active:scale-95 transition-all"
        >
          <LocateFixed className="w-[18px] h-[18px]" />
        </button>

        {/* 一键回到广西外国语学院五合校区 */}
        <button
          type="button"
          onClick={() => {
            focusOnCoords(CAMPUS_CENTER.lng, CAMPUS_CENTER.lat, 16.6);
            soundEngine.playPop(650);
            onShowToast('已回到广西外国语学院五合校区', 'info');
          }}
          title="回到广外五合校区"
          className="w-10 h-10 rounded-2xl liquid-dock flex items-center justify-center text-white/85 hover:text-white active:scale-95 transition-all"
        >
          <GraduationCap className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* 选点模式：屏幕中心苹果准星 (Crosshair) */}
      <AnimatePresence>
        {isPickMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <div className="relative flex flex-col items-center -translate-y-4">
              <div className="px-3.5 py-1 rounded-full liquid-dock text-[11px] text-white font-medium mb-2 max-w-[260px] truncate">
                {geoSuggestion?.name ||
                  `${formatCoord(centerCoords.lng)}, ${formatCoord(centerCoords.lat)}`}
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400/60 animate-ping opacity-35" />
                <Crosshair className="w-8 h-8 text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.95)]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部区域：常规卡片流 + 右下角液态玻璃标记按钮；选点模式显示确认条 */}
      <div className="absolute bottom-[88px] sm:bottom-[92px] left-0 right-0 z-20 pointer-events-none">
        {isPickMode ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto max-w-md mx-auto px-4"
          >
            <div className="liquid-glass-elevated rounded-[26px] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5 truncate">
                  <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                  {geoSuggestion?.name || '轻点地图或拖动准星选点'}
                </span>
                <span className="font-mono text-[10.5px] text-white/50 shrink-0">
                  {formatCoord(centerCoords.lng)}, {formatCoord(centerCoords.lat)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPickMode(false)}
                  className="flex-1 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white/80 text-xs font-medium"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex-[1.7] py-2.5 rounded-full bg-white text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  确认此位置并填写信息
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex justify-end px-4 sm:px-6">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleEnterPickMode}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-slate-950 font-semibold text-xs sm:text-[13px] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                标记治愈点
              </motion.button>
            </div>

            <div className="pointer-events-auto">
              <SpotCarousel
                spots={filteredSpots}
                selectedSpotId={selectedSpotId}
                referenceCoords={userCoords}
                onSelectFromCard={handleSelectFromCard}
                onOpenDetail={(spot) => setDetailSpotId(spot.id)}
                onToggleLike={handleToggleLike}
              />
            </div>
          </div>
        )}
      </div>

      {/* 详情抽屉 */}
      <SpotDetailDrawer
        spot={detailSpot}
        onClose={() => setDetailSpotId(null)}
        onToggleLike={handleToggleLike}
        onUpdateQuietStatus={handleUpdateQuietStatus}
        onAddReview={handleAddReview}
        onNavigateHint={(spot) => {
          setDetailSpotId(null);
          focusOnCoords(spot.lng, spot.lat, 18);
          onShowToast(`已锁定位置：慢步前往「${spot.name}」吧 🌿`, 'success');
        }}
      />

      {/* UGC 新增点位弹窗（自动带入高德逆地理编码反查地名） */}
      <AddSpotModal
        open={isAddModalOpen}
        coords={centerCoords}
        suggestedName={geoSuggestion?.name}
        suggestedAddress={geoSuggestion?.address}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSpotSubmit}
      />
    </div>
  );
};
