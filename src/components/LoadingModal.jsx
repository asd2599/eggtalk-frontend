import React, { useEffect, useState } from "react";
import { FiLoader } from "react-icons/fi";

const LoadingModal = ({ message = "로딩 중...", isVisible }) => {
  const [render, setRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) setRender(true);
  }, [isVisible]);

  const onAnimationEnd = () => {
    if (!isVisible) setRender(false);
  };

  if (!render) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-100/40 dark:bg-[#0b0f1a]/60 backdrop-blur-md transition-opacity duration-300 font-sans ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onTransitionEnd={onAnimationEnd}
    >
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-8 flex flex-col items-center gap-5 transition-transform duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        <div className="relative flex justify-center items-center w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-sky-400 border-t-transparent animate-spin"></div>
          <FiLoader className="text-sky-500 text-2xl absolute animate-pulse" />
        </div>
        <div className="text-center">
          <h3 className="text-[16px] font-black text-slate-800 dark:text-white tracking-tight mb-1">
            {message}
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
            Please Wait
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingModal;
