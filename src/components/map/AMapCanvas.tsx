import React, { useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { HealingSpot } from '../../types';
import { getCategoryMeta } from '../../services/spotsService';
import { CAMPUS_CENTER } from '../../utils/geo';

interface AMapCanvasProps {
  spots: HealingSpot[];
  selectedSpotId: string | null;
  mapStyle: 'dark' | 'satellite';
  isPickMode: boolean;
  focusTarget: { lng: number; lat: number; seq: number } | null;
  zoomTrigger: { delta: number; seq: number } | null;
  onSelectSpot: (spotId: string) => void;
  onCenterChange: (coords: { lng: number; lat: number }) => void;
  onPickClick: (coords: { lng: number; lat: number }) => void;
  onLoadFailed: (reason: string) => void;
  onLoaded: () => void;
}

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}

export const AMapCanvas: React.FC<AMapCanvasProps> = ({
  spots,
  selectedSpotId,
  mapStyle,
  isPickMode,
  focusTarget,
  zoomTrigger,
  onSelectSpot,
  onCenterChange,
  onPickClick,
  onLoadFailed,
  onLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const amapClassRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satelliteLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roadNetLayerRef = useRef<any>(null);

  const isPickModeRef = useRef(isPickMode);
  isPickModeRef.current = isPickMode;

  const onSelectSpotRef = useRef(onSelectSpot);
  onSelectSpotRef.current = onSelectSpot;

  const onCenterChangeRef = useRef(onCenterChange);
  onCenterChangeRef.current = onCenterChange;

  const onPickClickRef = useRef(onPickClick);
  onPickClickRef.current = onPickClick;

  // 初始化高德地图 JS API 2.0
  useEffect(() => {
    const key = import.meta.env.VITE_AMAP_KEY?.trim();
    const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE?.trim();

    if (!key) {
      onLoadFailed('未配置 VITE_AMAP_KEY');
      return;
    }

    if (securityCode) {
      window._AMapSecurityConfig = { securityJsCode: securityCode };
    }

    let destroyed = false;

    AMapLoader.load({
      key,
      version: '2.0',
      plugins: ['AMap.Scale'],
    })
      .then((AMap) => {
        if (destroyed || !containerRef.current) return;
        amapClassRef.current = AMap;

        const map = new AMap.Map(containerRef.current, {
          zoom: 16,
          center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat],
          mapStyle: 'amap://styles/darkblue',
          viewMode: '2D',
          pitch: 0,
        });

        satelliteLayerRef.current = new AMap.TileLayer.Satellite();
        roadNetLayerRef.current = new AMap.TileLayer.RoadNet();

        map.on('moveend', () => {
          const center = map.getCenter();
          if (center) {
            onCenterChangeRef.current({ lng: center.lng, lat: center.lat });
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('click', (e: any) => {
          if (isPickModeRef.current && e?.lnglat) {
            const coords = { lng: e.lnglat.lng, lat: e.lnglat.lat };
            map.panTo([coords.lng, coords.lat]);
            onPickClickRef.current(coords);
          }
        });

        mapRef.current = map;
        onLoaded();
      })
      .catch((err) => {
        if (!destroyed) {
          console.warn('[AMapCanvas] 高德地图加载失败，将自动降级:', err);
          onLoadFailed('高德地图加载失败');
        }
      });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [onLoadFailed, onLoaded]);

  // 切换暗黑图层 / 卫星图层
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mapStyle === 'satellite') {
      map.add([satelliteLayerRef.current, roadNetLayerRef.current]);
    } else {
      map.remove([satelliteLayerRef.current, roadNetLayerRef.current]);
      map.setMapStyle('amap://styles/darkblue');
    }
  }, [mapStyle]);

  // 缩放按钮控制
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomTrigger) return;
    if (zoomTrigger.delta > 0) map.zoomIn();
    else map.zoomOut();
  }, [zoomTrigger]);

  // 聚焦平移到指定点位
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.panTo([focusTarget.lng, focusTarget.lat]);
  }, [focusTarget]);

  // 渲染自定义呼吸发光视觉点位 (Custom Markers)
  useEffect(() => {
    const map = mapRef.current;
    const AMap = amapClassRef.current;
    if (!map || !AMap) return;

    if (markersRef.current.length > 0) {
      map.remove(markersRef.current);
      markersRef.current = [];
    }

    const createdMarkers = spots.map((spot) => {
      const meta = getCategoryMeta(spot.category);
      const isSelected = spot.id === selectedSpotId;
      const size = isSelected ? 52 : 40;

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = `${size}px`;
      wrapper.style.height = `${size}px`;
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.cursor = 'pointer';
      wrapper.style.transition = 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)';

      wrapper.innerHTML = `
        <span class="marker-ring-breathe" style="
          position:absolute; inset:-6px; border-radius:9999px;
          background:${meta.accentHex}33;
          border:1.5px solid ${meta.accentHex};
          box-shadow:0 0 18px ${meta.accentHex}88;
        "></span>
        <div style="
          position:relative; z-index:2; width:${size}px; height:${size}px;
          border-radius:9999px; overflow:hidden;
          border:2.5px solid ${isSelected ? '#FFFFFF' : meta.accentHex};
          background:${spot.fallbackGradient};
          box-shadow:0 6px 20px rgba(0,0,0,0.55);
          display:flex; align-items:center; justify-content:center;
        ">
          <img src="${spot.coverUrl}" alt="${spot.name}"
            style="width:100%;height:100%;object-fit:cover;opacity:0.88;"
            onerror="this.style.display='none'" />
          <span style="
            position:absolute; bottom:-2px; right:-2px;
            width:19px; height:19px; border-radius:9999px;
            background:#0B0F19; border:1px solid rgba(255,255,255,0.22);
            display:flex; align-items:center; justify-content:center;
            font-size:11px;
          ">${meta.emoji}</span>
        </div>
      `;

      const marker = new AMap.Marker({
        position: [spot.lng, spot.lat],
        content: wrapper,
        offset: new AMap.Pixel(-size / 2, -size / 2),
        zIndex: isSelected ? 120 : 80,
      });

      marker.on('click', () => {
        if (!isPickModeRef.current) {
          onSelectSpotRef.current(spot.id);
        }
      });

      return marker;
    });

    if (createdMarkers.length > 0) {
      map.add(createdMarkers);
    }
    markersRef.current = createdMarkers;
  }, [spots, selectedSpotId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0B0F19]"
      aria-label="高德校园治愈地图"
    />
  );
};
