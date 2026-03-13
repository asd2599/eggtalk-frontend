import React, { useEffect, useRef, useState } from "react";
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
          ? "bg-sky-500/10 border-sky-400/30 scale-100"
          : isOwner
          ? "bg-slate-800/40 border-sky-400/50 shadow-[0_0_20px_rgba(14,165,233,0.1)]"
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
        {isSubmitted && <FiCheckCircle className="text-sky-400" />}
      </div>

      <h3 className="text-lg font-black text-white mb-4">
        {CATEGORY_LABELS[cat]}
      </h3>

      {isOwner && !isSubmitted ? (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="..."
            className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-4 py-2 text-white font-bold outline-none focus:border-sky-400 transition-all text-sm"
            value={inputValue}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
          <button
            onClick={onSubmit}
            className="p-3 bg-sky-500 hover:bg-sky-600 text-slate-950 rounded-2xl transition-all shadow-lg"
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
  const childIdRef = useRef(null);

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
          childIdRef.current = petObj.id;

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

      if (childIdRef.current) {
        socket.emit("leave_feed_room", {
          childId: childIdRef.current,
          petName,
        });
      }
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

  const myAsgn = assignments[petId] || [];

  if (loading)
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="text-sky-400 font-bold animate-pulse">
          연결 중...🐾
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0b0f1a] p-6 flex flex-col items-center">
      {/* 결과 모달 */}
      {gameResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b0f1a]/90 backdrop-blur-xl">
          <div className="bg-white/10 border border-white/20 p-8 rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-sky-400/30">
              <FiBookOpen className="text-4xl text-sky-400" />
            </div>
            <h2 className="text-3xl font-black text-white text-center mb-2">
              우리의 이야기 완성!
            </h2>
            <p className="text-center text-sky-300 font-black text-xl mb-6">
              점수: {gameResult.score}점
            </p>

            <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/10 italic">
              <p className="text-white text-lg leading-relaxed text-center">
                "{gameResult.story}"
              </p>
              <p className="text-sky-200/50 text-xs mt-4 text-center">
                {gameResult.feedback}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-sky-500/10 p-3 rounded-2xl text-center border border-sky-400/20">
                <p className="text-[10px] text-sky-300 font-black uppercase">허기</p>
                <p className="text-white font-black">{gameResult.rewards.hunger > 0 ? `+${gameResult.rewards.hunger}` : gameResult.rewards.hunger}</p>
              </div>
              <div className="bg-sky-400/10 p-3 rounded-2xl text-center border border-sky-400/20">
                <p className="text-[10px] text-sky-200 font-black uppercase">애정</p>
                <p className="text-white font-black">{gameResult.rewards.affection > 0 ? `+${gameResult.rewards.affection}` : gameResult.rewards.affection}</p>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-2xl text-center border border-slate-600/30">
                <p className="text-[10px] text-slate-300 font-black uppercase">지식</p>
                <p className="text-white font-black">{gameResult.rewards.knowledge > 0 ? `+${gameResult.rewards.knowledge}` : gameResult.rewards.knowledge}</p>
              </div>
              <div className="bg-sky-500/10 p-3 rounded-2xl text-center border border-sky-400/20">
                <p className="text-[10px] text-sky-400 font-black uppercase">경험치</p>
                <p className="text-white font-black">+{gameResult.rewards.exp}</p>
              </div>
              <div className="col-span-2 bg-slate-800/80 p-3 rounded-2xl text-center border border-slate-700/50">
                <p className="text-[10px] text-sky-600 font-black uppercase">스트레스</p>
                <p className="text-white font-black">{gameResult.rewards.stress > 0 ? `+${gameResult.rewards.stress}` : gameResult.rewards.stress}</p>
              </div>
            </div>

            <button
              onClick={() => navigate("/child-room")}
              className="w-full py-5 bg-sky-500 text-slate-950 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all"
            >
              확인하고 나가기 🐾
            </button>
          </div>
        </div>
      )}

      <header className="w-full max-w-4xl flex justify-between items-center mb-8">
        <button
          onClick={() => navigate("/child-room")}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/50 border border-white/10 transition-all"
        >
          <FiArrowLeft size={24} />
        </button>
        <div className="text-center font-sans">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-200 uppercase tracking-widest">
            5W1H Story
          </h1>
          <p className="text-[10px] text-sky-500/50 font-black uppercase">
            Collaborative Storytelling
          </p>
        </div>
        <div className="w-12" />
      </header>

      <main className="w-full max-w-lg flex flex-col items-center flex-1">
        <div className="relative w-48 h-48 mb-8">
          <div className="absolute inset-0 bg-sky-500/10 blur-[60px] rounded-full animate-pulse" />
          <div className="relative z-10 animate-float">
            {childPet && childPet.draw("w-full h-full")}
          </div>
        </div>

        <div className="w-full space-y-4 mb-20 font-sans">
          {waiting ? (
            <div className="bg-white/5 p-12 rounded-[50px] border border-white/5 text-center">
              <FiLoader className="text-4xl text-sky-400 animate-spin mx-auto mb-6" />
              <h2 className="text-white font-black text-xl mb-2">
                참가자 대기 중
              </h2>
              <p className="text-white/30 text-sm font-bold">
                배우자님과 함께 아기의 <br />
                창의력 이야기를 설계 중입니다...
              </p>
            </div>
          ) : isEvaluating ? (
            <div className="bg-white/5 p-12 rounded-[50px] border border-white/5 text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-sky-400/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <FiEdit3 className="absolute inset-0 m-auto text-3xl text-sky-400 animate-bounce" />
              </div>
              <h2 className="text-white font-black text-xl mb-2">
                이야기를 짓는 중...
              </h2>
              <p className="text-sky-400/50 text-xs font-black italic">
                AI가 여러분의 단어로 마법을 부리고 있어요!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(CATEGORY_LABELS).map((cat) => (
                <CategoryCard
                  key={cat}
                  cat={cat}
                  isOwner={myAsgn.includes(cat)}
                  word={allWords[cat]}
                  inputValue={inputVal[cat] || ""}
                  onChange={(val) => setInputVal((prev) => ({ ...prev, [cat]: val }))}
                  onSubmit={() => handleSubmitWord(cat)}
                />
              ))}
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