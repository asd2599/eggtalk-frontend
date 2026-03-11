import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCoffee,
  FiStar,
  FiHeart,
  FiCheckCircle,
} from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";
import { useLocation } from "react-router-dom";

const ChildFeedPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFeeding, setIsFeeding] = useState(false);

  // 🍼 협동 게임용 상태
  const [gameMode, setGameMode] = useState(false); // 게임 진행 중 여부
  const [hint, setHint] = useState("");
  const [mySelection, setMySelection] = useState({ base: null, topping: null });
  const [partnerSelection, setPartnerSelection] = useState({
    base: null,
    topping: null,
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [waiting, setWaiting] = useState(true); // 배우자 대기용 상태
  const [roles, setRoles] = useState({
    baseSelectorId: null,
    toppingSelectorId: null,
  });

  const BASES = [
    { id: "milk", name: "고소한 우유", icon: "🥛" },
    { id: "soy", name: "담백한 두유", icon: "🫘" },
    { id: "almond", name: "달콤 아몬드", icon: "🌰" },
  ];

  const TOPPINGS = [
    { id: "honey", name: "달콤 꿀", icon: "🍯" },
    { id: "choco", name: "진한 초코", icon: "🍫" },
    { id: "berry", name: "상큼 베리", icon: "🍓" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/api/pets/child", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.childPet) {
          setChildPet(new Pet(res.data.childPet));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // 🍼 리스너를 먼저 등록 (서버 즉시 응답 유실 방지)
    const handleRoomWaiting = () => {
      setWaiting(true);
      setGameMode(false);
      setGameResult(null);
      setIsEvaluating(false);
    };

    const handleGameStarted = ({ hint, baseSelectorId, toppingSelectorId }) => {
      setWaiting(false);
      setHint(hint);
      setRoles({ baseSelectorId, toppingSelectorId });
      setGameMode(true);
      setGameResult(null);
      setIsEvaluating(false);
      setMySelection({ base: null, topping: null });
      setPartnerSelection({ base: null, topping: null });
    };

    socket.on("feed_room_waiting", handleRoomWaiting);
    socket.on("feed_game_started", handleGameStarted);

    // 리스너 등록 후 소켓 룸 입장
    if (childPet?.id) {
      socket.emit("join_feed_room", {
        childId: childPet.id,
        petId: localStorage.getItem("petId"),
        petName: localStorage.getItem("petName"),
      });
    }

    socket.on("ingredient_selected", ({ role, ingredientId, petName }) => {
      if (petName === localStorage.getItem("petName")) {
        setMySelection((prev) => ({ ...prev, [role]: ingredientId }));
      } else {
        setPartnerSelection((prev) => ({ ...prev, [role]: ingredientId }));
      }
    });

    socket.on("feed_game_evaluating", () => {
      setIsEvaluating(true);
    });

    socket.on("feed_game_result", (result) => {
      setIsEvaluating(false);
      setGameResult(result);
      setGameMode(false);
    });

    socket.on("feed_game_error", ({ message }) => {
      alert(message);
      setIsEvaluating(false);
    });

    socket.on("spouse_left_child_room", (petName) => {
      alert(
        `${petName || "배우자"}님이 방에서 나갔어요. 함께 육아방으로 복귀합니다. 🐾`,
      );
      navigate("/child-room");
    });

    return () => {
      socket.off("feed_room_waiting");
      socket.off("feed_game_started");
      socket.off("ingredient_selected");
      socket.off("feed_game_evaluating");
      socket.off("feed_game_result");
      socket.off("feed_game_error");
      socket.off("spouse_left_child_room");

      if (childPet?.id) {
        socket.emit("leave_feed_room", {
          childId: childPet.id,
          petName: localStorage.getItem("petName"),
        });
      }
    };
  }, [navigate, childPet?.id]);

  const handleFeed = async () => {
    // 일반 분유 주기는 이제 사용하지 않음
    return;
  };

  const handleSelectIngredient = (type, value) => {
    if (!gameMode || isEvaluating) return;

    // 역할 체크: 본인 역할이 아닌 카테고리는 선택 불가
    const myPetId = localStorage.getItem("petId");
    const isBaseRole = String(myPetId) === String(roles.baseSelectorId);
    const isToppingRole = String(myPetId) === String(roles.toppingSelectorId);

    if (type === "base" && !isBaseRole) {
      alert("상대방이 베이스를 선택할 차례입니다!");
      return;
    }
    if (type === "topping" && !isToppingRole) {
      alert("상대방이 토핑을 선택할 차례입니다!");
      return;
    }

    const role = type; // 서버는 role을 사용
    const ingredientId = value;

    setMySelection((prev) => ({ ...prev, [type]: value }));
    socket.emit("select_ingredient", {
      childId: childPet.id,
      petId: socket.id,
      role,
      ingredientId,
      petName: childPet.name,
    });
  };

  // 결과 모달 컴포넌트
  const GameResultModal = ({ result, onClose }) => (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiStar className="text-4xl text-emerald-500 fill-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
            요리 점수: {result.score}점!
          </h2>

          {/* 펫 능력치 변화 리스트 */}
          {result.changes && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-2xl flex items-center gap-3 border border-rose-100 dark:border-rose-900/30">
                <FiHeart className="text-rose-500" />
                <div className="text-left">
                  <p className="text-[10px] text-rose-400 font-bold uppercase">
                    애정
                  </p>
                  <p className="text-sm font-black text-rose-700 dark:text-rose-300">
                    +{result.changes.affection}
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl flex items-center gap-3 border border-blue-100 dark:border-blue-900/30">
                <FiCoffee className="text-blue-500" />
                <div className="text-left">
                  <p className="text-[10px] text-blue-400 font-bold uppercase">
                    허기
                  </p>
                  <p className="text-sm font-black text-blue-700 dark:text-blue-300">
                    {result.changes.hunger}
                  </p>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl flex items-center gap-3 border border-amber-100 dark:border-amber-900/30">
                <FiStar className="text-amber-500" />
                <div className="text-left">
                  <p className="text-[10px] text-amber-400 font-bold uppercase">
                    경험치
                  </p>
                  <p className="text-sm font-black text-amber-700 dark:text-amber-300">
                    +{result.changes.exp}
                  </p>
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-900/30">
                <FiCheckCircle className="text-emerald-500" />
                <div className="text-left">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase">
                    공감
                  </p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    +{result.changes.empathy}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 mb-8">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-lg">
              "{result.story}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
          >
            확인! 🐾
          </button>
        </div>
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="min-h-screen bg-[#fff9ee] dark:bg-[#0f172a] flex items-center justify-center">
        <div className="text-slate-500 font-bold animate-pulse">로딩 중...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#fff9ee] dark:bg-[#0f172a] p-6 flex flex-col items-center">
      <header className="w-full max-w-4xl flex justify-between items-center mb-12">
        <button
          onClick={() => navigate("/child-room")}
          className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-slate-300"
        >
          <FiArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
          Nursery Kitchen
        </h1>
        <div className="w-12" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
        <div className="relative w-64 h-64 mb-12 animate-bounce-slow">
          {childPet && childPet.draw("w-full h-full")}
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md text-center">
          {waiting && !gameResult ? (
            <div className="py-8">
              <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                배우자를 기다리는 중...
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                두 명이 모두 입장하면
                <br />
                자동으로 AI 협동 요리가 시작됩니다!
              </p>
            </div>
          ) : !gameMode && !gameResult ? (
            <div className="py-8">
              <div className="w-16 h-16 border-4 border-emerald-400 border-l-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                요리 준비 중...
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                AI 몽글이가 오늘의 힌트를
                <br />
                준비하고 있습니다!
              </p>
            </div>
          ) : isEvaluating ? (
            <div className="py-12">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                AI 몽글이가 시식 중...
              </h2>
              <p className="text-slate-500 mt-2">잠시만 기다려주세요!</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-3xl border border-amber-100 dark:border-amber-800">
                <p className="text-amber-700 dark:text-amber-300 font-bold mb-1 flex items-center justify-center gap-2">
                  <FiStar className="fill-amber-400 text-amber-400" />
                  AI 몽글이의 요구
                </p>
                <p className="text-slate-800 dark:text-slate-100 font-medium">
                  "{hint}"
                </p>
              </div>

              {/* 베이스 선택 */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                  <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
                  베이스 선택
                  {String(localStorage.getItem("petId")) ===
                  String(roles.baseSelectorId) ? (
                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full ml-1">
                      내 역할
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full ml-1">
                      상대방
                    </span>
                  )}
                  <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {BASES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleSelectIngredient("base", b.id)}
                      disabled={
                        mySelection.base ||
                        partnerSelection.base ||
                        String(localStorage.getItem("petId")) !==
                          String(roles.baseSelectorId)
                      }
                      className={`p-4 rounded-3xl transition-all flex flex-col items-center gap-2 border-2 ${
                        mySelection.base === b.id
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                          : partnerSelection.base === b.id
                            ? "bg-blue-50 border-blue-400 text-blue-700 opacity-60"
                            : "bg-slate-50 border-transparent hover:border-slate-200 text-slate-600"
                      }`}
                    >
                      <span className="text-2xl">{b.icon}</span>
                      <span className="text-xs font-bold leading-tight">
                        {b.name}
                      </span>
                      {partnerSelection.base === b.id && (
                        <span className="text-[10px] bg-blue-400 text-white px-1.5 py-0.5 rounded-full">
                          상대방
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 토핑 선택 */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                  <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
                  토핑 선택
                  {String(localStorage.getItem("petId")) ===
                  String(roles.toppingSelectorId) ? (
                    <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full ml-1">
                      내 역할
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full ml-1">
                      상대방
                    </span>
                  )}
                  <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {TOPPINGS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectIngredient("topping", t.id)}
                      disabled={
                        mySelection.topping ||
                        partnerSelection.topping ||
                        String(localStorage.getItem("petId")) !==
                          String(roles.toppingSelectorId)
                      }
                      className={`p-4 rounded-3xl transition-all flex flex-col items-center gap-2 border-2 ${
                        mySelection.topping === t.id
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                          : partnerSelection.topping === t.id
                            ? "bg-rose-50 border-rose-400 text-rose-700 opacity-60"
                            : "bg-slate-50 border-transparent hover:border-slate-200 text-slate-600"
                      }`}
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <span className="text-xs font-bold leading-tight">
                        {t.name}
                      </span>
                      {partnerSelection.topping === t.id && (
                        <span className="text-[10px] bg-rose-400 text-white px-1.5 py-0.5 rounded-full">
                          상대방
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400 font-medium">
                {!mySelection.base && !mySelection.topping
                  ? "하나의 재료를 골라보세요!"
                  : "상대방의 선택을 기다려주세요..."}
              </p>
            </div>
          )}
        </div>
      </main>

      {gameResult && (
        <GameResultModal
          result={gameResult}
          onClose={() => navigate("/child-room")}
        />
      )}

      <style>{`
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(-5%);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
      `}</style>
    </div>
  );
};

export default ChildFeedPage;
