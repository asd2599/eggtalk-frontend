import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSmile } from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

const ChildPlayPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

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

    const handleFinished = () => {
      navigate("/child-room");
    };

    socket.on("child_action_finished", handleFinished);

    return () => {
      socket.off("child_action_finished", handleFinished);
    };
  }, [navigate]);

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/api/pets/child/action",
        { actionType: "PLAY" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.childPet) {
        setChildPet(new Pet(res.data.childPet));
        socket.emit("child_action_finish", { childId: childPet.id });
        alert("신나게 뛰어놀았습니다! 스트레스가 풀렸어요. 🎈");
      }
    } catch (err) {
      alert("놀아 주기에 실패했습니다.");
    } finally {
      setIsPlaying(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-[#0f172a] p-6 flex flex-col items-center">
      <header className="w-full max-w-4xl flex justify-between items-center mb-12">
        <button
          onClick={() => navigate("/child-room")}
          className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-slate-300"
        >
          <FiArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
          Nursery Playground
        </h1>
        <div className="w-12" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
        <div
          className={`relative w-64 h-64 mb-12 flex items-center justify-center ${isPlaying ? "animate-wiggle" : ""}`}
        >
          {childPet && childPet.draw("w-full h-full")}
          {isPlaying && (
            <div className="absolute inset-x-0 -top-8 flex justify-center gap-2">
              <span className="text-4xl animate-bounce-fast">💖</span>
              <span className="text-4xl animate-bounce-slow">✨</span>
              <span className="text-4xl animate-bounce-fast">💖</span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md text-center">
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
            {childPet?.name}와(과) 신나는 시간
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            아이와 함께 웃고 떠들며 소중한 추억을 만들어보세요.
          </p>

          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className="w-full py-5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-3xl font-black text-lg shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <FiSmile className={isPlaying ? "animate-bounce" : ""} />
            {isPlaying ? "즐겁게 노는 중..." : "놀아 주기"}
          </button>
        </div>
      </main>

      <style jsx>{`
        .animate-wiggle {
          animation: wiggle 0.5s infinite;
        }
        .animate-bounce-fast {
          animation: bounce 0.8s infinite;
        }
        .animate-bounce-slow {
          animation: bounce 1.2s infinite;
        }
        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(-5deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
};

export default ChildPlayPage;
