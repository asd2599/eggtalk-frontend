import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * [RouteList.jsx] v4.0
 * 검색된 경로들 중 4개 카테고리(최적/최소시간/최소환승/최소거리)를 선별해 카드로 표시합니다.
 */

const CATEGORIES = [
  { key: 'optimal',     label: '최적',    icon: '✨', sortKey: null },
  { key: 'minTime',     label: '최소시간', icon: '⚡', sortKey: 'totalTime' },
  { key: 'minTransfer', label: '최소환승', icon: '🔄', sortKey: 'transferCount' },
  { key: 'minDistance', label: '최소거리', icon: '📏', sortKey: 'totalDistance' },
];

const RouteList = ({ routes, onSelect, onClose, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse text-lg">
          최적의 모험 경로를 계산 중입니다...
        </p>
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-800/50 rounded-2xl border border-slate-700/50">
        <span className="text-4xl mb-3 block">🗺️</span>
        <p className="text-slate-300 font-semibold mb-1">탐색된 경로가 없습니다.</p>
        <p className="text-slate-500 text-sm">
          도보 전용 경로는 1.5km 이내일 때 가장 효율적입니다.
          <br />
          수단 옵션을 '전체'로 변경하여 대중교통을 확인해보세요.
        </p>
      </div>
    );
  }

  // 4개 카테고리별 최적 경로 선별
  const bestRoutes = {
    optimal:     routes[0],
    minTime:     [...routes].sort((a, b) => a.totalTime - b.totalTime)[0],
    minTransfer: [...routes].sort((a, b) => a.transferCount - b.transferCount)[0],
    minDistance: [...routes].sort((a, b) => a.totalDistance - b.totalDistance)[0],
  };

  return (
    <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg text-sm">
            4가지
          </span>
          추천 경로
        </h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors text-sm font-medium"
        >
          닫기
        </button>
      </div>

      <AnimatePresence>
        {CATEGORIES.map(({ key, label, icon }, index) => {
          const route = bestRoutes[key];
          if (!route) return null;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              onClick={() => onSelect(route)}
              className="group relative bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/50 hover:border-blue-500/50 p-4 rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-blue-500/10"
            >
              {/* 카테고리 라벨 배지 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {icon} {label}
                </span>
              </div>

              {/* 시간 & 요금 정보 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">
                    {route.totalTime}
                    <span className="text-sm font-normal ml-1 text-slate-400">분</span>
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">
                    환승 {route.transferCount}회 |{' '}
                    {route.totalDistance >= 1000
                      ? (route.totalDistance / 1000).toFixed(1) + 'km'
                      : route.totalDistance + 'm'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-slate-900/50 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/20">
                    {route.totalFare?.toLocaleString() ?? 0}원
                  </span>
                  {route.totalWalkDistance > 0 &&
                    route.totalWalkDistance === route.totalDistance && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/30">
                        도보 추천
                      </span>
                    )}
                </div>
              </div>

              {/* 이동 수단 아이콘 리스트 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {route.subPaths
                  ?.filter((p) => p.trafficType !== 3)
                  .map((sub, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-slate-600 text-[10px]">▶</span>}
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold"
                        style={{
                          backgroundColor:
                            sub.trafficType === 1 ? '#0052A420' : '#33CC9920',
                          color: sub.trafficType === 1 ? '#4C9AFF' : '#52E0A5',
                          border: `1px solid ${sub.trafficType === 1 ? '#0052A440' : '#33CC9940'}`,
                        }}
                      >
                        <span>{sub.trafficType === 1 ? '🚇' : '🚌'}</span>
                        <span>
                          {sub.trafficType === 1
                            ? sub.lane[0]?.name
                            : sub.lane[0]?.busNo}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
              </div>

              {/* 정류장 요약 */}
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-700/30 pt-3">
                <span className="truncate max-w-[100px]">{route.firstStartStation}</span>
                <span className="text-[10px]">→</span>
                <span className="truncate max-w-[100px]">{route.lastEndStation}</span>
              </div>

              {/* 우측 하단 선택 화살표 */}
              <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                <span className="text-blue-400">➜</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default RouteList;
