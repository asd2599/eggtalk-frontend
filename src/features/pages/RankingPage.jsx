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
  FiTrendingUp
} from "react-icons/fi";

const RankingPage = () => {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || 
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }
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
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-6 h-6 border-2 border-gray-100 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#fcfcfc] dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden">
      {/* 테마 버튼 */}
      <button
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm z-50 hover:scale-110 transition-all"
      >
        {isDarkMode ? <FiSun className="text-gray-400" /> : <FiMoon className="text-gray-400" />}
      </button>

      {/* 사이드바 */}
      <aside className="w-20 lg:w-64 border-r border-gray-50 dark:border-gray-900 flex flex-col justify-between bg-white dark:bg-[#0b0f1a] z-40">
        <div className="p-8 lg:p-10">
          <h2 className="hidden lg:block text-sm font-black text-gray-900 dark:text-white mb-12 tracking-[0.3em] text-center">DASHBOARD</h2>
          <nav className="flex flex-col gap-3">
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
                className={`flex items-center gap-4 p-3 lg:px-5 lg:py-3.5 rounded-2xl transition-all ${
                  item.active 
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl shadow-gray-200 dark:shadow-none" 
                    : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                <item.icon className="text-xl" />
                <span className="hidden lg:block text-[13px] font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        {/* 로그아웃 버튼 */}
        <div className="p-10 border-t border-gray-50 dark:border-gray-900">
          <button onClick={() => {localStorage.removeItem("token"); navigate("/");}} className="flex items-center justify-center lg:justify-center gap-3 w-full text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest group">
            <FiLogOut /> Sign Out
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto custom-scrollbar px-6 py-12 lg:px-20 lg:py-20 bg-white dark:bg-[#0b0f1a]">
        <div className="max-w-[800px] mx-auto">
          
          {/* 헤더 */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 mb-4 border border-gray-100 dark:border-gray-800 shadow-sm">
              <FiAward className="text-gray-900 dark:text-gray-100 text-xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight italic">Hall of Fame</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-medium uppercase tracking-[0.2em]">명예의 전당</p>
          </div>

          {/* 플로팅 시상대: 투박한 블록 대신 공중에 뜬 듯한 카드 */}
          {top3.length > 0 && (
            <div className="relative flex justify-center items-end gap-4 lg:gap-8 mb-24 h-[320px]">
              {/* 2위 */}
              {top3[1] && (
                <div className="flex flex-col items-center w-32 lg:w-40 animate-fade-in-up delay-100 relative group">
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gray-50/50 dark:bg-gray-900/30 blur-2xl rounded-full opacity-50 transition-opacity group-hover:opacity-100"></div>
                  <div className="relative mb-6 z-10">
                    <div className="w-20 h-20 rounded-full border border-gray-100 dark:border-gray-800 p-1 bg-white dark:bg-gray-900 shadow-lg relative overflow-hidden transition-transform group-hover:scale-105">
                        <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/50 blur-sm"></div>
                        <img src={`/images/shapes/${top3[1].color}_body_circle.png`} className="w-full h-full object-contain relative z-10" alt="" />
                    </div>
                    <div className="absolute -bottom-2 -right-1 bg-gray-100 dark:bg-gray-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-white dark:border-gray-700 shadow-sm">2ND</div>
                  </div>
                  <div className="w-full h-32 bg-white/40 dark:bg-gray-900/20 rounded-t-[2rem] border border-gray-50 dark:border-gray-900 shadow-sm backdrop-blur-md flex flex-col items-center pt-6 transition-all group-hover:h-36 group-hover:shadow-lg">
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate px-4">{top3[1].name}</span>
                    <span className="text-[10px] text-gray-400 mt-1 font-mono">Lv.{top3[1].level}</span>
                  </div>
                </div>
              )}

              {/* 1위 (중앙) */}
              {top3[0] && (
                <div className="flex flex-col items-center w-36 lg:w-48 z-10 scale-110 -translate-y-4 group">
                  {/* Deep Glow 효과 */}
                  <div className="absolute top-0 inset-x-0 h-40 bg-gray-900/10 dark:bg-white/5 blur-[50px] rounded-full animate-pulse transition-opacity group-hover:opacity-100 opacity-60"></div>
                  
                  <div className="relative mb-8 z-10 transition-transform group-hover:scale-105">
                    <div className="w-24 h-24 rounded-full border-2 border-gray-900 dark:border-white p-1.5 bg-white dark:bg-gray-900 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-800/50 blur-sm"></div>
                        <img src={`/images/shapes/${top3[0].color}_body_circle.png`} className="w-full h-full object-contain relative z-10" alt="" />
                    </div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-black px-3 py-1 rounded-full shadow-2xl border border-gray-800 dark:border-white">1ST</div>
                  </div>
                  {/* 1위 */}
                  <div className="w-full h-44 bg-gray-900/90 dark:bg-white rounded-t-[2.5rem] shadow-3xl backdrop-blur-xl flex flex-col items-center pt-8 border border-gray-800 dark:border-white transition-all group-hover:h-48 group-hover:shadow-4xl">
                    <span className="text-[15px] font-black text-white dark:text-gray-900 truncate px-4">{top3[0].name}</span>
                    <span className="text-[11px] text-white/50 dark:text-gray-600 mt-1 font-mono">Lv.{top3[0].level}</span>
                  </div>
                </div>
              )}

              {/* 3위 */}
              {top3[2] && (
                <div className="flex flex-col items-center w-32 lg:w-40 animate-fade-in-up delay-200 relative group">
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gray-50/30 dark:bg-gray-900/20 blur-xl rounded-full opacity-40 transition-opacity group-hover:opacity-80"></div>
                  <div className="relative mb-6 z-10">
                    <div className="w-20 h-20 rounded-full border border-gray-50 dark:border-gray-800 p-1 bg-white dark:bg-gray-900 shadow-md relative overflow-hidden transition-transform group-hover:scale-105">
                        <div className="absolute inset-0 bg-gray-50/70 dark:bg-gray-900/70 blur-md opacity-70"></div>
                        <img src={`/images/shapes/${top3[2].color}_body_circle.png`} className="w-full h-full object-contain relative z-10 opacity-80" alt="" />
                    </div>
                    <div className="absolute -bottom-2 -right-1 bg-gray-50 dark:bg-gray-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-white dark:border-gray-700 shadow-sm text-gray-300">3RD</div>
                  </div>
                  <div className="w-full h-24 bg-white/20 dark:bg-gray-900/10 rounded-t-[1.5rem] border border-gray-50 dark:border-gray-900 shadow-inner backdrop-blur-sm flex flex-col items-center pt-6 transition-all group-hover:h-28 group-hover:shadow-sm">
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate px-4">{top3[2].name}</span>
                    <span className="text-[10px] text-gray-400 mt-1 font-mono">Lv.{top3[2].level}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 나머지 리스트: 미니멀한 프리미엄 리스트 */}
          <div className="space-y-4 pt-12 border-t border-gray-50 dark:border-gray-900">
            <h3 className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em] mb-6 text-center">Honorable Pets</h3>
            {others.map((pet, index) => (
              <div
                key={pet.id}
                className="group flex items-center justify-between p-4 lg:p-6 rounded-[1.5rem] bg-white/50 dark:bg-gray-900/30 border border-gray-50 dark:border-gray-800 hover:border-gray-100 dark:hover:border-gray-700 transition-all duration-300 backdrop-blur-md hover:scale-[1.01] hover:shadow-2xl hover:shadow-gray-100 dark:hover:shadow-none"
              >
                <div className="flex items-center gap-6">
                  <span className="text-sm font-black italic text-gray-200 dark:text-gray-800 group-hover:text-gray-900 dark:group-hover:text-white transition-colors w-6">
                    {index + 4}
                  </span>
                  <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner overflow-hidden">
                    <img src={`/images/shapes/${pet.color}_body_circle.png`} className="w-8 h-8 object-contain" alt="" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{pet.name}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Owner: {pet.user_id}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[13px] font-black text-gray-900 dark:text-white tracking-tighter">Lv.{pet.level}</span>
                  <div className="text-[9px] font-bold text-gray-300 dark:text-gray-700 mt-0.5 uppercase tracking-tighter">{pet.exp}% EXP</div>
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