import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FiMessageSquare, FiSend, FiUser, FiZap, FiTarget, FiSun, FiMoon, FiShield, FiHeart, FiLogOut, FiCheckCircle } from 'react-icons/fi';
import socket from '../../utils/socket';
import Pet from '../pets/pet';
import CommonSide from './CommonSide';
import api from '../../utils/config';

const MafiaGamePage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(location.state?.initialData || null);
  const [myPet, setMyPet] = useState(null);
  const [players, setPlayers] = useState(initialData?.players || []);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [phase, setPhase] = useState('day');
  const [timer, setTimer] = useState(60);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [bubbles, setBubbles] = useState({});
  const [gameResult, setGameResult] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [roomVotes, setRoomVotes] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }

    api.get('/api/pets/my').then(res => {
      if (res.data.pet) setMyPet(new Pet(res.data.pet));
    }).catch(console.error);

    socket.on("mafia_message", (msg) => {
      setMessages(prev => [...prev, msg]);
      const senderPlayer = players.find(p => p.anonName === msg.sender);
      if (senderPlayer) {
        setBubbles(prev => ({
          ...prev,
          [senderPlayer.id]: { text: msg.text, expiresAt: Date.now() + 3500 }
        }));
      }
    });

    socket.on("mafia_phase_change", (newPhase) => {
      setPhase(newPhase);
      if (newPhase === 'day') {
          setMyVote(null);
          setRoomVotes({});
      }
    });

    socket.on("mafia_timer", (t) => {
      setTimer(t);
    });

    socket.on("mafia_player_dead", (data) => {
      setPlayers(data.players);
    });

    socket.on("mafia_vote_synced", (data) => {
      setRoomVotes(data.votes);
    });

    socket.on("mafia_game_ended", (data) => {
      setGameResult(data.reason);
      setTimeout(() => { navigate(`/mafia`); }, 5000);
    });

    socket.on("mafia_game_started", (data) => {
        setPlayers(data.players);
    });

    return () => {
      socket.off("mafia_message");
      socket.off("mafia_phase_change");
      socket.off("mafia_timer");
      socket.off("mafia_player_dead");
      socket.off("mafia_vote_synced");
      socket.off("mafia_game_ended");
      socket.off("mafia_game_started");
    };
  }, [roomId, players, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBubbles(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (next[id].expiresAt < now) { delete next[id]; changed = true; }
        });
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleCastVote = (targetId) => {
      if (phase !== 'vote' || myInfo?.isDead) return;
      setMyVote(targetId);
      socket.emit("mafia_cast_vote", { roomId, targetId });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !myPet) return;
    const myInfo = players.find(p => p.type === 'human' && p.petId === myPet.id);
    if (myInfo?.isDead) return;
    socket.emit("mafia_send_message", { roomId, text: inputValue, sender: myInfo?.anonName });
    setInputValue('');
  };

  const handleExit = () => {
    if (window.confirm("정말 게임에서 나가시겠습니까?")) {
      socket.emit("mafia_leave_game", { roomId });
      navigate(`/mafia`);
    }
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setIsDarkMode(isDark);
  };

  const myInfo = players.find(p => p.type === 'human' && p.petId === myPet?.id);
  const myPetInfo = players.find(p => p.type === 'pet' && p.petId === myPet?.id);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f1a] transition-colors duration-500 overflow-hidden relative font-sans">
      <CommonSide activeMenu="마피아" />

      {gameResult && (
        <div className="absolute inset-0 bg-slate-950/90 z-[100] flex items-center justify-center backdrop-blur-xl">
           <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-md scale-110">
              <div className="w-20 h-20 bg-sky-400/20 rounded-full flex items-center justify-center mx-auto mb-6"><FiShield className="text-4xl text-sky-400" /></div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 uppercase italic tracking-tighter">GAME OVER</h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold mb-8 px-4">{gameResult}</p>
              <div className="text-[10px] font-black text-sky-400 uppercase tracking-widest animate-pulse">Redirecting to lobby...</div>
           </div>
        </div>
      )}

      <main className="flex-1 flex flex-col p-2 lg:p-8 relative pb-[80px] lg:pb-8 max-w-full">
        <header className="flex flex-wrap justify-between items-start lg:items-center w-full gap-2 mb-4 lg:mb-6 z-10">
          <div className="flex flex-wrap items-center gap-2 lg:gap-4 w-full sm:w-auto">
            <div className={`px-2 lg:px-4 py-1.5 lg:py-2 rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest shadow-lg whitespace-nowrap ${phase === 'night' ? 'bg-slate-900 text-sky-400' : phase === 'vote' ? 'bg-rose-500 text-white' : 'bg-sky-400 text-slate-900'}`}>
              {phase === 'night' ? '🌙 Night' : phase === 'vote' ? '🗳️ Vote' : '☀️ Day'} {timer}s
            </div>
            
            <div className="flex gap-1 lg:gap-2">
              <div className={`bg-white dark:bg-slate-900 px-2 lg:px-4 py-1.5 lg:py-2 rounded-xl lg:rounded-2xl border ${myInfo?.isDead ? 'border-rose-500 opacity-50' : 'border-slate-100 dark:border-slate-800'} text-[9px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm whitespace-nowrap`}>
                 <FiUser className="text-sky-400" /> <span className="hidden sm:inline">Me:</span> <span className={myInfo?.role === 'mafia' ? 'text-rose-500' : 'text-sky-500'}>{myInfo?.isDead ? 'DEAD' : (myInfo?.role || '...')}</span>
              </div>
              <div className={`bg-white dark:bg-slate-900 px-2 lg:px-4 py-1.5 lg:py-2 rounded-xl lg:rounded-2xl border ${myPetInfo?.isDead ? 'border-rose-500 opacity-50' : 'border-slate-100 dark:border-slate-800'} text-[9px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm whitespace-nowrap`}>
                 <FiZap className="text-amber-400" /> <span className="hidden sm:inline">Pet:</span> <span className={myPetInfo?.role === 'mafia' ? 'text-rose-500' : 'text-sky-500'}>{myPetInfo?.isDead ? 'DEAD' : (myPetInfo?.role || '...')}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 absolute top-2 right-2 lg:static ml-auto">
            <button onClick={toggleTheme} className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 rounded-xl hover:scale-105 transition-all outline-none shadow-md"><FiSun /></button>
            <button onClick={handleExit} className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-rose-400 rounded-xl hover:bg-rose-50 transition-all outline-none shadow-md"><FiLogOut /></button>
          </div>
        </header>

        <div className="flex-1 relative flex items-center justify-center min-h-[300px] mt-2 lg:mt-0 lg:min-h-[480px]">
          <div className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] lg:w-[480px] lg:h-[480px] bg-white dark:bg-slate-900/50 rounded-full border-12 lg:border-20 border-slate-100 dark:border-slate-800 shadow-2xl relative flex items-center justify-center mx-auto">
             <div className="text-center group cursor-default">
                <FiShield className={`text-3xl sm:text-4xl lg:text-6xl mb-2 lg:mb-4 mx-auto transition-all ${phase === 'vote' ? 'text-rose-500 animate-pulse' : 'text-sky-400 opacity-20'}`} />
                <p className="text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-[0.3em] italic">Investigation Table</p>
             </div>

             {players.map((p, idx) => {
               const angle = (idx * (360 / players.length)) * (Math.PI / 180) - (Math.PI / 2); // Start at top (12 o'clock)
               const radius = window.innerWidth < 1024 ? 120 : 280;
               const x = Math.cos(angle) * (window.innerWidth < 1024 ? 120 : radius);
               const y = Math.sin(angle) * (window.innerWidth < 1024 ? 120 : radius);
               const isMe = p.type === 'human' && p.petId === myPet?.id;
               const isMyPet = p.type === 'pet' && p.petId === myPet?.id;
               const bubble = bubbles[p.id];
               const voteCount = Object.values(roomVotes).filter(v => v === p.id).length;

               return (
                 <div key={p.id} style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }} className="absolute left-1/2 top-1/2 flex flex-col items-center transition-all duration-700 z-10 w-max">
                    {bubble && (
                      <div className="absolute -top-16 lg:-top-24 w-max max-w-[140px] lg:max-w-[220px] bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-slate-700 px-3 py-2 lg:px-4 rounded-2xl z-[60] animate-in slide-in-from-bottom-2 duration-300">
                         <p className="text-[9px] lg:text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight">{bubble.text}</p>
                         <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-slate-100 dark:border-slate-700 rotate-45" />
                      </div>
                    )}

                    {phase === 'vote' && voteCount > 0 && (
                        <div className="absolute -top-6 lg:-top-8 bg-rose-500 text-white text-[8px] lg:text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-bounce z-50">
                            {voteCount} VOTES
                        </div>
                    )}

                    <div 
                        onClick={() => handleCastVote(p.id)}
                        className={`w-12 h-12 lg:w-20 lg:h-20 bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl flex items-center justify-center relative overflow-hidden transition-all duration-500 cursor-pointer ${p.isDead ? 'grayscale bg-slate-200 border-slate-300 scale-90 opacity-50' : phase === 'vote' && myVote === p.id ? 'border-4 border-rose-500 ring-8 ring-rose-500/20 scale-105' : isMe || isMyPet ? 'border-4 border-sky-400 ring-4 ring-sky-400/20' : 'border-4 border-white dark:border-slate-900 shadow-2xl'} hover:scale-110`}
                    >
                       {p.type === 'human' ? <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-700/50"><FiUser className="text-xl lg:text-3xl text-slate-400" /></div> : <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-700/50"><PetAvatar id={p.petId} /></div>}
                       {p.isDead && <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center"><span className="text-white font-black text-[7px] lg:text-[10px] uppercase tracking-[.2em] -rotate-12">ELIMINATED</span></div>}
                       {phase === 'vote' && myVote === p.id && <FiCheckCircle className="absolute inset-0 m-auto text-3xl lg:text-4xl text-rose-500 opacity-80" />}
                    </div>
                    <div className={`mt-2 lg:mt-3 px-2 lg:px-3 py-1 flex items-center gap-1 lg:gap-2 backdrop-blur-md rounded-full border transition-all ${p.isDead ? 'bg-slate-200 border-slate-300' : isMe || isMyPet ? 'bg-sky-400/90 border-white/20' : 'bg-slate-900/80 dark:bg-slate-800/80 border-white/10'}`}>
                       <span className={`text-[7px] lg:text-[9px] font-black uppercase italic tracking-tighter ${p.isDead ? 'text-slate-400' : isMe || isMyPet ? 'text-slate-900' : 'text-white'}`}>{p.anonName} {isMe && "(Me)"} {isMyPet && "(Pet)"}</span>
                    </div>
                 </div>
               );
             })}
          </div>
        </div>

        <div className="relative lg:absolute w-[95%] sm:w-full mx-auto max-w-[380px] lg:max-w-[340px] lg:bottom-8 lg:right-8 shrink-0 h-[280px] lg:h-[350px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-3xl lg:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden z-50 mt-auto mb-2 lg:mb-0">
           <div ref={scrollRef} className="flex-1 p-4 lg:p-5 overflow-y-auto space-y-3 custom-scrollbar text-[11px] lg:text-[11px]">
              {messages.map((m, i) => {
                if (m.system) return <div key={i} className="text-center py-2"><span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-widest">{m.text}</span></div>;
                const isMsgMe = m.sender === myInfo?.anonName;
                return (
                  <div key={i} className={`flex flex-col ${isMsgMe ? 'items-end' : 'items-start'}`}>
                     <span className="text-[8px] font-black text-slate-400 uppercase mb-1 px-1">{m.sender}</span>
                     <div className={`px-4 py-2 rounded-2xl shadow-sm ${isMsgMe ? 'bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950 rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-50 dark:border-slate-700 rounded-tl-none'}`}>{m.text}</div>
                  </div>
                );
              })}
           </div>
           <form onSubmit={handleSendMessage} className="p-4 bg-white/50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800 flex gap-2">
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-[11px] focus:outline-none" placeholder={myInfo?.isDead ? "사망자는 관전만 가능합니다." : (phase === 'night' && myInfo?.role !== 'mafia' ? "밤에는 대화할 수 없습니다." : phase === 'vote' ? "투표 중에는 대화할 수 없습니다." : "메시지 입력...")} disabled={myInfo?.isDead || (phase === 'night' && myInfo?.role !== 'mafia') || phase === 'vote'} />
              <button type="submit" className="p-2 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-900 rounded-xl"><FiSend /></button>
           </form>
        </div>
      </main>
    </div>
  );
};

const PetAvatar = ({ id }) => {
  const [pet, setPet] = useState(null);
  useEffect(() => {
    let isMounted = true;
    api.get(`/api/pets/${id}`).then(res => { if (isMounted && res.data.pet) setPet(new Pet(res.data.pet)); }).catch(console.error);
    return () => { isMounted = false; };
  }, [id]);
  if (!pet) return <div className="animate-pulse w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />;
  return pet.draw("w-10 h-10 lg:w-14 lg:h-14");
};

export default MafiaGamePage;
