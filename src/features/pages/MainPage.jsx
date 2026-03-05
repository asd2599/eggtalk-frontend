import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/config"; // develop의 api 유틸 사용
import { FiSun, FiMoon, FiZap } from "react-icons/fi";
import Pet from "../pets/pet";
import PetStatusPage from "./PetStatusPage";
import CommonSide from "./CommonSide";
import socket from "../../utils/socket";

const MainPage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUserCount, setActiveUserCount] = useState(1);
  const [loginNotifications, setLoginNotifications] = useState([]); // develop의 알림 기능
  const [isDarkMode, setIsDarkMode] = useState(false);
  const petNameRef = useRef(null); // 알림 필터링용 Ref

  // 1. 테마 초기 설정
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark =
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  // 2. 데이터 페칭 및 소켓 이벤트 (알림 기능 통합)
  useEffect(() => {
    // 실시간 접속자 수 업데이트
    socket.on("update_user_count", (count) => setActiveUserCount(count));

    // 다른 유저 로그인 알림 (develop 기능)
    socket.on("new_user_login", (incomingPetName) => {
      if (petNameRef.current && incomingPetName !== petNameRef.current) {
        const id = Date.now() + Math.random();
        setLoginNotifications((prev) => [...prev, { id, petName: incomingPetName }]);
        setTimeout(() => {
          setLoginNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 3000);
      }
    });

    const fetchPetData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/"); return; }

        const response = await api.get("/api/pets/my"); // api 유틸 사용

        if (response.data.pet) {
          const loadedPet = new Pet(response.data.pet);
          setPetData(loadedPet);
          petNameRef.current = loadedPet.name;
          // 본인 로그인 알림 전송
          socket.emit("user_login", loadedPet.name);
        } else {
          navigate("/create-pet");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        localStorage.removeItem("token");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchPetData();

    return () => {
      socket.off("update_user_count");
      socket.off("new_user_login");
    };
  }, [navigate]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans relative overflow-hidden custom-scrollbar">
      
      {/* 테마 버튼 (SH 디자인 유지) */}
      <button 
        onClick={toggleTheme} 
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-200 z-[60] shadow-sm transition-all hover:scale-110"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>
      
      {/* 공통 사이드바 (SH 디자인 유지) */}
      <CommonSide activeMenu="내 펫 상태" />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 h-full overflow-y-auto pt-10 pb-24 lg:pb-10 px-4 lg:px-8 custom-scrollbar relative z-10 scroll-smooth">
        <div className="flex flex-col items-center w-full min-h-full">
           <PetStatusPage petData={petData} />
        </div>
      </main>

      {/* 타인 접속 토스트 알림 (develop 기능 + 페일 블루 테마 색상 적용) */}
      <div className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 z-[100] flex flex-col gap-3 pointer-events-none">
        {loginNotifications.map((noti) => (
          <div 
            key={noti.id} 
            className="bg-white/90 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 shadow-2xl rounded-[1.8rem] py-4 px-6 flex items-center gap-4 animate-fade-in-up pointer-events-auto transition-all"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <FiZap className="text-sky-400 text-[16px] stroke-[2.5]" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-sky-300 rounded-full border-2 border-white dark:border-[#0b0f1a] shadow-[0_0_8px_rgba(125,211,252,0.5)]"></span>
            </div>
            <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100 tracking-tight">
              <span className="text-slate-900 dark:text-sky-200 font-black mr-1.5">{noti.petName}</span>
              님이 접속했습니다!
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainPage;