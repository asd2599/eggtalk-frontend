import React from "react";
import { FiCheck } from "react-icons/fi";
import CommonSide from "../pages/CommonSide"; 

const ColorPaletteCard = () => {
  const palette = [
    { name: "Deep Navy", hex: "#0f172a" },
    { name: "Slate Deep", hex: "#1e293b" },
    { name: "Slate Mid", hex: "#64748b" },
    { name: "Pale Blue", hex: "#bae6fd" },
    { name: "Ice White", hex: "#f8fafc" },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden relative">

      {/* 배경 페일 블루 광채 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-100 dark:bg-sky-900/20 rounded-full blur-[100px] pointer-events-none opacity-50"></div>
      
      {/* 공통 사이드 바 */}
      <CommonSide activeMenu="SH 모듈" />

      {/* 메인 영역 */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar flex justify-center items-center p-6 lg:p-12">
        
        {/* 팔레트 카드 */}
        <div className="relative w-full max-w-[500px] animate-fade-in-up">
          
          {/* 상단 체크 로고 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center border-[6px] border-white dark:border-[#0b0f1a] z-20 shadow-xl">
            <FiCheck className="text-white dark:text-slate-900 text-2xl stroke-[3]" />
          </div>

          {/* 카드 몸체 */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-50 dark:border-slate-800">
            
            <div className="pt-16 pb-8 text-center px-6">
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none mb-8">
                EggTalk Palette <span className="text-sky-400 font-sans not-italic">.</span>
              </h2>
              
              <div className="flex justify-between items-center px-2">
                {palette.map((color) => (
                  <span key={color.hex} className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter">
                    {color.hex}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex h-72 w-full border-t border-slate-50 dark:border-slate-800">
              {palette.map((color) => (
                <div
                  key={color.hex}
                  style={{ backgroundColor: color.hex }}
                  className="group relative flex-1 h-full transition-all duration-500 hover:flex-[1.8] cursor-pointer overflow-hidden"
                  onClick={() => navigator.clipboard.writeText(color.hex)}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/10 backdrop-blur-[2px]">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white shadow-lg text-slate-900">
                      Copy
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="py-6 text-center bg-white dark:bg-slate-900">
              <p className="text-[10px] font-black text-slate-200 dark:text-slate-700 uppercase tracking-[0.6em] italic">
                EggTalk Project
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ColorPaletteCard;