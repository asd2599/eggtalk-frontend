import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import {
  FiSend, FiMoon, FiSun, FiUser, FiSmile,
  FiActivity, FiHeart, FiZap, FiDroplet, FiCoffee, FiBookOpen, FiCompass, FiUsers, FiTarget, FiGlobe, FiSearch, FiZapOff, FiArrowRight, FiMessageCircle
} from "react-icons/fi";
import Pet from "../pets/pet";
import CommonSide from "./CommonSide"; 

const ChatPage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [messages, setMessages] = useState([
    { sender: "pet", text: "안녕! 나랑 대화하자멍 (또는 냥)!" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }

    const fetchPetData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/"); return; }
        const response = await api.get("/api/pets/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.pet) {
          setPetData(new Pet(response.data.pet));
        } else {
          navigate("/create-pet");
        }
      } catch (error) {
        localStorage.removeItem("token");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchPetData();
  }, [navigate]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  const handleAnalyzeTendency = async () => {
    try {
      setAnalysisLoading(true);
      const token = localStorage.getItem("token");
      const response = await api.post("/api/pets/analyze-tendency", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.pet) {
        setPetData(new Pet(response.data.pet));
        setMessages((prev) => [
          ...prev,
          {
            sender: "pet",
            isSystem: true,
            text: `(시스템) AI 성향 분석 완료!\n현재 성향: ${response.data.pet.tendency}\n이유: ${response.data.reason}`,
          },
        ]);
      }
    } catch (error) {
      alert("AI 성향 분석 중 오류가 발생했습니다.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMessage = inputValue;
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInputValue("");
    setIsTyping(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.post("/api/pets/chat", { message: userMessage }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => [
        ...prev,
        { sender: "pet", text: response.data.reply, analysis: response.data.analysis },
      ]);
      if (response.data.pet) setPetData(new Pet(response.data.pet));
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "pet", text: "앗... 오류가 생겨서 대답을 못하겠어. 💧" },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const statConfig = {
    healthHp: { label: "체력", icon: FiHeart, color: "text-slate-400" },
    hunger: { label: "배고픔", icon: FiCoffee, color: "text-slate-400" },
    cleanliness: { label: "청결", icon: FiDroplet, color: "text-slate-400" },
    stress: { label: "스트레스", icon: FiZapOff, color: "text-slate-400" },
    affection: { label: "애정도", icon: FiHeart, color: "text-sky-400" },
    knowledge: { label: "지식", icon: FiBookOpen, color: "text-sky-400" },
    empathy: { label: "공감", icon: FiUsers, color: "text-sky-400" },
    logic: { label: "논리력", icon: FiTarget, color: "text-sky-400" },
    altruism: { label: "이타심", icon: FiGlobe, color: "text-sky-400" },
    extroversion: { label: "외향성", icon: FiSmile, color: "text-sky-400" },
    openness: { label: "개방성", icon: FiCompass, color: "text-sky-400" },
    directness: { label: "직설성", icon: FiMessageCircle, color: "text-sky-400" },
    curiosity: { label: "호기심", icon: FiSearch, color: "text-sky-400" },
    humor: { label: "유머", icon: FiZap, color: "text-sky-400" },
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden relative">
      
      {/* 테마 버튼 */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-sky-200 z-[60] transition-all border border-slate-100 dark:border-slate-800 shadow-sm"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>

      {/* 공통 사이드바 사용 */}
      <CommonSide activeMenu="대화하기" />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col lg:flex-row items-stretch p-3 lg:p-8 gap-4 lg:gap-8 bg-slate-50 dark:bg-[#0b0f1a] h-full overflow-y-auto lg:overflow-hidden custom-scrollbar pb-24 lg:pb-8 transition-all relative z-10">
        
        {/* 좌측: 스탯 영역 */}
        <div className="w-full lg:w-[380px] flex flex-col flex-shrink-0">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 lg:w-full lg:aspect-square lg:max-w-[160px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl lg:rounded-[2.5rem] shadow-sm flex items-center justify-center mb-4 relative overflow-hidden group">
              {petData && (
                <img src={petData.getImagePath()} className="w-16 h-16 lg:w-28 lg:h-28 object-contain relative z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-xl" alt="" />
              )}
            </div>

            <div className="text-center mb-4">
              <h2 className="text-lg lg:text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none uppercase">{petData?.name}</h2>
              <p className="text-[9px] lg:text-[10px] text-sky-400 font-black mt-3 uppercase tracking-widest leading-none">Lv. {petData?.level}</p>
            </div>

            <div className="w-full space-y-5">
              {[
                { title: "Vital Signs", stats: ["healthHp", "hunger", "cleanliness", "stress"] },
                { title: "Cognitive Matrix", stats: ["affection", "knowledge", "empathy", "logic", "altruism", "extroversion", "openness", "directness", "curiosity", "humor"] },
              ].map((section, sIdx) => (
                <div key={sIdx} className="space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-1 px-1 flex items-center gap-2">
                    <div className="w-1 h-1 bg-sky-300 rounded-full"></div>
                    <h4 className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] italic">{section.title}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {section.stats.map((key) => {
                      const config = statConfig[key];
                      return (
                        <div key={key} className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 transition-all hover:border-sky-100 dark:hover:border-sky-900 group shadow-sm">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-slate-800 transition-colors group-hover:bg-sky-50 dark:group-hover:bg-sky-900/30">
                            <config.icon className={`text-[12px] lg:text-[14px] ${config.color} group-hover:text-sky-500`} />
                          </div>
                          <div className="flex-1 flex flex-col min-w-0 text-left">
                            <span className="text-[10px] font-bold text-slate-400 truncate">{config.label}</span>
                            <span className="text-[11px] font-black text-slate-900 dark:text-white font-mono tracking-tighter">{petData?.[key]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleAnalyzeTendency}
            disabled={analysisLoading}
            className="w-full py-4 mt-8 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {analysisLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FiActivity />} AI 분석 및 성향 판별
          </button>
        </div>

        {/* 우측: 채팅창 영역 */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0b0f1a] border border-slate-100 dark:border-slate-900 rounded-[2.5rem] lg:rounded-[3rem] shadow-sm overflow-hidden relative min-h-[550px] lg:h-full transition-colors">
          <div className="px-6 lg:px-8 py-5 border-b border-slate-50 dark:border-slate-900 bg-white dark:bg-[#0b0f1a] flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">Encrypted Data Stream</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-tighter">Secure Link</span>
              <div className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse shadow-[0_0_8px_rgba(125,211,252,0.5)]"></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-6 lg:space-y-8 custom-scrollbar scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}>
                <div className={`max-w-[90%] lg:max-w-[80%] flex items-start gap-3.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 border ${msg.sender === "user" ? "bg-slate-900 border-slate-800 shadow-md" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"}`}>
                    {msg.sender === "user" ? <FiUser className="text-white text-sm" /> : <FiSmile className="text-sky-400 text-sm" />}
                  </div>
                  <div className="flex flex-col gap-2.5 min-w-0">
                    <div className={`p-4 lg:p-5 rounded-[1.6rem] text-[12px] lg:text-[13px] font-medium leading-relaxed shadow-sm transition-all duration-300
                      ${msg.sender === "user" 
                        ? "bg-slate-900 text-white rounded-tr-none" 
                        : msg.isSystem 
                          ? "bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-sky-100 border border-slate-100 dark:border-slate-700 font-bold italic" 
                          : "bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none"}`}>
                      {msg.text}
                    </div>

                    {msg.sender === "pet" && msg.analysis && (
                      <div className="flex flex-wrap gap-1.5 lg:gap-2 px-1">
                        {Object.entries(msg.analysis).map(([key, val]) => {
                          if (!val || val === 0) return null;
                          return (
                            <span key={key} className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 ${val > 0 ? "text-sky-500" : "text-rose-400"}`}>
                              {statConfig[key]?.label || key} {val > 0 ? `+${val}` : val}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-[10px] text-sky-400/50 ml-12 italic animate-pulse font-black tracking-widest uppercase">
                <FiZap className="text-xs" /> 생각 중...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 lg:p-8 bg-white dark:bg-[#0b0f1a] border-t border-slate-50 dark:border-slate-900">
            <form onSubmit={handleSendMessage} className="relative flex items-center max-w-2xl mx-auto w-full group">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isTyping}
                placeholder="대화를 입력하세요..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-[12px] px-6 py-4 lg:py-5 rounded-[1.8rem] focus:outline-none focus:ring-1 focus:ring-sky-200 dark:focus:ring-sky-900 transition-all shadow-inner"
              />
              <button type="submit" disabled={isTyping || !inputValue.trim()} className="absolute right-3 p-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg">
                <FiSend className="text-sm" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatPage;