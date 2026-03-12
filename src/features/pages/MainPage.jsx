import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/config"; 
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
  const [loginNotifications, setLoginNotifications] = useState([]); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const petNameRef = useRef(null); 

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

    // 다른 유저 로그인 알림 
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

        const response = await api.get("/api/pets/my");

        if (response.data.pet) {
          const loadedPet = new Pet(response.data.pet);
          setPetData(loadedPet);
          petNameRef.current = loadedPet.name;
          
          // 로컬 스토리지에 펫 정보 저장 (소켓 핸들러 및 다른 페이지에서 활용)
          localStorage.setItem("petId", loadedPet.id);
          localStorage.setItem("petName", loadedPet.name);
          
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

      {/* 실시간 접속자 수 표시 */}
      <div className="fixed top-4 left-4 lg:top-8 lg:left-[calc(16rem+2rem)] p-3 px-5 rounded-2xl bg-white/80 dark:bg-[#0b0f1a]/80 backdrop-blur-md border border-slate-100 dark:border-slate-800 z-[60] shadow-sm flex items-center gap-3 transition-all hover:scale-105 group cursor-default">
      {/* 상태 표시등 */}
      <div className="relative flex h-4 w-4 items-center justify-center">
        <span className="animate-ping absolute h-full w-full rounded-full bg-sky-400 opacity-20"></span>
        <span className="relative h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(125,211,252,0.7)]"></span>
      </div>
  
      {/* 유저 수 텍스트 */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.2em] italic group-hover:text-sky-400 transition-colors">
          Live
        </span>
        <span className="text-[14px] font-black text-slate-900 dark:text-white font-mono">
          {activeUserCount}
          <span className="ml-1 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Users</span>
        </span>
      </div>
    </div>
      
      {/* 테마 버튼 */}
      <button 
        onClick={toggleTheme} 
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-200 z-[60] shadow-sm transition-all hover:scale-110"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>
      
      {/* 공통 사이드바 */}
      <CommonSide activeMenu="내 펫" />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 h-full overflow-y-auto pt-10 pb-24 lg:pb-10 px-4 lg:px-8 custom-scrollbar relative z-10 scroll-smooth">
        <div className="flex flex-col items-center w-full min-h-full">
           <PetStatusPage petData={petData} />
        </div>
      </main>

      {/* 타인 접속 토스트 알림 */}
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