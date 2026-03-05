import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import { FiMail, FiLock, FiUserPlus, FiMoon, FiSun } from "react-icons/fi";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

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

  // 2. 테마 토글 함수 (로컬 스토리지 저장 포함)
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

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      const response = await api.post("/signup", {
        email,
        password,
        confirmPassword,
      });
      alert(response.data.message || "회원가입이 완료되었습니다.");
      navigate("/");
    } catch (error) {
      alert(
        error.response?.data?.message || "회원가입 중 오류가 발생했습니다.",
      );
    }
  };

  return (
    // bg-white와 dark:bg-[#0b0f1a]가 제대로 작동하려면 tailwind.config.js 설정이 필수입니다!
    <div className="flex justify-center items-center h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-300">
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 mb-4 border border-gray-100 dark:border-gray-800">
            <FiUserPlus className="text-gray-900 dark:text-gray-100 text-xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            계정 만들기
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            새로운 여정을 시작해보세요
          </p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiMail className="text-gray-400 dark:text-gray-600 text-xs group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors" />
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
              <FiLock className="text-gray-400 dark:text-gray-600 text-xs group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors" />
            </div>
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-900 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
              required
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiLock className="text-gray-400 dark:text-gray-600 text-xs group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors" />
            </div>
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-900 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-semibold py-2.5 rounded-xl hover:bg-black dark:hover:bg-white transition-all active:scale-[0.98] shadow-sm"
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
    </div>
  );
};

export default SignupPage;
