import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import {
  FiPlus, FiSun, FiMoon, FiRefreshCw, FiAlertCircle, FiZap, FiUsers, FiSmile
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

  // 초기 테마 및 펫 데이터 로드
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }

    const fetchPetData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/"); return; }
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

  // 방 목록 실시간 연동
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
    setNotifications((prev) => [...prev, { id, message, type, isExiting: false }]);
    
    setTimeout(() => {
      setNotifications((prev) => 
        prev.map(n => n.id === id ? { ...n, isExiting: true } : n)
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
      showToast(err.response?.data?.message || "방 입장에 실패했습니다.", "error");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden relative">
      
      {/* 테마 버튼 */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-200 z-[60] transition-all shadow-sm"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>

      {/* 사이드바 사용 */}
      <CommonSide activeMenu="라운지" />

      {/* 라운지 메인 콘텐츠 */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar px-6 py-12 lg:px-12 lg:py-16 bg-white dark:bg-[#0b0f1a] transition-all scroll-smooth pb-40 relative z-10">
        <div className="max-w-[1000px] mx-auto">
          
          <header className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12 border-b border-slate-50 dark:border-slate-900 pb-8">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase leading-none">
                Lounge Area <span className="text-sky-100 dark:text-sky-900 font-sans not-italic">.</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-3 italic">Live Communication Hub</p>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={fetchRooms} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-300 rounded-2xl transition-all shadow-sm active:scale-95">
                <FiRefreshCw className="text-lg" />
              </button>
              <button onClick={() => setShowCreateModal(true)} className="p-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center">
                <FiPlus className="text-xl" />
              </button>
            </div>
          </header>

          {/* 방 목록 컨테이너 */}
          {Object.keys(rooms).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300 dark:text-slate-700 space-y-4 py-20 animate-fade-in">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
                <FiUsers className="text-3xl opacity-20" />
              </div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-50">현재 활성화된 방이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in-up">
              {Object.entries(rooms).map(([roomId, room]) => {
                const isFull = room.users.length >= 2;
                return (
                  <div key={roomId} className="flex flex-col justify-between p-7 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] transition-all hover:border-sky-100 dark:hover:border-sky-900 group shadow-sm hover:shadow-xl">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white break-words pr-2 leading-tight uppercase tracking-tighter">{room.name}</h3>
                        <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase ${isFull ? "bg-slate-100 text-slate-400" : "bg-sky-50 dark:bg-sky-900/20 text-sky-400 border border-sky-100/50 dark:border-sky-800"}`}>
                          {room.users.length}/2
                        </span>
                      </div>
                      <div className="space-y-2">
                        {room.users.map((u, i) => (
                          <div key={i} className="text-[11px] font-bold text-slate-400 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 py-2 px-3 rounded-xl border border-slate-50 dark:border-slate-800 transition-colors group-hover:border-sky-50/30">
                            <FiSmile className="text-sky-300" /> <span className="text-slate-700 dark:text-slate-300 truncate">{u.petName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(roomId)}
                      disabled={isFull}
                      className={`mt-8 w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${isFull ? "bg-slate-50 dark:bg-slate-800 text-slate-300 cursor-not-allowed" : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:scale-[1.02] shadow-lg group-hover:bg-sky-400 group-hover:text-slate-900"}`}
                    >
                      {isFull ? "방이 가득 찼어요" : "방에 들어가기"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 방 만들기 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-fade-in-up">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-6">
               <FiPlus className="text-xl text-sky-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter uppercase italic">Create Room</h2>
            <p className="text-[10px] font-bold text-slate-400 mb-8 uppercase tracking-widest italic">New Communication Channel</p>
            <form onSubmit={handleCreateRoom}>
              <div className="mb-10">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:ring-1 focus:ring-sky-200 dark:focus:ring-sky-900 dark:text-white font-bold text-sm shadow-inner transition-all"
                  placeholder="방 이름을 입력하세요"
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:text-slate-900 dark:hover:text-white">취소</button>
                <button type="submit" disabled={!newRoomName.trim()} className="flex-1 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl">방 만들기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 토스트 알림 */}
      <div className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 z-[110] flex flex-col gap-3 pointer-events-none">
        {notifications.map((noti) => (
          <div 
            key={noti.id} 
            className={`
              bg-white/90 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 shadow-2xl rounded-[1.8rem] py-4 px-6 flex items-center gap-4 pointer-events-auto min-w-[280px] transition-all
              ${noti.isExiting ? 'animate-toast-out' : 'animate-toast-in'}
            `}
          >
            <div className={`relative flex items-center justify-center w-9 h-9 rounded-2xl ${noti.type === 'error' ? 'bg-slate-50 dark:bg-slate-900/20' : 'bg-sky-50 dark:bg-sky-900/20'}`}>
              {noti.type === 'error' ? <FiAlertCircle className="text-slate-400 text-[18px]" /> : <FiZap className="text-sky-400 text-[18px]" />}
            </div>
            <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100 tracking-tight">{noti.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoungePage;