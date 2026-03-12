import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/config";
import {
  FiLogOut,
  FiArrowLeft,
  FiSun,
  FiMoon,
  FiSend,
  FiUser,
  FiSmile,
  FiMessageCircle,
  FiGift,
  FiUserPlus,
  FiHeart, // 교배 아이콘 유지
  FiZap, // develop의 번개 아이콘(필요시 사용)도 임포트 유지
} from "react-icons/fi";
import Pet from "../pets/pet";
import socket from "../../utils/socket";
import GiftModal from "./components/GiftModal";
import FriendRequestModal from "./components/FriendRequestModal";
import BreedingRequestModal from "./components/BreedingRequestModal";

let strictModeLeaveTimer = null;

// 타이핑 효과 컴포넌트
const TypingText = ({ text, speed = 30 }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!text) return;
    let index = 0;
    setDisplayedText("");

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return <span>{displayedText}</span>;
};

const DatingPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [roomUsers, setRoomUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]); // 최신 메시지 내역 추적 (타이머 리셋 방지용)
  const isLeaving = useRef(false); // 퇴장 중인지 확인용
  const [inputValue, setInputValue] = useState("");

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [friendRequestData, setFriendRequestData] = useState(null);
  const [isFriendRequestModalOpen, setIsFriendRequestModalOpen] =
    useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isAutoCommentEnabled, setIsAutoCommentEnabled] = useState(true);

  // 교배 관련 상태 (HB 브랜치 기능 유지)
  const [isBreedingRequestModalOpen, setIsBreedingRequestModalOpen] =
    useState(false);
  const [isSendingBreedingRequest, setIsSendingBreedingRequest] =
    useState(false);
  const [breedingData, setBreedingData] = useState({
    requesterPetName: "",
    receiverPetName: "",
    isSender: false,
  });

  const chatEndRef = useRef(null);
  const roomUsersRef = useRef([]);

  useEffect(() => {
    roomUsersRef.current = roomUsers;
  }, [roomUsers]);

  // messages가 변경될 때마다 ref 업데이트
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const fetchRoomInfo = useCallback(async () => {
    if (!roomId || isLeaving.current) return;
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const usersWithInstances = res.data.room.users.map((u) => ({
          ...u,
          petInstance: u.petData ? new Pet(u.petData) : null,
        }));
        setRoomUsers(usersWithInstances);
        roomUsersRef.current = usersWithInstances;
      }
    } catch (err) {
      if (isLeaving.current) return;
      console.error("[DatingPage] Failed to fetch room info:", err);
      if (err.response?.status === 404) {
        alert("존재하지 않거나 이미 종료된 대화방입니다. 라운지로 이동합니다.");
        navigate("/lounge");
      }
    }
  }, [roomId, navigate]);

  // 1️⃣ 초기 방 정보 및 소켓 연결 로직 (중복 제거 및 통합)
  useEffect(() => {
    if (!petData?.name || !roomId) return;

    fetchRoomInfo();

    const joinRoom = () => {
      socket.emit("join_dating_room", { roomId, petName: petData.name });
    };

    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    return () => {
      socket.off("connect", joinRoom);
    };
  }, [petData, roomId, fetchRoomInfo]);

  // 2️⃣ 테마 및 펫 데이터 로드
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
  }, [navigate]);

  // 3️⃣ AI 자동 답변 로직 (HB 브랜치 유지)
  const silenceTimerRef = useRef(null);
  const isAutoCommenting = useRef(false);

  // 메시지 하단 자동 스크롤
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAutoComment = useCallback(async () => {
    if (isAutoCommenting.current || roomUsers.length < 2 || isLeaving.current)
      return;
    isAutoCommenting.current = true;
    try {
      const token = localStorage.getItem("token");
      const lastTen = messagesRef.current
        .filter((m) => !m.isSystem)
        .slice(-10)
        .map((m) => ({ sender: m.sender, message: m.message }));

      const res = await api.post(
        "/api/pets/auto-comment",
        { lastMessages: lastTen },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.reply && !isLeaving.current) {
        const petReplyMsg = {
          sender: petData.name,
          message: res.data.reply,
          timestamp: new Date(),
          isSystem: false,
          isPetReply: true,
          isNew: true,
        };
        setMessages((prev) => [...prev, petReplyMsg]);
        socket.emit("send_dating_message", {
          roomId,
          message: petReplyMsg.message,
          sender: petReplyMsg.sender,
          isSystem: false,
          isPetReply: true,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      isAutoCommenting.current = false;
      // AI 답변 완료 후 10초 타이머 다시 시작
      resetSilenceTimer();
    }
  }, [roomId, petData?.name, roomUsers.length]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (
      roomUsers.length < 2 ||
      isAutoCommenting.current ||
      !isAutoCommentEnabled ||
      isLeaving.current
    )
      return;
    silenceTimerRef.current = setTimeout(() => handleAutoComment(), 10000);
  }, [roomUsers.length, isAutoCommentEnabled, handleAutoComment]);

  useEffect(() => {
    resetSilenceTimer();
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [resetSilenceTimer]);

  // 4️⃣ 소켓 리스너 (교배/친구 통합)
  useEffect(() => {
    if (!petData?.name) return;

    socket.on("receive_dating_message", (data) => {
      setMessages((prev) => {
        // 중복 시스템 메시지(입장/퇴장) 중복 추가 방지
        const lastMsg = prev[prev.length - 1];
        if (
          lastMsg &&
          lastMsg.isSystem &&
          data.isSystem &&
          lastMsg.message === data.message
        ) {
          return prev;
        }
        return [...prev, { ...data, isNew: data.isPetReply }];
      });

      // 파트너 접속 또는 퇴장 시 방 인원 정보 새로고침
      if (
        data.isSystem &&
        (data.message.includes("방에 들어왔습니다") ||
          data.message.includes("방을 나갔습니다"))
      ) {
        fetchRoomInfo();
      }
    });

    socket.on("receive_friend_request", (data) => {
      if (
        data.receiverPetName?.toLowerCase().trim() ===
        petData.name.toLowerCase().trim()
      ) {
        setFriendRequestData({
          requesterPetName: data.requesterPetName,
          requestId: data.requestId,
        });
        setIsFriendRequestModalOpen(true);
      }
    });

    socket.on("receive_breeding_request", (data) => {
      if (
        data.receiverPetName?.toLowerCase().trim() ===
        petData.name.toLowerCase().trim()
      ) {
        setBreedingData({
          requesterPetName: data.requesterPetName,
          receiverPetName: data.receiverPetName,
          isSender: false,
        });
        setIsBreedingRequestModalOpen(true);
      }
    });

    socket.on("breeding_accepted", (data) => {
      const myNameNorm = petData.name.toLowerCase().trim();
      if (
        data.requesterPetName?.toLowerCase().trim() === myNameNorm ||
        data.receiverPetName?.toLowerCase().trim() === myNameNorm
      ) {
        setIsBreedingRequestModalOpen(false);
        const currentUsers = roomUsersRef.current;
        const requesterPetInfo = currentUsers.find(
          (u) =>
            u.petName?.toLowerCase().trim() ===
            data.requesterPetName?.toLowerCase().trim(),
        )?.petData;
        const receiverPetInfo = currentUsers.find(
          (u) =>
            u.petName?.toLowerCase().trim() ===
            data.receiverPetName?.toLowerCase().trim(),
        )?.petData;
        navigate("/breeding", {
          state: {
            breedingData: { ...data, requesterPetInfo, receiverPetInfo },
          },
        });
      }
    });

    socket.on("breeding_rejected", (data) => {
      if (data.requesterPetName === petData?.name) {
        setIsBreedingRequestModalOpen(false);
        setIsSendingBreedingRequest(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: "시스템",
            message: `💔 ${data.receiverPetName}님이 교배 요청을 거절하셨습니다.`,
            timestamp: new Date(),
            isSystem: true,
          },
        ]);
      }
    });

    return () => {
      socket.off("receive_dating_message");
      socket.off("receive_friend_request");
      socket.off("receive_breeding_request");
      socket.off("breeding_accepted");
      socket.off("breeding_rejected");
    };
  }, [petData, roomId, navigate]);

  // 5️⃣ 핸들러 함수들 (Develop의 예외처리 + HB의 기능)
  const handleGiftSuccess = (
    giftName,
    targetName,
    userMessage,
    aiReply,
    stats,
  ) => {
    const safeAiReply = aiReply || "선물 정말 고마워! 기분이 너무 좋아 ✨";
    if (userMessage) {
      const userMsgObj = {
        sender: petData.name,
        message: userMessage,
        timestamp: new Date(),
        isMine: true,
        isPetReply: false,
        isNew: false,
      };
      setMessages((prev) => [...prev, userMsgObj]);
      socket.emit("send_dating_message", {
        roomId,
        message: userMessage,
        sender: petData.name,
      });
    }

    const statNameMap = {
      healthHp: "체력",
      hunger: "포만감",
      cleanliness: "청결도",
      stress: "스트레스",
      affection: "애정도",
      altruism: "이타심",
      empathy: "공감능력",
      knowledge: "지식",
      logic: "논리력",
      extroversion: "외향성",
      humor: "유머감각",
      openness: "개방성",
      directness: "솔직함",
      curiosity: "호기심",
    };

    let statLog = stats
      ? Object.entries(stats)
          .filter(([_, v]) => v !== 0)
          .map(([k, v]) => `${statNameMap[k] || k}(${v > 0 ? "+" : ""}${v})`)
          .join(", ")
      : "";
    const systemNotice = `🎁 [선물 전달] ${petData.name}님이 ${targetName}에게 '${giftName}' 선물을 주었습니다!${statLog ? ` [효과: ${statLog}]` : ""}`;
    const aiMessageObj = {
      sender: targetName,
      message: safeAiReply,
      timestamp: new Date(),
      isSystem: false,
      isPetReply: true,
      isNew: true,
    };

    setMessages((prev) => [
      ...prev,
      { sender: "시스템", message: systemNotice, isSystem: true },
      aiMessageObj,
    ]);
    socket.emit("send_dating_message", {
      roomId,
      message: systemNotice,
      sender: "시스템",
      isSystem: true,
    });
    socket.emit("send_dating_message", {
      roomId,
      message: safeAiReply,
      sender: targetName,
      isPetReply: true,
    });

    // 선물 전송 성공 시 타이머 리셋
    resetSilenceTimer();
  };

  const handleSendFriendRequest = async () => {
    const otherPetName = roomUsers.find(
      (u) =>
        u.petName?.toLowerCase().trim() !== petData.name.toLowerCase().trim(),
    )?.petName;
    if (!otherPetName || isSendingRequest) return;
    setIsSendingRequest(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/api/friends/request",
        { receiver_pet_name: otherPetName },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status === 201) {
        socket.emit("send_friend_request", {
          roomId,
          requesterPetName: petData.name,
          receiverPetName: otherPetName,
          requestId: res.data.request.id,
        });
        setMessages((prev) => [
          ...prev,
          {
            sender: "시스템",
            message: `💌 ${otherPetName}님에게 친구 요청을 보냈습니다.`,
            isSystem: true,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleSendBreedingRequest = () => {
    const otherPet = roomUsers.find(
      (u) =>
        u.petName?.toLowerCase().trim() !== petData.name.toLowerCase().trim(),
    );
    if (!otherPet?.petName || isSendingBreedingRequest) return;
    setIsSendingBreedingRequest(true);
    socket.emit("send_breeding_request", {
      roomId,
      requesterPetName: petData.name,
      receiverPetName: otherPet.petName,
    });
    setBreedingData({
      requesterPetName: petData.name,
      receiverPetName: otherPet.petName,
      isSender: true,
    });
    setIsBreedingRequestModalOpen(true);
  };

  const handleLeaveRoom = async () => {
    if (!petData || !roomId) {
      navigate("/lounge");
      return;
    }
    isLeaving.current = true; // 퇴장 플래그 설정
    try {
      const token = localStorage.getItem("token");
      await api.post(
        `/api/rooms/${roomId}/leave`,
        { petName: petData.name },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // 퇴장 후 로비의 목록 갱신을 독려하기 위해 소켓 업데이트 이벤트를 백엔드도 보내지만 프론트에서도 즉각 반영하도록 이동
      navigate("/lounge");
    } catch (err) {
      console.error("방 퇴장 오류:", err);
      navigate("/lounge");
    }
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !petData) return;
    const newMsg = {
      sender: petData.name,
      message: inputValue,
      timestamp: new Date(),
      isMine: true,
      isNew: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    socket.emit("send_dating_message", {
      roomId,
      message: inputValue,
      sender: petData.name,
    });
    setInputValue("");
    // 메시지 전송 시 타이머 리셋
    resetSilenceTimer();
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-[#0b0f1a]">
        <div className="w-8 h-8 border-2 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );

  const isWaiting = roomUsers.length < 2;
  const otherPet = roomUsers.find(
    (u) =>
      u.petName?.toLowerCase().trim() !== petData.name.toLowerCase().trim(),
  );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500">
      <header className="h-16 lg:h-20 border-b dark:border-slate-900 flex items-center justify-between px-4 lg:px-8 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLeaveRoom}
            className="p-2 lg:p-3 bg-slate-50 dark:bg-slate-900 rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-black dark:text-white uppercase italic">
              1:1 라이브 채팅
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {isWaiting ? "연결 대기 중..." : "대화 중"} ({roomUsers.length}/2)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSendFriendRequest}
            disabled={isWaiting || isSendingRequest}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] font-black uppercase"
          >
            <FiUserPlus /> 친구
          </button>
          <button
            onClick={() => setIsGiftModalOpen(true)}
            disabled={isWaiting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-[11px] font-black italic"
          >
            <FiGift /> 교감
          </button>

          {/* 교배 버튼 (HB 기능 반영) */}
          <button
            onClick={handleSendBreedingRequest}
            disabled={
              isWaiting ||
              isSendingBreedingRequest ||
              petData?.spouseId ||
              otherPet?.petInstance?.spouseId
            }
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-xl text-[11px] font-black italic border border-rose-100 dark:border-rose-800"
          >
            <FiHeart /> 교배
          </button>

          {/* AI 자동 답변 스위치 */}
          {!isWaiting && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border dark:border-slate-800">
              <span className="text-[9px] font-black dark:text-slate-400 uppercase">
                AI 답변
              </span>
              <button
                onClick={() => setIsAutoCommentEnabled(!isAutoCommentEnabled)}
                className={`relative w-8 h-4.5 rounded-full transition-all ${isAutoCommentEnabled ? "bg-sky-400" : "bg-slate-300"}`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform ${isAutoCommentEnabled ? "translate-x-3.5" : ""}`}
                />
              </button>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900"
          >
            <FiSun />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col items-center bg-slate-50 dark:bg-[#0b0f1a] p-4">
        <div className="w-full max-w-5xl h-full flex flex-col bg-white dark:bg-slate-900/40 border dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden">
          <div
            ref={chatEndRef}
            className="flex-1 overflow-y-auto p-5 lg:p-10 space-y-6 custom-scrollbar"
          >
            {messages.map((msg, idx) => {
              const isFromMe =
                msg.sender?.toLowerCase().trim() ===
                  petData?.name?.toLowerCase().trim() || msg.isMine;
              if (msg.isSystem)
                return (
                  <div key={idx} className="flex justify-center my-4">
                    <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] rounded-full font-black uppercase">
                      {msg.message}
                    </span>
                  </div>
                );

              return (
                <div
                  key={idx}
                  className={`flex ${isFromMe ? "justify-end" : "justify-start"} animate-fade-in-up`}
                >
                  <div
                    className={`max-w-[80%] flex items-start gap-3 ${isFromMe ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl overflow-hidden border ${isFromMe ? "bg-slate-900" : "bg-white dark:bg-slate-800"}`}
                    >
                      {msg.isPetReply ? (
                        isFromMe ? (
                          petData?.draw("scale-125")
                        ) : (
                          otherPet?.petInstance?.draw("scale-125")
                        )
                      ) : (
                        <FiUser className="m-auto h-full" />
                      )}
                    </div>
                    <div
                      className={`flex flex-col ${isFromMe ? "items-end" : ""}`}
                    >
                      <span className="text-[10px] text-slate-400 font-black mb-1">
                        {msg.isPetReply ? `${msg.sender} [AI]` : msg.sender}
                      </span>
                      <div
                        className={`px-4 py-2 rounded-2xl text-sm ${isFromMe ? "bg-slate-900 text-white rounded-tr-none" : "bg-white dark:bg-slate-800 dark:text-white border dark:border-slate-700 rounded-tl-none"}`}
                      >
                        {msg.isPetReply && msg.isNew ? (
                          <TypingText text={msg.message} />
                        ) : (
                          msg.message
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t dark:border-slate-800">
            {isWaiting ? (
              <div className="text-center py-4 text-slate-400 text-[11px] font-black uppercase">
                대화 상대를 기다리는 중입니다...
              </div>
            ) : (
              <form
                onSubmit={handleSendMessage}
                className="relative flex max-w-4xl mx-auto"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  className="w-full bg-slate-100 dark:bg-slate-950 px-6 py-4 rounded-full text-sm font-bold focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-2 p-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full"
                >
                  <FiSend />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* 모달 모음 */}
      <GiftModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        targetPetName={otherPet?.petName}
        onGiftSuccess={handleGiftSuccess}
      />
      <FriendRequestModal
        isOpen={isFriendRequestModalOpen}
        onClose={() => setIsFriendRequestModalOpen(false)}
        requesterPetName={friendRequestData?.requesterPetName}
        requestId={friendRequestData?.requestId}
        onFriendSuccess={(target, acc) =>
          setMessages((prev) => [
            ...prev,
            {
              sender: "시스템",
              message: `🎉 ${target}님과 친구가 되었습니다!`,
              isSystem: true,
            },
          ])
        }
      />
      <BreedingRequestModal
        isOpen={isBreedingRequestModalOpen}
        onClose={() => {
          setIsBreedingRequestModalOpen(false);
          setIsSendingBreedingRequest(false);
        }}
        roomId={roomId}
        requesterPetName={breedingData.requesterPetName}
        receiverPetName={breedingData.receiverPetName}
        isSender={breedingData.isSender}
      />
    </div>
  );
};

export default DatingPage;
