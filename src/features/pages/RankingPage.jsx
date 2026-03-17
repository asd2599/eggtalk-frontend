import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import { FiSun, FiMoon, FiZap, FiArrowRight, FiAward } from "react-icons/fi";
import CommonSide from "./CommonSide"; 
import Pet from "../pets/pet";

const RankingPage = () => {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);
//테스트주석
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
        const response = await api.get("/api/pets/ranking", {
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
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden relative custom-scrollbar pb-16 lg:pb-0 overflow-x-hidden">
      
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-sky-400 z-[60] transition-all border border-slate-100 dark:border-slate-800 shadow-sm"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>

      <CommonSide activeMenu="랭킹" />

      <main className="flex-1 h-full overflow-y-auto custom-scrollbar px-6 pt-12 lg:px-24 py-12 lg:py-20 bg-white dark:bg-[#0b0f1a] transition-all scroll-smooth pb-40">
        <div className="max-w-[850px] mx-auto">
          
          <header className="mb-24 text-center">
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">
              Hall of Fame <span className="text-sky-400 dark:text-sky-400 font-sans not-italic">.</span>
            </h1>
            <div className="h-[1px] w-12 bg-slate-100 dark:bg-slate-800 mx-auto mt-4" />
          </header>

          <div className="flex flex-row justify-center items-end gap-4 md:gap-8 mb-32 px-6">
            
            {/* 2위 */}
            {top3[1] && (
              <div className="flex flex-col items-center animate-fade-in-up">
                <div className="relative mb-6">
                  <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center p-2 bg-white dark:bg-slate-900/50 shadow-sm transition-transform hover:scale-105">
                    {new Pet({ color: top3[1].color }).draw("w-full h-full object-contain")}
                  </div>
                  <div className="absolute -bottom-2 -right-1 bg-slate-900 text-white dark:bg-slate-700 dark:text-white text-[10px] font-black px-2.5 py-1 rounded-full border-2 border-white dark:border-[#0b0f1a]">2</div>
                </div>
                <h3 className="text-sm lg:text-base font-black text-slate-800 dark:text-slate-200 tracking-tight">{top3[1].name}</h3>
                <span className="text-[10px] text-slate-400 dark:text-sky-400/60 font-bold mt-1 uppercase tracking-widest">Lv.{top3[1].level}</span>
              </div>
            )}

            {/* 1위 (Champion) */}
            {top3[0] && (
              <div className="flex flex-col items-center z-10 scale-105 md:scale-110 mx-2 md:mx-4 animate-fade-in-up delay-75">
                <div className="relative mb-8">
                  {/* 포인트 광채 */}
                  <div className="absolute inset-0 bg-sky-200 dark:bg-sky-400 rounded-full blur-[20px] opacity-20 dark:opacity-30 animate-pulse"></div>
                  
                  <div className="relative w-32 h-32 lg:w-40 lg:h-40 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center p-4 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden ring-4 ring-sky-50 dark:ring-sky-900/20">
                    {new Pet({ color: top3[0].color }).draw("w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(125,211,252,0.5)]")}
                  </div>
                  
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-[11px] font-black px-5 py-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-900 tracking-tighter uppercase flex items-center gap-1.5 z-20">
                    <FiAward className="text-sm" />
                    Champion
                  </div>
                </div>
                <h3 className="text-base lg:text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{top3[0].name}</h3>
                <span className="text-[10px] text-sky-500 dark:text-sky-400 font-black uppercase mt-1 tracking-[0.2em]">Rank #01</span>
              </div>
            )}

            {/* 3위 */}
            {top3[2] && (
              <div className="flex flex-col items-center animate-fade-in-up delay-150 opacity-80">
                <div className="relative mb-6">
                  <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full border border-slate-50 dark:border-slate-800 flex items-center justify-center p-2 bg-white dark:bg-slate-900/30">
                    {new Pet({ color: top3[2].color }).draw("w-full h-full object-contain")}
                  </div>
                  <div className="absolute -bottom-2 -right-1 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 text-[10px] font-black px-2.5 py-1 rounded-full border-2 border-white dark:border-[#0b0f1a]">3</div>
                </div>
                <h3 className="text-sm lg:text-base font-black text-slate-500 dark:text-slate-400 tracking-tight">{top3[2].name}</h3>
                <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold mt-1 uppercase">Lv.{top3[2].level}</span>
              </div>
            )}
          </div>

          {/* 하단 리스트 영역 */}
          <div className="space-y-1 pt-12 border-t border-slate-50 dark:border-slate-900">
            <div className="flex justify-between items-center mb-8 px-2">
                <h3 className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em]">Database Entries</h3>
                <FiZap className="text-sky-300 dark:text-sky-400 animate-pulse" />
            </div>

            {others.map((pet, index) => (
              <div 
                key={pet.id} 
                className="group flex items-center justify-between p-3 lg:p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all duration-300 cursor-default border border-transparent dark:hover:border-slate-800"
              >
                <div className="flex items-center gap-6">
                  <span className="text-xs font-black text-slate-200 dark:text-slate-700 w-4 font-mono group-hover:text-sky-400 transition-colors">{(index + 4).toString().padStart(2, '0')}</span>
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-1.5 transition-all group-hover:scale-110 shadow-sm border border-slate-50 dark:border-slate-700">
                    {new Pet({ color: pet.color }).draw("w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100")}
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-sky-300 transition-colors uppercase tracking-tight">{pet.name}</span>
                </div>
                
                <div className="flex items-center gap-10">
                  <div className="text-right hidden sm:block">
                    <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-sky-400 dark:bg-sky-500 shadow-[0_0_8px_rgba(125,211,252,0.4)]" style={{ width: `${pet.exp}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 w-10 text-right font-mono italic">LV.{pet.level}</span>
                  <FiArrowRight className="text-slate-100 dark:text-slate-800 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
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