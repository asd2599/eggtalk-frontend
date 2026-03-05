import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import { FiMail, FiLock, FiLogIn, FiMoon, FiSun } from "react-icons/fi"; // FiMoon, FiSun 추가

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false); // 다크모드 상태 관리
  const navigate = useNavigate();

  // 초기 테마 설정 확인 및 적용 (회원가입 페이지와 동일한 로직)
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

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
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

        if (data.petId === 0 || !data.petId) {
          navigate("/create-pet");
        } else {
          navigate("/main");
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || "로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-300">
      {/* 테마 전환 아이콘 버튼 */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:scale-110 transition-all z-50"
      >
        {isDarkMode ? (
          <FiSun className="text-sm" />
        ) : (
          <FiMoon className="text-sm" />
        )}
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
    </div>
  );
};

export default LoginPage;
