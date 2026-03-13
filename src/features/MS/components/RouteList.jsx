import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { key: 'optimal',     label: '최적',     icon: 'ri-magic-line',     color: 'text-sky-500',   bg: 'bg-sky-50' },
  { key: 'minTime',     label: '최소시간',  icon: 'ri-flashlight-line', color: 'text-amber-500', bg: 'bg-amber-50' },
  { key: 'minTransfer', label: '최소환승',  icon: 'ri-shuffle-line',    color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { key: 'minDistance', label: '최소거리',  icon: 'ri-ruler-2-line',    color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

const RouteList = ({ routes, onSelect, onClose, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white rounded-[2rem]">
        <div className="w-10 h-10 border-[3px] border-sky-100 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">
          경로 탐색 중...
        </p>
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <div className="p-10 text-center bg-white rounded-[2rem] border border-slate-200 shadow-xl">
        <i className="ri-map-pin-range-line text-4xl text-slate-300 mb-4 block"></i>
        <p className="text-slate-600 font-bold mb-2 text-lg">탐색된 경로가 없습니다.</p>
        <p className="text-slate-400 text-xs leading-relaxed font-medium">
          도보 전용 경로는 1.5km 이내일 때 가장 효율적입니다.
          <br />
          옵션을 '전체'로 변경하여 다시 확인해보세요.
        </p>
      </div>
    );
  }

  const isWalkOnly = routes[0]?.isWalkOnly;

  const bestRoutes = isWalkOnly 
    ? { optimal: routes[0] }
    : {
        optimal:     routes[0],
        minTime:     [...routes].sort((a, b) => a.totalTime - b.totalTime)[0],
        minTransfer: [...routes].sort((a, b) => a.transferCount - b.transferCount)[0],
        minDistance: [...routes].sort((a, b) => a.totalDistance - b.totalDistance)[0],
      };

  const categoriesToRender = isWalkOnly 
    ? [ { key: 'optimal', label: '도보 여정', icon: 'ri-walk-line', color: 'text-sky-500', bg: 'bg-sky-50' } ]
    : CATEGORIES;

  return (
    <div className="flex flex-col gap-5 p-6 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-h-[80vh] overflow-y-auto custom-scrollbar border-[2px] border-slate-100">
      
      {/* 상단 헤더 영역 */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-3">
          {/* 뒤로 가기 버튼 */}
          <button
            onClick={onClose} 
            className="group flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 hover:bg-sky-500 text-slate-400 hover:text-white transition-all border border-slate-100 hover:border-sky-400"
            title="검색창으로 돌아가기"
          >
            <i className="ri-arrow-left-s-line text-xl group-hover:-translate-x-0.5 transition-transform"></i>
          </button>

          <h3 className="text-slate-800 font-black text-base flex items-center gap-2 tracking-tight">
            경로 선택
          </h3>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-all bg-slate-50 hover:bg-slate-100 w-8 h-8 rounded-xl flex items-center justify-center border border-slate-100"
        >
          <i className="ri-close-fill text-lg"></i>
        </button>
      </div>

      <AnimatePresence>
        {categoriesToRender.map(({ key, label, icon, color, bg }, index) => {
          const route = bestRoutes[key];
          if (!route) return null;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => onSelect(route)}
              className="group relative bg-slate-50/50 hover:bg-white border-[2px] border-slate-100 hover:border-sky-400 p-5 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-sky-500/10"
            >
              {/* 카테고리 라벨 배지 */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 ${bg} ${color} uppercase tracking-wider`}>
                  <i className={`${icon} text-xs`}></i>
                  {label}
                </span>
              </div>

              {/* 시간 & 요금 정보 */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl font-black text-slate-800 group-hover:text-sky-500 transition-colors">
                      {route.totalTime}
                    </span>
                    <span className="text-sm font-bold text-slate-400 ml-1">분</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                      <i className="ri-repeat-2-line text-sky-400 text-xs"></i>
                      환승 {route.transferCount}
                    </span>
                    <span className="text-slate-300 text-[10px]">|</span>
                    <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                      <i className="ri-pin-distance-line text-sky-400 text-xs"></i>
                      {route.totalDistance >= 1000
                        ? (route.totalDistance / 1000).toFixed(1) + 'km'
                        : route.totalDistance + 'm'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-md">
                    {route.totalFare?.toLocaleString() ?? 0}원
                  </span>
                </div>
              </div>

              {/* 이동 수단 아이콘 리스트 */}
              <div className="flex items-center gap-2 flex-wrap bg-white/50 p-2 rounded-xl border border-slate-100 shadow-inner">
                {route.subPaths
                  ?.filter((p) => p.trafficType !== 3)
                  .map((sub, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <i className="ri-arrow-right-s-line text-slate-300 text-xs"></i>}
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border"
                        style={{
                          backgroundColor: sub.trafficType === 1 ? '#00B4FF08' : '#10b98108',
                          color: sub.trafficType === 1 ? '#00B4FF' : '#10b981',
                          borderColor: sub.trafficType === 1 ? '#00B4FF30' : '#10b98130',
                        }}
                      >
                        <i className={sub.trafficType === 1 ? 'ri-subway-line text-xs' : 'ri-bus-2-line text-xs'}></i>
                        <span>
                          {sub.trafficType === 1
                            ? sub.lane[0]?.name.replace('지하철 ', '')
                            : sub.lane[0]?.busNo}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
              </div>

              {/* 정류장 요약 */}
              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 font-bold border-t border-slate-50 pt-4">
                <i className="ri-map-pin-2-fill text-sky-400 text-xs"></i>
                <span className="truncate max-w-[90px]">{route.firstStartStation}</span>
                <i className="ri-arrow-right-line text-slate-200"></i>
                <span className="truncate max-w-[90px]">{route.lastEndStation}</span>
              </div>

              {/* 우측 하단 선택 화살표 */}
              <div className="absolute right-5 bottom-5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                  <i className="ri-arrow-right-up-line text-lg"></i>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default RouteList;