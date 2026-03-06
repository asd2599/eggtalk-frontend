import React from "react";
import { FiMessageSquare, FiX } from "react-icons/fi";

const GiftReplyModal = ({ isOpen, replyMsg, targetName, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-[340px] rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col border border-slate-100 dark:border-slate-800 animate-scale-in">
        
        {/* 상단 헤더 데코영역 */}
        <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-sky-50/50 to-white dark:from-slate-900/50 dark:to-[#0b0f1a]">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center shadow-inner">
               <FiMessageSquare className="text-sky-400 text-lg" />
             </div>
             <div className="text-left">
               <h2 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                 교감 성공 <span className="text-sky-400 font-sans not-italic">!</span>
               </h2>
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                 <span className="text-sky-500 font-black">{targetName}</span>의 반응
               </p>
             </div>
           </div>
           <button
             onClick={onClose}
             className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-100 dark:border-slate-700"
           >
             <FiX className="text-lg" />
           </button>
        </div>

        {/* 바디: 리플라이 메시지 */}
        <div className="p-8 text-center bg-white dark:bg-[#0b0f1a]">
           <div className="relative inline-block mb-2">
             <span className="text-4xl">💬</span>
           </div>
           
           <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl mt-2 border border-slate-100 dark:border-slate-800 shadow-inner">
             <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
               "{replyMsg || "정말 고마워! 기분이 너무 좋아."}"
             </p>
           </div>
        </div>

        {/* 확인 버튼 */}
        <div className="px-6 py-5 bg-white dark:bg-[#0b0f1a] border-t border-slate-50 dark:border-slate-800 flex justify-center">
            <button
               onClick={onClose}
               className="w-full py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-[11px] rounded-xl uppercase tracking-[0.1em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
               닫기
            </button>
        </div>

      </div>
    </div>
  );
};

export default GiftReplyModal;
