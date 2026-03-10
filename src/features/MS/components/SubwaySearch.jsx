import React, { useState, useEffect, useRef, useCallback } from 'react';
import odsayService from '../utils/odsayService';

/**
 * [SubwaySearch.jsx]
 * 역할: 출발지와 도착지를 검색하고 탐색을 시작하는 대중교통 검색바 컴포넌트입니다.
 * //* [Modified Code] UX 흐름 개편 및 통합 장소 검색(POI), 디바운스 로직이 적용되었습니다.
 */

const SubwaySearch = ({ onSearch, onClose, isLoading = false }) => {
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startPOI, setStartPOI] = useState(null); // //* [Added Code] 선택된 출발 POI 정보
  const [endPOI, setEndPOI] = useState(null); // //* [Added Code] 선택된 도착 POI 정보
  const [hasSearched, setHasSearched] = useState(false); // //* [Added Code] 첫 검색 실행 여부

  const [startTime, setStartTime] = useState(
    new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null); // 'start' or 'end'
  /* //* [Modified Code] 수송 수단 및 최적화 옵션 상태 추가 (벤치마킹: ODsay) */
  const [searchType, setSearchType] = useState(0); // 0:추천, 1:최단시간, 3:최소환승
  const [pathType, setPathType] = useState(0); // 0:전체, 1:지하철, 2:버스
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);

  // 외부 클릭 시 제안 목록 닫기 및 옵션 변경 감지 로직
  useEffect(() => {
    // //* [Added Code] v10.0: 이미 검색된 상태에서 옵션이 바뀌면 자동으로 재검색 트리거
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
      // //* [Modified Code] POI 객체가 있으면 객체를, 없으면 텍스트를 전달 (odsayService.getPublicTransPath 확장 대응)
      onSearch(
        startPOI || startQuery,
        endPOI || endQuery,
        startTime,
        searchType,
        pathType,
      );
      setSuggestions([]);
      setSelectedIndex(-1);
      setHasSearched(true); // //* [Added Code] 검색 실행 시 옵션 탭 노출을 위해 상태 변경
    } else {
      alert('출발지와 도착지를 모두 입력해주세요.');
    }
  };

  /**
   * //* [Modified Code] 통합 장소 검색 (POI) 연동 및 디바운스 적용
   */
  const updateSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await odsayService.searchPOI(query);
        // mapObject나 좌표가 있는 POI 데이터를 정형화
        const formatted = results.slice(0, 10).map((p) => ({
          name: p.poiName,
          address: p.newAddress || p.oldAddress,
          x: p.x,
          y: p.y,
          isStation: p.isStation === 'Y',
        }));
        setSuggestions(formatted);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('POI 검색 실패:', err);
      }
    }, 300); // 300ms 디바운스
  }, []);

  const selectSuggestion = (suggestion) => {
    if (activeInput === 'start') {
      setStartQuery(suggestion.name);
      setStartPOI({ name: suggestion.name, x: suggestion.x, y: suggestion.y });
    } else {
      setEndQuery(suggestion.name);
      setEndPOI({ name: suggestion.name, x: suggestion.x, y: suggestion.y });
    }
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
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

  // //* [Added Code] 수송 수단 대분류 정의
  const TRANSPORT_MODES = [
    { label: '전체', value: 0, icon: '🚌🚇' },
    { label: '지하철', value: 1, icon: '🚇' },
    { label: '버스', value: 2, icon: '🚌' },
    { label: '도보', value: 3, icon: '🚶' }, // //* [New Option] v10.0
  ];

  // //* [Added Code] 상세 경로 옵션 정의
  const SEARCH_OPTIONS = [
    { label: '추천', value: 0, icon: '✨' },
    { label: '최단시간', value: 1, icon: '⚡' },
    { label: '최소환승', value: 3, icon: '🔄' },
    { label: '최단거리', value: 2, icon: '📏' }, // //* [New Option] v10.0
  ];

  return (
    <div
      ref={searchRef}
      className="absolute top-20 right-4 z-40 w-84 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-5 flex flex-col gap-4 border border-indigo-100/50 pointer-events-auto transition-all duration-500"
    >
      <div className="flex justify-between items-center px-1">
        <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
          <span className="p-1.5 bg-indigo-50 rounded-lg">🧭</span>
          Place & Route
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-rose-500 transition-colors bg-gray-50 hover:bg-rose-50 p-1.5 rounded-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {/* 출발지 입력 */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[10px] font-black text-indigo-500 ml-1 uppercase tracking-widest flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            Origin
          </label>
          <input
            type="text"
            value={startQuery}
            onChange={(e) => {
              setStartQuery(e.target.value);
              setStartPOI(null); // 검색어 변경 시 좌표 정보 초기화
              setActiveInput('start');
              updateSuggestions(e.target.value);
            }}
            onFocus={() => {
              setActiveInput('start');
              updateSuggestions(startQuery);
            }}
            onKeyDown={handleKeyDown}
            placeholder="어디서 출발할까요?"
            className="w-full h-12 px-5 bg-gray-50/50 rounded-2xl border-2 border-transparent focus:border-indigo-400 focus:bg-white outline-none text-sm transition-all shadow-sm font-bold placeholder:text-gray-300"
          />
          {activeInput === 'start' && suggestions.length > 0 && (
            <div className="absolute top-[76px] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
              {suggestions.map((s, idx) => (
                <div
                  key={`${s.name}-${idx}`}
                  onClick={() => selectSuggestion(s)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-5 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-none flex flex-col gap-0.5 ${
                    selectedIndex === idx
                      ? 'bg-indigo-50'
                      : 'hover:bg-indigo-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-800">
                      {s.name}
                    </span>
                    {s.isStation && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-md font-black">
                        STATION
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {s.address}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 도착지 입력 */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[10px] font-black text-rose-500 ml-1 uppercase tracking-widest flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
            Destination
          </label>
          <input
            type="text"
            value={endQuery}
            onChange={(e) => {
              setEndQuery(e.target.value);
              setEndPOI(null); // 검색어 변경 시 좌표 정보 초기화
              setActiveInput('end');
              updateSuggestions(e.target.value);
            }}
            onFocus={() => {
              setActiveInput('end');
              updateSuggestions(endQuery);
            }}
            onKeyDown={handleKeyDown}
            placeholder="어디로 갈까요?"
            className="w-full h-12 px-5 bg-gray-50/50 rounded-2xl border-2 border-transparent focus:border-rose-400 focus:bg-white outline-none text-sm transition-all shadow-sm font-bold placeholder:text-gray-300"
          />
          {activeInput === 'end' && suggestions.length > 0 && (
            <div className="absolute top-[76px] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
              {suggestions.map((s, idx) => (
                <div
                  key={`${s.name}-${idx}`}
                  onClick={() => selectSuggestion(s)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-5 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-none flex flex-col gap-0.5 ${
                    selectedIndex === idx ? 'bg-rose-50' : 'hover:bg-rose-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-800">
                      {s.name}
                    </span>
                    {s.isStation && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-md font-black">
                        STATION
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {s.address}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* //* [Modified Code] UX 개편: 검색 후 결과가 있거나 검색 중일 때만 옵션 탭 노출 */}
      {(hasSearched || isLoading) && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">
              Optimization Matrix
            </label>
            <div className="flex bg-gray-100/50 p-1.5 rounded-2xl gap-1">
              {TRANSPORT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setPathType(mode.value)}
                  className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                    pathType === mode.value
                      ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className="text-base">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="flex bg-gray-100/50 p-1.5 rounded-2xl gap-1">
              {SEARCH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSearchType(opt.value)}
                  className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    searchType === opt.value
                      ? 'bg-white text-rose-500 shadow-md scale-[1.05]'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">
              Departure Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-11 px-5 bg-gray-50/50 rounded-2xl border-2 border-transparent focus:border-gray-200 outline-none text-sm transition-all shadow-sm font-bold"
            />
          </div>
        </div>
      )}

      {/* 검색 버튼 */}
      <button
        onClick={handleSearch}
        disabled={isLoading}
        className={`w-full h-14 text-white font-black rounded-2xl shadow-2xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed opacity-70'
            : 'bg-linear-to-r from-indigo-500 via-purple-500 to-rose-500 hover:shadow-indigo-300 ring-indigo-200 hover:ring-8 transition-all duration-300'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-base">탐색 중...</span>
          </>
        ) : (
          <>
            <span className="text-xl">🚀</span>
            <span className="text-base">
              {hasSearched ? '옵션으로 다시 찾기' : '모험 시작하기'}
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default SubwaySearch;
