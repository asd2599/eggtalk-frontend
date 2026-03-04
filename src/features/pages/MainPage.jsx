import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { FiLogOut, FiBox, FiCloud, FiMonitor, FiSmile, FiAward, FiMessageCircle, FiZap, FiMoon, FiSun } from "react-icons/fi";
import Pet from "../pets/pet";
import PetStatusPage from "./PetStatusPage";

const MainPage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUserCount, setActiveUserCount] = useState(1);
  const [loginNotifications, setLoginNotifications] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const petNameRef = useRef(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
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

  useEffect(() => {
    const socket = io("http://localhost:8000");
    socket.on("update_user_count", (count) => setActiveUserCount(count));
    socket.on("new_user_login", (incomingPetName) => {
      if (petNameRef.current && incomingPetName !== petNameRef.current) {
        const id = Date.now() + Math.random();
        setLoginNotifications((prev) => [...prev, { id, petName: incomingPetName }]);
        setTimeout(() => setLoginNotifications((prev) => prev.filter((n) => n.id !== id)), 3000);
      }
    });

    const fetchPetData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/"); return; }
        const response = await axios.get("http://localhost:8000/api/pets/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.pet) {
          const loadedPet = new Pet(response.data.pet);
          setPetData(loadedPet);
          petNameRef.current = loadedPet.name; 
          socket.emit("user_login", loadedPet.name);
        } else { navigate("/create-pet"); }
      } catch (error) {
        localStorage.removeItem("token"); navigate("/");
      } finally { setLoading(false); }
    };
    fetchPetData();
    return () => { socket.disconnect(); };
  }, [navigate]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500">
      <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    // ✅ 전체 컨테이너에도 custom-scrollbar를 적용하여 일관성 유지
    <div className="flex flex-col lg:flex-row w-full h-screen bg-slate-50 dark:bg-[#0b0f1a] transition-colors duration-500 font-sans relative overflow-hidden custom-scrollbar">
      
      {/* 테마 토글 버튼 */}
      <button 
        onClick={toggleTheme} 
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-3 rounded-2xl bg-white dark:bg-[#0b0f1a] border border-gray-100 dark:border-gray-800 text-gray-500 z-[60] shadow-sm active:scale-90 transition-all hover:scale-110"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>
      
      {/* 사이드바 & 하단바 */}
      <aside className="fixed bottom-0 lg:relative w-full lg:w-64 h-16 lg:h-screen border-t lg:border-t-0 lg:border-r border-gray-100 dark:border-gray-900 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl z-50 flex lg:flex-col justify-between items-center lg:items-stretch shadow-lg lg:shadow-none">
        <div className="flex lg:flex-col items-center justify-around w-full lg:p-10">
          <h2 className="hidden lg:block text-xs font-black text-gray-900 dark:text-white mb-10 tracking-[0.3em] text-center uppercase">Dashboard</h2>
          
          <div className="hidden lg:flex mb-12 items-center justify-center gap-2 group cursor-default">
            <div className="relative flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-20"></span>
              <span className="relative h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]"></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em] italic transition-colors group-hover:text-gray-400">Live</span>
              <span className="text-[13px] font-black text-gray-900 dark:text-white">{activeUserCount} <span className="text-[10px] text-gray-400">Users</span></span>
            </div>
          </div>

          <nav className="flex lg:flex-col gap-1 lg:gap-3 w-full px-4 lg:px-0">
            {[
              { icon: FiSmile, label: "내 펫 상태", path: "/main", active: true },
              { icon: FiAward, label: "명예의 전당", path: "/ranking" },
              { icon: FiMessageCircle, label: "대화하기", path: "/chat" },
              { icon: FiBox, label: "DD 모듈", path: "/dd" },
              { icon: FiCloud, label: "MS 모듈", path: "/ms" },
              { icon: FiMonitor, label: "SH 모듈", path: "/sh" },
            ].map((item) => (
              <button key={item.label} onClick={() => navigate(item.path)} className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-4 p-2 lg:px-5 lg:py-3.5 rounded-xl lg:rounded-2xl transition-all flex-1 lg:flex-none ${item.active ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"}`}>
                <item.icon className="text-xl lg:text-lg" />
                <span className="text-[9px] lg:text-[13px] font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="hidden lg:block p-10 border-t border-gray-50 dark:border-gray-900">
          <button onClick={() => {localStorage.removeItem("token"); navigate("/");}} className="flex items-center justify-center gap-3 w-full text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest group"><FiLogOut className="text-lg" /> <span>Sign Out</span></button>
        </div>
      </aside>

      {/* ✅ 메인 콘텐츠 영역: h-full과 overflow-y-auto, 그리고 custom-scrollbar 적용 */}
      <main className="flex-1 h-full overflow-y-auto pt-10 pb-24 lg:pb-10 px-4 lg:px-8 custom-scrollbar relative z-10 scroll-smooth">
        {/* 중앙 정렬을 위한 래퍼 div */}
        <div className="flex flex-col items-center w-full min-h-full">
           <PetStatusPage petData={petData} />
        </div>
      </main>

      {/* 타인 접속 토스트 알림 */}
      <div className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 z-[100] flex flex-col gap-3 pointer-events-none">
        {loginNotifications.map((noti) => (
          <div key={noti.id} className="bg-white/90 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-2xl rounded-[1.8rem] py-4 px-6 flex items-center gap-4 animate-fade-in-up pointer-events-auto transition-all">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <FiZap className="text-amber-500 text-[16px] stroke-[2.5]" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#0b0f1a] shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
            </div>
            <div className="text-[13px] font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              <span className="text-amber-600 dark:text-amber-500 font-black mr-1.5">{noti.petName}</span>
              님이 접속했습니다!
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainPage;