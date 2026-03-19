import React from "react";
import { FiUsers, FiX, FiUserPlus, FiSmile } from "react-icons/fi";

const ConnectedUsersModal = ({
  isOpen,
  onClose,
  users,
  onInvite,
  myPetName,
}) => {
  if (!isOpen) return null;

  // Helper function to consistently extract user names
  const getUserName = (user) => {
    if (typeof user === "object") {
      return user.petName || user.name || String(user);
    }
    return String(user);
  };

  // 모든 유저 데이터를 문자열(이름)로 정규화 (name, petName 모두 대응)
  const userNames = (users || []).map(getUserName);
  
  // 중복 제거 및 본인 제외
  const otherUsers = Array.from(new Set(userNames)).filter(
    (name) => name && name !== myPetName
  );

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-md rounded-[3rem] p-8 lg:p-10 shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-scale-in max-h-[80vh] flex flex-col">
        
        <button
          onClick={onClose}
          className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <FiX size={24} />
        </button>

        <div className="w-14 h-14 bg-sky-50 dark:bg-sky-400/10 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-sky-500/5">
          <FiUsers className="text-2xl text-sky-500" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter uppercase italic leading-none">
          Online Users <span className="text-sky-400 font-sans not-italic">.</span>
        </h2>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-widest italic">
          Select a partner to invite
        </p>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
          {otherUsers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] italic">
              현재 접속 중인 다른 유저가 없습니다.
            </div>
          ) : (
            otherUsers.map((userName) => (
              <div
                key={userName}
                className="group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all hover:border-sky-400 dark:hover:border-sky-500 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                    <FiSmile className="text-sky-400 text-lg" />
                  </div>
                  <span className="text-[14px] font-black text-slate-700 dark:text-slate-200">
                    {userName}
                  </span>
                </div>
                <button
                  onClick={() => onInvite(userName)}
                  className="px-4 py-2 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <FiUserPlus />
                  Invite
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full py-4 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:text-slate-900 dark:hover:text-slate-200"
        >
          나가기
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(125, 211, 252, 0.2); border-radius: 10px; }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ConnectedUsersModal;
