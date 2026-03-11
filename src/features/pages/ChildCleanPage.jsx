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

  // 🛁 스무고개 협동 게임용 상태🐾👣
  const [gameMode, setGameMode] = useState(false);
  const [hint, setHint] = useState("");
  const [questions, setQuestions] = useState([]); // [{ question, answer, petName, turn }]
  const [inputQuestion, setInputQuestion] = useState("");
  const [inputGuess, setInputGuess] = useState("");
  const [gameResult, setGameResult] = useState(null);
  const [wrongGuess, setWrongGuess] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentTurnPetId, setCurrentTurnPetId] = useState(null);

  const myPetId = localStorage.getItem("petId");
  const myPetName = localStorage.getItem("petName");
  const childIdRef = useRef(null); // async load 완료 후 안전하게 childId 저장

  // 혼자서도 즉시 진행 가능하도록, 명확히 상대방 턴으로 찍혀있지 않으면 입력 허용
  const isMyTurn =
    !gameMode ||
    currentTurnPetId === null ||
    String(currentTurnPetId) === String(myPetId) ||
    currentTurnPetId === undefined;

  // PlayPage와 동일 패턴: 단일 useEffect에서 API fetch + 리스너 + emit을 모두 처리
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
          childIdRef.current = cPet.id; // ref에도 저장 → handleSend에서 안전 접근
          setChildPet(cPet);

          // API 응답 후 emit (리스너는 이미 아래에서 등록됨)
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

    // 1) 리스너 먼저 등록 (load 내부의 emit보다 항상 먼저 실행됨)
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
    socket.on("bath_wrong_guess", handleWrongGuess);
    socket.on("bath_game_result", handleGameResult);
    socket.on("bath_game_error", handleGameError);

    // 2) 데이터 로드 시작 (async이므로 리스너가 이미 등록된 뒤에 emit 발생)
    load();

    return () => {
      socket.off("bath_room_waiting", handleWaiting);
      socket.off("bath_game_started", handleStarted);
      socket.off("bath_partner_left", handlePartnerLeft);
      socket.off("bath_turn_changed", handleTurnChanged);
      socket.off("bath_question_answered", handleQuestionAnswered);
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
    if (!inputQuestion.trim()) return;
    if (!childIdRef.current) return;
    socket.emit("ask_bath_question", {
      childId: childIdRef.current,
      question: inputQuestion,
      petName: localStorage.getItem("petName"),
      petId: myPetId,
    });
    setInputQuestion("");
  };

  const handleSendGuess = (e) => {
    e.preventDefault();
    if (!inputGuess.trim()) return;
    if (!childIdRef.current) return;
    socket.emit("guess_bath_word", {
      childId: childIdRef.current,
      guess: inputGuess,
      petName: localStorage.getItem("petName"),
    });
    setInputGuess("");
  };

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
        key: "intelligence",
        label: "지능",
        icon: "🧠",
        color: "text-indigo-500",
        bg: "bg-indigo-50 dark:bg-indigo-900/20",
      },
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <div className="w-20 h-20 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="text-4xl text-sky-500" />
            </div>
            <p className="text-2xl font-black text-sky-500">
              정답: {result.word}!
            </p>
            <p className="text-sm text-slate-400 mt-1">스무고개 성공!</p>
          </div>

          <div className="flex items-center justify-center gap-2 bg-linear-to-r from-sky-400 to-indigo-400 text-white font-black text-2xl rounded-2xl px-8 py-3 shadow-lg">
            <FiStar className="fill-white" size={24} />
            {20 - questions.length}턴 만에 극복!
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
                  <span className={`font-black text-base ${color}`}>
                    +{value}
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
            className="w-full py-4 bg-linear-to-r from-sky-500 to-indigo-500 text-white font-black rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-95"
          >
            확인하고 나가기 🐾
          </button>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="min-h-screen bg-sky-50 dark:bg-[#0f172a] flex items-center justify-center">
        <div className="text-slate-500 font-bold animate-pulse">로딩 중...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-[#0f172a] p-6 flex flex-col items-center overflow-hidden">
      <header className="w-full max-w-4xl flex justify-between items-center mb-12 relative z-10">
        <button
          onClick={() => navigate("/child-room")}
          className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-slate-300"
        >
          <FiArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
          Nursery Bathroom
        </h1>
        <div className="w-12" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-start w-full max-w-2xl relative z-10 gap-8">
        <div className="relative w-48 h-48 animate-bounce-slow">
          <div className="relative z-10">
            {childPet && childPet.draw("w-full h-full")}
          </div>
          {/* 비눗방울🐾👣 */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bubble absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  width: `${Math.random() * 20 + 10}px`,
                  height: `${Math.random() * 20 + 10}px`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="w-full flex flex-col gap-6">
          {!gameMode && !gameResult ? (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-12 rounded-[40px] shadow-2xl border border-white dark:border-slate-700 text-center">
              <div className="w-16 h-16 border-4 border-emerald-400 border-l-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                게임 준비 중...
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                AI 몽글이가 아기의 비밀 단어를
                <br />
                정하고 있습니다!
              </p>
            </div>
          ) : (
            <>
              {/* 상단 힌트 및 턴 정보🐾👣 */}
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-xl flex justify-between items-center animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center">
                    <FiHelpCircle className="text-2xl text-sky-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest">
                      Initial Hint
                    </p>
                    <p className="text-lg font-black text-slate-800 dark:text-white italic">
                      "{hint}"
                    </p>
                  </div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-2xl">
                  <span className="text-sm font-black text-slate-500 uppercase tracking-widest">
                    Turn:{" "}
                  </span>
                  <span
                    className={`text-xl font-black ${questions.length >= 15 ? "text-rose-500" : "text-sky-500"}`}
                  >
                    {questions.length}/20
                  </span>
                </div>
              </div>

              {/* 채팅 영역🐾👣 */}
              <div className="flex-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-[40px] p-6 h-[300px] overflow-y-auto border border-white/20 shadow-inner flex flex-col gap-4">
                {questions.length === 0 && (
                  <div className="text-center py-12 text-slate-400 italic">
                    비밀 단어에 대해 질문을 던져보세요! (예: "음식인가요?")
                  </div>
                )}
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex justify-end">
                      <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 max-w-[80%]">
                        <p className="text-xs font-bold text-sky-400 mb-1">
                          {q.petName}
                        </p>
                        <p className="text-slate-700 dark:text-slate-200 font-medium">
                          Q: {q.question}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-sky-500 text-white px-4 py-2 rounded-2xl shadow-md max-w-[80%]">
                        <p className="text-xs font-bold text-sky-100 mb-1">
                          AI 몽글이
                        </p>
                        <p className="font-black text-lg">A: {q.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 입력 영역🐾👣 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form onSubmit={handleSendQuestion} className="relative">
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder="질문하기 (예: 동물인가요?)"
                    className="w-full bg-white dark:bg-slate-800 border-2 border-sky-300 dark:border-sky-600 rounded-[28px] py-4 pl-6 pr-14 transition-all font-medium focus:outline-none focus:border-sky-500"
                  />
                  <button className="absolute right-2 top-2 w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-200 active:scale-95">
                    <FiSend size={20} />
                  </button>
                </form>

                <form onSubmit={handleSendGuess} className="relative">
                  <input
                    type="text"
                    value={inputGuess}
                    onChange={(e) => setInputGuess(e.target.value)}
                    placeholder="정답 맞히기!"
                    className="w-full bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-800/30 rounded-[28px] py-4 pl-6 pr-14 focus:outline-none focus:border-emerald-400 transition-all font-black text-emerald-700 dark:text-emerald-300"
                  />
                  <button className="absolute right-2 top-2 w-12 h-12 bg-emerald-500 hover:bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 transition-all active:scale-95">
                    <FiCheckCircle size={20} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>

      {wrongGuess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce z-50 font-black">
          ❌ {wrongGuess.petName}: "{wrongGuess.guess}" (틀렸습니다!)
        </div>
      )}

      {gameResult && (
        <ResultModal
          result={gameResult}
          onClose={() => navigate("/child-room")}
        />
      )}

      <style>{`
        .bubble {
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          animation: float 2s infinite ease-out;
          opacity: 0;
        }
        .steam {
          position: absolute;
          background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%;
          animation: rise 4s infinite ease-in;
          opacity: 0;
          filter: blur(8px);
          pointer-events: none;
        }
        @keyframes float {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1.5);
            opacity: 0;
          }
        }
        @keyframes rise {
          0% {
            transform: translateY(50px) scale(0.5);
            opacity: 0;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-150px) scale(2);
            opacity: 0;
          }
        }
      `}</style>

      {/* 모락모락 김 이펙트 (수증기) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={`steam-${i}`}
            className="steam"
            style={{
              left: `${20 + Math.random() * 60}%`,
              bottom: "-10%",
              animationDelay: `${i * 1.5}s`,
              width: `${150 + Math.random() * 100}px`,
              height: `${150 + Math.random() * 100}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ChildCleanPage;
