import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import { FiMail, FiLock, FiUserPlus, FiMoon, FiSun, FiAlertCircle, FiZap } from "react-icons/fi";
import LoadingModal from "../../components/LoadingModal"; 

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

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

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }
    
    setIsLoading(true); 
    
    try {
      const nickname = email.split('@')[0];
      const response = await api.post("/signup", { email, password, confirmPassword, nickname });
      
      showToast(response.data.message || "에그톡의 가족이 되신 걸 환영합니다! ✨");
      setTimeout(() => { 
        setIsLoading(false); // 로딩 종료
        navigate("/"); 
      }, 1500);
    } catch (error) {
      setIsLoading(false); // 에러 시 로딩 종료
      showToast(error.response?.data?.message || "회원가입 중 오류가 발생했습니다.", "error");
    }
  };

  return (
    <>
      <LoadingModal isVisible={isLoading} message="회원가입 처리 중..." />
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-[#0b0f1a] transition-colors duration-300 relative overflow-hidden font-sans">
        
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-100 dark:bg-sky-400/5 rounded-full blur-[120px] pointer-events-none opacity-60"></div>

        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-500 hover:scale-110 transition-all z-50 shadow-sm active:scale-95"
        >
          {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
        </button>

        <div className="w-full max-w-[340px] px-6 relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-slate-900 dark:bg-sky-400 mb-5 shadow-2xl shadow-sky-500/10 transition-all">
              <FiUserPlus className="text-sky-300 dark:text-slate-950 text-2xl" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase leading-tight">
              Sign Up <span className="text-sky-400 font-sans not-italic">.</span>
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-300 mt-2 font-bold uppercase tracking-widest opacity-80">
              Join the EggTalk Family
            </p>
            <div className="h-[2px] w-8 bg-sky-200 dark:bg-sky-400/40 mx-auto mt-6 rounded-full"></div>
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <FiMail className="text-slate-300 dark:text-slate-500 text-xs group-focus-within:text-sky-500 transition-colors" />
              </div>
              <input
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-4 text-[13px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold shadow-sm"
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <FiLock className="text-slate-300 dark:text-slate-500 text-xs group-focus-within:text-sky-500 transition-colors" />
              </div>
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-4 text-[13px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold shadow-sm"
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <FiLock className="text-slate-300 dark:text-slate-500 text-xs group-focus-within:text-sky-500 transition-colors" />
              </div>
              <input
                type="password"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-4 text-[13px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold shadow-sm"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-[12px] font-black py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-sky-300 shadow-xl shadow-sky-500/5 dark:shadow-none uppercase tracking-[0.2em] italic transition-all active:scale-95 ${isLoading ? 'opacity-70 cursor-not-allowed transform-none' : ''}`}
            >
              {isLoading ? "가입 진행 중..." : "가입하기"}
            </button>
          </form>

          <div className="mt-10 text-center border-t border-slate-100 dark:border-slate-900/50 pt-8">
            <button
              type="button"
              onClick={() => navigate("/")}
              disabled={isLoading}
              className="text-[11px] font-black text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all uppercase tracking-widest disabled:opacity-50"
            >
              이미 계정이 있으신가요? <span className="text-sky-500 ml-1 underline underline-offset-8 decoration-2 font-black">Login</span>
            </button>
          </div>
        </div>

        <div className="fixed bottom-10 right-6 lg:right-10 z-110 flex flex-col gap-3 pointer-events-none">
          {notifications.map((noti) => (
            <div 
              key={noti.id} 
              className={`bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 shadow-2xl rounded-4xl py-4 px-7 flex items-center gap-5 pointer-events-auto min-w-[300px] transition-all ${noti.isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}
            >
              <div className={`relative flex items-center justify-center w-10 h-10 rounded-2xl ${noti.type === 'error' ? 'bg-slate-900 dark:bg-slate-800' : 'bg-sky-50 dark:bg-sky-900/30'}`}>
                {noti.type === 'error' ? 
                  <FiAlertCircle className="text-sky-600 text-[20px]" /> : 
                  <FiZap className="text-sky-500 text-[20px] animate-pulse" />
                }
              </div>
              <div className="text-[14px] font-black text-slate-800 dark:text-white tracking-tight">{noti.message}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SignupPage;
