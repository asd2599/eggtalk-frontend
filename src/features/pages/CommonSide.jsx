import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FiLogOut,
  FiBox,
  FiCloud,
  FiMonitor,
  FiSmile,
  FiAward,
  FiMessageCircle,
  FiUsers,
  FiUserCheck,
} from "react-icons/fi";

const CommonSide = ({ activeMenu }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const menuItems = [
    { icon: FiSmile, label: "내 펫", path: "/main" },
    { icon: FiAward, label: "랭킹", path: "/ranking" },
    { icon: FiMessageCircle, label: "대화", path: "/chat" },
    { icon: FiUsers, label: "라운지", path: "/lounge" },
    { icon: FiUserCheck, label: "친구", path: "/friends" },
    { icon: FiBox, label: "DD", path: "/dd" },
    { icon: FiCloud, label: "MS", path: "/ms" },
    { icon: FiMonitor, label: "SH", path: "/sh" },
  ];

  return (
    <aside className="fixed bottom-0 lg:relative w-full lg:w-64 h-20 lg:h-screen border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl z-50 flex lg:flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:shadow-none transition-colors overflow-hidden">
      
      <h2 className="hidden lg:block text-[10px] font-black text-slate-300 dark:text-slate-600 p-10 pb-0 tracking-[0.4em] text-center uppercase italic">
        EggTalk
      </h2>

      <nav className="flex-1 flex lg:flex-col items-center lg:items-stretch lg:p-10 overflow-hidden">
        <div className="flex-1 flex lg:flex-col items-center lg:items-stretch justify-center lg:justify-start overflow-x-auto lg:overflow-visible no-scrollbar px-6 lg:px-0 gap-1 lg:gap-3">
          
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 px-4 py-2 lg:px-5 lg:py-3.5 rounded-2xl transition-all h-[60px] lg:h-auto min-w-[75px] lg:min-w-0 lg:w-full flex-shrink-0 lg:flex-shrink ${
                activeMenu === item.label
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg font-bold"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-sky-400"
              }`}
            >
              <item.icon className="text-xl lg:text-lg shrink-0" />
              <span className="text-[9px] lg:text-[13px] font-black whitespace-nowrap uppercase">{item.label}</span>
            </button>
          ))}

          <button
            onClick={handleLogout}
            className="flex lg:hidden flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all h-[60px] min-w-[75px] flex-shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <FiLogOut className="text-xl shrink-0" />
            <span className="text-[9px] font-black whitespace-nowrap uppercase">Out</span>
          </button>
        </div>
      </nav>

      <div className="hidden lg:flex p-10 border-t border-slate-50 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center justify-start gap-4 px-5 py-3.5 w-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
        >
          <FiLogOut className="text-lg shrink-0" />
          <span className="text-[12px] font-black uppercase tracking-widest whitespace-nowrap">
            Sign Out
          </span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </aside>
  );
};

export default CommonSide;