import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUsers, FiShield, FiSun, FiMoon, FiSend, FiUser, FiZap, FiCheckCircle } from 'react-icons/fi';
import api from '../../utils/config';
import socket from '../../utils/socket';
import Pet from '../pets/pet';
import CommonSide from './CommonSide';

const MafiaRoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [roomInfo, setRoomInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef(null);

  const petRef = useRef(null);
  useEffect(() => { petRef.current = petData; }, [petData]);

  const fetchRoomData = async () => {
    try {
      const res = await api.get(`/api/mafia/rooms/${roomId}/participants`);
      setParticipants(res.data.participants);
      setRoomInfo(res.data.room);
    } catch (err) {
      console.error("방 데이터 동기화 실패", err);
      // 토큰 만료인 경우 (403) 메인으로 유도
      if (err.response?.status === 403) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }

    const init = async () => {
      try {
        const petResponse = await api.get('/api/pets/my');
        if (petResponse.data.pet) {
          const myPet = new Pet(petResponse.data.pet);
          setPetData(myPet);
          // fetchRoomData를 init() 내에서 호출하여 순서 보장
          const res = await api.get(`/api/mafia/rooms/${roomId}/participants`);
          setParticipants(res.data.participants);
          setRoomInfo(res.data.room);
          socket.emit("mafia_join_room", { roomId });
        } else {
          navigate('/create-pet');
        }
      } catch (err) {
        navigate('/mafia');
      }
    };
    init();

    socket.on("mafia_sync_needed", fetchRoomData);
    socket.on("mafia_message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on("mafia_game_started", (data) => {
      navigate(`/mafia/${roomId}/play`, { state: { initialData: data } });
    });

    return () => {
      socket.off("mafia_sync_needed");
      socket.off("mafia_message");
      socket.off("mafia_game_started");
      if (petRef.current) {
        api.post(`/api/mafia/rooms/${roomId}/leave`, { petId: petRef.current.id })
           .then(() => socket.emit("mafia_toggle_ready", { roomId }));
      }
    };
  }, [roomId, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleReady = async () => {
    if (!petData) return;
    const myParticipant = participants.find(p => Number(p.pet_id) === Number(petData.id));
    const newReadyStatus = !myParticipant?.is_ready;
    
    try {
      await api.post(`/api/mafia/rooms/${roomId}/ready`, {
        petId: petData.id,
        isReady: newReadyStatus
      });
      socket.emit("mafia_toggle_ready", { roomId });
    } catch (err) {
      console.error("레디 토글 실패", err);
      alert(`서버 에러 발생: ${err.message}`);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !petData) return;
    socket.emit("mafia_send_message", { roomId, text: inputValue, sender: petData.name });
    setInputValue('');
  };

  const handleLeaveRoom = async () => {
    if (!petData) return;
    try {
      await api.post(`/api/mafia/rooms/${roomId}/leave`, { petId: petData.id });
      socket.emit("mafia_toggle_ready", { roomId });
      navigate('/mafia');
    } catch (err) {
      console.error("방 퇴장 실패", err);
      alert("방 퇴장에 실패했습니다. 메인으로 이동합니다.");
      navigate('/mafia');
    }
  };

  const isAllReady = participants.length >= 1 && participants.every(p => p.is_ready);
  const isHost = petData && roomInfo && Number(petData.id) === Number(roomInfo.host_id);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f1a] transition-colors duration-500 overflow-hidden relative">
      <CommonSide activeMenu="마피아" />

      <main className="flex-1 flex flex-col p-4 lg:p-8">
        <header className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-slate-900 dark:bg-sky-400 rounded-2xl flex items-center justify-center text-white dark:text-slate-900 shadow-xl">
               <FiShield className="text-2xl" />
             </div>
             <div>
               <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                 {roomInfo?.title || "Mafia Room"}
               </h1>
               <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-[0.3em]">Waiting Lobby</p>
             </div>
           </div>
           
           <div className="flex items-center gap-3">
             <button 
               onClick={handleLeaveRoom}
               className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
             >
               Leave Room
             </button>
             {isHost && (
               <button 
                 onClick={() => socket.emit("mafia_start_game", { roomId })}
                 disabled={!isAllReady}
                 className={`px-8 py-3 rounded-2xl font-black text-[10px] lg:text-sm uppercase tracking-widest transition-all shadow-xl ${isAllReady ? 'bg-sky-400 text-slate-900 hover:scale-105 active:scale-95' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'}`}
               >
                 Start Game
               </button>
             )}
           </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 overflow-hidden pb-20 lg:pb-0">
          <div className="flex-1 grid grid-cols-2 gap-3 lg:gap-4 overflow-y-auto pr-1 custom-scrollbar">
            {participants.map((player) => {
              const petInstance = new Pet(player);
              return (
                <div key={player.pet_id} className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-4 lg:p-6 rounded-3xl lg:rounded-4xl flex flex-col items-center justify-center relative shadow-sm">
                  <div className="w-16 h-16 lg:w-24 lg:h-24 bg-slate-50 dark:bg-slate-800 rounded-2xl lg:rounded-3xl mb-3 lg:mb-4 flex items-center justify-center relative overflow-hidden">
                     {petInstance.draw("w-10 h-10 lg:w-16 lg:h-16")}
                     {player.is_ready && (
                       <div className="absolute -top-1 -right-1 w-6 h-6 lg:w-8 lg:h-8 bg-sky-400 rounded-full flex items-center justify-center text-slate-900 shadow-lg border-2 lg:border-4 border-white dark:border-slate-900 animate-bounce">
                          <FiCheckCircle className="text-[10px] lg:text-sm" />
                       </div>
                     )}
                  </div>
                  <span className="text-[11px] lg:text-sm font-black text-slate-900 dark:text-white uppercase italic truncate w-full text-center px-2">{player.name}</span>
                  <span className={`text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] mt-1 lg:mt-2 ${player.is_ready ? 'text-sky-400' : 'text-slate-300 dark:text-slate-700'}`}>
                    {Number(player.pet_id) === Number(roomInfo?.host_id) ? 'Room Host' : (player.is_ready ? 'READY' : 'WAITING')}
                  </span>
                </div>
              );
            })}
            
            {Array.from({ length: 4 - participants.length }).map((_, i) => (
              <div key={`empty-${i}`} className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl lg:rounded-4xl flex items-center justify-center opacity-30 h-[120px] lg:h-[180px]">
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Empty</span>
              </div>
            ))}
          </div>

          <div className="w-full lg:w-[400px] flex flex-col gap-4 h-[300px] lg:h-full">
             <div className="flex-1 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-4xl lg:rounded-5xl flex flex-col overflow-hidden">
                <div ref={scrollRef} className="flex-1 p-5 lg:p-6 overflow-y-auto space-y-3 lg:space-y-4 custom-scrollbar">
                   {messages.map((m, i) => (
                     <div key={i} className={`flex flex-col ${m.sender === petData?.name ? 'items-end' : 'items-start'}`}>
                        <span className="text-[8px] font-black text-slate-400 uppercase mb-1 px-1">{m.sender}</span>
                        <div className={`px-4 py-2 rounded-2xl text-[11px] lg:text-[12px] shadow-sm ${m.sender === petData?.name ? 'bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950 rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-50 dark:border-slate-700 rounded-tl-none'}`}>
                           {m.text}
                        </div>
                     </div>
                   ))}
                </div>
                <form onSubmit={handleSendMessage} className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800 flex gap-2">
                   <input 
                     type="text" 
                     value={inputValue}
                     onChange={(e) => setInputValue(e.target.value)}
                     className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-[11px] focus:outline-none"
                     placeholder="Say something..."
                   />
                   <button type="submit" className="p-2 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-900 rounded-xl"><FiSend /></button>
                </form>
             </div>

             {!isHost && (
               <button 
                 onClick={toggleReady}
                 className={`w-full py-4 lg:py-5 rounded-2xl lg:rounded-3xl font-black text-[12px] lg:text-sm uppercase tracking-[0.2em] transition-all shadow-xl ${participants.find(p => Number(p.pet_id) === Number(petData?.id))?.is_ready ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600' : 'bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 hover:scale-105 active:scale-95'}`}
               >
                 {participants.find(p => Number(p.pet_id) === Number(petData?.id))?.is_ready ? 'Cancel' : 'Ready Up'}
               </button>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MafiaRoomPage;
