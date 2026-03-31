import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import {
  FiPlus,
  FiSun,
  FiMoon,
  FiRefreshCw,
  FiShield,
  FiUsers,
  FiSmile,
} from "react-icons/fi";
import Pet from "../pets/pet";
import socket from "../../utils/socket";
import CommonSide from "./CommonSide";

const MafiaListPage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }

    const fetchPetData = async () => {
      try {
        const response = await api.get("/api/pets/my");
        if (response.data.pet) {
          setPetData(new Pet(response.data.pet));
        } else {
          navigate("/create-pet");
        }
      } catch (error) {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchPetData();
    fetchRooms();
  }, [navigate]);

  const fetchRooms = async () => {
    try {
      const res = await api.get("/api/mafia/rooms");
      setRooms(res.data);
    } catch (err) {
      console.error("마피아 방 목록 로드 실패", err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomTitle.trim() || !petData) return;
    try {
      const response = await api.post("/api/mafia/rooms", {
        title: newRoomTitle,
        petId: petData.id,
      });
      if (response.data.success) {
        navigate(`/mafia/${response.data.roomId}`);
      }
    } catch (err) {
      alert("방 생성 실패");
    }
  };

  const handleJoinRoom = async (roomId) => {
    if (!petData) return;
    try {
      const response = await api.post(`/api/mafia/rooms/${roomId}/join`, {
        petId: petData.id,
      });
      if (response.data.success) {
        navigate(`/mafia/${roomId}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "입장 실패");
    }
  };

  if (loading) return null;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f1a] transition-colors duration-500 overflow-hidden relative">
      <CommonSide activeMenu="마피아" />

      <main className="flex-1 overflow-y-auto px-6 py-12 lg:px-12 lg:py-16 pb-40 relative z-10 custom-scrollbar">
        <div className="max-w-[1000px] mx-auto">
          <header className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12 border-b border-slate-100 dark:border-slate-800 pb-8">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase leading-none">
                Mafia Lobby <span className="text-sky-400 font-sans not-italic">.</span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 italic">
                Strategic Investigation Hub
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchRooms} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-400 rounded-2xl shadow-sm">
                <FiRefreshCw className="text-lg" />
              </button>
              <button onClick={() => setShowCreateModal(true)} className="p-3 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all">
                <FiPlus className="text-xl" />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="p-5 lg:p-7 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[2rem] lg:rounded-[2.5rem] hover:border-sky-400 dark:hover:border-sky-500 transition-all group shadow-sm">
                <div className="flex justify-between items-start mb-4 lg:mb-6">
                  <h3 className="text-base lg:text-lg font-black text-slate-900 dark:text-white leading-tight uppercase italic truncate pr-2">{room.title}</h3>
                  <span className="px-2 py-0.5 lg:px-2.5 lg:py-1 text-[8px] lg:text-[9px] font-black bg-sky-50 dark:bg-sky-900/40 text-sky-500 rounded-full uppercase tracking-widest shrink-0">{room.current_players}/4</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 lg:p-3 rounded-xl lg:rounded-2xl mb-4 lg:mb-6 border border-slate-100 dark:border-slate-700">
                  <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest block mb-0.5 lg:mb-1">Host</span>
                  <span className="text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2"><FiSmile className="text-sky-400 shrink-0" /> <span className="truncate">{room.host_name}</span></span>
                </div>
                <button 
                  onClick={() => handleJoinRoom(room.id)}
                  className="w-full py-3.5 lg:py-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-[11px] uppercase tracking-widest hover:scale-[1.02] shadow-lg transition-all"
                >
                  Join Room
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tighter uppercase italic">Create Mafia Room</h2>
            <form onSubmit={handleCreateRoom}>
              <input 
                type="text" 
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                placeholder="Investigation Title"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-5 mb-8 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MafiaListPage;
