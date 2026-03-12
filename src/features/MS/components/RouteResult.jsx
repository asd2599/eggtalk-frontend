import React from 'react';
import { SUBWAY_LINE_COLORS } from '../MS';

/**
 * [RouteResult.jsx] v3.3
 * 역할: 탐색된 통합 대중교통(지하철+버스+도보) 경로의 상세 정보를 시각적으로 보여주는 결과창 컴포넌트입니다.
 */

// //* [Modified Code] onSegmentClick 프롭스 추가 (구간 클릭 시 지도 중심 이동 처리용)
const RouteResult = ({ result, startTime, onClose, onSegmentClick }) => {
  if (!result) return null;

  // 전체 요금 포맷팅
  const fareStr = result.totalFare.toLocaleString('ko-KR');

  // 도착 시간 계산 logic
  const [h, m] = startTime.split(':').map(Number);
  const arrivalDate = new Date();
  arrivalDate.setHours(h, m + result.totalTime, 0);
  const arrivalTimeStr = arrivalDate.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="absolute top-20 left-4 z-40 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-5 border border-purple-100 flex flex-col gap-4 pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-black text-gray-800 tracking-tight">
            Travel Route
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
            Optimal path found
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 active:scale-90"
        >
          ✕
        </button>
      </div>

      <div className="bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />

        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-bold opacity-80 uppercase tracking-wider">
            Total Time
          </span>
          <span className="text-3xl font-black leading-none">
            {result.totalTime}
            <small className="text-lg ml-0.5">min</small>
          </span>
        </div>

        <div className="flex justify-between items-center text-[11px] opacity-90 border-t border-white/20 pt-3 mt-1">
          <div className="flex flex-col">
            <span className="opacity-60">Fare</span>
            <span className="font-bold text-sm">₩{fareStr}</span>
          </div>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex flex-col items-end">
            <span className="opacity-60">Arrival</span>
            <span className="font-bold text-sm">{arrivalTimeStr}</span>
          </div>
        </div>

        <div className="absolute top-3 right-4 bg-white/20 px-2 py-0.5 rounded-full text-[9px] font-black">
          {result.transferCount} Transfers • 🚶{result.walkTime}m
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px] pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        <div className="flex flex-col relative py-2 gap-1">
          {result.timeline.map((step, index) => {
            const isSubway = step.type === 'SUBWAY';
            const isBus = step.type === 'BUS';
            const isWalk = step.type === 'WALK';

            let color = '#ccc';
            let icon = '📍';
            let label = '';
            let detail = '';

            if (isSubway) {
              color = SUBWAY_LINE_COLORS[step.line] || '#0052A4';
              icon = '🚇';
              label = step.line;
              detail = `${step.startName} → ${step.endName}`;
            } else if (isBus) {
              color = step.color || '#33CC99';
              icon = '🚌';
              label = `${step.busNo} (${step.busType})`;
              detail = `${step.startName} → ${step.endName}`;
            } else if (isWalk) {
              color = '#E5E7EB';
              icon = '🚶';
              label = 'Walk';
              detail = `${step.distance}m • ${step.time}min`;
            }

            return (
              <div
                key={index}
                // //* [Modified Code] 클릭 시 지도 이동을 위한 인터랙션, hover 효과, cursor-pointer 추가
                className="flex gap-4 min-h-[50px] relative group cursor-pointer hover:bg-gray-50/80 p-2 -mx-2 rounded-xl transition-all"
                onClick={() => onSegmentClick && onSegmentClick(step)}
              >
                {/* 수직 라인 */}
                {index < result.timeline.length - 1 && (
                  <div
                    className="absolute left-[8px] top-6 bottom-[-10px] w-[3px] rounded-full opacity-30 group-hover:opacity-100"
                    style={{ backgroundColor: color }}
                  />
                )}

                {/* 타입 아이콘 */}
                <div className="flex flex-col items-center z-10 pt-1">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm font-bold text-white transition-transform group-hover:scale-110"
                    style={{ backgroundColor: isWalk ? '#9CA3AF' : color }}
                  >
                    {icon === '🚇' ? 'S' : icon === '🚌' ? 'B' : 'W'}
                  </div>
                </div>

                <div className="flex flex-col pb-4 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-black text-gray-800">
                      {isWalk ? 'Walk' : step.startName}
                    </span>
                    {!isWalk && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-md text-white font-black shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        {label}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5 flex items-center gap-1.5">
                    {isWalk ? (
                      <span className="text-gray-400 font-medium">
                        {detail}
                      </span>
                    ) : (
                      <>
                        <span className="text-gray-400 font-medium">to</span>
                        <span className="text-gray-700">{step.endName}</span>
                        <span className="text-indigo-400">
                          • {step.time}min
                        </span>
                      </>
                    )}
                  </div>
                  {!isWalk && (
                    <div className="text-[9px] text-gray-300 mt-1">
                      {step.stationCount} stops •{' '}
                      {step.distance >= 1000
                        ? `${(step.distance / 1000).toFixed(1)}km`
                        : `${step.distance}m`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-50">
        <p className="text-[9px] text-gray-300 text-center font-medium italic leading-relaxed">
          * Travel times and fares are estimates based on standard schedules.
          Actual conditions may vary.
        </p>
      </div>
    </div>
  );
};

export default RouteResult;
