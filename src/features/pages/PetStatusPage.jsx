import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMoon,
  FiSun,
  FiAward,
  FiHeart,
  FiCoffee,
  FiHeart as FiHeartFill,
  FiMessageCircle,
} from "react-icons/fi";

const PetStatusPage = ({ petData }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentExp, setCurrentExp] = useState(petData?.exp || 0);
  const [progress, setProgress] = useState(0);
  const maxExp = 100;
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const targetProgress = Math.min(
        Math.max((currentExp / maxExp) * 100, 0),
        100,
      );
      setProgress(targetProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentExp]);

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

  return (
    <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-300 p-8 font-sans">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:scale-110 transition-all z-50"
      >
        {isDarkMode ? (
          <FiSun className="text-sm" />
        ) : (
          <FiMoon className="text-sm" />
        )}
      </button>

      {/* 메인 컨테이너 */}
      <div className="flex flex-col md:flex-row gap-20 items-stretch max-w-[950px] w-full">
        {/* [블럭 1: 좌측] */}
        <div className="w-full md:w-[320px] flex flex-col justify-between flex-shrink-0">
          <div className="flex-1 flex flex-col justify-center">
            {/* 펫 렌더링 영역 */}
            <div className="aspect-square w-full bg-gray-50 dark:bg-gray-900/50 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 mb-8 flex items-center justify-center shadow-sm relative overflow-hidden">
              {petData &&
                petData.draw(
                  "w-52 h-52 hover:scale-110 transition-transform duration-500 drop-shadow-2xl",
                )}
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter italic">
                {petData?.name}
              </h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-bold uppercase tracking-[0.3em]">
                Lv. {petData?.level}
              </p>
            </div>
          </div>

          {/* 하단 인터랙션 영역 */}
          <div className="pt-12">
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between items-end px-1">
                <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                  <FiAward className="text-xs" /> EXP
                </span>
                <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100">
                  {Math.floor(progress)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-900 dark:bg-white transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center py-4 px-5 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] mb-3">
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                <FiHeart className="text-xs" /> TENDENCY
              </span>
              <span className="text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                {petData?.tendency}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  icon: FiCoffee,
                  label: "먹기",
                  color: "group-hover:text-amber-500",
                },
                {
                  icon: FiHeartFill,
                  label: "교감",
                  color: "group-hover:text-rose-500",
                },
                {
                  icon: FiMessageCircle,
                  label: "대화",
                  color: "group-hover:text-cyan-500",
                  path: "/chat",
                },
                {
                  icon: FiAward,
                  label: "랭킹",
                  color: "group-hover:text-yellow-500",
                  path: "/ranking",
                },
              ].map((menu, i) => (
                <button
                  key={i}
                  onClick={() => menu.path && navigate(menu.path)}
                  className="flex flex-col items-center py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 group shadow-sm"
                >
                  <menu.icon
                    className={`text-[16px] text-gray-400 mb-1.5 transition-colors ${menu.color}`}
                  />
                  <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {menu.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* [블럭 2: 우측] */}
        <div className="w-full flex-1 flex flex-col justify-between py-2">
          {/* Survival 섹션 */}
          <section>
            <h3 className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em] mb-5 border-b border-gray-50 dark:border-gray-900 pb-2 font-mono italic">
              Survival
            </h3>
            <div className="space-y-1">
              {[
                { label: "체력", value: `${petData?.healthHp} / 100` },
                { label: "배고픔", value: `${petData?.hunger} / 100` },
                { label: "청결도", value: `${petData?.cleanliness} / 100` },
                { label: "스트레스", value: `${petData?.stress} / 100` },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center py-1.5 group">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-bold w-20 transition-colors group-hover:text-gray-900 dark:group-hover:text-white">
                    {stat.label}
                  </span>
                  <span className="text-[11px] font-black text-gray-900 dark:text-gray-100 font-mono tracking-tighter">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Mind & Intelligence 섹션 */}
          <section>
            <h3 className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em] mb-5 border-b border-gray-50 dark:border-gray-900 pb-2 font-mono italic">
              Mind & Intelligence
            </h3>
            <div className="space-y-1">
              {[
                { label: "애정도", value: `${petData?.affection} / 100` },
                { label: "지식", value: `${petData?.knowledge} / 100` },
                { label: "공감", value: `${petData?.empathy} / 100` },
                { label: "논리", value: `${petData?.logic} / 100` },
                { label: "이타성", value: `${petData?.altruism} / 100` },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center py-1.5 group">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-bold w-20 transition-colors group-hover:text-gray-900 dark:group-hover:text-white">
                    {stat.label}
                  </span>
                  <span className="text-[11px] font-black text-gray-900 dark:text-gray-100 font-mono tracking-tighter">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Social & Personality 섹션 */}
          <section>
            <h3 className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em] mb-5 border-b border-gray-50 dark:border-gray-900 pb-2 font-mono italic">
              Social & Personality
            </h3>
            <div className="space-y-1">
              {[
                { label: "외향성", value: `${petData?.extroversion} / 100` },
                { label: "개방성", value: `${petData?.openness} / 100` },
                { label: "직설성", value: `${petData?.directness} / 100` },
                { label: "호기심", value: `${petData?.curiosity} / 100` },
                { label: "유머", value: `${petData?.humor} / 100` },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center py-1.5 group">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-bold w-20 transition-colors group-hover:text-gray-900 dark:group-hover:text-white">
                    {stat.label}
                  </span>
                  <span className="text-[11px] font-black text-gray-900 dark:text-gray-100 font-mono tracking-tighter">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PetStatusPage;
