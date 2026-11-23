import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { HealingSpot } from '../../types';
import { getCategoryMeta } from '../../services/spotsService';
import { CAMPUS_CENTER, calculateDistanceMeters } from '../../utils/geo';

export interface PoiResult {
  id: string;
  name: string;
  address: string;
  lng: number;
  lat: number;
}

export interface AMapCanvasHandle {
  searchCampusPoi: (keyword: string) => Promise<PoiResult[]>;
  reverseGeocode: (
    lng: number,
    lat: number
  ) => Promise<{ name: string; address: string } | null>;
  locateUser: (panToUser?: boolean) => void;
}

interface AMapCanvasProps {
  spots: HealingSpot[];
  selectedSpotId: string | null;
  mapStyle: 'light' | 'satellite';
  isPickMode: boolean;
  focusTarget: { lng: number; lat: number; zoom?: number; seq: number } | null;
  zoomTrigger: { delta: number; seq: number } | null;
  onSelectSpot: (spotId: string) => void;
  onCenterChange: (coords: { lng: number; lat: number }) => void;
  onPickClick: (coords: { lng: number; lat: number }) => void;
  onUserLocation: (coords: { lng: number; lat: number }, insideCampus: boolean) => void;
  onLocationError: (msg: string) => void;
  onLoadFailed: (reason: string) => void;
  onLoaded: () => void;
}

export const AMapCanvas = forwardRef<AMapCanvasHandle, AMapCanvasProps>(
  (
    {
      spots,
      selectedSpotId,
      mapStyle,
      isPickMode,
      focusTarget,
      zoomTrigger,
      onSelectSpot,
      onCenterChange,
      onPickClick,
      onUserLocation,
      onLocationError,
      onLoadFailed,
      onLoaded,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const amapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userDotRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const satelliteLayerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roadNetLayerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geolocationRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geocoderRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const placeSearchRef = useRef<any>(null);

    const isPickModeRef = useRef(isPickMode);
    isPickModeRef.current = isPickMode;
    const onSelectSpotRef = useRef(onSelectSpot);
    onSelectSpotRef.current = onSelectSpot;
    const onCenterChangeRef = useRef(onCenterChange);
    onCenterChangeRef.current = onCenterChange;
    const onPickClickRef = useRef(onPickClick);
    onPickClickRef.current = onPickClick;
    const onUserLocationRef = useRef(onUserLocation);
    onUserLocationRef.current = onUserLocation;
    const onLocationErrorRef = useRef(onLocationError);
    onLocationErrorRef.current = onLocationError;

    const renderUserDot = (lng: number, lat: number) => {
      const map = mapRef.current;
      const AMap = amapRef.current;
      if (!map || !AMap) return;

      if (userDotRef.current) {
        userDotRef.current.setPosition([lng, lat]);
        return;
      }

      const el = document.createElement('div');
      el.style.position = 'relative';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.innerHTML = `
        <span class="marker-ring-breathe" style="
          position:absolute; inset:-6px; border-radius:9999px;
          background:rgba(0,122,255,0.28);
        "></span>
        <span style="
          position:relative; z-index:2; width:14px; height:14px;
          border-radius:9999px; background:#007AFF;
          border:2.5px solid #FFFFFF;
          box-shadow:0 2px 10px rgba(0,122,255,0.55);
        "></span>
      `;

      userDotRef.current = new AMap.Marker({
        position: [lng, lat],
        content: el,
        offset: new AMap.Pixel(-12, -12),
        zIndex: 140,
      });
      map.add(userDotRef.current);
    };

    const runGeolocation = (forcePanToUser = false) => {
      const geolocation = geolocationRef.current;
      const map = mapRef.current;
      if (!geolocation || !map) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result?.position) {
          const lng = result.position.lng;
          const lat = result.position.lat;
          renderUserDot(lng, lat);
          const distToCampus = calculateDistanceMeters(
            CAMPUS_CENTER.lng,
            CAMPUS_CENTER.lat,
            lng,
            lat
          );
          const insideCampus = distToCampus <= 4500;
          if (forcePanToUser || insideCampus) {
            map.setZoomAndCenter(17, [lng, lat], false, 500);
          }
          onUserLocationRef.current({ lng, lat }, insideCampus);
        } else {
          const message =
            result?.message || '未获取到精确位置权限，当前已展示广西外国语学院五合校区';
          onLocationErrorRef.current(message);
        }
      });
    };

    useImperativeHandle(ref, () => ({
      searchCampusPoi: (keyword: string) =>
        new Promise<PoiResult[]>((resolve) => {
          const ps = placeSearchRef.current;
          if (!ps || !keyword.trim()) {
            resolve([]);
            return;
          }
          ps.searchNearBy(
            keyword.trim(),
            [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat],
            4000,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (status: string, result: any) => {
              if (status === 'complete' && result?.poiList?.pois) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const items: PoiResult[] = result.poiList.pois.slice(0, 6).map((p: any) => ({
                  id: p.id || `${p.name}-${p.location?.lng}`,
                  name: p.name,
                  address: p.address || '广西外国语学院五合校区附近',
                  lng: p.location.lng,
                  lat: p.location.lat,
                }));
                resolve(items);
              } else {
                resolve([]);
              }
            }
          );
        }),

      reverseGeocode: (lng: number, lat: number) =>
        new Promise<{ name: string; address: string } | null>((resolve) => {
          const geocoder = geocoderRef.current;
          if (!geocoder) {
            resolve(null);
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geocoder.getAddress([lng, lat], (status: string, result: any) => {
            if (status === 'complete' && result?.regeocode) {
              const re = result.regeocode;
              const nearestPoi = re.pois?.[0]?.name;
              const aoi = re.aois?.[0]?.name;
              const street = re.addressComponent?.street;
              const name = nearestPoi || aoi || street || '广西外国语学院治愈角落';
              resolve({
                name,
                address: re.formattedAddress || '广西外国语学院五合校区',
              });
            } else {
              resolve(null);
            }
          });
        }),

      locateUser: (panToUser = true) => {
        runGeolocation(panToUser);
      },
    }));

    useEffect(() => {
      const key = import.meta.env.VITE_AMAP_KEY?.trim();
      const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE?.trim();

      if (!key) {
        onLoadFailed('未配置 VITE_AMAP_KEY');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._AMapSecurityConfig = {
        securityJsCode: securityCode || '',
      };

      let destroyed = false;

      AMapLoader.load({
        key,
        version: '2.0',
        plugins: [
          'AMap.Geolocation',
          'AMap.Geocoder',
          'AMap.PlaceSearch',
          'AMap.Scale',
        ],
      })
        .then((AMap) => {
          if (destroyed || !containerRef.current) return;
          amapRef.current = AMap;

          // 采用苹果白昼极简风底图 (amap://styles/whitesmoke)，清透高级不沉闷
          const map = new AMap.Map(containerRef.current, {
            zoom: 16.6,
            center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat],
            mapStyle: 'amap://styles/whitesmoke',
            viewMode: '2D',
            pitch: 0,
            animateEnable: true,
          });

          map.addControl(new AMap.Scale({ position: 'LB' }));

          const satLayer = new AMap.TileLayer.Satellite({ visible: false });
          const roadLayer = new AMap.TileLayer.RoadNet({ visible: false });
          map.add([satLayer, roadLayer]);
          satelliteLayerRef.current = satLayer;
          roadNetLayerRef.current = roadLayer;

          geocoderRef.current = new AMap.Geocoder({
            city: '南宁',
            radius: 300,
            extensions: 'all',
          });

          placeSearchRef.current = new AMap.PlaceSearch({
            city: '南宁',
            citylimit: true,
            pageSize: 6,
          });

          geolocationRef.current = new AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 30000,
            convert: true,
            showButton: false,
            showMarker: false,
            showCircle: false,
            panToLocation: false,
            zoomToAccuracy: false,
          });

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

          window.setTimeout(() => {
            if (!destroyed) {
              runGeolocation(false);
            }
          }, 500);
        })
        .catch((err) => {
          if (!destroyed) {
            console.warn('[AMapCanvas] 高德地图加载失败，自动切换矢量兜底:', err);
            onLoadFailed('高德地图加载异常');
          }
        });

      return () => {
        destroyed = true;
        if (mapRef.current) {
          mapRef.current.destroy();
          mapRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const map = mapRef.current;
      const sat = satelliteLayerRef.current;
      const road = roadNetLayerRef.current;
      if (!map || !sat || !road) return;

      if (mapStyle === 'satellite') {
        sat.show();
        road.show();
      } else {
        sat.hide();
        road.hide();
        map.setMapStyle('amap://styles/whitesmoke');
      }
    }, [mapStyle]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !zoomTrigger) return;
      if (zoomTrigger.delta > 0) map.zoomIn();
      else map.zoomOut();
    }, [zoomTrigger]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !focusTarget) return;
      if (focusTarget.zoom) {
        map.setZoomAndCenter(
          focusTarget.zoom,
          [focusTarget.lng, focusTarget.lat],
          false,
          420
        );
      } else {
        map.panTo([focusTarget.lng, focusTarget.lat], 380);
      }
    }, [focusTarget]);

    // 渲染苹果地图风格清爽白边立体气泡点位
    useEffect(() => {
      const map = mapRef.current;
      const AMap = amapRef.current;
      if (!map || !AMap) return;

      if (markersRef.current.length > 0) {
        map.remove(markersRef.current);
        markersRef.current = [];
      }

      const createdMarkers = spots.map((spot) => {
        const meta = getCategoryMeta(spot.category);
        const isSelected = spot.id === selectedSpotId;
        const size = isSelected ? 52 : 42;

        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.cursor = 'pointer';
        container.style.transform = 'translate(-50%, -86%)';

        container.innerHTML = `
          <div style="
            position:relative;
            width:${size}px;
            height:${size}px;
            display:flex;
            align-items:center;
            justify-content:center;
            transition:all 260ms cubic-bezier(0.22, 1, 0.36, 1);
          ">
            <span class="marker-ring-breathe" style="
              position:absolute; inset:${isSelected ? '-8px' : '-5px'};
              border-radius:9999px;
              background:${meta.accentHex}${isSelected ? '33' : '22'};
              border:1.5px solid ${meta.accentHex}88;
            "></span>
            <div style="
              position:relative; z-index:2;
              width:${size}px; height:${size}px;
              border-radius:9999px; overflow:hidden;
              padding:3px;
              background:#FFFFFF;
              box-shadow:0 8px 22px rgba(15,23,42,0.22), 0 0 0 1.5px ${isSelected ? meta.accentHex : 'rgba(255,255,255,0.9)'};
            ">
              <div style="
                width:100%; height:100%; border-radius:9999px;
                overflow:hidden; position:relative;
                background:${spot.fallbackGradient};
                display:flex; align-items:center; justify-content:center;
              ">
                <img src="${spot.coverUrl}" alt="${spot.name}"
                  style="width:100%;height:100%;object-fit:cover;"
                  onerror="this.style.display='none'" />
              </div>
            </div>
          </div>
          <div style="
            width:0; height:0; margin-top:-1px;
            border-left:5px solid transparent;
            border-right:5px solid transparent;
            border-top:7px solid ${isSelected ? meta.accentHex : '#FFFFFF'};
            filter:drop-shadow(0 2px 3px rgba(15,23,42,0.22));
          "></div>
          ${
            isSelected
              ? `<div style="
                  margin-top:4px;
                  padding:4px 11px;
                  border-radius:9999px;
                  background:rgba(255,255,255,0.92);
                  backdrop-filter:blur(20px);
                  -webkit-backdrop-filter:blur(20px);
                  border:1px solid rgba(255,255,255,0.95);
                  box-shadow:0 8px 22px rgba(15,23,42,0.16);
                  color:#1D1D1F;
                  font-size:11.5px;
                  font-weight:600;
                  white-space:nowrap;
                  letter-spacing:-0.01em;
                ">${meta.emoji} ${spot.name}</div>`
              : ''
          }
        `;

        const marker = new AMap.Marker({
          position: [spot.lng, spot.lat],
          content: container,
          offset: new AMap.Pixel(0, 0),
          zIndex: isSelected ? 130 : 85,
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
        className="w-full h-full bg-[#ECEFF4]"
        aria-label="广西外国语学院五合校区高德治愈地图"
      />
    );
  }
);

AMapCanvas.displayName = 'AMapCanvas';
