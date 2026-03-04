import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiLogOut,
  FiBox,
  FiCloud,
  FiMonitor,
  FiSmile,
  FiAward,
  FiMessageCircle,
  FiMoon,
  FiSun,
} from "react-icons/fi";

const RankingPage = () => {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 초기 테마 설정 및 시스템 테마 감지
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || 
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, []);

  // 테마 토글 함수
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/"); return; }
        const response = await axios.get("http://localhost:8000/api/pets/ranking", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.ranking) setRanking(response.data.ranking);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [navigate]);

  const top3 = ranking.slice(0, 3);
  const others = ranking.slice(3, 100);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500">
        <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    // ✅ 전체 컨테이너에도 custom-scrollbar를 적용하여 일관성 유지
    <div className="flex flex-col lg:flex-row h-screen bg-[#fcfcfc] dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden relative custom-scrollbar">
      
      {/* 테마 토글 버튼 */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-3 rounded-2xl bg-white dark:bg-[#0b0f1a] border border-gray-100 dark:border-gray-800 shadow-sm z-[60] hover:scale-110 active:scale-90 transition-all"
      >
        {isDarkMode ? <FiSun className="text-sm text-amber-500" /> : <FiMoon className="text-sm text-indigo-500" />}
      </button>

      {/* 사이드바 & 하단바 */}
      <aside className="fixed bottom-0 lg:relative w-full lg:w-64 h-16 lg:h-screen border-t lg:border-t-0 lg:border-r border-gray-100 dark:border-gray-900 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl z-50 flex lg:flex-col justify-between items-center lg:items-stretch shadow-lg lg:shadow-none">
        <div className="flex lg:flex-col items-center justify-around w-full lg:p-10">
          <h2 className="hidden lg:block text-xs font-black text-gray-900 dark:text-white mb-12 tracking-[0.3em] text-center uppercase">Dashboard</h2>
          
          <nav className="flex lg:flex-col gap-1 lg:gap-3 w-full px-4 lg:px-0">
            {[
              { icon: FiSmile, label: "내 펫 상태", path: "/main" },
              { icon: FiAward, label: "명예의 전당", path: "/ranking", active: true },
              { icon: FiMessageCircle, label: "대화하기", path: "/chat" },
              { icon: FiBox, label: "DD 모듈", path: "/dd" },
              { icon: FiCloud, label: "MS 모듈", path: "/ms" },
              { icon: FiMonitor, label: "SH 모듈", path: "/sh" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-4 p-2 lg:px-5 lg:py-3.5 rounded-xl lg:rounded-2xl transition-all flex-1 lg:flex-none ${
                  item.active 
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl" 
                    : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                <item.icon className="text-xl lg:text-lg" />
                <span className="text-[9px] lg:text-[13px] font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden lg:block p-10 border-t border-gray-50 dark:border-gray-900">
          <button onClick={() => {localStorage.removeItem("token"); navigate("/");}} className="flex items-center justify-center gap-3 w-full text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest group">
            <FiLogOut /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ✅ 메인 콘텐츠: custom-scrollbar와 h-full 적용 */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar px-6 pt-12 pb-32 lg:px-20 lg:py-20 bg-white dark:bg-[#0b0f1a] transition-all scroll-smooth">
        <div className="max-w-[800px] mx-auto">
          
          {/* 헤더 */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900/50 mb-4 border border-gray-100 dark:border-gray-800 shadow-sm">
              <FiAward className="text-gray-900 dark:text-gray-100 text-xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight italic">Hall of Fame</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-medium uppercase tracking-[0.2em]">명예의 전당</p>
          </div>

          {/* 시상대 */}
          {top3.length > 0 && (
            <div className="relative flex justify-center items-end gap-2 lg:gap-8 mb-24 h-[280px] lg:h-[320px]">
              {/* 2위 */}
              {top3[1] && (
                <div className="flex flex-col items-center w-28 lg:w-40 animate-fade-in-up relative group">
                  <div className="relative mb-4 lg:mb-6 z-10">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full border border-gray-100 dark:border-gray-800 p-1 bg-white dark:bg-[#0b0f1a] shadow-lg overflow-hidden transition-transform group-hover:scale-105">
                        <img src={`/images/shapes/${top3[1].color}_body_circle.png`} className="w-full h-full object-contain" alt="" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-gray-100 dark:bg-gray-800 text-[8px] lg:text-[10px] font-black px-1.5 py-0.5 rounded-md border border-white dark:border-gray-700">2ND</div>
                  </div>
                  <div className="w-full h-24 lg:h-32 bg-gray-50/50 dark:bg-gray-800/20 rounded-t-[1.5rem] lg:rounded-t-[2rem] border border-gray-50 dark:border-gray-800 shadow-sm backdrop-blur-md flex flex-col items-center pt-4 lg:pt-6 transition-all group-hover:h-28 lg:group-hover:h-36">
                    <span className="text-[11px] lg:text-[13px] font-bold text-gray-900 dark:text-white truncate px-2">{top3[1].name}</span>
                    <span className="text-[9px] lg:text-[10px] text-gray-400 mt-1 font-mono">Lv.{top3[1].level}</span>
                  </div>
                </div>
              )}

              {/* 1위 (중앙) */}
              {top3[0] && (
                <div className="flex flex-col items-center w-32 lg:w-48 z-20 scale-105 lg:scale-110 -translate-y-2 lg:-translate-y-4 group">
                  <div className="relative mb-6 lg:mb-8 z-10 transition-transform group-hover:scale-105">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full border-2 border-gray-900 dark:border-white p-1 bg-white dark:bg-[#0b0f1a] shadow-2xl overflow-hidden">
                        <img src={`/images/shapes/${top3[0].color}_body_circle.png`} className="w-full h-full object-contain" alt="" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[9px] lg:text-[11px] font-black px-3 py-1 rounded-full shadow-2xl z-30">1ST</div>
                  </div>
                  <div className="w-full h-36 lg:h-44 bg-gray-900 dark:bg-white rounded-t-[2rem] lg:rounded-t-[2.5rem] shadow-2xl flex flex-col items-center pt-8 lg:pt-10 relative overflow-hidden transition-all group-hover:h-40 lg:group-hover:h-48">
                    <span className="text-[14px] lg:text-[16px] font-black text-white dark:text-gray-900 truncate px-3 tracking-tight">{top3[0].name}</span>
                    <span className="text-[10px] lg:text-[11px] text-white/60 dark:text-gray-500 mt-1 font-mono font-bold tracking-tighter">Lv.{top3[0].level}</span>
                  </div>
                </div>
              )}

              {/* 3위 */}
              {top3[2] && (
                <div className="flex flex-col items-center w-28 lg:w-40 animate-fade-in-up relative group">
                  <div className="relative mb-4 lg:mb-6 z-10">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full border border-gray-50 dark:border-gray-800 p-1 bg-white dark:bg-[#0b0f1a] shadow-md overflow-hidden transition-transform group-hover:scale-105">
                        <img src={`/images/shapes/${top3[2].color}_body_circle.png`} className="w-full h-full object-contain opacity-80" alt="" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-gray-50 dark:bg-gray-800 text-[8px] lg:text-[10px] font-black px-1.5 py-0.5 rounded-md border border-white dark:border-gray-700 text-gray-400">3RD</div>
                  </div>
                  <div className="w-full h-20 lg:h-24 bg-gray-50/20 dark:bg-gray-800/10 rounded-t-[1.2rem] lg:rounded-t-[1.5rem] border border-gray-50 dark:border-gray-900 shadow-inner backdrop-blur-sm flex flex-col items-center pt-4 lg:pt-6 transition-all group-hover:h-24 lg:group-hover:h-28">
                    <span className="text-[11px] lg:text-[13px] font-bold text-gray-900 dark:text-white truncate px-2">{top3[2].name}</span>
                    <span className="text-[9px] lg:text-[10px] text-gray-400 mt-1 font-mono">Lv.{top3[2].level}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 나머지 리스트 */}
          <div className="space-y-3 pt-12 border-t border-gray-50 dark:border-gray-900">
            <h3 className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em] mb-6 text-center">Honorable Pets</h3>
            {others.map((pet, index) => (
              <div
                key={pet.id}
                className="group flex items-center justify-between p-4 lg:p-6 rounded-[1.5rem] bg-white/50 dark:bg-[#0b0f1a] border border-gray-50 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 backdrop-blur-md hover:scale-[1.01]"
              >
                <div className="flex items-center gap-4 lg:gap-6">
                  <span className="text-xs lg:text-sm font-black italic text-gray-200 dark:text-gray-800 group-hover:text-gray-900 dark:group-hover:text-white transition-colors w-4 lg:w-6">
                    {index + 4}
                  </span>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner overflow-hidden">
                    <img src={`/images/shapes/${pet.color}_body_circle.png`} className="w-6 h-6 lg:w-8 lg:h-8 object-contain" alt="" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs lg:text-sm font-bold text-gray-900 dark:text-white">{pet.name}</span>
                    <span className="text-[9px] lg:text-[10px] text-gray-400 font-medium truncate w-24 lg:w-full">Owner: {pet.user_id}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] lg:text-[13px] font-black text-gray-900 dark:text-white tracking-tighter">Lv.{pet.level}</span>
                  <div className="text-[8px] lg:text-[9px] font-bold text-gray-300 dark:text-gray-700 mt-0.5 uppercase tracking-tighter">{pet.exp}% EXP</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RankingPage;