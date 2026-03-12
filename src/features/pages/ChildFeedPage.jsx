import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiStar,
  FiMoon,
  FiMap,
  FiUsers,
  FiSmile,
  FiHeart,
  FiCheckCircle,
  FiCloud,
  FiGift
} from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

const PLACES = [
  { id: "place_star_sea", name: "별빛 바다", icon: "🌊" },
  { id: "place_cloud_garden", name: "구름 정원", icon: "☁️" },
  { id: "place_candy_forest", name: "캔디 숲", icon: "🍭" },
  { id: "place_crystal_cave", name: "수정 동굴", icon: "💎" },
  { id: "place_rainbow_hill", name: "무지개 언덕", icon: "🌈" },
  { id: "place_moon_palace", name: "달빛 궁전", icon: "🏰" },
];

const GUIDES = [
  { id: "guide_unicorn", name: "아기 유니콘", icon: "🦄" },
  { id: "guide_talking_star", name: "말하는 별님", icon: "⭐" },
  { id: "guide_little_fairy", name: "꼬마 요정", icon: "🧚" },
  { id: "guide_gem_whale", name: "보석 고래", icon: "🐳" },
  { id: "guide_flying_cat", name: "하늘 고양이", icon: "🐱" },
  { id: "guide_dream_dragon", name: "꿈결 드래곤", icon: "🐉" },
];

const ChildFeedPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🌌 꿈나라 모험용 상태
  const [gameMode, setGameMode] = useState(false);
  const [hint, setHint] = useState("");
  const [mySelection, setMySelection] = useState({ architect: null, guide: null });
  const [partnerSelection, setPartnerSelection] = useState({
    architect: null,
    guide: null,
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [waiting, setWaiting] = useState(true);
  const [roles, setRoles] = useState({
    architect: null,
    guide: null,
  });

  // 내 역할인지 확인하는 헬퍼 함수
  const isMe = (targetId) => {
    if (!targetId) return false;
    const myId = String(localStorage.getItem("petId") || "").trim().toLowerCase();
    return myId === String(targetId).trim().toLowerCase();
  };

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

          // 소켓 룸 입장
          socket.emit("join_dream_room", {
            childId: petObj.id,
            petId: localStorage.getItem("petId"),
            petName: localStorage.getItem("petName"),
          });
        }
      } catch (err) {
        console.error("Fetch Child Pet Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const handleRoomWaiting = () => {
      setWaiting(true);
      setGameMode(false);
      setGameResult(null);
      setIsEvaluating(false);
    };

    const handleGameStarted = ({ hint, rolesMap, currentChoices }) => {
      console.log("[DREAM] Game Started Sync:", { rolesMap, currentChoices });
      setWaiting(false);
      setHint(hint);
      setGameMode(true);
      setGameResult(null);
      setIsEvaluating(false);

      if (rolesMap) {
        setRoles({
          architect: rolesMap.architect ? String(rolesMap.architect).trim() : null,
          guide: rolesMap.guide ? String(rolesMap.guide).trim() : null
        });
      }
      
      if (currentChoices) {
        const myId = String(localStorage.getItem("petId") || "").trim().toLowerCase();
        const archId = String(rolesMap?.architect || "").trim().toLowerCase();
        
        const newMy = { architect: null, guide: null };
        const newPartner = { architect: null, guide: null };

        if (currentChoices.architect) {
          if (myId === archId) newMy.architect = currentChoices.architect;
          else newPartner.architect = currentChoices.architect;
        }
        if (currentChoices.guide) {
          if (myId !== archId) newMy.guide = currentChoices.guide;
          else newPartner.guide = currentChoices.guide;
        }

        setMySelection(newMy);
        setPartnerSelection(newPartner);
      } else {
        setMySelection({ architect: null, guide: null });
        setPartnerSelection({ architect: null, guide: null });
      }
    };

    socket.on("dream_game_started", handleGameStarted);
    socket.on("dream_room_waiting", handleRoomWaiting);

    socket.on("dream_element_selected", ({ role, elementId, petId }) => {
      const myId = String(localStorage.getItem("petId") || "").trim().toLowerCase();
      const senderId = String(petId || "").trim().toLowerCase();
      
      if (senderId === myId) {
        setMySelection((prev) => ({ ...prev, [role]: elementId }));
      } else {
        setPartnerSelection((prev) => ({ ...prev, [role]: elementId }));
      }
    });

    socket.on("dream_evaluating", () => setIsEvaluating(true));

    socket.on("dream_game_result", (result) => {
      setIsEvaluating(false);
      setGameResult(result);
      setGameMode(false);
    });

    socket.on("dream_game_error", ({ message }) => {
      alert(message || "에러가 발생했습니다.");
      setIsEvaluating(false);
    });

    const handlePartnerExit = (pName) => {
      alert(`${pName || "배우자"}님이 꿈나라를 떠났습니다. 🌌`);
      setGameMode(false);
      setWaiting(true);
    };

    socket.on("dream_partner_left", handlePartnerExit);

    return () => {
      socket.off("dream_game_started");
      socket.off("dream_room_waiting");
      socket.off("dream_element_selected");
      socket.off("dream_evaluating");
      socket.off("dream_game_result");
      socket.off("dream_game_error");
      socket.off("dream_partner_left");
    };
  }, []);

  const handleSelectElement = (role, elementId) => {
    if (!gameMode || isEvaluating) return;

    if (role === "architect" && !isMe(roles.architect)) {
      alert("배우자가 꿈의 장소를 고를 차례입니다!");
      return;
    }
    if (role === "guide" && !isMe(roles.guide)) {
      alert("배우자가 꿈의 친구를 고를 차례입니다!");
      return;
    }

    const myPetId = localStorage.getItem("petId");
    const myPetName = localStorage.getItem("petName");

    setMySelection((prev) => ({ ...prev, [role]: elementId }));
    socket.emit("select_dream_element", {
      childId: childPet.id,
      petId: String(myPetId).trim().toLowerCase(),
      role,
      elementId,
      petName: myPetName,
    });
  };

  // 결과 모달 컴포넌트
  const GameResultModal = ({ result, onClose }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f172a]/80 backdrop-blur-md">
      <div className="bg-white/10 backdrop-blur-2xl w-full max-w-md rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.3)] border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-400/30">
            <FiStar className="text-4xl text-indigo-400 fill-indigo-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">
            꿈 탐험 완료!
          </h2>
          <p className="text-indigo-200 font-bold mb-6 text-xl">점수: {result.score}점</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-rose-500/10 p-3 rounded-2xl flex items-center gap-3 border border-rose-400/20">
              <FiHeart className="text-rose-400" />
              <div className="text-left">
                <p className="text-[10px] text-rose-300 font-bold uppercase">애정</p>
                <p className="text-sm font-black text-white">+{result.changes?.affection || 0}</p>
              </div>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-2xl flex items-center gap-3 border border-emerald-400/20">
              <FiCheckCircle className="text-emerald-400" />
              <div className="text-left">
                <p className="text-[10px] text-emerald-300 font-bold uppercase">건강</p>
                <p className="text-sm font-black text-white">+{result.changes?.healthHp || 0}</p>
              </div>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-2xl flex items-center gap-3 border border-amber-400/20">
              <FiStar className="text-amber-400" />
              <div className="text-left">
                <p className="text-[10px] text-amber-300 font-bold uppercase">경험치</p>
                <p className="text-sm font-black text-white">+{result.changes?.exp || 0}</p>
              </div>
            </div>
            <div className="bg-indigo-500/10 p-3 rounded-2xl flex items-center gap-3 border border-indigo-400/20">
              <FiSmile className="text-indigo-400" />
              <div className="text-left">
                <p className="text-[10px] text-indigo-300 font-bold uppercase">상태</p>
                <p className="text-[10px] font-black text-white truncate w-20">{result.changes?.hunger || "꿈결 같음"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/10">
            <p className="text-indigo-100 leading-relaxed font-medium text-lg italic">
              "{result.story}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95"
          >
            기분 좋게 깨어나기 🐾
          </button>
        </div>
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-indigo-400 font-bold animate-pulse text-xl">꿈나라로 떠나는 중...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020617] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] p-6 flex flex-col items-center overflow-x-hidden">
      {gameResult && <GameResultModal result={gameResult} onClose={() => navigate("/child-room")} />}
      
      <header className="w-full max-w-4xl flex justify-between items-center mb-12">
        <button
          onClick={() => navigate("/child-room")}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl shadow-sm transition-all text-white/70 border border-white/10"
        >
          <FiArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 uppercase tracking-[0.2em]">
            Dream Journey
          </h1>
          <p className="text-[10px] text-indigo-400 font-black tracking-widest mt-1">AI 협동 꿈나라 모험</p>
        </div>
        <div className="w-12" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
        <div className="relative w-64 h-64 mb-16">
          <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full animate-pulse"></div>
          <div className="relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-float">
            {childPet && childPet.draw("w-full h-full")}
          </div>
          <FiStar className="absolute -top-4 left-0 text-yellow-200 animate-spin-slow opacity-50" size={20} />
          <FiMoon className="absolute top-10 -right-4 text-indigo-200 animate-bounce-slow opacity-50" size={24} />
        </div>

        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[50px] border border-white/10 w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {!gameMode && !gameResult ? (
            <div className="py-12 text-center">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-indigo-400/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-black text-white mb-3">꿈나라 입구에서 대기 중</h2>
              <p className="text-indigo-200/60 leading-relaxed font-medium">
                배우자님과 함께 아기의 <br />
                멋진 꿈을 설계하기 위해 연결 중입니다...
              </p>
            </div>
          ) : isEvaluating ? (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse border border-indigo-400/30">
                <FiCloud className="text-4xl text-indigo-300" />
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                아기가 꿈을 꾸고 있어요...
              </h2>
              <p className="text-indigo-200/60 mt-4 font-medium italic">"조용히 해주세요, 아주 아름다운 이야기가 만들어지고 있어요!"</p>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="bg-indigo-500/10 p-6 rounded-[32px] border border-indigo-400/20 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                  <FiMoon size={80} />
                </div>
                <p className="text-[11px] text-indigo-400 font-black mb-2 flex items-center gap-2 tracking-widest uppercase">
                  <FiStar className="fill-indigo-400" />
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
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <FiMap className="text-indigo-400" size={16}/>
                    </div>
                    <h3 className="text-indigo-200 font-black text-sm uppercase tracking-wider">어디로 떠날까요?</h3>
                   </div>
                   {isMe(roles.architect) ? (
                    <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-indigo-500/20">내 역할: 설계자</span>
                   ) : (
                    <span className="px-3 py-1 bg-white/5 text-indigo-300 text-[10px] font-black rounded-full border border-white/10">상대방: 설계자</span>
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
                          ? "bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                          : partnerSelection.architect === p.id
                            ? "bg-white/5 border-white/10 opacity-40 cursor-not-allowed"
                            : "bg-white/5 border-transparent hover:border-white/20 active:scale-95"
                      }`}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{p.icon}</span>
                        <span className={`text-[11px] font-black ${mySelection.architect === p.id ? "text-indigo-200" : "text-white/60"}`}>
                          {p.name}
                        </span>
                      </div>
                      {partnerSelection.architect === p.id && (
                        <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px] flex items-center justify-center">
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
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <FiUsers className="text-purple-400" size={16}/>
                    </div>
                    <h3 className="text-purple-200 font-black text-sm uppercase tracking-wider">누구와 함께할까요?</h3>
                   </div>
                   {isMe(roles.guide) ? (
                    <span className="px-3 py-1 bg-purple-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-purple-500/20">내 역할: 인도자</span>
                   ) : (
                    <span className="px-3 py-1 bg-white/5 text-purple-300 text-[10px] font-black rounded-full border border-white/10">상대방: 인도자</span>
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
                          ? "bg-purple-500/20 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                          : partnerSelection.guide === g.id
                            ? "bg-white/5 border-white/10 opacity-40 cursor-not-allowed"
                            : "bg-white/5 border-transparent hover:border-white/20 active:scale-95"
                      }`}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{g.icon}</span>
                        <span className={`text-[11px] font-black ${mySelection.guide === g.id ? "text-purple-200" : "text-white/60"}`}>
                          {g.name}
                        </span>
                      </div>
                      {partnerSelection.guide === g.id && (
                        <div className="absolute inset-0 bg-purple-900/40 backdrop-blur-[2px] flex items-center justify-center">
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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce 6s infinite;
        }
      `}} />
    </div>
  );
};

export default ChildFeedPage;
