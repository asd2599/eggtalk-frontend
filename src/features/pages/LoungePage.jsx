import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import {
  FiPlus,
  FiSun,
  FiMoon,
  FiRefreshCw,
  FiAlertCircle,
  FiZap,
  FiUsers,
  FiSmile,
} from "react-icons/fi";
import Pet from "../pets/pet";
import socket from "../../utils/socket";
import CommonSide from "./CommonSide";

const LoungePage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [rooms, setRooms] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }

    const fetchPetData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }
        const response = await api.get("/api/pets/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.pet) {
          setPetData(new Pet(response.data.pet));
          socket.emit("user_login", response.data.pet.name);
        } else {
          navigate("/create-pet");
        }
      } catch (error) {
        localStorage.removeItem("token");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchPetData();
  }, [navigate]);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await api.get("/api/rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(res.data || {});
    } catch (err) {
      console.error("방 목록 로드 실패:", err);
    }
  };

  useEffect(() => {
    fetchRooms();
    socket.on("rooms_updated", fetchRooms);

    return () => {
      socket.off("rooms_updated", fetchRooms);
    };
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setNotifications((prev) => [
      ...prev,
      { id, message, type, isExiting: false },
    ]);

    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isExiting: true } : n)),
      );
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 300);
    }, 3000);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim() || !petData) return;
    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        "/api/rooms",
        { roomName: newRoomName, petName: petData.name },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.success) {
        socket.emit("trigger_rooms_update");
        showToast(`${newRoomName} 방이 생성되었습니다! ✨`);
        setShowCreateModal(false);
        setNewRoomName("");
        setTimeout(() => navigate(`/dating/${response.data.roomId}`), 1000);
      }
    } catch (err) {
      showToast("채팅방을 생성하지 못했습니다.", "error");
    }
  };

  const handleJoinRoom = async (roomId) => {
    if (!petData) return;
    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        `/api/rooms/${roomId}/join`,
        { petName: petData.name },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.success) {
        socket.emit("trigger_rooms_update");
        showToast("방에 입장합니다. 잠시만 기다려주세요!");
        setTimeout(() => navigate(`/dating/${roomId}`), 800);
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || "방 입장에 실패했습니다.",
        "error",
      );
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-sky-500 dark:border-slate-800 dark:border-t-sky-400 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden relative">
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-sky-400 z-[60] transition-all border border-slate-100 dark:border-slate-800 shadow-sm"
      >
        {isDarkMode ? (
          <FiSun className="text-sm" />
        ) : (
          <FiMoon className="text-sm" />
        )}
      </button>

      <CommonSide activeMenu="모임" />

      <main className="flex-1 h-full overflow-y-auto custom-scrollbar px-6 py-12 lg:px-12 lg:py-16 bg-white dark:bg-[#0b0f1a] transition-all scroll-smooth pb-40 relative z-10">
        <div className="max-w-[1000px] mx-auto">
          <header className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12 border-b border-slate-100 dark:border-slate-900 pb-8">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase leading-none">
                Lounge Area{" "}
                <span className="text-sky-400 dark:text-sky-400 font-sans not-italic">
                  .
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 italic">
                Live Communication Hub
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchRooms}
                className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-400 rounded-2xl transition-all shadow-sm active:scale-95"
              >
                <FiRefreshCw className="text-lg" />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-3 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center"
              >
                <FiPlus className="text-xl" />
              </button>
            </div>
          </header>

          {Object.keys(rooms).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300 dark:text-slate-700 space-y-4 py-20 animate-fade-in">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-50 dark:border-slate-800 shadow-inner">
                <FiUsers className="text-3xl text-slate-300 dark:text-slate-700" />
              </div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-50 dark:opacity-80 dark:text-slate-500">
                현재 활성화된 방이 없습니다
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in-up">
              {Object.entries(rooms).map(([roomId, room]) => {
                const isFull = room.users.length >= 2;
                return (
                  <div
                    key={roomId}
                    className="flex flex-col justify-between p-7 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] transition-all hover:border-sky-400 dark:hover:border-sky-500 group shadow-sm hover:shadow-2xl hover:shadow-sky-500/5 dark:hover:shadow-none relative overflow-hidden"
                  >
                    {/* 활성 상태 표시 도트 포인트 */}
                    {!isFull && (
                      <div className="absolute top-5 right-5 w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(125,211,252,0.8)]" />
                    )}

                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 pr-2 leading-tight uppercase tracking-tighter group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                          {room.name}
                        </h3>
                        <span
                          className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase ${isFull ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500" : "bg-sky-50 dark:bg-sky-900/40 text-sky-500 dark:text-sky-400 border border-sky-100/50 dark:border-sky-800/50"}`}
                        >
                          {room.users.length}/2
                        </span>
                      </div>
                      <div className="space-y-2">
                        {room.users.map((u, i) => (
                          <div
                            key={u.petName || i}
                            className="text-[11px] font-bold flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 py-2.5 px-3 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors"
                          >
                            <FiSmile className="text-sky-400" />{" "}
                            <span className="text-slate-700 dark:text-slate-200 truncate">
                              {u.petName}
                            </span>
                          </div>
                        ))}
                        {room.users.length === 1 && (
                          <div
                            key="waiting-msg"
                            className="text-[10px] font-black text-slate-300 dark:text-slate-700 px-3 py-1 uppercase tracking-widest italic animate-pulse"
                          >
                            Waiting for guest...
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(roomId)}
                      disabled={isFull}
                      className={`mt-8 w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-lg ${isFull ? "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed" : "bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 hover:scale-[1.02] active:scale-95 group-hover:shadow-sky-500/10"}`}
                    >
                      {isFull ? "방이 꽉 찼어요" : "방에 입장하기"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 방 만들기 모달 디자인 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in font-sans">
          <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-scale-in">
            <div className="w-14 h-14 bg-slate-900 dark:bg-sky-400 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl shadow-sky-500/10">
              <FiPlus className="text-2xl text-sky-400 dark:text-slate-950" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter uppercase italic leading-none">
              Create Channel{" "}
              <span className="text-sky-400 font-sans not-italic">.</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-widest italic">
              Initialize new communication link
            </p>
            <form onSubmit={handleCreateRoom}>
              <div className="mb-10">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 dark:text-white font-bold text-[13px] shadow-inner transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                  placeholder="방 이름을 입력하세요"
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:text-slate-900 dark:hover:text-slate-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim()}
                  className="flex-1 py-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] shadow-xl shadow-sky-500/10 transition-all"
                >
                  방 만들기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 토스트 알림 다크모드 가독성 강화 */}
      <div className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 z-[110] flex flex-col gap-3 pointer-events-none">
        {notifications.map((noti) => (
          <div
            key={noti.id}
            className={`
              bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 shadow-2xl rounded-[2rem] py-4 px-7 flex items-center gap-5 pointer-events-auto min-w-[300px] transition-all
              ${noti.isExiting ? "animate-toast-out" : "animate-toast-in"}
            `}
          >
            <div
              className={`relative flex items-center justify-center w-10 h-10 rounded-2xl ${noti.type === "error" ? "bg-slate-900 dark:bg-slate-800" : "bg-sky-50 dark:bg-sky-400/10"}`}
            >
              {noti.type === "error" ? (
                <FiAlertCircle className="text-slate-100 text-[20px]" />
              ) : (
                <FiZap className="text-sky-500 text-[20px]" />
              )}
            </div>
            <div className="text-[14px] font-black text-slate-700 dark:text-slate-100 tracking-tight">
              {noti.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoungePage;
