import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiShield, FiSun, FiMoon, FiSend, FiUser, FiZap, FiActivity } from 'react-icons/fi';
import api from '../../utils/config';
import socket from '../../utils/socket';
import Pet from '../pets/pet';
import CommonSide from './CommonSide';

const MafiaPage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [gameState, setGameState] = useState('waiting'); // waiting, role_assign, night, day, vote, end
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [myRole, setMyRole] = useState(null);
  const [isAlive, setIsAlive] = useState(true);
  const [timer, setTimer] = useState(0);

  const scrollRef = useRef(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }

    const fetchPetData = async () => {
      try {
        const response = await api.get('/api/pets/my');
        if (response.data.pet) {
          setPetData(new Pet(response.data.pet));
        } else {
          navigate('/create-pet');
        }
      } catch (error) {
        navigate('/');
      }
    };
    fetchPetData();

    // Socket listeners for Mafia Game
    socket.on('mafia_update_players', (playerList) => {
      setPlayers(playerList);
    });

    socket.on('mafia_game_start', ({ role, members }) => {
      setGameState('night');
      setMyRole(role);
      setMessages(prev => [...prev, { system: true, text: `🛡️ 게임이 시작되었습니다! 당신의 직업은 [${role}]입니다.` }]);
    });

    socket.on('mafia_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('mafia_timer', (time) => {
      setTimer(time);
    });

    socket.on('mafia_phase_change', (phase) => {
      setGameState(phase);
      setMessages(prev => [...prev, { system: true, text: `🔔 [${phase}] 단계로 전환되었습니다.` }]);
    });

    return () => {
      socket.off('mafia_update_players');
      socket.off('mafia_game_start');
      socket.off('mafia_message');
      socket.off('mafia_timer');
      socket.off('mafia_phase_change');
    };
  }, [navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setIsDarkMode(isDark);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    socket.emit('mafia_send_message', { text: inputValue });
    setInputValue('');
  };

  const handleStartGame = () => {
    if (players.length < 2) {
      alert("최소 2명의 유저가 필요합니다!");
      return;
    }
    socket.emit('mafia_request_start');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f1a] transition-colors duration-500 overflow-hidden">
      <CommonSide activeMenu="마피아" />

      <main className="flex-1 flex flex-col p-4 lg:p-8 relative">
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-400 z-50 transition-all"
        >
          {isDarkMode ? <FiSun /> : <FiMoon />}
        </button>

        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 dark:bg-sky-400 rounded-xl flex items-center justify-center text-white dark:text-slate-950 shadow-lg shrink-0">
              <FiShield className="text-xl" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">
                Pet Mafia Game
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {gameState === 'waiting' ? 'Waiting for players...' : `Phase: ${gameState.toUpperCase()}`}
              </p>
            </div>
          </div>

          {gameState !== 'waiting' && (
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
                <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mr-3">Time</span>
                <span className="text-lg font-mono font-black text-sky-400">{timer}s</span>
              </div>
              <div className="px-4 py-2 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-xl shadow-lg border border-slate-800 dark:border-sky-300">
                <span className="text-[10px] font-black uppercase tracking-widest mr-3 opacity-70">Role</span>
                <span className="text-sm font-black italic">{myRole || 'Pending'}</span>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Player Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
            {players.map((player, idx) => (
              <div
                key={idx}
                className={`relative group p-4 rounded-3xl bg-white dark:bg-slate-900/50 border transition-all duration-300 ${
                  player.isDead ? 'opacity-50 grayscale border-slate-100 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800 hover:border-sky-200 dark:hover:border-sky-800 shadow-sm hover:shadow-xl'
                }`}
              >
                <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden">
                  {player.petData ? (
                    <div className="w-3/4 h-3/4">
                       {/* Actual pet draw would go here */}
                       <div className="w-full h-full bg-sky-200/20 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <FiUser className="text-4xl text-slate-300" />
                  )}
                  {player.isDead && (
                    <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="text-2xl font-black text-white uppercase tracking-widest -rotate-12 border-4 border-white px-4 py-1">RIP</span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <span className="block text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter italic">
                    {player.name}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {player.isPet ? 'Pet AI' : 'User'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Panel */}
          <div className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Live Investigation</span>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20">
                <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-red-500 uppercase">Live</span>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.system ? 'items-center' : (msg.sender === petData?.name ? 'items-end' : 'items-start')}`}>
                  {msg.system ? (
                    <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 italic">
                      {msg.text}
                    </div>
                  ) : (
                    <div className={`max-w-[85%] ${msg.sender === petData?.name ? 'items-end' : 'items-start'}`}>
                      <span className="text-[8px] font-black text-slate-400 uppercase mb-1 px-2">{msg.sender}</span>
                      <div className={`px-4 py-2.5 rounded-[1.2rem] text-[13px] shadow-sm ${
                        msg.sender === petData?.name 
                        ? 'bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950 rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-50 dark:border-slate-700 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-50 dark:border-slate-800">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={!isAlive || gameState === 'waiting' || gameState === 'night'}
                  placeholder={!isAlive ? "You are dead..." : (gameState === 'night' ? "Silent night..." : "Discuss who is the mafia...")}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white text-[12px] px-6 py-4 rounded-3xl focus:outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900/50"
                />
                <button
                  type="submit"
                  disabled={!isAlive || !inputValue.trim()}
                  className="absolute right-2 p-3 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  <FiSend />
                </button>
              </form>
            </div>
          </div>
        </div>

        {gameState === 'waiting' && players.length > 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
             <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-white dark:border-slate-800">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-sky-400 rounded-[2rem] flex items-center justify-center text-slate-900 shadow-xl mb-6">
                    <FiShield className="text-4xl" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">Game Lobby</h2>
                  <p className="text-sm text-slate-400 font-bold mb-8">Gather teammates and start the hunt.</p>
                  
                  <div className="w-full space-y-3 mb-10">
                    <div className="flex justify-between items-center px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Players</span>
                      <span className="text-lg font-black text-sky-400 italic">{players.length}/4</span>
                    </div>
                  </div>

                  <button
                    onClick={handleStartGame}
                    className="w-full py-5 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Start Investigation
                  </button>
                  <p className="mt-6 text-[9px] text-slate-300 dark:text-slate-600 font-black uppercase tracking-widest italic">
                    Pets will automatically join to fill the slots.
                  </p>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MafiaPage;
