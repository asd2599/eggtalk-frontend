import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Pet from "../pets/pet";
import "remixicon/fonts/remixicon.css";
import CommonSide from "../pages/CommonSide";
import ActionModal from "./ActionModal";
import SubwayIcon from "./components/SubwayIcon";
import { SUBWAY_LINE_MAP } from "./subwayLineMap";
import { api } from "../../utils/config";
import SubwaySearch from "./components/SubwaySearch";
import RouteResult from "./components/RouteResult";
import RouteList from "./components/RouteList";
import odsayService, {
  loadLineTrack,
  getCachedLane,
  cacheLaneData,
} from "./utils/odsayService";
import { snapToPolyline, calculateBearing } from "./utils/snapToTrack";
import {
  Map,
  useKakaoLoader,
  ZoomControl,
  CustomOverlayMap,
  Polyline,
} from "react-kakao-maps-sdk";

// --- [상수 정의] ---
export const SUBWAY_LINE_COLORS = {
  "1호선": "#0052A4",
  "1호선(경인선)": "#0052A4",
  "1호선(경부선)": "#0052A4",
  "2호선": "#00A84D",
  "2호선(본선)": "#00A84D",
  "2호선(신정지선)": "#00A84D",
  "2호선(성수지선)": "#00A84D",
  "3호선": "#EF7C1C",
  "4호선": "#00A5DE",
  "5호선": "#996CAC",
  "6호선": "#CD7C2F",
  "7호선": "#747F00",
  "8호선": "#E6186C",
  "9호선": "#BDB092",
  신분당선: "#D4003B",
  수인분당선: "#F5A200",
  경의중앙선: "#77C4A3",
  경춘선: "#0C8E72",
  서해선: "#81A914",
  우이신설선: "#B7C452",
  공항철도: "#0090D2",
  김포골드라인: "#AD8605",
  지하철: "#666666",
  "수도권 광역급행철도 A노선": "#D60024",
  경강선: "#003DA5",
  인천1호선: "#7CA8D5",
  인천2호선: "#ED8B00",
  의정부경전철: "#FDA600",
  용인경전철: "#5BB025",
};

export const SUBWAY_LINE_ZINDEX = {
  "1호선": 101, "2호선": 102, "3호선": 103, "4호선": 104,
  "5호선": 105, "6호선": 106, "7호선": 107, "8호선": 108,
  "9호선": 109, 신분당선: 111, 수인분당선: 112, 경의중앙선: 113,
  공항철도: 114, 우이신설선: 115, 서해선: 116,
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

  const [petData, setPetData] = useState(null);
  const [petName, setPetName] = useState("Pet");
  const [level, setLevel] = useState(1);
  const [expPercent, setExpPercent] = useState(0);
  const [selectedTrainId, setSelectedTrainId] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [routeStartTime, setRouteStartTime] = useState("");
  const [routeSegments, setRouteSegments] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeList, setRouteList] = useState([]);
  const [isRouteListOpen, setIsRouteListOpen] = useState(false);
  const [petPosition, setPetPosition] = useState({ lat: 37.498095, lng: 127.02761 });
  const [mapLevel, setMapLevel] = useState(3);
  const [savedStart, setSavedStart] = useState({ query: '', poi: null });
  const [savedEnd, setSavedEnd] = useState({ query: '', poi: null });
  const [currentMapLevel, setCurrentMapLevel] = useState(3);
  const mapBoundsRef = useRef(null);

  const [isSubwayApiDisabled, setIsSubwayApiDisabled] = useState(false);
  const [isSubwayRealtimeOn, setIsSubwayRealtimeOn] = useState(false);

  const handleRouteSearch = async (start, end, time, searchType = 0, pathType = 0) => {
    try {
      setRouteLoading(true);
      setRouteStartTime(time);
      setRouteSegments([]);
      setRouteResult(null);
      const result = await odsayService.getPublicTransPath(start, end, searchType, pathType);
      if (result && result.length > 0) {
        setRouteList(result);
        setIsRouteListOpen(true);
        // 모바일 UI 최적화: 검색 후 검색창은 닫아줌
        if (window.innerWidth < 768) setShowSearch(false);
      } else { alert("입력하신 경로를 찾을 수 없습니다."); }
    } catch (error) { console.error(error); } finally { setRouteLoading(false); }
  };

  const handleSelectRoute = async (selectedRoute) => {
    try {
      setRouteLoading(true);
      const detail = await odsayService.getPathDetail(selectedRoute);
      setRouteResult(detail);
      setRouteSegments(detail.segments || []);
      if (detail.segments) {
        detail.segments.forEach((seg) => {
          if (seg.path && seg.path.length > 0) {
            const typeMatch = seg.laneName.match(/(\d+)/);
            const laneType = typeMatch ? parseInt(typeMatch[1]) : 0;
            if (laneType > 0 && laneType < 200) cacheLaneData(laneType, seg.path);
          }
        });
      }
      setIsRouteListOpen(false);
      setShowSearch(false);
      if (detail.segments?.[0]?.path?.[0]) setPetPosition(detail.segments[0].path[0]);
    } catch (error) { console.error(error); } finally { setRouteLoading(false); }
  };

  const handleRouteResultBack = () => {
    setRouteResult(null);
    setIsRouteListOpen(false);
    setShowSearch(true);
  };

  useEffect(() => {
    const fetchPetParams = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await api.get("/api/pets/my");
        if (res.data?.pet) {
          const p = res.data.pet;
          setPetData(p);
          setPetName(p.name || "Pet");
          setLevel(p.level || 1);
          setExpPercent(Math.min(((p.exp || 0) / (p.level * 100)) * 100, 100));
        }
      } catch (err) { console.error(err); }
    };
    fetchPetParams();
  }, []);

  useEffect(() => {
    handleCurrentLocation();
  }, []);

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setPetPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        (err) => console.error(err),
        { enableHighAccuracy: true },
      );
    }
  };

  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY,
    libraries: ["clusterer", "drawing", "services"],
  });

  const [subways, setSubways] = useState([]);

  // 지하철 실시간 위치 데이터를 가져오는 함수
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
          const list = Array.isArray(res.data) ? res.data : [];
          return list.filter((item) => item.lat && item.lng);
        } catch (e) {
          return [];
        }
      });

      const results = await Promise.all(promises);
      setSubways(results.flat());
    } catch (err) { 
      console.error('Subway tracking error:', err); 
    }
  };

  useEffect(() => {
    if (isSubwayRealtimeOn) {
      fetchSubwayPositions(null, 3);
      const id = setInterval(() => fetchSubwayPositions(mapBoundsRef.current?.bounds, mapBoundsRef.current?.level), 45000);
      return () => clearInterval(id);
    } else {
      setSubways([]);
    }
  }, [isSubwayRealtimeOn]);

  return (
    <div className="flex w-full h-screen overflow-hidden font-sans bg-white dark:bg-[#0b0f1a]">
      <CommonSide activeMenu="길찾기" />
      <main className="flex-1 relative overflow-hidden">
        
        {/* [Mobile] 헤더 검색바 */}
        <div className="md:hidden absolute top-4 left-4 right-4 z-[55] flex flex-col gap-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => { setShowSearch(true); setIsRouteListOpen(false); }}
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all bg-slate-50 dark:bg-slate-800 text-slate-400`}
            >
              <i className="ri-search-2-line text-lg text-sky-500"></i>
              <span className="text-[13px] font-black tracking-tight uppercase">어디로 갈까요?</span>
            </button>
            <button 
              onClick={() => setIsSubwayRealtimeOn(!isSubwayRealtimeOn)}
              className={`p-3 rounded-xl transition-all ${isSubwayRealtimeOn ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
            >
              <i className={`ri-broadcast-line text-lg ${isSubwayRealtimeOn ? 'animate-pulse text-sky-400' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* [Mobile] 검색 입력 바텀 시트 */}
        {showSearch && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-auto md:hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSearch(false)}></div>
            <div className="relative bg-white dark:bg-slate-950 rounded-t-[3rem] shadow-2xl p-6 pb-10 max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-full duration-300">
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6"></div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">경로 찾기</h2>
                <button onClick={() => setShowSearch(false)} className="text-slate-400 text-2xl"><i className="ri-close-line"></i></button>
              </div>
              <SubwaySearch onSearch={handleRouteSearch} onClose={() => setShowSearch(false)} isLoading={routeLoading} initialStart={savedStart} initialEnd={savedEnd} onSaveSearch={(s, e) => { setSavedStart(s); setSavedEnd(e); }} />
            </div>
          </div>
        )}

        {/* [Mobile] 경로 목록 바텀 시트 */}
        {isRouteListOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-auto md:hidden">
            {!routeResult && <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" onClick={() => setIsRouteListOpen(false)}></div>}
              
              <div className="relative bg-white dark:bg-slate-950 rounded-t-[3rem] shadow-2xl p-6 pb-10 max-h-[75vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-full duration-300">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6"></div>
                <RouteList routes={routeList} isLoading={routeLoading} onSelect={handleSelectRoute} onClose={() => { setIsRouteListOpen(false); setShowSearch(true); }} />
              </div>
            </div>
          )}

          {routeResult && (
            <div className="fixed inset-0 z-[150] bg-white dark:bg-slate-950 md:absolute md:inset-0 md:bg-transparent pointer-events-auto overflow-y-auto no-scrollbar">
               <div className="min-h-full">
                  <RouteResult
                    result={routeResult}
                    startTime={routeStartTime}
                    onClose={handleRouteResultBack}
                    onSegmentClick={(s) => setPetPosition({ lat: parseFloat(s.startY), lng: parseFloat(s.startX) })}
                  />
               </div>
            </div>
          )}

        {/* [PC] 레이아웃 영역 */}
        <div className="hidden md:flex absolute top-6 left-10 z-50 flex-col items-start gap-4 pointer-events-none transition-all duration-300">
          <div className="flex flex-row items-center gap-3 pointer-events-auto">
            <button
              onClick={() => { setShowSearch(!showSearch); if (isRouteListOpen) setIsRouteListOpen(false); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-[2px] shadow-lg transition-all active:scale-95 w-32 sm:w-36 justify-start ${
                showSearch ? 'bg-slate-900 border-sky-400 text-white shadow-sky-500/20' : 'bg-white/95 dark:bg-slate-800/95 border-slate-200 text-slate-600'
              }`}
            >
              <i className={`ri-route-line text-lg ${showSearch ? 'text-sky-400' : 'text-sky-500'}`}></i>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-[10px] font-black leading-none mb-0.5 whitespace-nowrap">길 찾기 {showSearch ? '닫기' : ''}</span>
                <span className={`text-[6px] font-bold uppercase tracking-widest leading-none ${showSearch ? 'text-sky-200' : 'text-slate-400'}`}>Route Finder</span>
              </div>
            </button>

            <button
              onClick={() => setIsSubwayRealtimeOn(!isSubwayRealtimeOn)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-[2px] shadow-lg transition-all active:scale-95 w-32 sm:w-36 justify-start ${
                isSubwayRealtimeOn ? 'bg-slate-900 border-sky-400 text-white shadow-sky-500/20' : 'bg-white/95 dark:bg-slate-800/95 border-slate-200 text-slate-600'
              }`}
            >
              <i className={`ri-broadcast-line text-lg ${isSubwayRealtimeOn ? 'animate-pulse text-sky-400' : 'text-slate-400'}`}></i>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-[10px] font-black leading-none mb-0.5 whitespace-nowrap">실시간 {isSubwayRealtimeOn ? 'ON' : 'OFF'}</span>
                <span className={`text-[6px] font-bold uppercase tracking-widest leading-none ${isSubwayRealtimeOn ? 'text-sky-200' : 'text-slate-400'}`}>Realtime</span>
              </div>
            </button>
          </div>

          <div className="flex flex-col items-start gap-4 w-full h-full">
             {showSearch && (
              <div className="w-[280px] sm:w-[320px] pointer-events-auto animate-in fade-in slide-in-from-top-1 duration-200">
                <SubwaySearch onSearch={handleRouteSearch} onClose={() => setShowSearch(false)} isLoading={routeLoading} initialStart={savedStart} initialEnd={savedEnd} onSaveSearch={(s, e) => { setSavedStart(s); setSavedEnd(e); }} />
              </div>
            )}
            {isRouteListOpen && (
              <div className="pointer-events-auto w-[300px] sm:w-[350px] max-h-[60vh] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-left-2 duration-300 shadow-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <RouteList routes={routeList} isLoading={routeLoading} onSelect={handleSelectRoute} onClose={() => setIsRouteListOpen(false)} />
              </div>
            )}
          </div>
        </div>

        {/* 지도 영역 */}
        <div className="absolute inset-0 w-full h-full z-0">
          {!error && !loading && (
            <Map center={petPosition} style={{ width: "100%", height: "100%" }} level={mapLevel} onBoundsChanged={(map) => { const lv = map.getLevel(); mapBoundsRef.current = { bounds: map.getBounds(), level: lv }; setCurrentMapLevel(lv); }}>
              
              <div className="absolute bottom-24 right-3 md:bottom-28 md:right-5 z-20 pointer-events-auto">
                <button
                  onClick={handleCurrentLocation}
                  className="w-12 h-12 md:w-10 md:h-10 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-sky-500 transition-all active:scale-90"
                >
                  <i className="ri-focus-3-line text-2xl md:text-xl"></i>
                </button>
              </div>

              <div className="absolute bottom-40 right-3 md:bottom-44 md:right-5 z-20 pointer-events-auto">
                <div className="flex flex-col bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
                  <button onClick={() => setMapLevel(prev => Math.max(prev - 1, 1))} className="p-3 md:p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-sky-500 border-b dark:border-slate-700 transition-all">
                    <i className="ri-add-line text-xl"></i>
                  </button>
                  <button onClick={() => setMapLevel(prev => Math.min(prev + 1, 14))} className="p-3 md:p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-sky-500 transition-all">
                    <i className="ri-subtract-line text-xl"></i>
                  </button>
                </div>
              </div>

              {/* //* [Modified Code] 내 위치로 이동하는 전용 버튼 추가 (ZoomControl 위쪽 배치) */}
              <div 
                className="absolute bottom-28 right-2 z-10 flex flex-col gap-2"
                style={{ marginRight: '10px', marginBottom: '10px' }}
              >
                <button
                  onClick={handleCurrentLocation}
                  className="w-10 h-10 bg-white border-2 border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-600 hover:text-sky-500 hover:border-sky-500 transition-all active:scale-95 pointer-events-auto"
                  title="내 위치로 이동"
                >
                  <i className="ri-focus-3-fill text-xl"></i>
                </button>
              </div>

              {routeSegments.map((seg, i) => (
                <Polyline 
                  key={i} 
                  path={seg.path} 
                  strokeWeight={seg.strokeStyle === 'dash' ? 4 : 7} 
                  strokeColor={seg.strokeStyle === 'dash' ? seg.color : adjustBrightness(seg.color, -25)} 
                  strokeOpacity={0.8} 
                  zIndex={10} 
                  /* 도보(dash) 점선 */
                  strokeStyle={seg.strokeStyle === 'dash' ? 'dash' : 'solid'}
                />
              ))}

              {currentMapLevel <= 3 &&
                subways.map((sub) => (
                  <CustomOverlayMap key={sub.id} position={{ lat: sub.lat, lng: sub.lng }} yAnchor={0.5} zIndex={SUBWAY_LINE_ZINDEX[sub.line] || 100}>
                    <SubwayIcon direction="up" angle={sub.angle} width={28} arrowColor={SUBWAY_LINE_COLORS[sub.line] || '#10b981'} isExpress={sub.isExpress} />
                  </CustomOverlayMap>
                ))}

              <div className="absolute top-1/2 left-1/2 z-10 pointer-events-none animate-bounce-slight">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-1 shadow-2xl"
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

          {/* 상세 경로 결과 */}
          {routeResult && (
            <div className="fixed inset-0 z-[120] bg-white dark:bg-slate-950 md:absolute md:inset-0 md:bg-transparent pointer-events-auto overflow-y-auto no-scrollbar">
               <div className="min-h-full">
                  <RouteResult 
                    result={routeResult} 
                    startTime={routeStartTime} 
                    onClose={handleRouteResultBack} 
                    onSegmentClick={(s) => setPetPosition({ lat: parseFloat(s.startY), lng: parseFloat(s.startX) })} 
                  />
               </div>
            </div>
          )}
        </div>
      </main>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-bounce-slight { animation: bounceSlight 2s ease-in-out infinite; }
        @keyframes bounceSlight { 0%, 100% { transform: translate(-50%, -50%); } 50% { transform: translate(-50%, -60%); } }
      `}</style>
    </div>
  );
};

export default MS;