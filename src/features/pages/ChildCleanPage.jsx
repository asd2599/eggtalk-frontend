import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiSend,
  FiHelpCircle,
  FiCheckCircle,
  FiHeart,
  FiStar,
} from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

const ChildCleanPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🛁 스무고개 협동 게임용 상태
  const [gameMode, setGameMode] = useState(false);
  const [hint, setHint] = useState("");
  const [questions, setQuestions] = useState([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [inputGuess, setInputGuess] = useState("");
  const [gameResult, setGameResult] = useState(null);
  const [wrongGuess, setWrongGuess] = useState(null);
  const [currentTurnPetId, setCurrentTurnPetId] = useState(null);

  const myPetId = localStorage.getItem("petId");
  const myPetName = localStorage.getItem("petName");
  const childIdRef = useRef(null);
  const chatEndRef = useRef(null);

  // 새 질답 추가 시 자동 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [questions]);

  const isMyTurn =
    !gameMode ||
    currentTurnPetId === null ||
    String(currentTurnPetId) === String(myPetId) ||
    currentTurnPetId === undefined;

  // PlayPage와 동일 패턴: 단일 useEffect에서 API fetch + 리스너 + emit
  useEffect(() => {
    let childIdForCleanup = null;

    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/api/pets/child", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.childPet) {
          const cPet = new Pet(res.data.childPet);
          childIdForCleanup = cPet.id;
          childIdRef.current = cPet.id;
          setChildPet(cPet);
          socket.emit("join_bath_room", {
            childId: cPet.id,
            petId: myPetId,
            petName: myPetName,
          });
        }
      } catch (err) {
        console.error("[BATH]", err);
      } finally {
        setLoading(false);
      }
    };

    const handleWaiting = () => {
      setGameMode(false);
      setGameResult(null);
    };
    const handleStarted = ({ hint, currentTurnPetId }) => {
      setGameMode(true);
      setHint(hint);
      setCurrentTurnPetId(currentTurnPetId);
      setQuestions([]);
      setGameResult(null);
    };
    const handlePartnerLeft = (petName) => {
      alert(
        `${petName || "배우자"}님이 방에서 나갔어요. 함께 육아방으로 복귀합니다. 🐾`,
      );
      navigate("/child-room");
    };
    const handleGuessAttempted = ({ petName, guess, isCorrect }) => {
      // 정답 시도를 채팅창에 추가
      setQuestions((prev) => [
        ...prev,
        { type: "guess", petName, question: guess, isCorrect },
      ]);
    };
    const handleLastChance = () => {
      // 20턴 도달, 정답만 입력 가능 시스템 메시지
      setQuestions((prev) => [
        ...prev,
        {
          type: "system",
          question: "⚠️ 마지막 기회! 반드시 정답을 맞춰야 합니다.",
        },
      ]);
    };
    const handleTurnChanged = ({ currentTurnPetId }) => {
      setCurrentTurnPetId(currentTurnPetId);
    };
    const handleQuestionAnswered = (entry) => {
      setQuestions((prev) => [...prev, entry]);
    };
    const handleWrongGuess = ({ petName: guesserName, guess }) => {
      setWrongGuess({ petName: guesserName, guess });
      setTimeout(() => setWrongGuess(null), 3000);
    };
    const handleGameResult = (result) => {
      setGameResult(result);
      setGameMode(false);
    };
    const handleGameError = ({ message }) => {
      setWrongGuess({ petName: "시스템", guess: message });
      setTimeout(() => setWrongGuess(null), 3000);
    };

    socket.on("bath_room_waiting", handleWaiting);
    socket.on("bath_game_started", handleStarted);
    socket.on("bath_partner_left", handlePartnerLeft);
    socket.on("bath_turn_changed", handleTurnChanged);
    socket.on("bath_question_answered", handleQuestionAnswered);
    socket.on("bath_guess_attempted", handleGuessAttempted);
    socket.on("bath_last_chance", handleLastChance);
    socket.on("bath_wrong_guess", handleWrongGuess);
    socket.on("bath_game_result", handleGameResult);
    socket.on("bath_game_error", handleGameError);

    load();

    return () => {
      socket.off("bath_room_waiting", handleWaiting);
      socket.off("bath_game_started", handleStarted);
      socket.off("bath_partner_left", handlePartnerLeft);
      socket.off("bath_turn_changed", handleTurnChanged);
      socket.off("bath_question_answered", handleQuestionAnswered);
      socket.off("bath_guess_attempted", handleGuessAttempted);
      socket.off("bath_last_chance", handleLastChance);
      socket.off("bath_wrong_guess", handleWrongGuess);
      socket.off("bath_game_result", handleGameResult);
      socket.off("bath_game_error", handleGameError);
      if (childIdForCleanup) {
        socket.emit("leave_bath_room", {
          childId: childIdForCleanup,
          petName: myPetName,
        });
      }
    };
  }, [navigate, myPetId, myPetName]);

  const handleSendQuestion = (e) => {
    e.preventDefault();
    if (!inputQuestion.trim() || !childIdRef.current) return;
    socket.emit("ask_bath_question", {
      childId: childIdRef.current,
      question: inputQuestion,
      petName: myPetName,
      petId: myPetId,
    });
    setInputQuestion("");
  };

  const handleSendGuess = (e) => {
    e.preventDefault();
    if (!inputGuess.trim() || !childIdRef.current) return;
    socket.emit("guess_bath_word", {
      childId: childIdRef.current,
      guess: inputGuess,
      petName: myPetName,
    });
    setInputGuess("");
  };

  // ── 결과 모달 ──
  const ResultModal = ({ result, onClose }) => {
    const stats = [
      {
        key: "exp",
        label: "경험치",
        icon: "⭐",
        color: "text-amber-500",
        bg: "bg-amber-50 dark:bg-amber-900/20",
      },
      {
        key: "affection",
        label: "애정",
        icon: "🥰",
        color: "text-rose-500",
        bg: "bg-rose-50 dark:bg-rose-900/20",
      },
      {
        key: "cleanliness",
        label: "청결",
        icon: "🛁",
        color: "text-sky-500",
        bg: "bg-sky-50 dark:bg-sky-900/20",
      },
      {
        key: "knowledge",
        label: "지식",
        icon: "🧠",
        color: "text-indigo-500",
        bg: "bg-indigo-50 dark:bg-indigo-900/20",
      },
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <div
              className={`w-20 h-20 ${result.isSuccess ? "bg-sky-100 dark:bg-sky-900/30" : "bg-red-100 dark:bg-red-900/30"} rounded-full flex items-center justify-center mx-auto mb-4`}
            >
              {result.isSuccess ? (
                <FiCheckCircle className="text-4xl text-sky-500" />
              ) : (
                <FiHeart className="text-4xl text-red-400" />
              )}
            </div>
            <p
              className={`text-2xl font-black ${result.isSuccess ? "text-sky-500" : "text-red-400"}`}
            >
              {result.isSuccess
                ? `🎉 정답: ${result.word}!`
                : `😢 정답은... ${result.word}`}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {result.isSuccess
                ? "스무고개 성공!"
                : "20번 안에 맞추지 못했어요."}
            </p>
          </div>

          <div
            className={`flex items-center justify-center gap-2 ${result.isSuccess ? "bg-gradient-to-r from-sky-400 to-indigo-400" : "bg-gradient-to-r from-red-400 to-orange-400"} text-white font-black text-xl rounded-2xl px-8 py-3 shadow-lg`}
          >
            <FiStar className="fill-white" size={20} />
            {result.isSuccess
              ? `${20 - questions.length}턴 만에 성공!`
              : "20턴 초과"}
          </div>

          <div className="w-full space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">
              아기 펫 능력치 변화
            </p>
            {stats.map(({ key, label, icon, color, bg }) => {
              const value = result.changes?.[key];
              if (value === undefined || value === null) return null;
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between px-4 py-2.5 ${bg} rounded-2xl`}
                >
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {icon} {label}
                  </span>
                  <span
                    className={`font-black text-base ${value < 0 ? "text-red-500" : color}`}
                  >
                    {value >= 0 ? `+${value}` : value}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center w-full">
            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
              "{result.story}"
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-black rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-95"
          >
            확인하고 나가기 🐾
          </button>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="h-screen bg-sky-50 dark:bg-[#0f172a] flex items-center justify-center">
        <div className="text-slate-500 font-bold animate-pulse">로딩 중...</div>
      </div>
    );

  return (
    <div className="h-screen bg-sky-50 dark:bg-[#0f172a] flex flex-col overflow-hidden">
      {/* ── 상단 고정 헤더 ── */}
      <header className="flex-none px-4 pt-4 pb-2 flex justify-between items-center bg-sky-50/90 dark:bg-[#0f172a]/90 backdrop-blur-md z-20 border-b border-sky-100 dark:border-slate-800">
        <button
          onClick={() => navigate("/child-room")}
          className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-slate-300"
        >
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tighter">
          🛁 목욕하기
        </h1>
        <div className="w-11" />
      </header>

      {/* ── 힌트 고정 바 (게임 중에만) ── */}
      {gameMode && (
        <div className="flex-none px-4 py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-sky-100 dark:border-slate-700 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FiHelpCircle className="text-sky-500 shrink-0" size={16} />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 italic truncate">
                "{hint}"
              </p>
            </div>
            <span
              className={`shrink-0 ml-3 text-sm font-black px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 ${questions.filter((q) => q.type !== "system").length >= 15 ? "text-rose-500" : "text-sky-500"}`}
            >
              {questions.filter((q) => q.type !== "system").length}/20
            </span>
          </div>
        </div>
      )}

      {/* ── 중간 스크롤 채팅 영역 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* 준비 중 */}
        {!gameMode && !gameResult && (
          <div className="flex-1 flex items-center justify-center min-h-full">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-10 rounded-[40px] shadow-xl border border-white dark:border-slate-700 text-center max-w-sm w-full">
              <div className="w-14 h-14 border-4 border-emerald-400 border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white mb-2">
                게임 준비 중...
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                AI 몽글이가 아기의 비밀 단어를
                <br />
                정하고 있습니다!
              </p>
            </div>
          </div>
        )}

        {/* 게임 시작 안내 */}
        {gameMode && questions.length === 0 && (
          <div className="text-center py-20 text-slate-400 italic text-sm">
            비밀 단어에 대해 질문을 던져보세요!
            <br />
            <span className="text-xs">(예: "음식인가요?", "동물인가요?")</span>
          </div>
        )}

        {/* 채팅 목록 */}
        {questions.map((q, i) => {
          // 시스템 메시지 (마지막 기회 알림 등)
          if (q.type === "system") {
            return (
              <div key={i} className="flex justify-center animate-in fade-in">
                <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 px-4 py-2 rounded-full text-amber-700 dark:text-amber-300 text-xs font-bold">
                  {q.question}
                </div>
              </div>
            );
          }
          // 정답 시도
          if (q.type === "guess") {
            return (
              <div
                key={i}
                className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex justify-end">
                  <div
                    className={`px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm border max-w-[80%] ${q.isCorrect ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700" : "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800"}`}
                  >
                    <p
                      className={`text-[10px] font-bold mb-0.5 ${q.isCorrect ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {q.petName}
                    </p>
                    <p
                      className={`text-sm font-bold ${q.isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                    >
                      🎯 정답 시도: {q.question} {q.isCorrect ? "✅" : "❌"}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          // 일반 Q&A
          return (
            <div
              key={i}
              className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2"
            >
              {/* 질문 - 오른쪽 */}
              <div className="flex justify-end">
                <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm border border-slate-100 dark:border-slate-700 max-w-[80%]">
                  <p className="text-[10px] font-bold text-sky-400 mb-0.5">
                    {q.petName}
                  </p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Q: {q.question}
                  </p>
                </div>
              </div>
              {/* 답변 - 왼쪽 */}
              <div className="flex justify-start">
                <div className="bg-sky-500 text-white px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-md max-w-[80%]">
                  <p className="text-[10px] font-bold text-sky-100 mb-0.5">
                    AI 몽글이
                  </p>
                  <p className="font-black text-lg">A: {q.answer}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* 자동 스크롤 앵커 */}
        <div ref={chatEndRef} />
      </div>

      {/* ── 하단 고정 입력창 (게임 중에만) ── */}
      {gameMode && (
        <div className="flex-none px-4 pb-6 pt-3 bg-sky-50/90 dark:bg-[#0f172a]/90 backdrop-blur-md border-t border-sky-100 dark:border-slate-800 z-20">
          {wrongGuess && (
            <div className="mb-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-4 py-2 rounded-2xl text-rose-600 text-sm font-bold text-center">
              ❌ {wrongGuess.petName}: "{wrongGuess.guess}" (틀렸습니다!)
            </div>
          )}
          <div className="flex flex-col gap-3">
            <form onSubmit={handleSendQuestion} className="relative">
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="질문하기 (예: 동물인가요?)"
                className="w-full bg-white dark:bg-slate-800 border-2 border-sky-300 dark:border-sky-600 rounded-[28px] py-3.5 pl-5 pr-14 transition-all font-medium focus:outline-none focus:border-sky-500 text-sm"
              />
              <button className="absolute right-2 top-1.5 w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-200 active:scale-95">
                <FiSend size={18} />
              </button>
            </form>
            <form onSubmit={handleSendGuess} className="relative">
              <input
                type="text"
                value={inputGuess}
                onChange={(e) => setInputGuess(e.target.value)}
                placeholder="정답 맞히기!"
                className="w-full bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-200 dark:border-emerald-800/30 rounded-[28px] py-3.5 pl-5 pr-14 focus:outline-none focus:border-emerald-400 transition-all font-black text-emerald-700 dark:text-emerald-300 text-sm"
              />
              <button className="absolute right-2 top-1.5 w-11 h-11 bg-emerald-500 hover:bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 transition-all active:scale-95">
                <FiCheckCircle size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 결과 모달 ── */}
      {gameResult && (
        <ResultModal
          result={gameResult}
          onClose={() => navigate("/child-room")}
        />
      )}
    </div>
  );
};

export default ChildCleanPage;
