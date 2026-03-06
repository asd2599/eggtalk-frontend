import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../../utils/config";
import { FiEdit3, FiCheck, FiMoon, FiSun, FiAlertCircle, FiZap } from "react-icons/fi";

const CreatePetPage = () => {
  const navigate = useNavigate();
  const [petName, setPetName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // 토스트 상태
  const [notifications, setNotifications] = useState([]);

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

  // 부드러운 토스트 실행 함수
  const showToast = (message, type = "success") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, isExiting: false }]);
    
    // 3초 뒤에 나가는 애니메이션 시작
    setTimeout(() => {
      setNotifications((prev) => 
        prev.map(n => n.id === id ? { ...n, isExiting: true } : n)
      );
      // 애니메이션 끝난 후 리스트에서 제거
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 300);
    }, 3000);
  };

  const colors = ["blue", "green", "pink", "purple", "red", "yellow"];

  const handleCreatePet = async () => {
    if (!petName.trim()) {
      showToast("펫 이름을 먼저 지어주세요! 🥚", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${SERVER_URL}/api/pets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: petName,
          color: selectedColor,
        }),
      });

      if (response.ok) {
        showToast("새로운 친구가 탄생했습니다! ✨");
        setTimeout(() => navigate("/main"), 1800);
      } else {
        const errorData = await response.json();
        showToast(errorData.message || "생성에 실패했습니다.", "error");
      }
    } catch (error) {
      showToast("서버 연결 상태를 확인해주세요.", "error");
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 dark:bg-[#0b0f1a] transition-colors duration-500 font-sans p-6 relative overflow-hidden">
      
      {/* 테마 버튼 */}
      <button onClick={toggleTheme} 
              className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-200 z-[60] shadow-sm transition-all hover:scale-110"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>

      {/* 배경 블러 효과 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white dark:bg-[#0b0f1a] rounded-[3rem] p-10 lg:p-12 shadow-2xl border border-gray-100 dark:border-gray-800 z-10 transition-all">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl mb-6 border border-gray-100 dark:border-gray-800 shadow-inner">
            <FiEdit3 className="text-gray-900 dark:text-sky-500 text-2xl" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic">Create My Pet</h1>
          <p className="text-[11px] font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">나만의 펫 커스텀</p>
        </div>

        {/* 입력란 */}
        <div className="space-y-3 mb-10 px-1">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest italic ml-1">Pet Name</label>
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-[14px] px-6 py-4 rounded-2xl focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-bold"
          />
        </div>

        {/* 색상 선택 */}
        <div className="space-y-4 mb-12">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest italic ml-1 px-1">Select Color</label>
          <div className="grid grid-cols-3 gap-4">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`relative aspect-square flex items-center justify-center rounded-[1.8rem] transition-all duration-300 border-2 ${
                  selectedColor === color
                    ? "border-sky-500 bg-sky-50/30 dark:bg-sky-900/10 shadow-lg scale-105"
                    : "border-gray-50 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/30 hover:border-gray-200 dark:hover:border-gray-700"
                }`}
              >
                <img src={`/images/shapes/${color}_body_circle.png`} alt={color} className={`w-12 h-12 lg:w-16 lg:h-16 object-contain transition-transform duration-500 ${selectedColor === color ? "scale-110 drop-shadow-xl" : "opacity-60 grayscale-[30%]"}`} />
                {selectedColor === color && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0b0f1a] shadow-sm animate-pop">
                    <FiCheck className="text-white text-[10px] font-bold" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleCreatePet} className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.25em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-gray-300 dark:shadow-none">
          생성하기
        </button>
      </div>

      {/* 부드러운 토스트 영역 */}
      <div className="fixed bottom-10 right-6 lg:right-10 z-[100] flex flex-col gap-3 pointer-events-none">
        {notifications.map((noti) => (
          <div 
            key={noti.id} 
            className={`
              bg-white/90 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-2xl rounded-[1.8rem] py-4 px-6 flex items-center gap-4 pointer-events-auto min-w-[280px]
              ${noti.isExiting ? 'animate-toast-out' : 'animate-toast-in'}
            `}
          >
            <div className={`relative flex items-center justify-center w-9 h-9 rounded-2xl ${noti.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-sky-50 dark:bg-sky-900/20'}`}>
              {noti.type === 'error' ? <FiAlertCircle className="text-slate-600 dark:text-slate-400 text-[18px]" /> : 
                              <FiZap className="text-sky-400 text-[18px]" />}
            </div>
            <div className="text-[13px] font-bold text-gray-800 dark:text-gray-100 tracking-tight">{noti.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreatePetPage;