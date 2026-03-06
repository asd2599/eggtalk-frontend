import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/config";
import {
  FiLogOut,
  FiArrowLeft,
  FiSun,
  FiMoon,
  FiSend,
  FiUser,
  FiSmile,
  FiMessageCircle,
  FiGift,
  FiUserPlus,
} from "react-icons/fi";
import Pet from "../pets/pet";
import socket from "../../utils/socket";
import GiftModal from "./components/GiftModal";
import FriendRequestModal from "./components/FriendRequestModal";

let strictModeLeaveTimer = null;

const STAT_MAPPING = [
  { key: "healthHp", label: "체력", color: "bg-slate-400", text: "text-slate-400" },
  { key: "hunger", label: "포만감", color: "bg-slate-400", text: "text-slate-400" },
  { key: "cleanliness", label: "청결도", color: "bg-slate-400", text: "text-slate-400" },
  { key: "stress", label: "스트레스", color: "bg-slate-400", text: "text-slate-400" },
  { key: "affection", label: "애정도", color: "bg-sky-400", text: "text-sky-400" },
  { key: "altruism", label: "이타심", color: "bg-sky-400", text: "text-sky-400" },
  { key: "empathy", label: "공감력", color: "bg-sky-400", text: "text-sky-400" },
  { key: "knowledge", label: "지식", color: "bg-sky-400", text: "text-sky-400" },
  { key: "logic", label: "논리력", color: "bg-sky-400", text: "text-sky-400" },
  { key: "extroversion", label: "외향성", color: "bg-sky-400", text: "text-sky-400" },
  { key: "humor", label: "유머감각", color: "bg-sky-400", text: "text-sky-400" },
  { key: "openness", label: "개방성", color: "bg-sky-400", text: "text-sky-400" },
  { key: "directness", label: "솔직함", color: "bg-sky-400", text: "text-sky-400" },
  { key: "curiosity", label: "호기심", color: "bg-sky-400", text: "text-sky-400" },
];

const DatingPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [roomUsers, setRoomUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const [showMyStats, setShowMyStats] = useState(false);
  const [showOtherStats, setShowOtherStats] = useState(false);

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  const [friendRequestData, setFriendRequestData] = useState(null);
  const [isFriendRequestModalOpen, setIsFriendRequestModalOpen] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isAutoCommentEnabled, setIsAutoCommentEnabled] = useState(true);

  const chatEndRef = useRef(null);

  useEffect(() => {
    let intervalId;
    let hasAlerted = false;

    const fetchRoomInfo = async () => {
      if (hasAlerted) return;
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await api.get(`/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          const usersWithPetInstances = res.data.room.users.map((u) => ({
            ...u,
            petInstance: u.petData ? new Pet(u.petData) : null,
          }));
          setRoomUsers(usersWithPetInstances);
        }
      } catch (err) {
        if (!hasAlerted) {
          hasAlerted = true;
          if (intervalId) clearInterval(intervalId);
          navigate("/lounge");
        }
      }
    };

    if (petData && roomId) {
      fetchRoomInfo();
      intervalId = setInterval(fetchRoomInfo, 1000);
      socket.emit("join_dating_room", { roomId, petName: petData.name });
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [petData, roomId, navigate]);

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
        const response = await api.get("/api/pets/my", { headers: { Authorization: `Bearer ${token}` } });
        if (response.data.pet) { setPetData(new Pet(response.data.pet)); } 
        else { navigate("/create-pet"); }
      } catch (error) {
        localStorage.removeItem("token");
        navigate("/");
      } finally { setLoading(false); }
    };
    fetchPetData();
  }, [navigate]);

  const silenceTimerRef = useRef(null);
  const isAutoCommenting = useRef(false);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (roomUsers.length < 2 || isAutoCommenting.current || !isAutoCommentEnabled) return;
    silenceTimerRef.current = setTimeout(() => { handleAutoComment(); }, 10000);
  }, [roomUsers.length, messages, isAutoCommentEnabled]);

  const handleAutoComment = async () => {
    if (isAutoCommenting.current || roomUsers.length < 2) return;
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === petData?.name || lastMsg.isMine) return;
    }
    isAutoCommenting.current = true;
    try {
      const token = localStorage.getItem("token");
      const lastTen = messages.filter((m) => !m.isSystem).slice(-10).map((m) => ({ sender: m.sender, message: m.message }));
      const res = await api.post("/api/pets/auto-comment", { lastMessages: lastTen }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.reply) {
        const petReplyMsg = { sender: petData.name, message: res.data.reply, timestamp: new Date(), isSystem: false, isPetReply: true };
        setMessages((prev) => [...prev, petReplyMsg]);
        socket.emit("send_dating_message", { roomId, message: petReplyMsg.message, sender: petReplyMsg.sender, isSystem: false, isPetReply: true });
      }
    } catch (err) { console.error(err); } 
    finally { isAutoCommenting.current = false; resetSilenceTimer(); }
  };

  useEffect(() => {
    resetSilenceTimer();
    return () => { if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); };
  }, [messages, inputValue, roomUsers.length, resetSilenceTimer]);

  useEffect(() => {
    socket.on("receive_dating_message", (data) => { setMessages((prev) => [...prev, data]); });
    socket.on("receive_friend_request", (data) => {
      if (data.receiverPetName === petData?.name) {
        setFriendRequestData({ requesterPetName: data.requesterPetName, requestId: data.requestId });
        setIsFriendRequestModalOpen(true);
      }
    });
    if (strictModeLeaveTimer) { clearTimeout(strictModeLeaveTimer); strictModeLeaveTimer = null; }
    return () => {
      socket.off("receive_dating_message");
      socket.off("receive_friend_request");
      strictModeLeaveTimer = setTimeout(async () => {
        if (!petData) return;
        socket.emit("leave_dating_room", { roomId, petName: petData.name });
        try {
          const token = localStorage.getItem("token");
          await api.post(`/api/rooms/${roomId}/leave`, { petName: petData.name }, { headers: { Authorization: `Bearer ${token}` } });
          socket.emit("trigger_rooms_update");
        } catch (err) { console.error(err); } 
        finally { strictModeLeaveTimer = null; }
      }, 800);
    };
  }, [roomId, petData]);

  useEffect(() => { if (chatEndRef.current) { chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight; } }, [messages]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !petData) return;
    const newMsg = { sender: petData.name, message: inputValue, timestamp: new Date(), isMine: true };
    setMessages((prev) => [...prev, newMsg]);
    socket.emit("send_dating_message", { roomId, message: inputValue, sender: petData.name });
    setInputValue("");
  };

  const currentRoomName = roomUsers.length > 0 ? "1:1 라이브 채팅" : "연결 대기 중...";
  const isWaiting = roomUsers.length < 2;
  const otherPetObj = roomUsers.find((user) => user.petName !== petData?.name);
  const otherPetName = otherPetObj ? otherPetObj.petName : null;
  const otherPetInstance = otherPetObj ? otherPetObj.petInstance : null;

  const handleGiftSuccess = (giftName, targetName, userMessage, aiReply, stats) => {
    if (userMessage) {
      const userMsgObj = { sender: petData.name, message: userMessage, timestamp: new Date(), isMine: true, isPetReply: false };
      setMessages((prev) => [...prev, userMsgObj]);
      socket.emit("send_dating_message", { roomId, message: userMsgObj.message, sender: userMsgObj.sender, isMine: false, isPetReply: false });
    }
    const statNameMap = { healthHp: "체력", hunger: "포만감", cleanliness: "청결도", stress: "스트레스", affection: "애정도", altruism: "이타심", empathy: "공감능력", knowledge: "지식", logic: "논리력", extroversion: "외향성", humor: "유머감각", openness: "개방성", directness: "솔직함", curiosity: "호기심" };
    let statLog = "";
    if (stats && typeof stats === "object") {
      statLog = Object.entries(stats).filter(([key, val]) => val > 0 || val < 0).map(([key, val]) => `${statNameMap[key] || key}(${val > 0 ? "+" : ""}${val})`).join(", ");
    }
    const statNoticeMsg = statLog ? ` [효과: ${statLog}]` : "";
    const systemNotice = `🎁 [선물 전달] ${petData.name}님이 ${targetName}에게 '${giftName}' 선물을(를) 주었습니다!${statNoticeMsg}`;
    const aiMessageObj = { sender: targetName, message: aiReply, timestamp: new Date(), isSystem: false, isPetReply: true };
    setMessages((prev) => [...prev, { sender: "시스템", message: systemNotice, timestamp: new Date(), isSystem: true }, aiMessageObj]);
    socket.emit("send_dating_message", { roomId, message: systemNotice, sender: "시스템", isSystem: true });
    socket.emit("send_dating_message", { roomId, message: aiMessageObj.message, sender: aiMessageObj.sender, isSystem: false, isPetReply: true });
  };

  const handleSendFriendRequest = async () => {
    if (!otherPetName || isSendingRequest) return;
    setIsSendingRequest(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.post("/api/friends/request", { receiver_pet_name: otherPetName }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 201) {
        socket.emit("send_friend_request", { roomId, requesterPetName: petData.name, receiverPetName: otherPetName, requestId: res.data.request.id });
        const systemMsg = `💌 ${otherPetName}님에게 친구 요청을 보냈습니다.`;
        setMessages((prev) => [...prev, { sender: "시스템", message: systemMsg, timestamp: new Date(), isSystem: true }]);
      }
    } catch (err) { console.error(err); } 
    finally { setIsSendingRequest(false); }
  };

  const handleFriendSuccess = (targetName, isAccepted) => {
    const actionText = isAccepted ? "수락" : "거절";
    const systemNotice = `🎉 ${petData.name}님이 ${targetName}님의 친구 요청을 ${actionText}했습니다!`;
    setMessages((prev) => [...prev, { sender: "시스템", message: systemNotice, timestamp: new Date(), isSystem: true }]);
    socket.emit("send_dating_message", { roomId, message: systemNotice, sender: "시스템", isSystem: true });
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans">
      <header className="h-16 lg:h-20 border-b border-slate-50 dark:border-slate-900 bg-white/90 dark:bg-[#0b0f1a]/90 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/lounge")}
            className="p-2 lg:p-3 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-xl hover:text-slate-900 dark:hover:text-white transition-all border border-slate-100 dark:border-slate-800"
          >
            <FiArrowLeft className="text-sm lg:text-base" />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 italic uppercase tracking-tighter">
              {currentRoomName}
              {!isWaiting && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_rgba(125,211,252,0.6)]" />}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {isWaiting ? "연결 대기 중..." : "대화 상대와 연결되었습니다."} ({roomUsers.length}/2)
            </p>
          </div>
        </div>

        {!isWaiting && otherPetInstance && petData && (
          <div className="hidden lg:flex absolute top-5 left-1/2 -translate-x-1/2 items-start gap-4 z-[60]">
            <div className={`w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-4 transition-all duration-500 mt-2 ${showMyStats ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}>
              <div className="flex items-center justify-between mb-3 border-b border-slate-50 dark:border-slate-800 pb-2">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">내 펫</span>
                <span className="text-[10px] font-black text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-2.5 py-0.5 rounded-full uppercase">LV.{petData.level}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {STAT_MAPPING.map((stat) => (
                  <div key={stat.key} className="w-full">
                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase mb-[2px]">
                      <span>{stat.label}</span>
                      <span className={stat.text}>{petData[stat.key] || 0}%</span>
                    </div>
                    <div className="h-0.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${petData[stat.key] || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowMyStats(!showMyStats)} className={`relative w-14 h-14 rounded-2xl border transition-all hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center p-1 ${showMyStats ? "bg-slate-900 border-slate-800 dark:bg-slate-100 dark:border-white" : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800"}`}>
                  <div className="w-full h-full overflow-hidden rounded-xl relative pointer-events-none">{petData.draw("w-full h-full scale-[1.3] translateY-[10%]")}</div>
                </button>
                <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-inner z-10 animate-bounce-slight mt-2 pointer-events-none">
                  <span className="text-[10px] font-black text-sky-400 italic">VS</span>
                </div>
                <button onClick={() => setShowOtherStats(!showOtherStats)} className={`relative w-14 h-14 rounded-2xl border transition-all hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center p-1 ${showOtherStats ? "bg-slate-900 border-slate-800 dark:bg-slate-100 dark:border-white" : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800"}`}>
                  <div className="w-full h-full overflow-hidden rounded-xl relative pointer-events-none">{otherPetInstance.draw("w-full h-full scale-[1.3] translateY-[10%]")}</div>
                </button>
              </div>
              <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 mt-3 uppercase tracking-[0.2em] italic animate-pulse">아바타를 눌러 스탯을 확인해 보세요!</span>
            </div>

            <div className={`w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-4 transition-all duration-500 mt-2 ${showOtherStats ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"}`}>
              <div className="flex items-center justify-between mb-3 border-b border-slate-50 dark:border-slate-800 pb-2">
                <span className="text-[10px] font-black text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-2.5 py-0.5 rounded-full uppercase">LV.{otherPetInstance.level}</span>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic truncate ml-2">{otherPetName}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {STAT_MAPPING.map((stat) => (
                  <div key={stat.key} className="w-full">
                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase mb-[2px]">
                      <span>{stat.label}</span>
                      <span className={stat.text}>{otherPetInstance[stat.key] || 0}%</span>
                    </div>
                    <div className="h-0.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${otherPetInstance[stat.key] || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 lg:gap-4">
          <button
            onClick={handleSendFriendRequest}
            disabled={isWaiting || !otherPetName || isSendingRequest}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-xl text-[11px] font-black border border-slate-100 dark:border-slate-800 transition-all hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none uppercase tracking-widest"
          >
            <FiUserPlus className="text-sm" />
            <span>친구</span>
          </button>

          <button
            onClick={() => setIsGiftModalOpen(true)}
            disabled={isWaiting || !otherPetName}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-[11px] font-black shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none uppercase tracking-[0.2em] italic"
          >
            <FiGift className="text-sm" />
            <span>교감</span>
          </button>

          {!isWaiting && (
            <div className="hidden lg:flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
              <div className={`w-2 h-2 rounded-full ${isAutoCommentEnabled ? "bg-sky-400 shadow-[0_0_8px_rgba(125,211,252,0.6)]" : "bg-slate-300 dark:bg-slate-700"}`} />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">AI 자동 답변</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] font-black ${isAutoCommentEnabled ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                    {isAutoCommentEnabled ? "자동 답변" : "자동 답변"}
                  </span>
                  <button onClick={() => setIsAutoCommentEnabled(!isAutoCommentEnabled)} className={`relative w-8 h-4.5 rounded-full transition-all ${isAutoCommentEnabled ? "bg-sky-400" : "bg-slate-200 dark:bg-slate-700"}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform ${isAutoCommentEnabled ? "translate-x-3.5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-400 transition-all">
            {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col items-center bg-slate-50 dark:bg-[#0b0f1a] py-4 lg:py-8 px-2 lg:px-4">
        <div className="w-full max-w-5xl h-full flex flex-col bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] lg:rounded-[3.5rem] shadow-sm overflow-hidden relative">
          <div ref={chatEndRef} className="flex-1 overflow-y-auto p-5 lg:p-10 space-y-6 lg:space-y-8 scroll-smooth custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 opacity-50">
                <FiMessageCircle className="text-6xl mb-4" />
                <p className="font-black uppercase tracking-[0.3em] italic text-xs">대화를 시작해 보세요!</p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isFromMe = msg.sender === petData?.name || msg.isMine;
              const isPetReply = msg.isPetReply;

              if (msg.isSystem) {
                return (
                  <div key={idx} className="flex justify-center my-6 animate-fade-in-up">
                    <span className="px-5 py-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] lg:text-[11px] rounded-full font-black uppercase tracking-widest italic border border-slate-100 dark:border-slate-700">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              return (
                <div key={idx} className={`flex ${isFromMe ? "justify-end" : "justify-start"} animate-fade-in-up`}>
                  <div className={`max-w-[85%] lg:max-w-[75%] flex items-start gap-3 lg:gap-4 ${isFromMe ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md border transition-transform hover:scale-110 ${isFromMe ? "bg-slate-900 border-slate-800 dark:bg-slate-100 dark:border-white" : "bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700"}`}>
                      {isPetReply ? (
                        isFromMe ? petData?.draw("w-full h-full scale-125 translate-y-1") : otherPetInstance?.draw("w-full h-full scale-125 translate-y-1")
                      ) : (
                        <div className={`${isFromMe ? "text-sky-300" : "text-slate-400"} w-full h-full flex items-center justify-center`}><FiUser className="text-xl" /></div>
                      )}
                    </div>

                    <div className={`flex flex-col gap-1.5 ${isFromMe ? "items-end" : "items-start"}`}>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter italic px-1">
                        {isPetReply ? `${msg.sender} [AI]` : isFromMe ? `나 [${petData?.name}]` : `상대방 [${msg.sender}]`}
                      </span>
                      {/* 말풍선 사이즈 */}
                      <div className={`px-4 py-2.5 lg:px-5 lg:py-3 rounded-[1.2rem] lg:rounded-[1.4rem] text-[13px] lg:text-[14px] leading-snug shadow-sm break-words whitespace-pre-wrap transition-all ${
                        isFromMe
                          ? isPetReply
                            ? "bg-sky-50 dark:bg-sky-900/30 text-slate-900 dark:text-sky-100 border border-sky-100 dark:border-sky-900/50 rounded-tr-none italic font-bold"
                            : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-tr-none font-medium"
                          : isPetReply
                            ? "bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none font-bold italic"
                            : "bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-300 border border-slate-100 dark:border-slate-800 rounded-tl-none"
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-5 lg:p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-slate-50 dark:border-slate-800 flex-shrink-0">
            {isWaiting ? (
              <div className="w-full text-center py-5 bg-slate-50 dark:bg-slate-950/50 rounded-[2rem] border border-dashed border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] italic">
                대화 상대를 기다리는 중이어서 메시지를 보낼 수 없습니다.
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="relative flex items-center w-full max-w-4xl mx-auto group">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="보낼 내용을 입력하세요..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white text-[13px] px-7 py-4 lg:py-5 rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900/50 transition-all font-bold placeholder-slate-300 dark:placeholder-slate-700 shadow-inner"
                />
                <button type="submit" disabled={!inputValue.trim()} className="absolute right-2.5 p-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-30">
                  <FiSend className="text-sm lg:text-base" />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <GiftModal isOpen={isGiftModalOpen} onClose={() => setIsGiftModalOpen(false)} targetPetName={otherPetName} onGiftSuccess={handleGiftSuccess} />
      <FriendRequestModal isOpen={isFriendRequestModalOpen} onClose={() => setIsFriendRequestModalOpen(false)} requesterPetName={friendRequestData?.requesterPetName} requestId={friendRequestData?.requestId} onFriendSuccess={handleFriendSuccess} />
    </div>
  );
};

export default DatingPage;