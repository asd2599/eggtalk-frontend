import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Pet from '../pets/pet';
import 'remixicon/fonts/remixicon.css'

// ✅ 사이드바 컴포넌트 임포트
import CommonSide from '../pages/CommonSide';

import ActionModal from './ActionModal';
import { SUBWAY_STATION_COORDS_V2 } from './subwayCoords';
import SubwayIcon from './components/SubwayIcon';
import { SUBWAY_LINE_MAP } from './subwayLineMap';
import { api } from '../../utils/config';
import SubwaySearch from './components/SubwaySearch';
import RouteResult from './components/RouteResult';
import RouteList from './components/RouteList';
import odsayService, {
  loadLineTrack,
  getCachedLane,
  cacheLaneData,
} from './utils/odsayService';
import { snapToPolyline, calculateBearing } from './utils/snapToTrack';
import {
  Map,
  useKakaoLoader,
  ZoomControl,
  CustomOverlayMap,
  Polyline,
} from 'react-kakao-maps-sdk';

// --- [상수 정의] ---
export const SUBWAY_LINE_COLORS = {
  '1호선': '#0052A4', '1호선(경인선)': '#0052A4', '1호선(경부선)': '#0052A4',
  '2호선': '#00A84D', '2호선(본선)': '#00A84D', '2호선(신정지선)': '#00A84D',
  '2호선(성수지선)': '#00A84D', '3호선': '#EF7C1C', '4호선': '#00A5DE',
  '5호선': '#996CAC', '6호선': '#CD7C2F', '7호선': '#747F00', '8호선': '#E6186C',
  '9호선': '#BDB092', 신분당선: '#D4003B', 수인분당선: '#F5A200', 경의중앙선: '#77C4A3',
  경춘선: '#0C8E72', 서해선: '#81A914', 우이신설선: '#B7C452', 공항철도: '#0090D2',
  김포골드라인: '#AD8605', 지하철: '#666666', '수도권 광역급행철도 A노선': '#D60024',
  경강선: '#003DA5', 인천1호선: '#7CA8D5', 인천2호선: '#ED8B00', 의정부경전철: '#FDA600',
  용인경전철: '#5BB025',
};

export const SUBWAY_LINE_ZINDEX = {
  '1호선': 101, '2호선': 102, '3호선': 103, '4호선': 104, '5호선': 105,
  '6호선': 106, '7호선': 107, '8호선': 108, '9호선': 109, 신분당선: 111,
  수인분당선: 112, 경의중앙선: 113, 공항철도: 114, 우이신설선: 115, 서해선: 116,
};

const adjustBrightness = (hex, percent) => {
  if (!hex || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const amt = Math.floor((255 * percent) / 100);
  const newR = Math.max(0, Math.min(255, r + amt));
  const newG = Math.max(0, Math.min(255, g + amt));
  const newB = Math.max(0, Math.min(255, b + amt));
  return `#${((1 << 24) | (newR << 16) | (newG << 8) | newB).toString(16).slice(1)}`;
};

const MS = () => {
  const subwayApiKey = import.meta.env.VITE_SUBWAY_API_KEY;
  
  // --- [상태 관리] ---
  const [petData, setPetData] = useState(null);
  const [petName, setPetName] = useState('Pet');
  const [level, setLevel] = useState(1);
  const [expPercent, setExpPercent] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const [subwayError, setSubwayError] = useState(null);
  const [selectedTrainId, setSelectedTrainId] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [routeStartTime, setRouteStartTime] = useState('');
  const [routeSegments, setRouteSegments] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeList, setRouteList] = useState([]);
  const [isRouteListOpen, setIsRouteListOpen] = useState(false);
  const [petPosition, setPetPosition] = useState({ lat: 37.498095, lng: 127.02761 });
  const [mapLevel, setMapLevel] = useState(3);
  const [mapBounds, setMapBounds] = useState(null);
  const mapBoundsRef = useRef(null);

  const [isSubwayApiDisabled, setIsSubwayApiDisabled] = useState(false);
  const [isSubwayRealtimeOn, setIsSubwayRealtimeOn] = useState(true);

  // --- [기능 로직] ---
  const handleRouteSearch = async (start, end, time, searchType = 0, pathType = 0) => {
    try {
      setRouteLoading(true); setRouteStartTime(time); setRouteSegments([]); setRouteResult(null);
      const result = await odsayService.getPublicTransPath(start, end, searchType, pathType);
      if (result && result.length > 0) { setRouteList(result); setIsRouteListOpen(true); } 
      else { alert('입력하신 경로를 찾을 수 없습니다.'); }
    } catch (error) { console.error(error); } finally { setRouteLoading(false); }
  };

  const handleSelectRoute = async (selectedRoute) => {
    try {
      setRouteLoading(true);
      const detail = await odsayService.getPathDetail(selectedRoute);
      setRouteResult(detail); setRouteSegments(detail.segments || []);
      if (detail.segments) {
        detail.segments.forEach((seg) => {
          if (seg.path && seg.path.length > 0) {
            const typeMatch = seg.laneName.match(/(\d+)/);
            const laneType = typeMatch ? parseInt(typeMatch[1]) : 0;
            if (laneType > 0 && laneType < 200) cacheLaneData(laneType, seg.path);
          }
        });
      }
      setIsRouteListOpen(false); setShowSearch(false);
      if (detail.segments?.[0]?.path?.[0]) setPetPosition(detail.segments[0].path[0]);
    } catch (error) { console.error(error); } finally { setRouteLoading(false); }
  };

  useEffect(() => {
    const fetchPetParams = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await api.get('/api/pets/my');
        if (res.data && res.data.pet) {
          const p = res.data.pet;
          setPetData(p); setPetName(p.name || 'Pet'); setLevel(p.level || 1);
          const maxExp = (p.level || 1) * 100;
          setExpPercent(Math.min(((p.exp || 0) / maxExp) * 100, 100));
        }
      } catch (err) { console.error(err); }
    };
    fetchPetParams();
  }, []);

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPetPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
  };

  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY,
    libraries: ['clusterer', 'drawing', 'services'],
  });

  const [subways, setSubways] = useState([]);
  const fetchSubwayPositions = async (currentBounds = null, currentLevel = null) => {
    try {
      if (isSubwayApiDisabled || !isSubwayRealtimeOn || (currentLevel !== null && currentLevel > 3)) {
        if (subways.length > 0) setSubways([]);
        return;
      }
      const lines = ['1호선', '2호선', '3호선', '4호선', '5호선', '6호선', '7호선', '8호선', '9호선', '신분당선', '수인분당선'];
      const promises = lines.map(async (lineName) => {
        try {
          const res = await api.get(`/api/subway/positions?line=${encodeURIComponent(lineName)}`);
          if (res.data?.realtimePositionList) {
             return res.data.realtimePositionList.map((item, index) => {
                const rawStation = item.statnNm.trim().split('(')[0];
                const coords = SUBWAY_STATION_COORDS_V2[lineName]?.[rawStation] || SUBWAY_STATION_COORDS_V2[lineName]?.[rawStation + '역'];
                if (coords) {
                   return {
                      id: `${item.trainNo}_${index}`, lat: coords.lat, lng: coords.lng, line: lineName,
                      updnLine: item.updnLine, angle: 0, 
                      trainName: `[${lineName}] ${item.statnNm}`
                   };
                }
                return null;
             }).filter(Boolean);
          }
          return [];
        } catch (e) { return []; }
      });
      const results = await Promise.all(promises);
      setSubways(results.flat());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchSubwayPositions(null, 3);
    const id = setInterval(() => fetchSubwayPositions(mapBoundsRef.current?.bounds, mapBoundsRef.current?.level), 45000);
    return () => clearInterval(id);
  }, [isSubwayRealtimeOn]);

  useEffect(() => {
    const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
    const handleKeyDown = (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; };
    const handleKeyUp = (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    const update = () => {
      setPetPosition((prev) => {
        if (showSearch) return prev;
        let nLat = prev.lat, nLng = prev.lng;
        if (keys.ArrowUp) nLat += 0.00005; if (keys.ArrowDown) nLat -= 0.00005;
        if (keys.ArrowLeft) nLng -= 0.00006; if (keys.ArrowRight) nLng += 0.00006;
        return (nLat !== prev.lat || nLng !== prev.lng) ? { lat: nLat, lng: nLng } : prev;
      });
      requestAnimationFrame(update);
    };
    const animId = requestAnimationFrame(update);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); cancelAnimationFrame(animId); };
  }, [showSearch]);

  const handleBoundsChange = (map) => {
    const bounds = map.getBounds();
    const newB = { sw: { lat: bounds.getSouthWest().getLat(), lng: bounds.getSouthWest().getLng() }, ne: { lat: bounds.getNorthEast().getLat(), lng: bounds.getNorthEast().getLng() } };
    setMapBounds(newB); setMapLevel(map.getLevel());
    mapBoundsRef.current = { bounds: newB, level: map.getLevel() };
  };

  return (
    <div className="flex w-full h-screen overflow-hidden font-sans bg-white dark:bg-[#0b0f1a]">
      <CommonSide activeMenu="길찾기" />
      
      <main className="flex-1 relative overflow-hidden">
        
        {/* ✅ [레이아웃 최적화] 좌측 상단 영역: 버튼, 검색창, 결과창이 유기적으로 배치됨 */}
        <div className="absolute top-6 left-8 md:left-10 z-50 flex flex-row items-start gap-4 pointer-events-none transition-all duration-300">
          
          {/* 1. 길찾기 버튼 & 검색창 (수직 묶음) */}
          <div className="flex flex-col items-start gap-1.5 pointer-events-auto">
            <button
              onClick={() => { setShowSearch(!showSearch); if (isRouteListOpen) setIsRouteListOpen(false); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-[2px] shadow-lg transition-all active:scale-95 ${
                showSearch 
                ? 'bg-blue-600/90 border-blue-400 text-white shadow-blue-500/20' 
                : 'bg-white/95 dark:bg-slate-800/95 border-slate-200 text-slate-600'
              }`}
            >
              <i className={`ri-route-line text-lg ${showSearch ? 'text-white' : 'text-sky-500'}`}></i>
              <div className="flex flex-col items-start pr-1">
                <span className="text-[10px] font-black leading-none mb-0.5">길 찾기 {showSearch ? '닫기' : ''}</span>
                <span className={`text-[6px] font-bold uppercase tracking-widest leading-none ${showSearch ? 'text-blue-200' : 'text-slate-400'}`}>Route Finder</span>
              </div>
            </button>

            {/* 버튼 바로 아래에 뜨는 검색창 */}
            {showSearch && (
              <div className="w-[280px] sm:w-[320px] mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <SubwaySearch onSearch={handleRouteSearch} onClose={() => setShowSearch(false)} isLoading={routeLoading} />
              </div>
            )}
          </div>

          {/* ✅ [핵심 수정] 2. 결과 목록(RouteList): 검색창의 오른쪽으로 배치 */}
          {isRouteListOpen && (
            <div className="pointer-events-auto w-[300px] sm:w-[350px] max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-300 shadow-2xl rounded-3xl mt-[52px]">
              {/* mt-[52px]는 '길찾기' 버튼의 높이와 간격을 고려하여 검색창 상단 라인에 맞춘 값입니다. */}
              <RouteList routes={routeList} isLoading={routeLoading} onSelect={handleSelectRoute} onClose={() => setIsRouteListOpen(false)} />
            </div>
          )}
        </div>

        {/* 3. 우측 상단 실시간 버튼 */}
        <div className="absolute top-6 right-8 md:right-10 z-50 pointer-events-none transition-all duration-300">
          <button
            onClick={() => { setIsSubwayRealtimeOn(!isSubwayRealtimeOn); if (isSubwayRealtimeOn) setSubways([]); }}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-[2px] shadow-lg transition-all active:scale-95 ${
              isSubwayRealtimeOn 
              ? 'bg-blue-600/90 border-blue-400 text-white shadow-blue-500/20' 
              : 'bg-white/95 dark:bg-slate-800/95 border-slate-200 text-slate-600'
            }`}
          >
            <i className={`ri-broadcast-line text-lg ${isSubwayRealtimeOn ? 'animate-pulse text-white' : 'text-slate-400'}`}></i>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-black leading-none mb-0.5">실시간 {isSubwayRealtimeOn ? 'ON' : 'OFF'}</span>
              <span className={`text-[6px] font-bold uppercase tracking-widest leading-none ${isSubwayRealtimeOn ? 'text-blue-200' : 'text-slate-400'}`}>Realtime</span>
            </div>
          </button>
        </div>

        <div className="absolute inset-0 w-full h-full z-0">
          {!error && !loading && (
            <Map 
              center={petPosition} 
              style={{ width: '100%', height: '100%' }} 
              level={mapLevel} 
              onBoundsChanged={handleBoundsChange}
              draggable={true} zoomable={true} onClick={() => setSelectedTrainId(null)}
            >
              <ZoomControl position={window.kakao?.maps.ControlPosition.BOTTOMRIGHT} />

              {/* 경로 폴리라인 및 마커 유지 */}
              {routeSegments.map((seg, i) => (
                <Polyline key={i} path={seg.path} strokeWeight={seg.strokeStyle === 'dash' ? 4 : 7} strokeColor={seg.strokeStyle === 'dash' ? seg.color : adjustBrightness(seg.color, -25)} strokeOpacity={0.8} zIndex={10} />
              ))}

              {subways.map((sub) => (
                <CustomOverlayMap key={sub.id} position={{ lat: sub.lat, lng: sub.lng }} yAnchor={0.5} zIndex={SUBWAY_LINE_ZINDEX[sub.line] || 100}>
                  <div onClick={(e) => { e.stopPropagation(); setSelectedTrainId(selectedTrainId === sub.id ? null : sub.id); }} className="cursor-pointer transition-transform hover:scale-110">
                    <SubwayIcon direction="up" angle={sub.angle} width={28} arrowColor={SUBWAY_LINE_COLORS[sub.line] || '#10b981'} />
                  </div>
                </CustomOverlayMap>
              ))}

              {/* PET 얼굴 & 경험치 보더 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-1 shadow-2xl animate-bounce-slight"
                  style={{ background: `conic-gradient(#00B4FF ${expPercent}%, #f1f5f9 0%)` }}
                >
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-inner">
                    {petData ? new Pet(petData).draw("w-[135%] h-[135%] object-cover") : <span className="font-black text-sky-400 text-xs">{petName}</span>}
                  </div>
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white shadow-md">
                  LV.{level}
                </div>
              </div>
            </Map>
          )}

          {/* 최종 경로 결과 위젯 */}
          {routeResult && (
            <RouteResult 
              result={routeResult} 
              startTime={routeStartTime} 
              onClose={() => {
                setRouteResult(null);         // 1. 상세 정보창만 끈다.
                setIsRouteListOpen(true);     // 2. 결과 목록 리스트는 다시 켠다.
                setShowSearch(true);          // 3. 길 찾기 검색창도 그대로 유지한다!
              }} 
              onSegmentClick={(s) => setPetPosition({ lat: parseFloat(s.startY), lng: parseFloat(s.startX) })} 
            />
          )}
        </div>

        {/* 현재 위치 버튼 */}
        <div className="absolute bottom-54 right-[2px] z-45">
           <button
            onClick={handleCurrentLocation}
            className="w-9 h-9 bg-white rounded-md shadow-md flex items-center justify-center border border-slate-200 hover:bg-sky-50 active:scale-95 transition-all group"
            title="현재 내 위치"
          >
            <i className="ri-focus-3-line text-xl text-gray-400 group-hover:text-sky-500"></i>
          </button>
        </div>
      </main>
    </div>
  );
};

export default MS;