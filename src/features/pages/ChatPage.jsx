import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiLogOut, FiBox, FiCloud, FiMonitor, FiSmile, FiAward, FiMessageCircle, FiSend, FiMoon, FiSun, FiUser, FiActivity,
  FiHeart, FiZap, FiDroplet, FiCoffee, FiBookOpen, FiCompass, FiUsers, FiTarget, FiHash, FiGlobe, FiEye, FiSearch, FiZapOff
} from "react-icons/fi";
import Pet from "../pets/pet";

const ChatPage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [messages, setMessages] = useState([{ sender: "pet", text: "안녕! 나랑 대화하자멍 (또는 냥)!" }]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) { document.documentElement.classList.add("dark"); setIsDarkMode(true); }

    const fetchPetData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/"); return; }
        const response = await axios.get("http://localhost:8000/api/pets/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.pet) { setPetData(new Pet(response.data.pet)); }
        else { navigate("/create-pet"); }
      } catch (error) {
        localStorage.removeItem("token"); navigate("/");
      } finally { setLoading(false); }
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

  const handleLogout = () => { localStorage.removeItem("token"); navigate("/"); };

  const handleAnalyzeTendency = async () => {
    try {
      setAnalysisLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post("http://localhost:8000/api/pets/analyze-tendency", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.pet) {
        setPetData(new Pet(response.data.pet));
        setMessages(prev => [...prev, {
          sender: "pet", isSystem: true,
          text: `(시스템) AI 성향 분석 완료!\n현재 성향: ${response.data.pet.tendency}\n이유: ${response.data.reason}`,
        }]);
      }
    } catch (error) { alert("AI 성향 분석 중 오류가 발생했습니다."); }
    finally { setAnalysisLoading(false); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMessage = inputValue;
    setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
    setInputValue("");
    setIsTyping(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("http://localhost:8000/api/pets/chat", { message: userMessage }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => [...prev, { sender: "pet", text: response.data.reply, analysis: response.data.analysis }]);
      if (response.data.pet) setPetData(new Pet(response.data.pet));
    } catch (error) {
      setMessages(prev => [...prev, { sender: "pet", text: "앗... 오류가 생겨서 대답을 못하겠어. 💧" }]);
    } finally { setIsTyping(false); }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
      <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
    </div>
  );

  const statConfig = {
    healthHp: { label: "체력", icon: FiHeart, color: "text-rose-500" },
    hunger: { label: "배고픔", icon: FiCoffee, color: "text-amber-600" },
    cleanliness: { label: "청결", icon: FiDroplet, color: "text-cyan-500" },
    stress: { label: "스트레스", icon: FiZapOff, color: "text-purple-500" },
    affection: { label: "애정도", icon: FiHeart, color: "text-pink-500" },
    knowledge: { label: "지식", icon: FiBookOpen, color: "text-blue-500" },
    empathy: { label: "공감", icon: FiUsers, color: "text-emerald-500" },
    logic: { label: "논리력", icon: FiTarget, color: "text-indigo-500" },
    altruism: { label: "이타심", icon: FiGlobe, color: "text-orange-500" },
    extroversion: { label: "외향성", icon: FiSmile, color: "text-yellow-500" },
    openness: { label: "개방성", icon: FiCompass, color: "text-teal-500" },
    directness: { label: "직설성", icon: FiMessageCircle, color: "text-red-500" },
    curiosity: { label: "호기심", icon: FiSearch, color: "text-blue-400" },
    humor: { label: "유머", icon: FiZap, color: "text-yellow-400" },
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden">
      
      {/* 테마 버튼 */}
      <button onClick={toggleTheme} className="fixed top-4 right-4 lg:top-6 lg:right-6 p-2.5 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-100 dark:border-gray-800 text-gray-500 z-[60] shadow-sm active:scale-90 transition-all">
        {isDarkMode ? <FiSun className="text-xs" /> : <FiMoon className="text-xs" />}
      </button>

      {/* 사이드바 */}
      <aside className="fixed bottom-0 w-full h-16 lg:relative lg:w-64 lg:h-full border-t lg:border-t-0 lg:border-r border-gray-100 dark:border-gray-900 bg-white/90 dark:bg-[#0b0f1a]/90 backdrop-blur-xl z-50 flex lg:flex-col justify-between items-center lg:items-stretch">
        <div className="flex lg:flex-col items-center justify-around w-full lg:p-10">
          <h2 className="hidden lg:block text-xs font-black text-gray-900 dark:text-white mb-10 tracking-[0.3em] text-center uppercase">Dashboard</h2>
          <nav className="flex lg:flex-col gap-1 lg:gap-3 w-full px-2 lg:px-0">
            {[
              { icon: FiSmile, label: "내 펫 상태", path: "/main" },
              { icon: FiAward, label: "명예의 전당", path: "/ranking" },
              { icon: FiMessageCircle, label: "대화하기", path: "/chat", active: true },
              { icon: FiBox, label: "DD 모듈", path: "/dd" },
              { icon: FiCloud, label: "MS 모듈", path: "/ms" },
              { icon: FiMonitor, label: "SH 모듈", path: "/sh" },
            ].map((item) => (
              <button key={item.label} onClick={() => navigate(item.path)} className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-4 p-2 lg:px-5 lg:py-3.5 rounded-xl lg:rounded-2xl transition-all flex-1 lg:flex-none ${item.active ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"}`}>
                <item.icon className="text-xl lg:text-lg" />
                <span className="text-[9px] lg:text-[13px] font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        {/* 로그아웃 버튼 */}
        <div className="p-10 border-t border-gray-50 dark:border-gray-900">
          <button onClick={() => {localStorage.removeItem("token"); navigate("/");}} className="flex items-center justify-center lg:justify-center gap-3 w-full text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest group">
            <FiLogOut /> Sign Out
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col lg:flex-row items-stretch p-3 lg:p-8 gap-4 lg:gap-8 bg-[#fcfcfc] dark:bg-[#0b0f1a] h-[calc(100vh-64px)] lg:h-full overflow-y-auto lg:overflow-hidden custom-scrollbar">
        
        {/* ✅ 좌측: 스탯 영역 (입체 카드 스타일) - 넓이 w-[380px] */}
        <div className="w-full lg:w-[380px] flex flex-col justify-between flex-shrink-0 lg:py-2 h-full">
          <div className="flex flex-col items-center h-full">
            <div className="w-24 h-35 lg:w-full lg:aspect-square lg:max-w-[160px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl lg:rounded-[2.5rem] shadow-sm flex items-center justify-center mb-4 relative overflow-hidden group">
              {petData && <img src={petData.getImagePath()} className="w-16 h-16 lg:w-28 lg:h-28 object-contain relative z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-xl" alt="" />}
            </div>

            <div className="text-center mb-4">
              <h2 className="text-lg lg:text-2xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">{petData?.name}</h2>
              <p className="text-[9px] lg:text-[10px] text-indigo-500 font-bold mt-1.5 uppercase tracking-widest">{petData?.tendency}</p>
            </div>

            {/* 스탯 카드 리스트 영역 (스크롤 가능) */}
            <div className="w-full flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4 lg:max-h-[calc(100vh-320px)]">
              {[
                { title: "Character Stats", stats: ["healthHp", "hunger", "cleanliness", "stress"] },
                { title: "Mind & Social", stats: ["affection", "knowledge", "empathy", "logic", "altruism", "extroversion", "openness", "directness", "curiosity", "humor"] }
              ].map((section, sIdx) => (
                <div key={sIdx} className="space-y-3">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-1.5 mb-2 px-1">
                    <h4 className="text-[9px] lg:text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em] italic">{section.title}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    {section.stats.map((key) => {
                      const config = statConfig[key];
                      if (!config) return null;
                      return (
                        <div key={key} className="flex items-center gap-2 lg:gap-3.5 p-2 lg:p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100/50 dark:border-gray-800 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all hover:scale-[1.03] hover:shadow-lg group">
                          <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <config.icon className={`text-[13px] lg:text-[15px] ${config.color}`} />
                          </div>
                          <div className="flex-1 flex flex-col">
                            <span className="text-[11px] lg:text-[13px] font-bold text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors leading-tight">{config.label}</span>
                            <span className="text-[12px] lg:text-[14px] font-black text-gray-900 dark:text-white font-mono tracking-tighter">{petData?.[key]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleAnalyzeTendency} disabled={analysisLoading} className="w-full py-3 lg:py-4 mt-4 lg:mt-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl lg:rounded-[1.8rem] font-bold text-[10px] lg:text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
            {analysisLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FiActivity />} AI 분석 및 성향 확립
          </button>
        </div>

        {/* ✅ 우측: 채팅창 영역 (비율 flex-1로 축소) */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-[2rem] lg:rounded-[3rem] shadow-sm overflow-hidden relative h-full">
          <div className="px-6 lg:px-8 py-4 lg:py-5 border-b border-gray-50 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex justify-between items-center flex-shrink-0">
            <span className="text-[8px] lg:text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Live Interaction Terminal</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>

          <div ref={chatEndRef} className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 lg:space-y-6 scroll-smooth custom-scrollbar bg-slate-50/10 dark:bg-transparent">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}>
                <div className={`max-w-[90%] lg:max-w-[85%] flex items-start gap-3 lg:gap-4 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0 border ${msg.sender === "user" ? "bg-gray-900 border-gray-800 shadow-md" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"}`}>
                    {msg.sender === "user" ? <FiUser className="text-white text-[10px] lg:text-xs" /> : <FiSmile className="text-gray-400 text-[10px] lg:text-xs" />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className={`p-3 lg:p-5 rounded-[1.2rem] lg:rounded-[1.8rem] text-[12px] lg:text-[13px] leading-relaxed shadow-sm ${msg.sender === "user" ? "bg-gray-900 text-white rounded-tr-none" : msg.isSystem ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-100 font-bold" : "bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-50 dark:border-gray-700 rounded-tl-none"}`}>
                      {msg.text}
                    </div>
                    {msg.sender === "pet" && msg.analysis && (
                      <div className="flex flex-wrap gap-1 lg:gap-2 px-1">
                        {Object.entries(msg.analysis).map(([key, val]) => {
                          if (!val || val === 0) return null;
                          return (
                            <span key={key} className={`text-[8px] lg:text-[10px] font-black px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full border ${val > 0 ? "bg-emerald-50/50 border-emerald-100 text-emerald-600" : "bg-rose-50/50 border-rose-100 text-rose-600"}`}>
                              {(statConfig[key]?.label || key)} {val > 0 ? `+${val}` : val}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && <div className="text-[10px] lg:text-[11px] text-gray-300 ml-10 lg:ml-12 italic animate-pulse">typing...</div>}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 lg:p-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-50 dark:border-gray-800 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="relative flex items-center max-w-2xl mx-auto w-full group">
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isTyping} placeholder="대화를 입력하세요..." className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-[11px] lg:text-[12px] px-5 lg:px-7 py-3 lg:py-4.5 rounded-xl lg:rounded-[1.8rem] focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all shadow-inner" />
              <button type="submit" disabled={isTyping || !inputValue.trim()} className="absolute right-2 lg:right-2.5 p-2 lg:p-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg lg:rounded-[1.4rem] hover:scale-105 active:scale-95 transition-all shadow-lg"><FiSend className="text-xs lg:text-sm" /></button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatPage;