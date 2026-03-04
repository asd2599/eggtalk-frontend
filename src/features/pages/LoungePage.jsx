import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiLogOut,
  FiBox,
  FiCloud,
  FiMonitor,
  FiSmile,
  FiAward,
  FiMessageCircle,
  FiUsers,
  FiPlus,
  FiArrowRight,
  FiSun,
  FiMoon,
  FiRefreshCw,
} from "react-icons/fi";
import Pet from "../pets/pet";
import socket from "../../utils/socket";

const LoungePage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [rooms, setRooms] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

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
        const response = await axios.get("http://localhost:8000/api/pets/my", {
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
      const res = await axios.get("http://localhost:8000/api/rooms", {
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
    return () => { socket.off("rooms_updated", fetchRooms); };
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  const handleLogout = () => { localStorage.removeItem("token"); navigate("/"); };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim() || !petData) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/api/rooms",
        { roomName: newRoomName, petName: petData.name },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.success) {
        socket.emit("trigger_rooms_update");
        setShowCreateModal(false);
        setNewRoomName("");
        navigate(`/dating/${response.data.roomId}`);
      }
    } catch (err) {
      alert("채팅방을 생성하지 못했습니다.");
    }
  };

  const handleJoinRoom = async (roomId) => {
    if (!petData) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:8000/api/rooms/${roomId}/join`,
        { petName: petData.name },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.success) {
        socket.emit("trigger_rooms_update");
        navigate(`/dating/${roomId}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "방 입장에 실패했습니다.");
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
      <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden">
      
      {/* 테마 버튼 */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-3 rounded-2xl bg-white dark:bg-[#0b0f1a] border border-gray-100 dark:border-gray-800 text-gray-500 z-[60] shadow-sm active:scale-90 transition-all hover:scale-110"
      >
        {isDarkMode ? <FiSun className="text-sm text-amber-500" /> : <FiMoon className="text-sm text-indigo-500" />}
      </button>

      {/* 사이드바 & 하단바 */}
      <aside className="fixed bottom-0 w-full h-16 lg:relative lg:w-64 lg:h-full border-t lg:border-t-0 lg:border-r border-gray-100 dark:border-gray-900 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl z-50 flex lg:flex-col justify-between items-center lg:items-stretch shadow-lg lg:shadow-none">
        <div className="flex lg:flex-col items-center justify-around w-full lg:p-10">
          <h2 className="hidden lg:block text-xs font-black text-gray-900 dark:text-white mb-10 tracking-[0.3em] text-center uppercase">Dashboard</h2>
          <nav className="flex lg:flex-col gap-1 lg:gap-3 w-full px-2 lg:px-0">
            {[
              { icon: FiSmile, label: "내 펫 상태", path: "/main" },
              { icon: FiAward, label: "명예의 전당", path: "/ranking" },
              { icon: FiMessageCircle, label: "대화하기", path: "/chat" },
              { icon: FiUsers, label: "라운지", path: "/lounge", active: true },
              { icon: FiBox, label: "DD 모듈", path: "/dd" },
              { icon: FiCloud, label: "MS 모듈", path: "/ms" },
              { icon: FiMonitor, label: "SH 모듈", path: "/sh" },
            ].map((item) => (
              <button key={item.label} onClick={() => navigate(item.path)} className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-4 p-2 lg:px-5 lg:py-3.5 rounded-xl lg:rounded-2xl transition-all flex-1 lg:flex-none ${item.active ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"}`}>
                <item.icon className="text-xl lg:text-lg" />
                <span className="text-[9px] lg:text-[13px] font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="hidden lg:block p-10 border-t border-gray-50 dark:border-gray-900">
          <button onClick={handleLogout} className="flex items-center justify-center gap-3 w-full text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest group">
            <FiLogOut /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 라운지 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col items-stretch p-4 lg:p-8 gap-0 bg-slate-50 dark:bg-[#0b0f1a] h-full overflow-y-auto lg:overflow-hidden custom-scrollbar pb-24 lg:pb-8 transition-all">
        
        {/* 통합형 라운지 헤더 */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white dark:bg-[#0b0f1a] border border-gray-100 dark:border-gray-800 p-6 lg:px-10 lg:py-7 rounded-t-[2.5rem] lg:rounded-t-[3rem] shadow-[0_-1px_0_rgba(0,0,0,0.05)] border-b-0 flex-shrink-0 transition-colors">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3">
               <h1 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-tighter italic">Lounge Area</h1>
               <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            </div>
            <p className="text-sm lg:text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-[0.2em]">다른 펫들과 실시간으로 1:1 대화를 나눠보세요.</p>
          </div>

          {/* 버튼 영역 */}
          <div className="flex items-center gap-3 w-auto lg:w-auto">
            {/* 새로고침 버튼 */}
            <button onClick={fetchRooms} className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 hover:text-amber-500 rounded-2xl transition-all shadow-sm active:scale-95">
              <FiRefreshCw className="text-lg" />
            </button>
            {/* 방 만들기 버튼 */}
            <button onClick={() => setShowCreateModal(true)} className="p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center">
              <FiPlus className="text-xl" />
            </button>
          </div>
        </div>

        {/* 방 목록 컨테이너 */}
        <div className="flex-1 bg-white dark:bg-[#0b0f1a] border border-gray-100 dark:border-gray-800 rounded-b-[2.5rem] lg:rounded-b-[3rem] shadow-sm p-6 lg:p-10 overflow-y-auto custom-scrollbar transition-colors">
          {Object.keys(rooms).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-4 py-20">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center">
                <FiUsers className="text-3xl opacity-20" />
              </div>
              <p className="text-[12px] font-bold tracking-tight uppercase opacity-50">만들어진 방이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(rooms).map(([roomId, room]) => {
                const isFull = room.users.length >= 2;
                return (
                  <div key={roomId} className="flex flex-col justify-between p-7 bg-white dark:bg-[#0b0f1a] border border-gray-100 dark:border-gray-800 rounded-[2rem] transition-all hover:border-amber-400 dark:hover:border-amber-500 group hover:shadow-2xl hover:shadow-amber-100/10">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white break-words pr-2 leading-tight">{room.name}</h3>
                        <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase ${isFull ? "bg-rose-50 text-rose-500 border border-rose-100" : "bg-emerald-50 text-emerald-500 border border-emerald-100"}`}>
                          {room.users.length}/2명
                        </span>
                      </div>
                      <div className="space-y-2">
                        {room.users.map((u, i) => (
                          <div key={i} className="text-[11px] font-bold text-gray-400 flex items-center gap-2 bg-slate-50/50 dark:bg-gray-900/50 py-1.5 px-3 rounded-lg border border-slate-100 dark:border-gray-800">
                            <FiSmile className="text-amber-500" /> <span className="text-gray-600 dark:text-gray-300">{u.petName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(roomId)}
                      disabled={isFull}
                      className={`mt-8 w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all ${isFull ? "bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02] shadow-lg group-hover:bg-amber-500 group-hover:text-white dark:group-hover:bg-amber-400"}`}
                    >
                      {isFull ? "방이 가득 찼어요" : "들어가기"}
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
        <div className="fixed inset-0 z-[100] bg-[#0b0f1a]/60 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-gray-100 dark:border-gray-800 relative animate-fade-in-up">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6">
               <FiPlus className="text-xl text-amber-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter">방 만들기</h2>
            <p className="text-[11px] font-bold text-gray-400 mb-8 uppercase tracking-widest italic">Open a new communication line</p>
            <form onSubmit={handleCreateRoom}>
              <div className="mb-10">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-6 py-4 focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:text-white font-bold text-sm shadow-inner transition-all"
                  placeholder="방 이름"
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-900 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">취소</button>
                <button type="submit" disabled={!newRoomName.trim()} className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-gray-200 dark:shadow-none">방 만들기</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoungePage;