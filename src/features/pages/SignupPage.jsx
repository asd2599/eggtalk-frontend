import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import { FiMail, FiLock, FiUserPlus, FiMoon, FiSun, FiAlertCircle, FiZap } from "react-icons/fi";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  // 토스트 상태 관리
  const [notifications, setNotifications] = useState([]);

  // 1. 초기 로드 시 테마 상태 확인 및 적용
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, []);

  // 2. 테마 토글 함수
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  // 토스트 실행 함수
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

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showToast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }
    
    try {
      const response = await api.post("/signup", {
        email,
        password,
        confirmPassword,
      });
      
      showToast(response.data.message || "에그톡의 가족이 되신 걸 환영합니다! ✨");
      
      // 토스트 메시지를 읽을 시간을 준 뒤 이동
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      showToast(
        error.response?.data?.message || "회원가입 중 오류가 발생했습니다.",
        "error"
      );
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-300 relative overflow-hidden font-sans">
      
      {/* 테마 전환 버튼 */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:scale-110 transition-all z-50 shadow-sm"
      >
        {isDarkMode ? <FiSun className="text-sm text-amber-500" /> : <FiMoon className="text-sm text-indigo-500" />}
      </button>

      <div className="w-full max-w-[340px] px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 mb-4 border border-gray-100 dark:border-gray-800">
            <FiUserPlus className="text-gray-900 dark:text-amber-500 text-xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            계정 만들기
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 uppercase tracking-widest">
            Your journey starts here
          </p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          {/* 이메일 입력 */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiMail className="text-gray-400 dark:text-gray-600 text-xs transition-colors group-focus-within:text-amber-500" />
            </div>
            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:bg-white dark:focus:bg-gray-900 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
              required
            />
          </div>

          {/* 비밀번호 입력 */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiLock className="text-gray-400 dark:text-gray-600 text-xs transition-colors group-focus-within:text-amber-500" />
            </div>
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:bg-white dark:focus:bg-gray-900 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
              required
            />
          </div>

          {/* 비밀번호 확인 */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiLock className="text-gray-400 dark:text-gray-600 text-xs transition-colors group-focus-within:text-amber-500" />
            </div>
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:bg-white dark:focus:bg-gray-900 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-semibold py-2.5 rounded-xl hover:bg-black dark:hover:bg-white transition-all active:scale-[0.98] shadow-lg shadow-gray-200 dark:shadow-none"
          >
            가입하기
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-[12px] text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
          >
            이미 계정이 있으신가요?{" "}
            <span className="underline underline-offset-4 ml-1">로그인</span>
          </button>
        </div>
      </div>

      {/* 하단 커스텀 토스트 알림 영역 */}
      <div className="fixed bottom-10 right-6 lg:right-10 z-[100] flex flex-col gap-3 pointer-events-none">
        {notifications.map((noti) => (
          <div 
            key={noti.id} 
            className={`
              bg-white/90 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-2xl rounded-[1.8rem] py-4 px-6 flex items-center gap-4 pointer-events-auto min-w-[280px] transition-all
              ${noti.isExiting ? 'animate-toast-out' : 'animate-toast-in'}
            `}
          >
            <div className={`relative flex items-center justify-center w-9 h-9 rounded-2xl ${noti.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
              {noti.type === 'error' ? <FiAlertCircle className="text-rose-500 text-[18px]" /> : <FiZap className="text-amber-500 text-[18px]" />}
            </div>
            <div className="text-[13px] font-bold text-gray-800 dark:text-gray-100 tracking-tight">{noti.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignupPage;