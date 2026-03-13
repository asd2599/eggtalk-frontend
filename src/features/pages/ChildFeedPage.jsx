import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit3,
  FiCheckCircle,
  FiLoader,
  FiHeart,
  FiZap,
  FiBookOpen,
  FiSmile,
  FiClock,
} from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

const CATEGORY_LABELS = {
  who: "누가",
  when: "언제",
  where: "어디서",
  what: "무엇을",
  how: "어떻게",
  why: "왜",
};

const CATEGORY_ICONS = {
  who: "👤",
  when: "⏰",
  where: "📍",
  what: "🎁",
  how: "✨",
  why: "❓",
};

// 🌟 React 컴포넌트는 반드시 외부에서 정의해야 포커스를 잃지 않습니다.🐾
const CategoryCard = ({ cat, isOwner, word, inputValue, onChange, onSubmit }) => {
  const isSubmitted = !!word;

  return (
    <div
      className={`relative p-5 rounded-[32px] border-2 transition-all duration-300 ${
        isSubmitted
          ? "bg-emerald-500/10 border-emerald-400/30 scale-100"
          : isOwner
          ? "bg-indigo-500/10 border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
          : "bg-white/5 border-white/5 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
          <span className="text-xs font-black text-white/50 uppercase tracking-tighter">
            {cat}
          </span>
        </div>
        {isSubmitted && <FiCheckCircle className="text-emerald-400" />}
      </div>

      <h3 className="text-lg font-black text-white mb-4">
        {CATEGORY_LABELS[cat]}
      </h3>

      {isOwner && !isSubmitted ? (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="..."
            className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-4 py-2 text-white font-bold outline-none focus:border-indigo-400 transition-all text-sm"
            value={inputValue}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
          <button
            onClick={onSubmit}
            className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl transition-all shadow-lg"
          >
            <FiZap />
          </button>
        </div>
      ) : (
        <div className="h-10 flex items-center">
          {isSubmitted ? (
            <span className="text-white font-black text-sm">{word}</span>
          ) : (
            <span className="text-white/20 text-xs font-bold animate-pulse">
              대기 중...
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const ChildFeedPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [loading, setLoading] = useState(true);

  // 📝 육하원칙 게임 상태
  const [gameMode, setGameMode] = useState(false);
  const [assignments, setAssignments] = useState({}); // { petId: ["who", "when"] }
  const [allWords, setAllWords] = useState({}); // { who: "단어", ... }
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [waiting, setWaiting] = useState(true);

  const [inputVal, setInputVal] = useState({}); // { category: "사용자 입력" }

  const petId = localStorage.getItem("petId");
  const petName = localStorage.getItem("petName");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/api/pets/child", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.childPet) {
          const petObj = new Pet(res.data.childPet);
          setChildPet(petObj);

          socket.emit("join_feed_room", {
            childId: petObj.id,
            petId,
            petName,
          });
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    socket.on("feed_game_started", ({ assignments: asgn, currentWords }) => {
      setWaiting(false);
      setGameMode(true);
      setAssignments(asgn);
      setAllWords(currentWords || {});
      setGameResult(null);
      setIsEvaluating(false);
    });

    socket.on("feed_word_submitted", ({ category, word }) => {
      setAllWords((prev) => ({ ...prev, [category]: word }));
    });

    socket.on("feed_story_creating", () => setIsEvaluating(true));

    socket.on("feed_game_result", (result) => {
      setIsEvaluating(false);
      setGameResult(result);
      setGameMode(false);
    });

    socket.on("feed_game_error", ({ message }) => {
      alert(message);
      setIsEvaluating(false);
    });

    socket.on("feed_partner_left", (pName) => {
      alert(`${pName || "배우자"}님이 나갔습니다. 함께 종료됩니다.`);
      navigate("/child-room");
    });

    return () => {
      socket.off("feed_game_started");
      socket.off("feed_word_submitted");
      socket.off("feed_story_creating");
      socket.off("feed_game_result");
      socket.off("feed_game_error");
      socket.off("feed_partner_left");
    };
  }, [petId, petName, navigate]);

  const handleSubmitWord = (category) => {
    const word = inputVal[category];
    if (!word || !word.trim()) return;

    socket.emit("submit_feed_word", {
      childId: childPet.id,
      petId,
      category,
      word: word.trim(),
    });
  };

  // 결과 모달 컴포넌트
  const GameResultModal = ({ result, onClose }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b0f1a]/80 backdrop-blur-md">
      <div className="bg-white/10 backdrop-blur-2xl w-full max-w-md rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(14,165,233,0.3)] border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-sky-400/30">
            <FiStar className="text-4xl text-sky-400 fill-sky-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">
            꿈 탐험 완료!
          </h2>
          <p className="text-sky-200 font-bold mb-6 text-xl">점수: {result.score}점</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-sky-400/10 p-3 rounded-2xl flex items-center gap-3 border border-sky-400/20">
              <FiHeart className="text-sky-400" />
              <div className="text-left">
                <p className="text-[10px] text-sky-300 font-bold uppercase tracking-tighter">애정</p>
                <p className="text-sm font-black text-white">+{result.changes?.affection || 0}</p>
              </div>
            </div>
            <div className="bg-emerald-400/10 p-3 rounded-2xl flex items-center gap-3 border border-emerald-400/20">
              <FiCheckCircle className="text-emerald-400" />
              <div className="text-left">
                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-tighter">건강</p>
                <p className="text-sm font-black text-white">+{result.changes?.healthHp || 0}</p>
              </div>
            </div>
            <div className="bg-amber-400/10 p-3 rounded-2xl flex items-center gap-3 border border-amber-400/20">
              <FiStar className="text-amber-400" />
              <div className="text-left">
                <p className="text-[10px] text-amber-300 font-bold uppercase tracking-tighter">경험치</p>
                <p className="text-sm font-black text-white">+{result.changes?.exp || 0}</p>
              </div>
            </div>
            <div className="bg-indigo-400/10 p-3 rounded-2xl flex items-center gap-3 border border-indigo-400/20">
              <FiSmile className="text-indigo-400" />
              <div className="text-left">
                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-tighter">상태</p>
                <p className="text-[10px] font-black text-white truncate w-20">{result.changes?.hunger || "꿈결 같음"}</p>
              </div>
            </div>

          <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/10 shadow-inner">
            <p className="text-sky-100 leading-relaxed font-medium text-lg italic">
              "{result.story}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-3xl font-black text-xl shadow-xl shadow-sky-500/20 transition-all active:scale-95"
          >
            기분 좋게 깨어나기 🐾
          </button>
        </div>
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="text-sky-400 font-bold animate-pulse text-xl tracking-widest">꿈나라로 떠나는 중...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0b0f1a] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] p-6 flex flex-col items-center overflow-x-hidden font-sans">
      {gameResult && <GameResultModal result={gameResult} onClose={() => navigate("/child-room")} />}
      
      <header className="w-full max-w-4xl flex justify-between items-center mb-12">
        <button
          onClick={() => navigate("/child-room")}
          className="p-3 bg-white/5 hover:bg-sky-500/10 rounded-2xl shadow-sm transition-all text-white/70 border border-white/10 active:scale-95"
        >
          <FiArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-sky-200 to-indigo-300 uppercase tracking-[0.2em]">
            Dream Journey
          </h1>
          <p className="text-[10px] text-sky-400 font-black tracking-widest mt-1 uppercase">AI Collaborative Adventure</p>
        </div>
        <div className="w-12" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
        <div className="relative w-64 h-64 mb-16">
          <div className="absolute inset-0 bg-sky-500/20 blur-[80px] rounded-full animate-pulse"></div>
          <div className="relative z-10 drop-shadow-[0_0_20px_rgba(14,165,233,0.5)] animate-float">
            {childPet && childPet.draw("w-full h-full")}
          </div>
          <FiStar className="absolute -top-4 left-0 text-sky-200 animate-spin-slow opacity-50" size={20} />
          <FiMoon className="absolute top-10 -right-4 text-sky-300 animate-bounce-slow opacity-50" size={24} />
        </div>

        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[50px] border border-white/10 w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          {!gameMode && !gameResult ? (
            <div className="py-12 text-center">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-sky-400/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-tight">꿈나라 입구에서 대기 중</h2>
              <p className="text-sky-200/60 leading-relaxed font-medium">
                배우자님과 함께 아기의 <br />
                창의력 이야기를 설계 중입니다...
              </p>
            </div>
          ) : isEvaluating ? (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse border border-sky-400/30">
                <FiCloud className="text-4xl text-sky-300" />
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-indigo-300 tracking-tight">
                아기가 꿈을 꾸고 있어요...
              </h2>
              <p className="text-sky-200/60 mt-4 font-medium italic">"조용히 해주세요, 아주 아름다운 이야기가 만들어지고 있어요!"</p>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="bg-sky-500/10 p-6 rounded-[32px] border border-sky-400/20 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10 text-sky-400">
                  <FiMoon size={80} />
                </div>
                <p className="text-[11px] text-sky-400 font-black mb-2 flex items-center gap-2 tracking-widest uppercase">
                  <FiStar className="fill-sky-400" />
                  아이의 소망
                </p>
                <p className="text-white text-lg font-bold leading-relaxed relative z-10">
                  "{hint}"
                </p>
              </div>

              {/* 꿈의 장소 선택 (Architect) */}
              <section>
                <header className="flex items-center justify-between mb-5">
                   <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center">
                      <FiMap className="text-sky-400" size={16}/>
                    </div>
                    <h3 className="text-sky-200 font-black text-xs uppercase tracking-[0.15em]">어디로 떠날까요?</h3>
                   </div>
                   {isMe(roles.architect) ? (
                    <span className="px-3 py-1 bg-sky-500 text-slate-950 text-[10px] font-black rounded-full shadow-lg shadow-sky-500/20 uppercase tracking-tighter">내 역할: 설계자</span>
                   ) : (
                    <span className="px-3 py-1 bg-white/5 text-sky-300 text-[10px] font-black rounded-full border border-white/10 uppercase tracking-tighter">상대방: 설계자</span>
                   )}
                </header>
                <div className="grid grid-cols-3 gap-3">
                  {PLACES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectElement("architect", p.id)}
                      disabled={mySelection.architect || partnerSelection.architect || !isMe(roles.architect)}
                      className={`group relative p-4 rounded-3xl transition-all duration-300 border-2 overflow-hidden ${
                        mySelection.architect === p.id
                          ? "bg-sky-500/20 border-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.2)]"
                          : partnerSelection.architect === p.id
                            ? "bg-white/5 border-white/10 opacity-40 cursor-not-allowed"
                            : "bg-white/5 border-transparent hover:border-sky-400/30 active:scale-95"
                      }`}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{p.icon}</span>
                        <span className={`text-[11px] font-black ${mySelection.architect === p.id ? "text-sky-300" : "text-white/40"}`}>
                          {p.name}
                        </span>
                      </div>
                      {partnerSelection.architect === p.id && (
                        <div className="absolute inset-0 bg-sky-900/40 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="text-[10px] font-black text-white/80 uppercase">Partner</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* 꿈의 가이드 선택 (Guide) */}
              <section>
                <header className="flex items-center justify-between mb-5">
                   <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <FiUsers className="text-indigo-400" size={16}/>
                    </div>
                    <h3 className="text-indigo-200 font-black text-xs uppercase tracking-[0.15em]">누구와 함께할까요?</h3>
                   </div>
                   {isMe(roles.guide) ? (
                    <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-indigo-500/20 uppercase tracking-tighter">내 역할: 인도자</span>
                   ) : (
                    <span className="px-3 py-1 bg-white/5 text-indigo-300 text-[10px] font-black rounded-full border border-white/10 uppercase tracking-tighter">상대방: 인도자</span>
                   )}
                </header>
                <div className="grid grid-cols-3 gap-3">
                  {GUIDES.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => handleSelectElement("guide", g.id)}
                      disabled={mySelection.guide || partnerSelection.guide || !isMe(roles.guide)}
                      className={`group relative p-4 rounded-3xl transition-all duration-300 border-2 overflow-hidden ${
                        mySelection.guide === g.id
                          ? "bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                          : partnerSelection.guide === g.id
                            ? "bg-white/5 border-white/10 opacity-40 cursor-not-allowed"
                            : "bg-white/5 border-transparent hover:border-indigo-400/30 active:scale-95"
                      }`}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{g.icon}</span>
                        <span className={`text-[11px] font-black ${mySelection.guide === g.id ? "text-indigo-300" : "text-white/40"}`}>
                          {g.name}
                        </span>
                      </div>
                      {partnerSelection.guide === g.id && (
                        <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="text-[10px] font-black text-white/80 uppercase">Partner</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `,
        }}
      />
    </div>
  );
};

export default ChildFeedPage;