import React from "react";
import { FiHeart, FiX, FiCheck } from "react-icons/fi";

const DatingInvitationModal = ({ 
  isOpen, 
  onClose, 
  onAccept, 
  requesterPetName, 
  roomName 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-sm rounded-[3rem] p-8 lg:p-10 shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-scale-in text-center">
        
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-400/10 rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl shadow-rose-500/10">
          <FiHeart className="text-4xl text-rose-500 animate-pulse" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter uppercase italic leading-none">
          New Invitation <span className="text-rose-500 font-sans not-italic">!</span>
        </h2>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-widest italic">
          Someone wants to meet you
        </p>

        <div className="mb-10 space-y-2">
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
            <span className="text-slate-900 dark:text-white font-black text-lg mr-1">{requesterPetName}</span>님이
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-[13px]">
            '<span className="font-bold text-sky-500">{roomName}</span>' 방으로 초대했습니다!
          </p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:text-slate-900 dark:hover:text-slate-200 flex items-center justify-center gap-2"
          >
            <FiX /> 거절
          </button>
          <button 
            onClick={onAccept}
            className="flex-1 py-4 bg-slate-900 dark:bg-rose-500 text-white dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] shadow-xl shadow-rose-500/10 transition-all flex items-center justify-center gap-2"
          >
            <FiCheck /> 수락하기
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
};

export default DatingInvitationModal;
