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

  // 고정할 메뉴 (내 펫)
  const fixedFirst = { icon: FiSmile, label: "내 펫", path: "/main" };

  // 슬라이드될 메뉴들
  const slideItems = [
    { icon: FiAward, label: "랭킹", path: "/ranking" },
    { icon: FiMessageCircle, label: "대화", path: "/chat" },
    { icon: FiUsers, label: "라운지", path: "/lounge" },
    { icon: FiUserCheck, label: "친구", path: "/friends" },
    { icon: FiBox, label: "DD", path: "/dd" },
    { icon: FiCloud, label: "MS", path: "/ms" },
    { icon: FiMonitor, label: "SH", path: "/sh" },
  ];

  return (
    <aside className="fixed bottom-0 lg:relative w-full lg:w-64 h-20 lg:h-screen border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-slate-900 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl z-50 flex lg:flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:shadow-none transition-colors overflow-hidden">
      
      {/* 1. 데스크탑 전용 로고 */}
      <h2 className="hidden lg:block text-[10px] font-black text-slate-300 dark:text-slate-600 p-10 pb-0 tracking-[0.4em] text-center uppercase italic">
        EggTalk
      </h2>

      {/* 2. 메인 네비게이션 영역 */}
      <nav className="flex lg:flex-col w-full h-full lg:h-auto items-center lg:items-stretch lg:p-10">
        
        {/* [좌측 고정] 내 펫 버튼 */}
        <div className="flex-shrink-0 px-2 lg:px-0 lg:mb-3">
          <button
            onClick={() => navigate(fixedFirst.path)}
            className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-4 px-4 py-2 lg:px-5 lg:py-3.5 rounded-2xl transition-all h-[60px] lg:h-auto min-w-[64px] lg:w-full ${
              activeMenu === fixedFirst.label
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg font-bold"
                : "text-slate-400 hover:text-slate-900 dark:hover:text-sky-400"
            }`}
          >
            <fixedFirst.icon className="text-xl lg:text-lg" />
            <span className="text-[9px] lg:text-[13px] font-black whitespace-nowrap uppercase">{fixedFirst.label}</span>
          </button>
        </div>

        {/* [중간 슬라이드 영역] */}
        <div className="flex-1 overflow-x-auto lg:overflow-visible no-scrollbar flex lg:flex-col gap-1 lg:gap-3 items-center lg:items-stretch px-2 border-l border-slate-100 dark:border-slate-800 lg:border-none">
          {slideItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-4 px-4 py-2 lg:px-5 lg:py-3.5 rounded-2xl transition-all h-[60px] lg:h-auto min-w-[64px] lg:w-full ${
                activeMenu === item.label
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg font-bold"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-sky-400"
              }`}
            >
              <item.icon className="text-xl lg:text-lg" />
              <span className="text-[9px] lg:text-[13px] font-black whitespace-nowrap uppercase">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 3. [우측 고정] 로그아웃 버튼 */}
      <div className="flex-shrink-0 w-20 lg:w-full h-full lg:h-auto border-l lg:border-l-0 lg:border-t border-slate-100 dark:border-slate-800 flex items-center justify-center lg:p-10">
        <button
          onClick={handleLogout}
          className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-3 p-2 w-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <FiLogOut className="text-xl lg:text-base" />
          <span className="text-[8px] lg:text-[12px] font-black uppercase tracking-widest whitespace-nowrap">
            <span className="lg:hidden">Out</span>
            <span className="hidden lg:inline">Sign Out</span>
          </span>
        </button>
      </div>

      {/* 스크롤바 숨김 스타일 */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </aside>
  );
};

export default CommonSide;