import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiSun, FiMoon, FiZap } from "react-icons/fi";
import Pet from "../pets/pet";
import PetStatusPage from "./PetStatusPage"; // ✅ 컴포넌트 불러오기
import CommonSide from "./CommonSide";     // ✅ 사이드바 불러오기
import socket from "../../utils/socket";

const MainPage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUserCount, setActiveUserCount] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 1. 테마 초기 설정
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) { document.documentElement.classList.add("dark"); setIsDarkMode(true); }
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  // 2. 데이터 페칭
  useEffect(() => {
    socket.on("update_user_count", (count) => setActiveUserCount(count));

    const fetchPetData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/"); return; }
        const res = await axios.get("http://localhost:8000/api/pets/my", { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.pet) { setPetData(new Pet(res.data.pet)); } 
        else { navigate("/create-pet"); }
      } catch (err) { navigate("/"); } finally { setLoading(false); }
    };
    fetchPetData();
    return () => socket.off("update_user_count");
  }, [navigate]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans relative overflow-hidden custom-scrollbar">
      
      {/* 테마 버튼 */}
      <button onClick={toggleTheme} className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-200 z-[60] shadow-sm transition-all hover:scale-110">
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>
      
      {/* ✅ 공통 사이드바 */}
      <CommonSide activeMenu="내 펫 상태" />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 h-full overflow-y-auto pt-10 pb-24 lg:pb-10 px-4 lg:px-8 custom-scrollbar relative z-10 scroll-smooth">
        <div className="flex flex-col items-center w-full min-h-full">
           {/* ✅ 펫 상태 페이지 컴포넌트 삽입 */}
           <PetStatusPage petData={petData} />
        </div>
      </main>
    </div>
  );
};

export default MainPage;