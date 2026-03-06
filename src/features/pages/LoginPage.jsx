import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import { FiMail, FiLock, FiLogIn, FiMoon, FiSun, FiAlertCircle, FiZap } from "react-icons/fi";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  // ✅ 토스트 상태 관리
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark =
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  // 토스트 알림 함수
  const showToast = (message, type = "success") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, isExiting: false }]);
    
    setTimeout(() => {
      setNotifications((prev) => 
        prev.map(n => n.id === id ? { ...n, isExiting: true } : n)
      );
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 300);
    }, 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      localStorage.removeItem("token");

      const response = await api.post("/login", {
        email,
        password,
      });
      const data = response.data;
      
      if (data.token) {
        localStorage.setItem("token", data.token);
        showToast("성공적으로 로그인되었습니다! ✨");

        // 토스트 노출 후 이동
        setTimeout(() => {
          if (data.petId === 0 || !data.petId) {
            navigate("/create-pet");
          } else {
            navigate("/main");
          }
        }, 1200);
      }
    } catch (error) {
      showToast(error.response?.data?.message || "로그인 정보를 확인해주세요.", "error");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-300 relative overflow-hidden font-sans">
      
      {/* 배경 페일 블루 광채 (SignupPage와 동일한 효과) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-100 dark:bg-sky-900/20 rounded-full blur-[100px] pointer-events-none opacity-50"></div>

      {/* 테마 전환 아이콘 버튼 */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-300 hover:scale-110 transition-all z-50 shadow-sm"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>

      <div className="w-full max-w-[340px] px-6 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-100 mb-4 shadow-xl transition-colors">
            {/* 아이콘 색상: 딥 네이비 배경에 페일 블루 포인트 */}
            <FiLogIn className="text-sky-200 dark:text-slate-900 text-xl" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight italic uppercase">
            환영합니다!
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
            서비스 이용을 위해 로그인해 주세요
          </p>
          <div className="h-[1px] w-8 bg-sky-200 dark:bg-sky-900 mx-auto mt-5"></div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* 이메일 입력 영역 */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiMail className="text-slate-400 dark:text-slate-600 text-xs group-focus-within:text-sky-400 transition-colors" />
            </div>
            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-3 text-[13px] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-200 dark:focus:ring-sky-900 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
              required
            />
          </div>

          {/* 비밀번호 입력 영역 */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiLock className="text-slate-400 dark:text-slate-600 text-xs group-focus-within:text-sky-400 transition-colors" />
            </div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-3 text-[13px] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-200 dark:focus:ring-sky-900 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[12px] font-black py-3.5 rounded-xl hover:scale-[1.02] transition-all active:scale-[0.98] shadow-xl shadow-slate-200 dark:shadow-none uppercase tracking-widest"
          >
            로그인
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-50 dark:border-slate-900 pt-6">
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 transition-colors uppercase tracking-tighter"
          >
            아직 계정이 없으신가요? <span className="text-sky-400 ml-1 underline underline-offset-4">회원가입</span>
          </button>
        </div>
      </div>

      {/* 하단 커스텀 토스트 알림 영역 (디자인 통합) */}
      <div className="fixed bottom-10 right-6 lg:right-10 z-[100] flex flex-col gap-3 pointer-events-none">
        {notifications.map((noti) => (
          <div 
            key={noti.id} 
            className={`bg-white/90 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 shadow-2xl rounded-[1.5rem] py-4 px-6 flex items-center gap-4 pointer-events-auto min-w-[280px] transition-all ${noti.isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}
          >
            <div className={`relative flex items-center justify-center w-9 h-9 rounded-2xl ${noti.type === 'error' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-sky-50 dark:bg-sky-900/30'}`}>
              {noti.type === 'error' ? 
                <FiAlertCircle className="text-slate-600 dark:text-slate-400 text-[18px]" /> : 
                <FiZap className="text-sky-400 text-[18px]" />
              }
            </div>
            <div className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">{noti.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoginPage;