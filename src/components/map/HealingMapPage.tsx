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
import { useAuth } from '../../context/AuthContext';
import { AccountPill } from '../common/AccountPill';
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
  const { user, requireAuth } = useAuth();
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

  const [engineMode, setEngineMode] = useState<'amap' | 'vector'>(
    hasAmapKey ? 'amap' : 'vector'
  );
  const [mapStyle, setMapStyle] = useState<'light' | 'satellite'>('light');

  const [userCoords, setUserCoords] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'ready' | 'campus'>(
    'locating'
  );

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

  const [isPickMode, setIsPickMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [geoSuggestion, setGeoSuggestion] = useState<{
    name: string;
    address: string;
  } | null>(null);

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
          '已获取实时定位，当前默认展示广西外国语学院五合校区（点右侧定位按钮可跳转我的位置）',
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

  const handleToggleLike = useCallback(
    (spotId: string) => {
      requireAuth('点赞收藏治愈点', () => {
        setSpots(spotsService.toggleLike(spotId));
        soundEngine.playPop(640);
        triggerHaptic(15);
      });
    },
    [requireAuth]
  );

  const handleUpdateQuietStatus = useCallback(
    (spotId: string, status: QuietStatus) => {
      requireAuth('更新实时安静度', () => {
        setSpots(spotsService.updateQuietStatus(spotId, status));
        soundEngine.playPop(700);
        onShowToast('已更新此刻实时安静度 ✨', 'success');
      });
    },
    [requireAuth, onShowToast]
  );

  const handleAddReview = useCallback(
    (spotId: string, content: string, moodTag: string) => {
      requireAuth('发布校园打卡足迹', () => {
        setSpots(
          spotsService.addReview(
            spotId,
            content,
            moodTag,
            user?.nickname,
            user?.avatarUrl
          )
        );
        soundEngine.playPop(740);
        onShowToast('你的治愈足迹已留在地图上', 'warm');
      });
    },
    [requireAuth, user, onShowToast]
  );

  const handleEnterPickMode = () => {
    requireAuth('标记新的校园治愈点', () => {
      setIsPickMode(true);
      setDetailSpotId(null);
      setGeoSuggestion(null);
      onShowToast('轻点地图任意建筑，或拖动中央准星锁定坐标', 'info');
    });
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
    const created = spotsService.addSpot(data, user?.nickname, user?.avatarUrl);
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
    <div className="relative w-full h-full overflow-hidden bg-[#ECEFF4]">
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

      {/* 顶部 Apple Maps 悬浮搜索栏 + 账号胶囊 + 分类胶囊 */}
      <div className="absolute top-3 left-0 right-0 z-30 px-3.5 sm:px-5 pointer-events-none">
        <div className="max-w-4xl mx-auto space-y-2.5">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="relative flex-1">
              <div className="liquid-dock rounded-full px-4 py-2.5 flex items-center gap-2.5">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() =>
                    window.setTimeout(() => setSearchFocused(false), 180)
                  }
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索广外五合校区建筑、落日、图书馆…"
                  className="w-full bg-transparent text-[13px] sm:text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setPoiResults([]);
                    }}
                    className="w-5 h-5 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {searchFocused && poiResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="absolute top-full left-0 right-0 mt-2 liquid-glass-elevated rounded-[22px] p-1.5 z-40 divide-y divide-slate-100"
                  >
                    {poiResults.map((poi) => (
                      <button
                        key={poi.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectPoi(poi)}
                        className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-slate-100/80 flex items-center gap-2.5 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-[#007AFF]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[#1D1D1F] truncate">
                            {poi.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {poi.address}
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 顶部登录 / 个人头像液态胶囊 */}
            <AccountPill />
          </div>

          {/* 分类胶囊 */}
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
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[#1D1D1F] text-white shadow-sm'
                      : 'liquid-glass text-slate-700 hover:text-[#1D1D1F]'
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

      {/* 左上角极简校区坐标胶囊 */}
      <button
        type="button"
        onClick={() => {
          focusOnCoords(CAMPUS_CENTER.lng, CAMPUS_CENTER.lat, 16.6);
          onShowToast(`已回到 ${CAMPUS_INFO.name}`, 'info');
        }}
        className="absolute top-[106px] left-3.5 sm:left-5 z-20 liquid-glass rounded-full px-3 py-1 text-[11px] font-medium text-slate-700 flex items-center gap-1.5"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            engineMode === 'amap' ? 'bg-[#34C759]' : 'bg-[#FF9500]'
          }`}
        />
        {CAMPUS_INFO.shortName}
        {gpsStatus === 'ready' && (
          <span className="text-slate-400">· GPS已定位</span>
        )}
      </button>

      {/* 右侧 Apple 液态玻璃地图控件 */}
      <div className="absolute right-3.5 sm:right-5 top-[148px] sm:top-1/2 sm:-translate-y-1/2 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            const next = mapStyle === 'light' ? 'satellite' : 'light';
            setMapStyle(next);
            soundEngine.playPop(580);
            onShowToast(
              next === 'satellite' ? '已切换高清卫星图' : '已切换清透标准图',
              'info'
            );
          }}
          title="切换标准图 / 卫星图"
          className={`w-10 h-10 rounded-2xl liquid-dock flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
            mapStyle === 'satellite' ? 'text-[#007AFF]' : 'text-slate-700'
          }`}
        >
          <Layers className="w-[17px] h-[17px]" />
          <span className="text-[9px] leading-none font-semibold">
            {mapStyle === 'satellite' ? '卫星' : '标准'}
          </span>
        </button>

        <div className="liquid-dock rounded-2xl overflow-hidden flex flex-col divide-y divide-slate-200/70">
          <button
            type="button"
            onClick={() =>
              setZoomTrigger({ delta: 1, seq: Date.now() + Math.random() })
            }
            aria-label="放大"
            className="w-10 h-9 flex items-center justify-center text-slate-700 hover:bg-black/[0.04] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setZoomTrigger({ delta: -1, seq: Date.now() + Math.random() })
            }
            aria-label="缩小"
            className="w-10 h-9 flex items-center justify-center text-slate-700 hover:bg-black/[0.04] transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

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
          className="w-10 h-10 rounded-2xl liquid-dock flex items-center justify-center text-[#007AFF] active:scale-95 transition-all"
        >
          <LocateFixed className="w-[18px] h-[18px]" />
        </button>

        <button
          type="button"
          onClick={() => {
            focusOnCoords(CAMPUS_CENTER.lng, CAMPUS_CENTER.lat, 16.6);
            soundEngine.playPop(650);
            onShowToast('已回到广西外国语学院五合校区', 'info');
          }}
          title="回到广外五合校区"
          className="w-10 h-10 rounded-2xl liquid-dock flex items-center justify-center text-slate-700 active:scale-95 transition-all"
        >
          <GraduationCap className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* 选点模式准星 */}
      <AnimatePresence>
        {isPickMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <div className="relative flex flex-col items-center -translate-y-4">
              <div className="px-3.5 py-1 rounded-full liquid-glass-elevated text-[11.5px] text-[#1D1D1F] font-semibold mb-2 max-w-[260px] truncate">
                {geoSuggestion?.name ||
                  `${formatCoord(centerCoords.lng)}, ${formatCoord(centerCoords.lat)}`}
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full border-2 border-[#007AFF]/60 animate-ping opacity-40" />
                <Crosshair className="w-8 h-8 text-[#007AFF] drop-shadow" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部卡片流与标记按钮 */}
      <div className="absolute bottom-[88px] sm:bottom-[92px] left-0 right-0 z-20 pointer-events-none">
        {isPickMode ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto max-w-md mx-auto px-4"
          >
            <div className="liquid-glass-elevated rounded-[26px] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#1D1D1F] flex items-center gap-1.5 truncate">
                  <MapPin className="w-4 h-4 text-[#007AFF] shrink-0" />
                  {geoSuggestion?.name || '轻点地图或拖动准星选点'}
                </span>
                <span className="font-mono text-[10.5px] text-slate-400 shrink-0">
                  {formatCoord(centerCoords.lng)}, {formatCoord(centerCoords.lat)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPickMode(false)}
                  className="flex-1 py-2.5 rounded-full bg-[#F2F2F7] hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex-[1.7] py-2.5 rounded-full bg-[#007AFF] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-[0_6px_18px_rgba(0,122,255,0.28)]"
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
                className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#1D1D1F] text-white font-semibold text-xs sm:text-[13px] shadow-[0_10px_28px_rgba(15,23,42,0.28)]"
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
