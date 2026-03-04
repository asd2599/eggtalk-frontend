import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
// io 제거됨
import axios from "axios";
import {
  FiLogOut,
  FiArrowLeft,
  FiSun,
  FiMoon,
  FiSend,
  FiUser,
  FiSmile,
  FiMessageCircle,
} from "react-icons/fi";
import Pet from "../pets/pet";
import socket from "../../utils/socket";

// React StrictMode 더블 렌더링에 의한 강제 퇴장(언마운트) 버그 회피용 전역 타이머
let strictModeLeaveTimer = null;

const DatingPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [roomUsers, setRoomUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const chatEndRef = useRef(null);

  // 1초마다 최신 방정보 불러오기 (폴링)
  // ※ 웹소켓으로도 갱신할 수 있지만, DB 동기화를 위해 짧은 주기로 폴링
  useEffect(() => {
    let intervalId;
    let hasAlerted = false; // 무한 얼럿 방지

    const fetchRoomInfo = async () => {
      // 이미 튕겼으면 API 더이상 안 부름
      if (hasAlerted) return;

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(
          `http://localhost:8000/api/rooms/${roomId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.data.success) {
          setRoomUsers(res.data.room.users);
        }
      } catch (err) {
        if (!hasAlerted) {
          hasAlerted = true;
          if (intervalId) clearInterval(intervalId);
          console.error("방 정보 로드 오류:", err);
          alert("채팅방 정보를 불러올 수 없거나 삭제되었습니다.");
          navigate("/lounge");
        }
      }
    };

    if (petData && roomId) {
      // 내 펫 정보를 가져온 뒤부터 인터벌 실행
      fetchRoomInfo();
      intervalId = setInterval(fetchRoomInfo, 1000);

      // 소켓 입장 처리 (채팅 릴레이용)
      socket.emit("join_dating_room", { roomId, petName: petData.name });
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [petData, roomId, navigate]);

  // 초기 로드: 내 정보 조회 및 테마 세팅
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

  // 실시간 Socket 이벤트 등록 (메시지 수신) 및 퇴장 관리
  useEffect(() => {
    socket.on("receive_dating_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    // 컴포넌트 마운트 시, 이전에 돌아가고 있던 퇴장 타이머(StrictMode)가 있다면 즉시 파기 (방 폭파 취소)
    if (strictModeLeaveTimer) {
      clearTimeout(strictModeLeaveTimer);
      strictModeLeaveTimer = null;
    }

    // 컴포넌트 언마운트 시 방 나가기 API 호출 및 리스너 해제
    return () => {
      socket.off("receive_dating_message");

      // 즉시 퇴장 API를 쏘지 않고 0.8초의 렌더링 유예를 가짐
      strictModeLeaveTimer = setTimeout(async () => {
        if (!petData) return;

        // 실제로 유예기간을 견디고(진짜 퇴장) 동작할 때 상대방에게 알림 발송
        socket.emit("leave_dating_room", { roomId, petName: petData.name });

        try {
          const token = localStorage.getItem("token");
          await axios.post(
            `http://localhost:8000/api/rooms/${roomId}/leave`,
            { petName: petData.name },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          socket.emit("trigger_rooms_update"); // 로비에 있는 사람들에게 목록 갱신 트리거
        } catch (err) {
          console.error("퇴장 오류:", err);
        } finally {
          strictModeLeaveTimer = null;
        }
      }, 800);
    };
  }, [roomId, petData]);

  // 자동 스크롤
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !petData) return;

    // 로컬 화면에 먼저 메시지 추가
    const newMsg = {
      sender: petData.name,
      message: inputValue,
      timestamp: new Date(),
      isMine: true,
    };
    setMessages((prev) => [...prev, newMsg]);

    socket.emit("send_dating_message", {
      roomId,
      message: inputValue,
      sender: petData.name,
    });

    setInputValue("");
  };

  const currentRoomName =
    roomUsers.length > 0 ? "1:1 라이브 채팅" : "연결 대기 중...";
  const isWaiting = roomUsers.length < 2;

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans">
      {/* 헤더 영역 */}
      <header className="h-16 lg:h-20 border-b border-gray-100 dark:border-gray-900 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/lounge")}
            className="p-2 lg:p-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <FiArrowLeft className="text-sm lg:text-base" />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              {currentRoomName}
              {!isWaiting && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">
              {isWaiting
                ? "상대방을 기다리고 있습니다..."
                : "상대방과 연결되었습니다!"}
              ({roomUsers.length}/2)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 hover:bg-gray-200 transition-all"
          >
            {isDarkMode ? (
              <FiSun className="text-xs" />
            ) : (
              <FiMoon className="text-xs" />
            )}
          </button>
        </div>
      </header>

      {/* 메인 채팅 영역 */}
      <main className="flex-1 overflow-hidden relative flex flex-col items-center bg-[#fcfcfc] dark:bg-[#0b0f1a]/80 py-4 lg:py-8 px-2 lg:px-4">
        {/* 채팅창 컨테이너 */}
        <div className="w-full max-w-4xl h-full flex flex-col bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-[2rem] lg:rounded-[3rem] shadow-sm overflow-hidden relative">
          <div
            ref={chatEndRef}
            className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 lg:space-y-6 scroll-smooth custom-scrollbar"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FiMessageCircle className="text-4xl mb-4 opacity-50" />
                <p className="font-bold text-sm">대화를 시작해보세요.</p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isMine = msg.sender === petData?.name || msg.isMine;

              if (msg.isSystem) {
                return (
                  <div
                    key={idx}
                    className="flex justify-center my-4 animate-fade-in-up"
                  >
                    <span className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] lg:text-xs rounded-full font-bold">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} animate-fade-in-up`}
                >
                  <div
                    className={`max-w-[85%] lg:max-w-[70%] flex items-end gap-2 lg:gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* 아바타 아이콘 */}
                    <div
                      className={`w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isMine ? "bg-indigo-600 shadow-md" : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"}`}
                    >
                      {isMine ? (
                        <FiUser className="text-white text-[10px] lg:text-xs" />
                      ) : (
                        <FiSmile className="text-gray-400 text-[10px] lg:text-xs" />
                      )}
                    </div>

                    {/* 말풍선 본문 */}
                    <div className="flex flex-col gap-1">
                      <span
                        className={`text-[10px] font-bold px-1 ${isMine ? "text-right text-gray-400" : "text-left text-gray-500 dark:text-gray-400"}`}
                      >
                        {msg.sender}
                      </span>
                      <div
                        className={`p-3 lg:p-4 rounded-[1.2rem] lg:rounded-[1.5rem] text-[12px] lg:text-[13px] leading-relaxed shadow-sm break-words ${isMine ? "bg-indigo-600 text-white rounded-br-none" : "bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none"}`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단 입력 영역 */}
          <div className="p-4 lg:p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-50 dark:border-gray-800 flex-shrink-0">
            {isWaiting ? (
              <div className="w-full text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-[1.5rem] border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-sm font-bold">
                대화 상대를 기다리는 중이어서 메시지를 보낼 수 없습니다.
              </div>
            ) : (
              <form
                onSubmit={handleSendMessage}
                className="relative flex items-center w-full group"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-[11px] lg:text-[13px] px-5 lg:px-7 py-3.5 lg:py-4 rounded-xl lg:rounded-[1.8rem] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="absolute right-2 lg:right-2.5 p-2.5 lg:p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg lg:rounded-[1.4rem] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:active:scale-100"
                >
                  <FiSend className="text-xs lg:text-sm" />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DatingPage;
