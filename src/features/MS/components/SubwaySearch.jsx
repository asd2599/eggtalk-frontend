import React, { useState, useEffect, useRef, useCallback } from 'react';
import odsayService from '../utils/odsayService';
import { api } from '../../../utils/config';

const SubwaySearch = ({ onSearch, onClose, isLoading = false, initialStart = { query: '', poi: null }, initialEnd = { query: '', poi: null }, onSaveSearch }) => {
  const [startQuery, setStartQuery] = useState(initialStart.query);
  const [endQuery, setEndQuery] = useState(initialEnd.query);
  const [startPOI, setStartPOI] = useState(initialStart.poi);
  const [endPOI, setEndPOI] = useState(initialEnd.poi);
  const [hasSearched, setHasSearched] = useState(false);

  const [startTime, setStartTime] = useState(
    new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [searchType, setSearchType] = useState(0);
  const [pathType, setPathType] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (hasSearched && !isLoading) {
      handleSearch();
    }
  }, [searchType, pathType]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSuggestions([]);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (startQuery && endQuery) {
      onSaveSearch?.({ query: startQuery, poi: startPOI }, { query: endQuery, poi: endPOI });
      onSearch(
        startPOI || startQuery,
        endPOI || endQuery,
        startTime,
        searchType,
        pathType,
      );
      setSuggestions([]);
      setSelectedIndex(-1);
      setHasSearched(true);
    } else {
      alert('출발지와 도착지를 모두 입력해주세요.');
    }
  };

  const updateSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      const isStationQuery = /역$/.test(query.trim());
      if (isStationQuery) {
        try {
          const res = await api.get('/api/subway/search-station', {
            params: { stationName: query },
          });
          const stations = res.data?.result?.station;
          if (Array.isArray(stations) && stations.length > 0 && stations[0]) {
            const formatted = stations.filter(Boolean).slice(0, 10).map((s) => ({
              name: s.stationName || s.poiName,
              address: s.stationGroupName || '',
              x: String(s.x),
              y: String(s.y),
              isStation: true,
              source: 'odsay',
            }));
            setSuggestions(formatted);
            setSelectedIndex(-1);
            return;
          }
        } catch (err) {
          console.warn('[역 검색] 실패');
        }
      }

      if (window.kakao?.maps?.services?.Places) {
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(query, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const formatted = result.slice(0, 10).map((p) => ({
              name: p.place_name,
              address: p.road_address_name || p.address_name,
              x: p.x,
              y: p.y,
              isStation: p.category_group_code === 'SW8',
              source: 'kakao',
            }));
            setSuggestions(formatted);
          } else {
            setSuggestions([]);
          }
          setSelectedIndex(-1);
        });
      }
    }, 300);
  }, []);

  const selectSuggestion = (suggestion) => {
    const poi = { name: suggestion.name, x: suggestion.x, y: suggestion.y, source: suggestion.source || 'kakao' };
    if (activeInput === 'start') {
      setStartQuery(suggestion.name);
      setStartPOI(poi);
    } else {
      setEndQuery(suggestion.name);
      setEndPOI(poi);
    }
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => prev < suggestions.length - 1 ? prev + 1 : prev);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
      } else if (e.key === 'Escape') {
        setSuggestions([]);
        setSelectedIndex(-1);
      }
    } else if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const TRANSPORT_MODES = [
    { label: '전체', value: 0, icon: 'ri-command-line' },
    { label: '지하철', value: 1, icon: 'ri-subway-line' },
    { label: '버스', value: 2, icon: 'ri-bus-2-line' },
    { label: '도보', value: 3, icon: 'ri-walk-line' },
  ];

  const SEARCH_OPTIONS = [
    { label: '추천', value: 0, icon: 'ri-magic-line' },
    { label: '최단시간', value: 1, icon: 'ri-flashlight-line' },
    { label: '최소환승', value: 3, icon: 'ri-shuffle-line' },
    { label: '최단거리', value: 2, icon: 'ri-ruler-2-line' },
  ];

  return (
    <div
      ref={searchRef}
      className="w-full bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-7 flex flex-col gap-6 border-[2px] border-slate-200 pointer-events-auto"
    >
      {/* 헤더 */}
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <i className="ri-compass-3-line text-sky-500 text-lg"></i>
            NAVIGATION
          </h3>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-7">EggTalk Mobility System</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-all bg-slate-50 hover:bg-slate-100 w-8 h-8 rounded-xl flex items-center justify-center border border-slate-100"
          >
            <i className="ri-close-fill text-xl"></i>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {/* 출발지 */}
        <div className="flex flex-col gap-2 relative">
          <label className="text-[9px] font-black text-slate-400 ml-2 uppercase tracking-widest flex items-center gap-2">
            <i className="ri-map-pin-user-line text-xs text-sky-500"></i>
            출발지
          </label>
          <div className="relative">
            <input
              type="text"
              value={startQuery}
              onChange={(e) => {
                setStartQuery(e.target.value);
                setStartPOI(null);
                setActiveInput('start');
                updateSuggestions(e.target.value);
              }}
              onFocus={() => { setActiveInput('start'); updateSuggestions(startQuery); }}
              onKeyDown={handleKeyDown}
              placeholder="출발지를 입력하세요"
              className="w-full h-12 px-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500/30 focus:bg-white outline-none text-sm transition-all text-slate-800 placeholder:text-slate-300 font-bold shadow-inner"
            />
          </div>
          {activeInput === 'start' && suggestions.length > 0 && (
            <div className="absolute top-[84px] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-y-auto max-h-60 z-50 animate-in fade-in zoom-in-95">
              {suggestions.map((s, idx) => (
                <div
                  key={`${s.name}-${idx}`}
                  onClick={() => selectSuggestion(s)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-5 py-3.5 cursor-pointer transition-colors border-b border-slate-50 last:border-none flex flex-col gap-0.5 ${selectedIndex === idx ? 'bg-sky-50' : 'hover:bg-sky-50'}`}
                >
                  <div className="flex items-center gap-2">
                    <i className={`${s.isStation ? 'ri-subway-line' : 'ri-map-pin-2-line'} text-sky-500 text-xs`}></i>
                    <span className="text-sm font-bold text-slate-700">{s.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium truncate ml-5">{s.address}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 도착지 */}
        <div className="flex flex-col gap-2 relative">
          <label className="text-[9px] font-black text-slate-400 ml-2 uppercase tracking-widest flex items-center gap-2">
            <i className="ri-flag-line text-xs text-slate-800"></i>
            도착지
          </label>
          <div className="relative">
            <input
              type="text"
              value={endQuery}
              onChange={(e) => {
                setEndQuery(e.target.value);
                setEndPOI(null);
                setActiveInput('end');
                updateSuggestions(e.target.value);
              }}
              onFocus={() => { setActiveInput('end'); updateSuggestions(endQuery); }}
              onKeyDown={handleKeyDown}
              placeholder="목적지를 입력하세요"
              className="w-full h-12 px-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-slate-800/30 focus:bg-white outline-none text-sm transition-all text-slate-800 placeholder:text-slate-300 font-bold shadow-inner"
            />
          </div>
          {activeInput === 'end' && suggestions.length > 0 && (
            <div className="absolute top-[84px] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-y-auto max-h-60 z-50 animate-in fade-in zoom-in-95">
              {suggestions.map((s, idx) => (
                <div
                  key={`${s.name}-${idx}`}
                  onClick={() => selectSuggestion(s)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-5 py-3.5 cursor-pointer transition-colors border-b border-slate-50 last:border-none flex flex-col gap-0.5 ${selectedIndex === idx ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
                >
                  <div className="flex items-center gap-2">
                    <i className={`${s.isStation ? 'ri-subway-line' : 'ri-map-pin-2-line'} text-slate-600 text-xs`}></i>
                    <span className="text-sm font-bold text-slate-700">{s.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium truncate ml-5">{s.address}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 옵션 영역 */}
      {(hasSearched || isLoading) && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500 border-t border-slate-100 pt-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200">
              {TRANSPORT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setPathType(mode.value)}
                  className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all flex flex-col items-center gap-1 ${
                    pathType === mode.value
                      ? 'bg-white text-sky-500 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <i className={`${mode.icon} text-sm`}></i>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SEARCH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSearchType(opt.value)}
                className={`py-2.5 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2 border ${
                  searchType === opt.value
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <i className={`${opt.icon} text-xs`}></i>
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 px-1">
            <div className="flex items-center gap-2">
               <i className="ri-time-line text-slate-400 text-xs"></i>
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">출발 시간</label>
            </div>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-11 px-5 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-xs text-slate-700 font-bold transition-all focus:border-sky-500/50"
            />
          </div>
        </div>
      )}

      {/* 실행 버튼 */}
      <button
        onClick={handleSearch}
        disabled={isLoading}
        className={`w-full h-14 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${
          isLoading
            ? 'bg-slate-200 cursor-not-allowed text-slate-400'
            : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-[3px] border-slate-300 border-t-sky-500 rounded-full animate-spin" />
            <span className="text-sm tracking-tight text-slate-500">경로 검색 중...</span>
          </>
        ) : (
          <>
            <i className="ri-rocket-fill text-lg"></i>
            <span className="text-sm font-black uppercase tracking-widest">
              {hasSearched ? '검색하기' : '여정 떠나기'}
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default SubwaySearch;