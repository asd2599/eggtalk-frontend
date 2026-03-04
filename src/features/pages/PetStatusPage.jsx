import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiAward, FiHeart, FiCoffee, FiHeart as FiHeartFill, FiMessageCircle, FiMoon, FiSun } from "react-icons/fi";

const PetStatusPage = ({ petData }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // test

  // 초기 테마 설정 및 경험치 애니메이션
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) { document.documentElement.classList.add("dark"); setIsDarkMode(true); }

    const timer = setTimeout(() => {
      setProgress(Math.min(Math.max(((petData?.exp || 0) / 100) * 100, 0), 100));
    }, 100);
    return () => clearTimeout(timer);
  }, [petData?.exp]);

  // 테마 토글 함수
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  return (
    <div className="w-full max-w-[950px] mx-auto transition-all duration-500">
      {/* 테마 버튼 */}
      <button onClick={toggleTheme} className="hidden lg:block absolute top-8 right-8 p-3 rounded-2xl bg-[#ffffff] dark:bg-[#0b0f1a] border border-gray-100 dark:border-gray-800 text-gray-500 z-50 transition-all hover:scale-110">
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>

      {/* 메인 컨테이너 박스 */}
      <div className="bg-[#ffffff] dark:bg-[#0b0f1a] rounded-[3rem] lg:rounded-[4rem] p-8 lg:p-14 shadow-2xl lg:shadow-none border border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row gap-12 lg:gap-20 items-stretch h-auto min-h-max mb-10 transition-colors duration-500">
        
        {/* [왼쪽 프로필 영역] */}
        <div className="w-full lg:w-[320px] flex flex-col items-center lg:items-stretch flex-shrink-0">
          {/* 펫 이미지 박스 */}
          <div className="aspect-square w-full max-w-[260px] lg:max-w-none bg-gray-50 dark:bg-[#0b0f1a] rounded-[3rem] border border-gray-100 dark:border-gray-800 mb-8 flex items-center justify-center shadow-inner relative overflow-hidden group">
            {petData && petData.draw("w-40 h-40 lg:w-52 lg:h-52 group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl")}
          </div>

          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">{petData?.name}</h2>
            <p className="text-[10px] lg:text-[11px] text-amber-500 font-black mt-3 uppercase tracking-[0.3em]">Lv. {petData?.level}</p>
          </div>

          <div className="w-full space-y-6">
            {/* 경험치 바 영역 배경 */}
            <div className="space-y-3 px-1">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic flex items-center gap-2"><FiAward /> EXP</span>
                <span className="text-[11px] font-bold dark:text-white">{Math.floor(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-[#0b0f1a] dark:border-gray-800 rounded-full p-[2px]">
                <div className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
              </div>
            </div>
            
            {/* 성향 표시 바 배경 */}
            <div className="flex justify-between items-center py-4 px-6 bg-gray-50 dark:bg-[#0b0f1a] border border-gray-100 dark:border-gray-800 rounded-2xl">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest italic">현재 성향</span>
              <span className="text-[12px] font-black text-amber-500 uppercase">{petData?.tendency}</span>
            </div>

            {/* 하단 버튼들 배경 */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: FiCoffee, label: "먹기", color: "group-hover:text-amber-500" },
                { icon: FiHeartFill, label: "교감", color: "group-hover:text-rose-500" },
                { icon: FiMessageCircle, label: "대화", color: "group-hover:text-cyan-500", path: "/chat" },
                { icon: FiAward, label: "랭킹", color: "group-hover:text-yellow-500", path: "/ranking" },
              ].map((menu, i) => (
                <button 
                  key={i} 
                  onClick={() => menu.path && navigate(menu.path)} 
                  className="flex flex-col items-center py-3 bg-[#ffffff] dark:bg-[#0b0f1a] border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-400 dark:hover:border-gray-600 transition-all active:scale-95 group shadow-sm"
                >
                  <menu.icon className={`text-[18px] text-gray-400 mb-1 transition-colors duration-300 ${menu.color}`} />
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white uppercase tracking-tighter">
                    {menu.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* [오른쪽 상세 스탯 영역] */}
        <div className="flex-1 flex flex-col gap-10">
          {[
            { title: "Survival Status", stats: [{ label: "체력", value: petData?.healthHp }, { label: "배고픔", value: petData?.hunger }, { label: "청결도", value: petData?.cleanliness }, { label: "스트레스", value: petData?.stress }] },
            { title: "Mind & Intelligence", stats: [{ label: "애정도", value: petData?.affection }, { label: "지식", value: petData?.knowledge }, { label: "공감", value: petData?.empathy }, { label: "논리", value: petData?.logic }, { label: "이타성", value: petData?.altruism }] },
            { title: "Social & Personality", stats: [{ label: "외향성", value: petData?.extroversion }, { label: "개방성", value: petData?.openness }, { label: "직설성", value: petData?.directness }, { label: "호기심", value: petData?.curiosity }, { label: "유머", value: petData?.humor }] }
          ].map((section, idx) => (
            <section key={idx}>
              <h3 className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.4em] mb-4 dark:border-gray-800 pb-2 italic font-mono">{section.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {section.stats.map((stat, sIdx) => (
                  <div key={sIdx} className="flex justify-between items-center py-1 group border-transparent hover:border-gray-50 dark:hover:border-gray-800/30 transition-all">
                    <span className="text-[12px] text-gray-500 font-bold group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{stat.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1 bg-gray-100 dark:bg-[#0b0f1a] dark:border-gray-800 rounded-full hidden sm:block overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${stat.value}%` }} />
                      </div>
                      <span className="text-[12px] font-black text-gray-900 dark:text-white font-mono w-8 text-right">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PetStatusPage;