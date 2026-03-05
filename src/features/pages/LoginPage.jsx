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
      // alert 대신 토스트 사용
      showToast(error.response?.data?.message || "로그인 정보를 확인해주세요.", "error");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-300 relative overflow-hidden">
      {/* 테마 전환 아이콘 버튼 */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:scale-110 transition-all z-50"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>

      <div className="w-full max-w-[340px] px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 mb-4 border border-gray-100 dark:border-gray-800 transition-colors">
            <FiLogIn className="text-gray-900 dark:text-gray-100 text-xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            환영합니다!
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            서비스 이용을 위해 로그인해 주세요
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMail className="text-gray-400" />
            </div>
            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-900 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
              required
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiLock className="text-gray-400 dark:text-gray-600 text-xs transition-colors" />
            </div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-900 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-semibold py-2.5 rounded-xl hover:bg-black dark:hover:bg-white transition-all active:scale-[0.98] shadow-sm"
          >
            로그인
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-[12px] text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
          >
            아직 계정이 없으신가요?{" "}
            <span className="underline underline-offset-4 ml-1">회원가입</span>
          </button>
        </div>
      </div>

      {/* 하단 커스텀 토스트 알림 영역 */}
      <div className="fixed bottom-10 right-6 lg:right-10 z-[100] flex flex-col gap-3 pointer-events-none">
        {notifications.map((noti) => (
          <div 
            key={noti.id} 
            className={`
              bg-white/90 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-2xl rounded-[1.8rem] py-4 px-6 flex items-center gap-4 pointer-events-auto min-w-[280px]
              ${noti.isExiting ? 'animate-toast-out' : 'animate-toast-in'}
            `}
          >
            <div className={`relative flex items-center justify-center w-9 h-9 rounded-2xl ${noti.type === 'error' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
              {noti.type === 'error' ? <FiAlertCircle className="text-red-500 text-[18px]" /> : <FiZap className="text-amber-500 text-[18px]" />}
            </div>
            <div className="text-[13px] font-bold text-gray-800 dark:text-gray-100 tracking-tight">{noti.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoginPage;