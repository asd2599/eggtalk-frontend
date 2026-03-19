import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiSend,
  FiStar,
  FiInfo,
  FiCheckCircle,
  FiZap,
} from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

/* 결과 모달 */
const ResultModal = ({ totalScore, statChanges, onClose }) => {
  const stats = [
    {
      key: "stress",
      label: "스트레스",
      icon: "💆",
      color: "text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      key: "empathy",
      label: "공감능력",
      icon: "💖",
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      key: "affection",
      label: "애정",
      icon: "🥰",
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      key: "altruism",
      label: "이타심",
      icon: "🤝",
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      key: "knowledge",
      label: "지식",
      icon: "📚",
      color: "text-slate-600 dark:text-slate-300",
      bg: "bg-slate-100 dark:bg-slate-800/20",
    },
    {
      key: "logic",
      label: "논리력",
      icon: "🧠",
      color: "text-slate-700 dark:text-slate-200",
      bg: "bg-slate-100 dark:bg-slate-800/20",
    },
    {
      key: "health_hp",
      label: "건강",
      icon: "💪",
      color: "text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      key: "hunger",
      label: "허기",
      icon: "🍖",
      color: "text-slate-500",
      bg: "bg-slate-50 dark:bg-slate-800/20",
    },
    {
      key: "cleanliness",
      label: "청결",
      icon: "🛁",
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      key: "exp",
      label: "경험치",
      icon: "⭐",
      color: "text-sky-600 font-black",
      bg: "bg-sky-100 dark:bg-sky-900/30",
    },
  ];

  const avgScore = statChanges?.avgScore ?? 0; // 0~100
  const grade =
    avgScore >= 80
      ? { label: "🏆 완벽한 연기!", color: "text-sky-600" }
      : avgScore >= 55
        ? { label: "🌟 훌륭해요!", color: "text-sky-500" }
        : avgScore >= 30
          ? { label: "👍 괜찮아요!", color: "text-slate-600" }
          : { label: "🌱 연습이 필요해요", color: "text-slate-400" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0b0f1a] rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300 border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* 등급 */}
        <div className="text-center">
          <p className={`text-2xl font-black ${grade.color}`}>{grade.label}</p>
          <p className="text-sm text-slate-400 mt-1 font-bold">상황극이 끝났어요!</p>
        </div>

        {/* 총점 */}
        <div className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 font-black text-3xl rounded-2xl px-8 py-3 shadow-lg w-full">
          <FiStar className="fill-current" size={24} />
          {totalScore}점{" "}
          <span className="text-lg opacity-80">(평균 {avgScore}점)</span>
        </div>

        {/* 능력치 변화 */}
        <div className="w-full space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
            아기 펫 능력치 변화
          </p>
          {stats.map(({ key, label, icon, color, bg }) => {
            const value = statChanges?.[key];
            if (value === undefined || value === null) return null;
            return (
              <div
                key={key}
                className={`flex items-center justify-between px-5 py-3 ${bg} rounded-2xl border border-white/5 shadow-sm`}
              >
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {icon} {label}
                </span>
                <span className={`font-black text-base ${color}`}>
                  {value > 0 ? `+${value}` : value === 0 ? "−" : value}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-4.5 bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all active:scale-95"
        >
          확인하고 나가기 🐾
        </button>
      </div>
    </div>
  );
};

/* 메인 컴포넌트 */
const ChildPlayPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [myPet, setMyPet] = useState(null);
  const [loading, setLoading] = useState(true);

  const [scenario, setScenario] = useState(null);
  const [myRole, setMyRole] = useState("");
  const [messages, setMessages] = useState([]); // { ...msg } | { type: "score", value: N }
  const [inputText, setInputText] = useState("");
  const [totalScore, setTotalScore] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [canSpeak, setCanSpeak] = useState(true);
  const [turnStatus, setTurnStatus] = useState("");

  // 결과 모달
  const [showResult, setShowResult] = useState(false);
  const [statChanges, setStatChanges] = useState(null);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const scrollRef = useRef(null);
  const childIdRef = useRef(null);
  const myPetIdRef = useRef(null);
  const myPetObjRef = useRef(null);
  const totalScoreRef = useRef(0);
  const roundCountRef = useRef(0); // 완료된 라운드 수

  useEffect(() => {
    totalScoreRef.current = totalScore;
  }, [totalScore]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/api/pets/child", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.childPet) {
          const cPet = new Pet(res.data.childPet);
          const mPet = new Pet(res.data.myPet);
          childIdRef.current = cPet.id;
          myPetIdRef.current = String(mPet.id);
          myPetObjRef.current = mPet;
          setChildPet(cPet);
          setMyPet(mPet);
          socket.emit("join_play_room", {
            childId: cPet.id,
            petId: String(mPet.id),
            petName: mPet.name,
          });
        }
      } catch (err) {
        console.error("[PLAY]", err);
      } finally {
        setLoading(false);
      }
    };
    load();

    const onWaiting = () => setWaiting(true);
    const onStarted = ({ scenario: sc, roles }) => {
      setScenario(sc);
      setWaiting(false);
      setCanSpeak(true);
      setTurnStatus("");
      const myId = myPetIdRef.current;
      setMyRole(roles?.[myId] || Object.values(roles || {})[0] || "참가자");
    };
    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.senderId === "child_pet") {
        setCanSpeak(true);
        setTurnStatus("");
      }
    };
    const onRoundScore = ({ score }) => {
      setTotalScore((prev) => prev + score);
      roundCountRef.current += 1; // 라운드 완료 카운트
      setMessages((prev) => [
        ...prev,
        { type: "score", value: score, id: Date.now() },
      ]);
    };
    const onAlreadySpoke = () =>
      setTurnStatus(
        "이미 이번 라운드에 말했어요! 상대방 차례를 기다려주세요 🐾",
      );
    const onWaitingOther = () => {
      setCanSpeak(false);
      setTurnStatus("상대방 발언을 기다리는 중... 💬");
    };
    const onRoundStart = () => {
      setCanSpeak(true);
      setTurnStatus("");
    };
    const onPartnerLeft = ({ name }) => {
      alert(`${name}이(가) 상황극을 나갔어요. 함께 종료됩니다.`);
      navigate("/child-room");
    };
    const onGameFinished = ({ totalScore: ts, statChanges: sc }) => {
      // 총점은 현재 누적값 사용 (서버에서 전달된 ts는 종료자 기준이므로 내 점수 우선)
      setStatChanges(sc);
      setShowResult(true);
    };
    const onGameError = ({ message }) => alert(message);

    socket.on("play_room_waiting", onWaiting);
    socket.on("role_play_started", onStarted);
    socket.on("role_play_message", onMessage);
    socket.on("play_round_score", onRoundScore);
    socket.on("play_already_spoke", onAlreadySpoke);
    socket.on("play_waiting_other", onWaitingOther);
    socket.on("play_round_start", onRoundStart);
    socket.on("play_partner_left", onPartnerLeft);
    socket.on("play_game_finished", onGameFinished);
    socket.on("play_game_error", onGameError);
    socket.on("play_game_ending", () => setCanSpeak(false));

    return () => {
      socket.off("play_room_waiting", onWaiting);
      socket.off("role_play_started", onStarted);
      socket.off("role_play_message", onMessage);
      socket.off("play_round_score", onRoundScore);
      socket.off("play_already_spoke", onAlreadySpoke);
      socket.off("play_waiting_other", onWaitingOther);
      socket.off("play_round_start", onRoundStart);
      socket.off("play_partner_left", onPartnerLeft);
      socket.off("play_game_finished", onGameFinished);
      socket.off("play_game_error", onGameError);
      if (childIdRef.current) {
        socket.emit("leave_play_room", {
          childId: childIdRef.current,
          petName: myPetObjRef.current?.name || "상대방",
        });
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !scenario || !childPet || !myPet || !canSpeak)
      return;
    socket.emit("role_play_chat", {
      childId: childPet.id,
      senderId: String(myPet.id),
      senderName: myPet.name,
      content: inputText,
      role: myRole,
      scenarioId: scenario.id,
    });
    setInputText("");
  };

  // 종료 버튼 → 소켓으로 finish_play_room 전송 → 서버가 DB 업데이트 후 결과 브로드캐스트
  const handleFinish = () => {
    if (!childPet) return;
    socket.emit("finish_play_room", {
      childId: childPet.id,
      totalScore: totalScoreRef.current,
      roundCount: Math.max(1, roundCountRef.current),
    });
  };

  const handleModalClose = () => navigate("/child-room");

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f1a] flex items-center justify-center font-sans">
        <div className="text-sky-500 font-black animate-pulse tracking-widest uppercase">Loading Role-Play Room...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f1a] flex flex-col h-screen overflow-hidden font-sans">
      {/* 결과 모달 */}
      {showResult && (
        <ResultModal
          totalScore={totalScore}
          statChanges={statChanges}
          onClose={handleModalClose}
        />
      )}

      {/* 헤더 */}
      <header className="px-5 py-3 bg-white/80 dark:bg-[#0b0f1a]/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
        <button
          onClick={() => navigate("/child-room")}
          className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-sky-500 border border-slate-100 dark:border-slate-800"
        >
          <FiArrowLeft size={22} />
        </button>
        <div className="text-center">
          <h1 className="text-base font-black text-slate-800 dark:text-white flex items-center justify-center gap-1.5">
            <FiStar className="text-sky-500 fill-current" size={15} />
            {scenario?.title || (waiting ? "배우자 입장 대기 중..." : "상황극")}
          </h1>
          <p className="text-[9px] text-sky-500 font-black uppercase tracking-[0.2em] mt-0.5">
            Role-Play Game
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900 dark:bg-sky-500 px-3 py-1.5 rounded-full font-black text-white dark:text-slate-950 text-xs shadow-lg shadow-sky-500/10">
          <FiStar size={12} className="fill-current" /> {totalScore}
        </div>
      </header>

      {/* 역할 바 */}
      {!waiting && scenario && (
        <div 
          onClick={() => setShowFullDesc(!showFullDesc)}
          className={`bg-sky-50/50 dark:bg-sky-900/10 px-5 py-3 border-b border-sky-100/50 dark:border-sky-900/20 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer transition-all ${
            showFullDesc ? "bg-sky-100/60 dark:bg-sky-900/30" : "hover:bg-sky-100/40 dark:hover:bg-sky-900/20"
          }`}
        >
          <div className="flex items-center justify-between w-full sm:w-auto overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
              <FiInfo size={13} className="text-sky-500 shrink-0" />
              <span>내 역할: <span className="text-sky-600 dark:text-sky-400 font-black">{myRole}</span></span>
            </div>
            <span className="sm:hidden text-[9px] font-black text-sky-400 uppercase tracking-tighter shrink-0 ml-4 animate-pulse">
              {showFullDesc ? "닫기" : "펼치기"}
            </span>
          </div>
          <span className="hidden sm:inline text-slate-200 dark:text-slate-700">|</span>
          <span className={`italic transition-all duration-300 ${
            showFullDesc ? "opacity-100 text-slate-700 dark:text-slate-200 leading-relaxed bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-sky-100/50 dark:border-sky-900/30 mt-1" : "truncate opacity-80"
          }`}>
            {scenario.description}
          </span>
        </div>
      )}

      {/* 채팅 영역 */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4 relative custom-scrollbar"
      >
        {/* 대기 */}
        {waiting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center">
            <div
              className="w-32 h-32 mb-8 drop-shadow-2xl"
              style={{ animation: "bounce 1.5s infinite" }}
            >
              {childPet?.draw("w-full h-full")}
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
              배우자를 기다리는 중이에요...
            </h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 italic font-medium leading-relaxed">
              둘 다 들어오면 아기 펫이 <br />
              즐거운 상황극을 제안할 거예요! ✨
            </p>
            <div className="mt-8 flex gap-2">
              {[0, 0.2, 0.4].map((d) => (
                <div
                  key={d}
                  className="w-2.5 h-2.5 bg-sky-500 rounded-full shadow-lg shadow-sky-500/20"
                  style={{ animation: `bounce 1s ${d}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 메시지 */}
        {!waiting &&
          messages.map((msg, idx) => {
            // 점수 뱃지
            if (msg.type === "score")
              return (
                <div key={msg.id || idx} className="flex justify-center my-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 text-[11px] font-black px-5 py-2 rounded-full shadow-xl">
                    <FiZap size={14} className="fill-current" /> 이번 라운드 +{msg.value}점 획득! 🐾
                  </div>
                </div>
              );

            const isMe = String(msg.senderId) === String(myPet?.id);
            const isPet = msg.senderId === "child_pet";
            return (
              <div
                key={idx}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2`}
              >
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">
                  [{isPet ? "🐾 아기 펫" : msg.role}] {msg.senderName}
                </span>
                <div
                  className={`max-w-[85%] px-5 py-3.5 rounded-3xl text-[13px] font-bold shadow-md transition-all ${
                    isMe
                      ? "bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 rounded-tr-sm"
                      : isPet
                        ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-tl-sm border border-sky-100 dark:border-sky-800"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-sm border border-slate-100 dark:border-slate-700"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

        {!waiting && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none grayscale">
            <div className="w-24 h-24 mb-4">
              {childPet?.draw("w-full h-full")}
            </div>
            <p className="font-black text-slate-800 dark:text-white text-sm">
              대화를 시작해 보세요!
            </p>
          </div>
        )}

        <style>{`
          @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        `}</style>
      </main>

      {/* 입력창 */}
      {!waiting && (
        <footer className="p-5 bg-white dark:bg-[#0b0f1a] border-t border-slate-100 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10">
          {turnStatus && (
            <div className="mb-3 text-center text-[11px] font-black text-sky-500 animate-pulse bg-sky-50 dark:bg-sky-900/20 py-1.5 rounded-full border border-sky-100 dark:border-sky-800">
              {turnStatus}
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!canSpeak}
              placeholder={
                canSpeak
                  ? `${myRole} 역할로 대화해보세요...`
                  : "상대방 차례를 기다리는 중..."
              }
              className={`flex-1 px-6 py-4 rounded-4xl outline-none text-sm font-bold transition-all border-2 ${
                canSpeak
                  ? "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus:border-sky-400 dark:focus:border-sky-500 dark:text-white"
                  : "bg-slate-100 dark:bg-slate-950 border-transparent cursor-not-allowed opacity-50 dark:text-slate-600"
              }`}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || !canSpeak}
              className="w-14 h-14 bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:bg-slate-200 dark:disabled:bg-slate-800 shadow-lg shadow-sky-500/10"
            >
              <FiSend size={22} />
            </button>
          </form>
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleFinish}
              className="text-[11px] font-black text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-all uppercase tracking-widest flex items-center gap-2 group"
            >
              <FiCheckCircle size={14} className="group-hover:animate-bounce" /> 상황극 종료
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ChildPlayPage;