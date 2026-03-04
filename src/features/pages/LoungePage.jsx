import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// (io 제거됨)
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

  // 방 목록 상태
  const [rooms, setRooms] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  // 테마 초기화 및 유저 정보 불러오기
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

  // 방 목록 가져오기 (REST API)
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

  // 마운트 시 최초 방 목록 조회 및 다른 유저/지연 퇴장 로직 처리에 따른 갱신 이벤트 수신
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // 새 채팅방 만들기 (REST API)
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
        socket.emit("trigger_rooms_update"); // 다른 클라이언트들 방 목록 갱신 트리거
        setShowCreateModal(false);
        setNewRoomName("");
        navigate(`/dating/${response.data.roomId}`);
      }
    } catch (err) {
      console.error("방 생성 실패:", err);
      alert("채팅방을 생성하지 못했습니다.");
    }
  };

  // 기존 채팅방 들어가기 (REST API)
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
        socket.emit("trigger_rooms_update"); // 다른 클라이언트들 방 방 목록 갱신 트리거
        navigate(`/dating/${roomId}`);
      }
    } catch (err) {
      console.error("방 입장 불가:", err);
      alert(err.response?.data?.message || "방 입장에 실패했습니다.");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden">
      {/* 테마 버튼 */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 lg:top-6 lg:right-6 p-2.5 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-100 dark:border-gray-800 text-gray-500 z-[60] shadow-sm active:scale-90 transition-all"
      >
        {isDarkMode ? (
          <FiSun className="text-xs" />
        ) : (
          <FiMoon className="text-xs" />
        )}
      </button>

      {/* 사이드바 */}
      <aside className="fixed bottom-0 w-full h-16 lg:relative lg:w-64 lg:h-full border-t lg:border-t-0 lg:border-r border-gray-100 dark:border-gray-900 bg-white/90 dark:bg-[#0b0f1a]/90 backdrop-blur-xl z-50 flex lg:flex-col justify-between items-center lg:items-stretch">
        <div className="flex lg:flex-col items-center justify-around w-full lg:p-10">
          <h2 className="hidden lg:block text-xs font-black text-gray-900 dark:text-white mb-10 tracking-[0.3em] text-center uppercase">
            Dashboard
          </h2>
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
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-4 p-2 lg:px-5 lg:py-3.5 rounded-xl lg:rounded-2xl transition-all flex-1 lg:flex-none ${item.active ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"}`}
              >
                <item.icon className="text-xl lg:text-lg" />
                <span className="text-[9px] lg:text-[13px] font-bold">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
        </div>
        <div className="p-10 border-t border-gray-50 dark:border-gray-900">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center lg:justify-center gap-3 w-full text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest group"
          >
            <FiLogOut /> Sign Out
          </button>
        </div>
      </aside>

      {/* 라운지 영역 */}
      <main className="flex-1 flex flex-col items-stretch p-4 lg:p-8 gap-4 lg:gap-8 bg-[#fcfcfc] dark:bg-[#0b0f1a] h-[calc(100vh-64px)] lg:h-full overflow-y-auto lg:overflow-hidden custom-scrollbar">
        {/* 라운지 헤더 */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 p-6 lg:p-8 rounded-[2rem] lg:rounded-[3rem] shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic">
              Lounge Area
            </h1>
            <p className="text-xs lg:text-sm font-bold text-gray-400 mt-2">
              다른 펫들과 실시간으로 만나 1:1 대화를 나눠보세요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRooms}
              className="p-3 lg:px-4 lg:py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 text-sm"
            >
              <FiRefreshCw /> <span className="hidden lg:inline">새로고침</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 text-sm"
            >
              <FiPlus /> 방 만들기
            </button>
          </div>
        </div>

        {/* 방 목록 리스트 */}
        <div className="flex-1 bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-[2rem] lg:rounded-[3rem] shadow-sm p-6 overflow-y-auto custom-scrollbar">
          {Object.keys(rooms).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <FiUsers className="text-4xl opacity-50" />
              <p className="text-sm font-bold">
                현재 개설된 방이 없습니다. 새로운 방을 만들어보세요!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(rooms).map(([roomId, room]) => {
                const isFull = room.users.length >= 2;
                return (
                  <div
                    key={roomId}
                    className="flex flex-col justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[1.8rem] border border-gray-100 dark:border-gray-700 transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white break-words">
                          {room.name}
                        </h3>
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full ${isFull ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}
                        >
                          {room.users.length} / 2 명
                        </span>
                      </div>
                      <div className="space-y-2">
                        {room.users.map((u, i) => (
                          <div
                            key={i}
                            className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2"
                          >
                            <FiSmile className="opacity-70" /> {u.petName} 님
                            대기중
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(roomId)}
                      disabled={isFull}
                      className={`mt-6 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isFull ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02] active:scale-95 shadow-sm"}`}
                    >
                      {isFull ? (
                        "입장 불가 (가득 참)"
                      ) : (
                        <>
                          입장하기 <FiArrowRight />
                        </>
                      )}
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
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative animate-fade-in-up">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">
              새로운 채팅방 개설
            </h2>
            <form onSubmit={handleCreateRoom}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">
                  방 제목
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
                  placeholder="예: 즐거운 대화 나눠요!"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim()}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/30"
                >
                  생성 및 입장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoungePage;
