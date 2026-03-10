import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSettings } from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

const ChildCleanPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);

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

  const handleClean = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/api/pets/child/action",
        { actionType: "CLEAN" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.childPet) {
        setChildPet(new Pet(res.data.childPet));
        socket.emit("child_action_finish", { childId: childPet.id });
        alert("뽀득뽀득 시원하게 목욕을 마쳤습니다! 🧼");
      }
    } catch (err) {
      alert("목욕 시키기에 실패했습니다.");
    } finally {
      setIsCleaning(false);
    }
  };

  if (loading) return null;

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

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl relative z-10">
        <div className="relative w-64 h-64 mb-12">
          <div
            className={`transition-all duration-500 ${isCleaning ? "scale-110 rotate-3" : ""}`}
          >
            {childPet && childPet.draw("w-full h-full")}
          </div>
          {isCleaning && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="bubble absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    width: `${Math.random() * 30 + 10}px`,
                    height: `${Math.random() * 30 + 10}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl border border-white dark:border-slate-700 w-full max-w-md text-center">
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
            {childPet?.name}를 씻겨줄 시간
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            부드러운 비누 거품으로 아이를 깨끗하게 씻겨보아요.
          </p>

          <button
            onClick={handleClean}
            disabled={isCleaning}
            className="w-full py-5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-3xl font-black text-lg shadow-lg shadow-sky-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <FiSettings className={isCleaning ? "animate-spin" : ""} />
            {isCleaning ? "거품 목욕 중..." : "목욕 시키기"}
          </button>
        </div>
      </main>

      <style>{`
        .bubble {
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          animation: float 2s infinite ease-out;
          opacity: 0;
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
      `}</style>
    </div>
  );
};

export default ChildCleanPage;
