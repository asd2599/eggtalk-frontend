import React from 'react';
import { SUBWAY_LINE_COLORS } from '../MS';
import { useRef } from 'react';

const RouteResult = ({ result, startTime, onClose, onSegmentClick }) => {
  if (!result) return null;

  const fareStr = result.totalFare.toLocaleString('ko-KR');
  const scrollRef = useRef(null);

  // 도착 시간 계산
  const [h, m] = startTime.split(':').map(Number);
  const arrivalDate = new Date();
  arrivalDate.setHours(h, m + result.totalTime, 0);
  const arrivalTimeStr = arrivalDate.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="relative w-full flex flex-col gap-5 pointer-events-auto bg-white dark:bg-slate-950 pb-6">
      
      {/* 헤더 섹션 - 상단 여백 보정 */}
      <div className="flex justify-between items-center px-6 pt-10 md:pt-6 md:px-1">
        <div className="flex items-center gap-3">
          {/* 뒤로 가기 버튼 */}
          <button
            onClick={onClose}
            className="group flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-sky-500 text-slate-400 hover:text-white transition-all border border-slate-100 dark:border-slate-800"
            title="목록으로 돌아가기"
          >
            <i className="ri-arrow-left-s-line text-2xl md:text-xl group-hover:-translate-x-0.5 transition-transform"></i>
          </button>
          <div>
            <h3 className="text-lg md:text-base font-black text-slate-800 dark:text-white tracking-tight">여정 상세</h3>
            <p className="text-[10px] md:text-[8px] text-sky-500 font-bold uppercase tracking-[0.2em]">Step by Step</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-all bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 w-10 h-10 md:w-8 md:h-8 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800"
        >
          <i className="ri-close-fill text-xl md:text-lg"></i>
        </button>
      </div>

      {/* 요약 카드 - 패딩 보정 */}
      <div className="px-6 md:px-0">
        <div className="bg-slate-900 rounded-[2.5rem] md:rounded-[2rem] p-7 md:p-6 text-white shadow-xl relative overflow-hidden border border-white/5">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-sky-500/20 rounded-full blur-2xl" />

          <div className="flex justify-between items-end mb-4">
            <div className="flex flex-col">
              <span className="text-[11px] md:text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1 opacity-80">
                Total Time
              </span>
              <span className="text-5xl md:text-4xl font-black leading-none flex items-baseline">
                {result.totalTime}
                <small className="text-xl md:text-lg ml-1 font-bold text-sky-400">min</small>
              </span>
            </div>
            <div className="text-right">
               <span className="block text-[11px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Arrival</span>
               <span className="text-xl md:text-lg font-black text-white">{arrivalTimeStr}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-[12px] md:text-[11px] border-t border-white/10 pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 font-bold uppercase tracking-tighter">Fare</span>
              <span className="font-black text-base md:text-sm text-sky-300">₩{fareStr}</span>
            </div>
            <div className="h-7 w-px bg-white/10" />
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-slate-400 font-bold uppercase tracking-tighter">Transfers</span>
              <span className="font-black text-base md:text-sm text-sky-300">{result.transferCount}회</span>
            </div>
          </div>
        </div>
      </div>

      {/* 타임라인 섹션 - 모바일 터치 편의성 강화 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar px-6 md:px-0">
        <div className="flex flex-col relative py-2 gap-4 md:gap-2">
          {result.timeline.map((step, index) => {
            const isSubway = step.type === 'SUBWAY';
            const isBus = step.type === 'BUS';
            const isWalk = step.type === 'WALK';

            let stepColor = '#cbd5e1';
            let StepIcon = 'ri-walk-line';
            let label = '';

            if (isSubway) {
              stepColor = SUBWAY_LINE_COLORS[step.line] || '#0ea5e9';
              StepIcon = 'ri-subway-line';
              label = step.line;
            } else if (isBus) {
              stepColor = step.color || '#10b981';
              StepIcon = 'ri-bus-2-line';
              label = step.busNo;
            } else if (isWalk) {
              label = 'Walk';
            }

            return (
              <div
                key={index}
                className="flex gap-5 md:gap-4 relative group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 p-4 md:p-3 rounded-[2rem] md:rounded-2xl transition-all border border-transparent hover:border-slate-100"
                onClick={() => {
                  onSegmentClick && onSegmentClick(step);
                  scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                {/* 수직 라인 지표 */}
                {index < result.timeline.length - 1 && (
                  <div
                    className="absolute left-[36px] md:left-[23px] top-11 md:top-9 bottom-[-20px] md:bottom-[-12px] w-[3px] md:w-[2px] rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-sky-200 transition-colors"
                  />
                )}

                {/* 아이콘 서클 */}
                <div className="flex flex-col items-center z-10">
                  <div
                    className="w-10 h-10 md:w-8 md:h-8 rounded-2xl md:rounded-xl flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-900 transition-all group-hover:scale-110"
                    style={{ backgroundColor: isWalk ? '#f1f5f9' : stepColor, color: isWalk ? '#94a3b8' : 'white' }}
                  >
                    <i className={`${StepIcon} text-xl md:text-base`}></i>
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base md:text-[13px] font-black text-slate-800 dark:text-white truncate">
                      {isWalk ? '도보 이동' : step.startName}
                    </span>
                    {!isWalk && (
                      <span
                        className="text-[10px] md:text-[9px] px-2 py-0.5 rounded-md text-white font-black shadow-sm flex-shrink-0"
                        style={{ backgroundColor: stepColor }}
                      >
                        {label}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-[12px] md:text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    {isWalk ? (
                      <span className="text-slate-400">{step.distance}m • {step.time}분</span>
                    ) : (
                      <>
                        <i className="ri-arrow-right-line text-slate-300"></i>
                        <span className="text-slate-700 dark:text-slate-300 truncate">{step.endName}</span>
                        <span className="text-sky-500 font-black">• {step.time}분</span>
                      </>
                    )}
                  </div>

                  {!isWalk && (
                    <div className="flex items-center gap-2 mt-2 md:mt-1.5">
                       <span className="text-[10px] md:text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase">
                          {step.stationCount} stops
                       </span>
                       <span className="text-[10px] md:text-[9px] text-slate-300 font-medium">
                          {step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)}km` : `${step.distance}m`}
                       </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 푸터 안내 */}
      <div className="pt-4 pb-10 md:pb-2 border-t border-slate-50 dark:border-slate-900 mx-6 md:mx-0">
        <p className="text-[10px] md:text-[9px] text-slate-300 text-center font-bold tracking-tight">
          * 정보는 표준 시간표 기준으로, 실제 상황과 다를 수 있습니다.
        </p>
      </div>
    </div>
  );
};

export default RouteResult;