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
    { icon: FiSmile, label: "내 펫 상태", path: "/main" },
    { icon: FiAward, label: "명예의 전당", path: "/ranking" },
    { icon: FiMessageCircle, label: "대화하기", path: "/chat" },
    { icon: FiUsers, label: "라운지", path: "/lounge" },
    { icon: FiUserCheck, label: "친구 목록", path: "/friends" },
    { icon: FiBox, label: "DD 모듈", path: "/dd" },
    { icon: FiCloud, label: "MS 모듈", path: "/ms" },
    { icon: FiMonitor, label: "SH 모듈", path: "/sh" },
  ];

  return (
    <aside className="fixed bottom-0 lg:relative w-full lg:w-64 h-16 lg:h-screen border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-slate-900 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl z-50 flex lg:flex-col justify-between items-center lg:items-stretch shadow-lg lg:shadow-none transition-colors">
      <div className="flex lg:flex-col items-center justify-around w-full lg:p-10">
        <h2 className="hidden lg:block text-[10px] font-black text-slate-300 dark:text-slate-600 mb-10 tracking-[0.4em] text-center uppercase italic">
          EggTalk
        </h2>
        <nav className="flex lg:flex-col gap-1 lg:gap-3 w-full px-4 lg:px-0">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-4 p-2 lg:px-5 lg:py-3.5 rounded-2xl transition-all flex-1 lg:flex-none ${
                activeMenu === item.label
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xl font-bold"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-sky-200"
              }`}
            >
              <item.icon className="text-xl lg:text-lg" />
              <span className="text-[9px] lg:text-[13px] font-bold">
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
      <div className="hidden lg:block p-10 border-t border-slate-50 dark:border-slate-900">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 w-full text-[12px] font-bold text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors uppercase tracking-widest group"
        >
          <FiLogOut /> <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default CommonSide;
