import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCoffee } from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

const ChildFeedPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFeeding, setIsFeeding] = useState(false);

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

    // 동의된 액션 완료 감지하여 공동 육아방으로 자동 복귀
    const handleFinished = () => {
      navigate("/child-room");
    };

    socket.on("child_action_finished", handleFinished);

    return () => {
      socket.off("child_action_finished", handleFinished);
    };
  }, [navigate]);

  const handleFeed = async () => {
    if (isFeeding) return;
    setIsFeeding(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/api/pets/child/action",
        { actionType: "FEED" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.childPet) {
        setChildPet(new Pet(res.data.childPet));
        // 소켓을 통해 양측 모두에게 완료 알림 발송 (자동 복귀 유도)
        socket.emit("child_action_finish", { childId: childPet.id });
        alert("맛있게 분유를 먹었습니다! 🍼");
      }
    } catch (err) {
      alert("분유 주기에 실패했습니다.");
    } finally {
      setIsFeeding(false);
    }
  };

  if (loading) return null;

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
          {isFeeding && (
            <div className="absolute -top-10 -right-10 animate-pulse">
              <FiCoffee className="text-6xl text-emerald-500 transform rotate-12" />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md text-center">
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
            배고픈 {childPet?.name}를 위해
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            따뜻한 분유를 준비했습니다. 함께 아이의 배를 채워주세요!
          </p>

          <button
            onClick={handleFeed}
            disabled={isFeeding}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-3xl font-black text-lg shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <FiCoffee className={isFeeding ? "animate-spin" : ""} />
            {isFeeding ? "분유 먹이는 중..." : "분유 주기"}
          </button>
        </div>
      </main>

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
