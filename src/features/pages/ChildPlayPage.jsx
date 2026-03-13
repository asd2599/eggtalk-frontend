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

/* ── 결과 모달 ─────────────────────────────────── */
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
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      key: "affection",
      label: "애정",
      icon: "🥰",
      color: "text-pink-500",
      bg: "bg-pink-50 dark:bg-pink-900/20",
    },
    {
      key: "altruism",
      label: "이타심",
      icon: "🤝",
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      key: "knowledge",
      label: "지식",
      icon: "📚",
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      key: "logic",
      label: "논리력",
      icon: "🧠",
      color: "text-slate-600 dark:text-slate-300",
      bg: "bg-slate-100 dark:bg-slate-800/50",
    },
    {
      key: "health_hp",
      label: "건강",
      icon: "💪",
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
    },
    {
      key: "hunger",
      label: "허기",
      icon: "🍖",
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
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
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ];

  const avgScore = statChanges?.avgScore ?? 0; // 0~100
  const grade =
    avgScore >= 80
      ? { label: "🏆 완벽한 연기!", color: "text-sky-500" }
      : avgScore >= 55
        ? { label: "🌟 훌륭해요!", color: "text-indigo-500" }
        : avgScore >= 30
          ? { label: "👍 괜찮아요!", color: "text-blue-500" }
          : { label: "🌱 연습이 필요해요", color: "text-slate-500" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300">
        {/* 등급 */}
        <div className="text-center">
          <p className={`text-2xl font-black ${grade.color}`}>{grade.label}</p>
          <p className="text-sm text-slate-400 mt-1">상황극이 끝났어요!</p>
        </div>

        {/* 총점 */}
        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-black text-3xl rounded-2xl px-8 py-3 shadow-lg">
          <FiStar className="fill-white" size={24} />
          {totalScore}점{" "}
          <span className="text-lg opacity-80">(평균 {avgScore}점)</span>
        </div>

        {/* 능력치 변화 */}
        <div className="w-full space-y-3">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">
            아기 펫 능력치 변화
          </p>
          {stats.map(({ key, label, icon, color, bg }) => {
            const value = statChanges?.[key];
            if (value === undefined || value === null) return null;
            return (
              <div
                key={key}
                className={`flex items-center justify-between px-4 py-2.5 ${bg} rounded-2xl`}
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
          className="w-full py-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 font-black rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-95"
        >
          확인하고 나가기 🐾
        </button>
      </div>
    </div>
  );
};

/* ── 메인 컴포넌트 ───────────────────────────────── */
const ChildPlayPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [myPet, setMyPet] = useState(null);
  const [loading, setLoading] = useState(true);

  const [scenario, setScenario] = useState(null);
  const [myRole, setMyRole] = useState("");
  const [messages, setMessages] = useState([]); 
  const [inputText, setInputText] = useState("");
  const [totalScore, setTotalScore] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [canSpeak, setCanSpeak] = useState(true);
  const [turnStatus, setTurnStatus] = useState("");

  const [showResult, setShowResult] = useState(false);
  const [statChanges, setStatChanges] = useState(null);

  const scrollRef = useRef(null);
  const childIdRef = useRef(null);
  const myPetIdRef = useRef(null);
  const myPetObjRef = useRef(null);
  const totalScoreRef = useRef(0);
  const roundCountRef = useRef(0);

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
      roundCountRef.current += 1;
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sky-500 font-bold animate-pulse">로딩 중...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex flex-col h-screen overflow-hidden font-sans">
      {/* 결과 모달 */}
      {showResult && (
        <ResultModal
          totalScore={totalScore}
          statChanges={statChanges}
          onClose={handleModalClose}
        />
      )}

      {/* 헤더 */}
      <header className="px-5 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <button
          onClick={() => navigate("/child-room")}
          className="p-2 hover:bg-sky-50 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
        >
          <FiArrowLeft size={22} />
        </button>
        <div className="text-center">
          <h1 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1">
            <FiStar className="text-amber-400 fill-amber-400" size={15} />
            {scenario?.title || (waiting ? "배우자 입장 대기 중..." : "상황극")}
          </h1>
          <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">
            Role-Play Game
          </p>
        </div>
        <div className="flex items-center gap-1 bg-sky-100 dark:bg-sky-900/30 px-3 py-1 rounded-full font-black text-sky-600 dark:text-sky-300 text-sm">
          <FiStar size={12} /> {totalScore}
        </div>
      </header>

      {/* 역할 바 */}
      {!waiting && scenario && (
        <div className="bg-white/60 dark:bg-slate-900/60 px-5 py-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3 text-xs font-bold text-slate-500">
          <FiInfo size={13} className="text-sky-500 shrink-0" />내 역할:{" "}
          <span className="text-sky-600 dark:text-sky-300">{myRole}</span>
          <span className="text-slate-300">|</span>
          <span className="truncate max-w-xs opacity-70">
            {scenario.description}
          </span>
        </div>
      )}

      {/* 채팅 영역 */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-3 relative"
      >
        {/* 대기 */}
        {waiting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="w-28 h-28 mb-5"
              style={{ animation: "bounce 1.5s infinite" }}
            >
              {childPet?.draw("w-full h-full")}
            </div>
            <h2 className="text-xl font-black text-slate-700 dark:text-white mb-2 text-center">
              배우자를 기다리는 중이에요...
            </h2>
            <p className="text-sm text-slate-400 italic text-center">
              둘 다 들어오면 자식 펫이 상황극을 제안해요! ✨
            </p>
            <div className="mt-6 flex gap-2">
              {[0, 0.2, 0.4].map((d) => (
                <div
                  key={d}
                  className="w-2 h-2 bg-sky-400 rounded-full"
                  style={{ animation: `bounce 1s ${d}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 메시지 */}
        {!waiting &&
          messages.map((msg, idx) => {
            if (msg.type === "score")
              return (
                <div key={msg.id || idx} className="flex justify-center my-2">
                  <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-sky-400 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-md">
                    <FiZap size={12} /> 이번 라운드 +{msg.value}점 획득! 🎉
                  </div>
                </div>
              );

            const isMe = String(msg.senderId) === String(myPet?.id);
            const isPet = msg.senderId === "child_pet";
            return (
              <div
                key={idx}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-1">
                  [{isPet ? "🐾 아기 펫" : msg.role}] {msg.senderName}
                </span>
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm transition-all ${
                    isMe
                      ? "bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-tr-none"
                      : isPet
                        ? "bg-amber-100 dark:bg-amber-900/40 text-slate-800 dark:text-slate-100 rounded-tl-none border border-amber-200"
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

        {!waiting && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <div className="w-24 h-24 mb-3">
              {childPet?.draw("w-full h-full")}
            </div>
            <p className="font-black text-slate-400 text-sm">
              역할에 맞게 대화를 시작해보세요!
            </p>
          </div>
        )}

        <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
      </main>

      {/* 입력창 */}
      {!waiting && (
        <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {turnStatus && (
            <div className="mb-2 text-center text-xs font-bold text-amber-500 animate-pulse">
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
              className={`flex-1 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-sky-400 outline-none text-sm dark:text-white transition-all ${
                canSpeak
                  ? "bg-slate-50 dark:bg-slate-800"
                  : "bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-50"
              }`}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || !canSpeak}
              className="p-3 bg-slate-900 dark:bg-sky-400 hover:opacity-90 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white dark:text-slate-950 rounded-2xl transition-all active:scale-95 shadow-md"
            >
              <FiSend size={20} />
            </button>
          </form>
          <div className="mt-3 flex justify-center">
            <button
              onClick={handleFinish}
              className="text-xs font-bold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-1"
            >
              <FiCheckCircle size={12} /> 상황극 종료
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ChildPlayPage;