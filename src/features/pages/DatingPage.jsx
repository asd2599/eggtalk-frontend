import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
// io 제거됨
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
} from "react-icons/fi";
import Pet from "../pets/pet";
import socket from "../../utils/socket";
import GiftModal from "./components/GiftModal";
import FriendRequestModal from "./components/FriendRequestModal";
import { FiUserPlus } from "react-icons/fi";

// React StrictMode 더블 렌더링에 의한 강제 퇴장(언마운트) 버그 회피용 전역 타이머
let strictModeLeaveTimer = null;

const STAT_MAPPING = [
  {
    key: "healthHp",
    label: "체력",
    color: "bg-rose-500",
    text: "text-rose-500",
  },
  {
    key: "hunger",
    label: "포만감",
    color: "bg-emerald-500",
    text: "text-emerald-500",
  },
  {
    key: "cleanliness",
    label: "청결도",
    color: "bg-sky-500",
    text: "text-sky-500",
  },
  {
    key: "stress",
    label: "스트레스",
    color: "bg-purple-500",
    text: "text-purple-500",
  },
  {
    key: "affection",
    label: "애정도",
    color: "bg-pink-400",
    text: "text-pink-400",
  },
  {
    key: "altruism",
    label: "이타심",
    color: "bg-teal-400",
    text: "text-teal-400",
  },
  {
    key: "empathy",
    label: "공감력",
    color: "bg-orange-400",
    text: "text-orange-400",
  },
  {
    key: "knowledge",
    label: "지식",
    color: "bg-blue-400",
    text: "text-blue-400",
  },
  {
    key: "logic",
    label: "논리력",
    color: "bg-indigo-400",
    text: "text-indigo-400",
  },
  {
    key: "extroversion",
    label: "외향성",
    color: "bg-yellow-500",
    text: "text-yellow-500",
  },
  {
    key: "humor",
    label: "유머감각",
    color: "bg-amber-400",
    text: "text-amber-400",
  },
  {
    key: "openness",
    label: "개방성",
    color: "bg-cyan-500",
    text: "text-cyan-500",
  },
  {
    key: "directness",
    label: "솔직함",
    color: "bg-red-400",
    text: "text-red-400",
  },
  {
    key: "curiosity",
    label: "호기심",
    color: "bg-lime-500",
    text: "text-lime-500",
  },
];

const DatingPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [roomUsers, setRoomUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  // 아바타 클릭 시 스탯 팝오버 토글 상태
  const [showMyStats, setShowMyStats] = useState(false);
  const [showOtherStats, setShowOtherStats] = useState(false);

  // 선물 모달(GiftModal) 상태
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  // 친구 요청 모달 상태 (수신자용)
  const [friendRequestData, setFriendRequestData] = useState(null); // { requesterPetName, requestId }
  const [isFriendRequestModalOpen, setIsFriendRequestModalOpen] =
    useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isAutoCommentEnabled, setIsAutoCommentEnabled] = useState(true); // 자동 대화 활성화 상태

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

        const res = await api.get(`/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          // 서버에서 받은 raw petData를 Pet 클래스 인스턴스로 감싸서 렌더링에 사용할 수 있게 함
          const usersWithPetInstances = res.data.room.users.map((u) => ({
            ...u,
            petInstance: u.petData ? new Pet(u.petData) : null,
          }));
          setRoomUsers(usersWithPetInstances);
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

        const response = await api.get("/api/pets/my", {
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

  // --- 자동 대화 (Silence Breaker) 로직 개선 --- //
  const silenceTimerRef = useRef(null);
  const isAutoCommenting = useRef(false);

  const resetSilenceTimer = useCallback(() => {
    // 1. 기존 타이머는 무조건 즉시 제거 (가장 중요)
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // 대기 중이거나(상대 없음), 이미 AI가 답변을 생성 중이거나, 기능이 비활성화된 경우 새로 예약하지 않음
    if (
      roomUsers.length < 2 ||
      isAutoCommenting.current ||
      !isAutoCommentEnabled
    )
      return;

    // 2. 10초 뒤 실행 예약
    silenceTimerRef.current = setTimeout(() => {
      handleAutoComment();
    }, 10000);
  }, [roomUsers.length, messages, isAutoCommentEnabled]); // isAutoCommentEnabled 의존성 추가

  const handleAutoComment = async () => {
    // 1. 기본 상태 체크 및 대기 중인 상대 확인
    if (isAutoCommenting.current || roomUsers.length < 2) return;

    // 2. 유저별 발화 권한 체크 (마지막 메시지가 내가 보낸 것이라면 나는 IDLE이 아님)
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      // 내가 보낸 메시지(isMine)이거나 내 펫의 이름으로 발화된 것이라면 스킵
      if (lastMsg.sender === petData?.name || lastMsg.isMine) {
        return;
      }
    }

    isAutoCommenting.current = true;

    try {
      const token = localStorage.getItem("token");
      const lastTen = messages
        .filter((m) => !m.isSystem)
        .slice(-10)
        .map((m) => ({
          sender: m.sender,
          message: m.message,
        }));

      const res = await api.post(
        "/api/pets/auto-comment",
        { lastMessages: lastTen },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.reply) {
        const petReplyMsg = {
          sender: petData.name,
          message: res.data.reply,
          timestamp: new Date(),
          isSystem: false,
          isPetReply: true,
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
      console.error("자동 멘트 생성 실패:", err);
    } finally {
      isAutoCommenting.current = false;
      resetSilenceTimer(); // 멘트 성공/실패 후 다시 타이머 대기 시작
    }
  };

  // 메시지, 입력값, 인원수 변경 시 마다 타이머 리셋
  useEffect(() => {
    resetSilenceTimer();
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [messages, inputValue, roomUsers.length, resetSilenceTimer]);
  // ---------------------------------------- //

  // 실시간 Socket 이벤트 등록 (메시지 수신) 및 퇴장 관리
  useEffect(() => {
    socket.on("receive_dating_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    // 상대방이 나에게 보낸 친구 요청 수신
    socket.on("receive_friend_request", (data) => {
      if (data.receiverPetName === petData?.name) {
        setFriendRequestData({
          requesterPetName: data.requesterPetName,
          requestId: data.requestId,
        });
        setIsFriendRequestModalOpen(true);
      }
    });

    // 컴포넌트 마운트 시, 이전에 돌아가고 있던 퇴장 타이머(StrictMode)가 있다면 즉시 파기 (방 폭파 취소)
    if (strictModeLeaveTimer) {
      clearTimeout(strictModeLeaveTimer);
      strictModeLeaveTimer = null;
    }

    // 컴포넌트 언마운트 시 방 나가기 API 호출 및 리스너 해제
    return () => {
      socket.off("receive_dating_message");
      socket.off("receive_friend_request");

      // 즉시 퇴장 API를 쏘지 않고 0.8초의 렌더링 유예를 가짐
      strictModeLeaveTimer = setTimeout(async () => {
        if (!petData) return;

        // 실제로 유예기간을 견디고(진짜 퇴장) 동작할 때 상대방에게 알림 발송
        socket.emit("leave_dating_room", { roomId, petName: petData.name });

        try {
          const token = localStorage.getItem("token");
          await api.post(
            `/api/rooms/${roomId}/leave`,
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

  // 상대방 이름 추출
  const otherPetObj = roomUsers.find((user) => user.petName !== petData?.name);
  const otherPetName = otherPetObj ? otherPetObj.petName : null;
  const otherPetInstance = otherPetObj ? otherPetObj.petInstance : null;

  // 선물하기 성공 시 콜백 (알림 브로드캐스트)
  const handleGiftSuccess = (
    giftName,
    targetName,
    userMessage,
    aiReply,
    stats,
  ) => {
    // 1. 유저가 메시지를 입력했다면, 유저 발화로 먼저 처리
    if (userMessage) {
      const userMsgObj = {
        sender: petData.name,
        message: userMessage,
        timestamp: new Date(),
        isMine: true,
        isPetReply: false,
      };

      setMessages((prev) => [...prev, userMsgObj]);
      socket.emit("send_dating_message", {
        roomId,
        message: userMsgObj.message,
        sender: userMsgObj.sender,
        isMine: false, // 상대방에게는 내가 보낸 것이 아님
        isPetReply: false,
      });
    }

    // 2. 스탯 상승 로그 한글 변환 매핑
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

    let statLog = "";
    if (stats && typeof stats === "object") {
      statLog = Object.entries(stats)
        .filter(([key, val]) => val > 0 || val < 0)
        .map(
          ([key, val]) =>
            `${statNameMap[key] || key}(${val > 0 ? "+" : ""}${val})`,
        )
        .join(", ");
    }

    const statNoticeMsg = statLog ? ` [효과: ${statLog}]` : "";
    const systemNotice = `🎁 [선물 전달] ${petData.name}님이 ${targetName}에게 '${giftName}' 선물을(를) 주었습니다!${statNoticeMsg}`;

    // 3. AI(펫)가 대답하는 메시지 객체 구성
    const aiMessageObj = {
      sender: targetName, // 발화자는 선물을 받은 상대 펫의 이름
      message: aiReply, // 펫의 순수 답변만 포함
      timestamp: new Date(),
      isSystem: false,
      isPetReply: true, // 펫(AI)의 대답임을 구별하는 플래그
    };

    setMessages((prev) => [
      ...prev,
      {
        sender: "시스템",
        message: systemNotice,
        timestamp: new Date(),
        isSystem: true,
      },
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
      message: aiMessageObj.message,
      sender: aiMessageObj.sender,
      isSystem: false,
      isPetReply: true,
    });
  };

  // ---------------------------------------------------------------- //
  // 내 쪽에서 [친구 추가] 버튼 클릭 시 동작
  const handleSendFriendRequest = async () => {
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
        // 성공적으로 DB에 PENDING 삽입 시, 대상자에게 실시간 알림 소켓 쏘기
        socket.emit("send_friend_request", {
          roomId,
          requesterPetName: petData.name,
          receiverPetName: otherPetName,
          requestId: res.data.request.id,
        });

        // 내 채팅창에 시스템 알림 표시
        const systemMsg = `💌 ${otherPetName}님에게 친구 요청을 보냈습니다.`;
        setMessages((prev) => [
          ...prev,
          {
            sender: "시스템",
            message: systemMsg,
            timestamp: new Date(),
            isSystem: true,
          },
        ]);
        alert("친구 요청을 성공적으로 보냈습니다!");
      }
    } catch (err) {
      console.error("친구 요청 발송 에러:", err);
      const errMsg = err.response?.data?.message || err.message;
      alert(`친구 요청 실패: ${errMsg}`);
    } finally {
      setIsSendingRequest(false);
    }
  };

  // 상대방이 보낸 친구 요청을 내가 수락/거절 했을 때 동작
  const handleFriendSuccess = (targetName, isAccepted) => {
    const actionText = isAccepted ? "수락" : "거절";
    const systemNotice = `🎉 ${petData.name}님이 ${targetName}님의 친구 요청을 ${actionText}했습니다!`;

    // 로컬과 상대방 채팅창에 브로드캐스트
    setMessages((prev) => [
      ...prev,
      {
        sender: "시스템",
        message: systemNotice,
        timestamp: new Date(),
        isSystem: true,
      },
    ]);
    socket.emit("send_dating_message", {
      roomId,
      message: systemNotice,
      sender: "시스템",
      isSystem: true,
    });
  };
  // ---------------------------------------------------------------- //

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

        {/* 중앙: 펫 상대 상태 HUD (All Stats) */}
        {!isWaiting && otherPetInstance && petData && (
          <div className="hidden lg:flex absolute top-5 left-1/2 -translate-x-1/2 items-start gap-4 z-[60]">
            {/* 내 펫 전체 상태창 요소 */}
            <div
              className={`w-52 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-xl p-3 transition-all duration-300 mt-2 ${
                showMyStats
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-4 pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between mb-2 border-b border-indigo-50 dark:border-indigo-900/50 pb-2">
                <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                  Me
                </span>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                  LV.{petData.level}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {STAT_MAPPING.map((stat) => (
                  <div key={stat.key} className="w-full">
                    <div className="flex justify-between text-[8px] font-bold text-gray-500 mb-[2px]">
                      <span>{stat.label}</span>
                      <span className={stat.text}>
                        {petData[stat.key] || 0}%
                      </span>
                    </div>
                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stat.color} transition-all duration-500`}
                        style={{ width: `${petData[stat.key] || 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 정중앙 아바타 및 VS 표기 */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-4">
                {/* 내 펫 아바타 버튼 */}
                <button
                  onClick={() => setShowMyStats(!showMyStats)}
                  className={`relative w-14 h-14 rounded-full border-2 shadow-sm flex items-center justify-center p-1 transition-all hover:scale-105 active:scale-95 ${
                    showMyStats
                      ? "bg-indigo-100 border-indigo-400 dark:bg-indigo-900/60 dark:border-indigo-500"
                      : "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800"
                  }`}
                  title="능력치 보기"
                >
                  <div className="w-full h-full overflow-hidden rounded-full relative pointer-events-none">
                    {petData.draw("w-full h-full scale-[1.3] translateY-[10%]")}
                  </div>
                </button>
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shadow-inner z-10 animate-bounce-slight mt-2 pointer-events-none">
                  <span className="text-[10px] font-black text-indigo-400 italic">
                    VS
                  </span>
                </div>
                {/* 상대 펫 아바타 버튼 */}
                <button
                  onClick={() => setShowOtherStats(!showOtherStats)}
                  className={`relative w-14 h-14 rounded-full border-2 shadow-sm flex items-center justify-center p-1 transition-all hover:scale-105 active:scale-95 ${
                    showOtherStats
                      ? "bg-pink-100 border-pink-400 dark:bg-pink-900/60 dark:border-pink-500"
                      : "bg-pink-50 border-pink-200 dark:bg-pink-900/40 dark:border-pink-800"
                  }`}
                  title="능력치 보기"
                >
                  <div className="w-full h-full overflow-hidden rounded-full relative pointer-events-none">
                    {otherPetInstance.draw(
                      "w-full h-full scale-[1.3] translateY-[10%]",
                    )}
                  </div>
                </button>
              </div>
              <span className="text-[9px] font-bold text-gray-400 mt-2 pointer-events-none animate-pulse">
                👆 아바타를 클릭해 능력치를 확인하세요
              </span>
            </div>

            {/* 상대 펫 전체 상태창 요소 */}
            <div
              className={`w-52 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl border border-pink-100 dark:border-pink-900/50 shadow-xl p-3 transition-all duration-300 mt-2 ${
                showOtherStats
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-4 pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between mb-2 border-b border-pink-50 dark:border-pink-900/50 pb-2">
                <span className="text-[10px] font-black text-pink-500 bg-pink-50 dark:bg-pink-900/30 px-2 py-0.5 rounded-full flex-shrink-0 mr-1">
                  LV.{otherPetInstance.level}
                </span>
                <span className="text-xs font-black text-gray-800 dark:text-gray-200 truncate text-right">
                  {otherPetName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {STAT_MAPPING.map((stat) => (
                  <div key={stat.key} className="w-full">
                    <div className="flex justify-between text-[8px] font-bold text-gray-500 mb-[2px]">
                      <span>{stat.label}</span>
                      <span className={stat.text}>
                        {otherPetInstance[stat.key] || 0}%
                      </span>
                    </div>
                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stat.color} transition-all duration-500`}
                        style={{ width: `${otherPetInstance[stat.key] || 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 lg:gap-4">
          <button
            onClick={handleSendFriendRequest}
            disabled={isWaiting || !otherPetName || isSendingRequest}
            className="flex items-center gap-1.5 px-3 lg:px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-2xl text-[11px] lg:text-xs font-black shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <FiUserPlus className="text-sm" />
            <span className="mb-0.5">친구 추가</span>
          </button>

          <button
            onClick={() => setIsGiftModalOpen(true)}
            disabled={isWaiting || !otherPetName}
            className="flex items-center gap-1.5 px-3 lg:px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl text-[11px] lg:text-xs font-black shadow-lg shadow-pink-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <FiGift className="text-sm" />
            <span className="mb-0.5">선물하기</span>
          </button>

          {/* 펫 자동 대화 토글 버튼 (데스크톱/모바일 공용 UI) */}
          {!isWaiting && (
            <div className="flex items-center gap-2 bg-gray-50/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all hover:shadow-sm">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  isAutoCommentEnabled
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                <FiMessageCircle className="text-[10px]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter leading-none mb-0.5">
                  AI Auto Chat
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-bold ${
                      isAutoCommentEnabled
                        ? "text-emerald-600"
                        : "text-gray-500"
                    }`}
                  >
                    {isAutoCommentEnabled ? "ON" : "OFF"}
                  </span>
                  <button
                    onClick={() =>
                      setIsAutoCommentEnabled(!isAutoCommentEnabled)
                    }
                    className={`relative w-7 h-4 rounded-full transition-colors focus:outline-none ${
                      isAutoCommentEnabled
                        ? "bg-emerald-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform transform ${
                        isAutoCommentEnabled ? "translate-x-3" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

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
              // 1. 발화 위치 결정 (오른쪽: 나 또는 내 펫 / 왼쪽: 상대 유저 또는 상대 펫)
              const isFromMe = msg.sender === petData?.name || msg.isMine;
              // 2. 펫(AI)의 대답인지 유저의 채팅인지 구분
              const isPetReply = msg.isPetReply;

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
                  className={`flex ${isFromMe ? "justify-end" : "justify-start"} animate-fade-in-up`}
                >
                  <div
                    className={`max-w-[85%] lg:max-w-[70%] flex items-end gap-2 lg:gap-3 ${isFromMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* 프로필 이미지 아이콘 부분 */}
                    <div
                      className={`w-9 h-9 lg:w-10 lg:h-10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm border ${
                        isFromMe
                          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800"
                          : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                      }`}
                    >
                      {isPetReply ? (
                        // 펫의 대답일 때: 펫 아바타 출력
                        isFromMe ? (
                          petData?.draw("w-full h-full scale-125")
                        ) : otherPetInstance ? (
                          otherPetInstance.draw("w-full h-full scale-125")
                        ) : (
                          <FiSmile className="text-gray-400 text-lg" />
                        )
                      ) : (
                        // 유저의 채팅일 때: 유저 아이콘 출력
                        <div
                          className={`${isFromMe ? "bg-indigo-600" : "bg-pink-600"} w-full h-full flex items-center justify-center`}
                        >
                          <FiUser className="text-white text-lg" />
                        </div>
                      )}
                    </div>

                    {/* 말풍선 본문 */}
                    <div className="flex flex-col gap-1">
                      <span
                        className={`text-[10px] font-bold px-1 ${isFromMe ? "text-right text-gray-400" : "text-left text-gray-500 dark:text-gray-400"}`}
                      >
                        {isPetReply
                          ? `${msg.sender} (펫 AI)`
                          : isFromMe
                            ? "나 (유저)"
                            : `상대방 (${msg.sender})`}
                      </span>
                      <div
                        className={`p-3 lg:p-4 rounded-[1.2rem] lg:rounded-[1.5rem] text-[12px] lg:text-[13px] leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                          isFromMe
                            ? isPetReply
                              ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-br-none"
                              : "bg-indigo-600 text-white rounded-br-none"
                            : isPetReply
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800 rounded-bl-none font-bold"
                              : "bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none"
                        }`}
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

      {/* 모달 렌더링 영역 */}
      <GiftModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        targetPetName={otherPetName}
        onGiftSuccess={handleGiftSuccess}
      />
      <FriendRequestModal
        isOpen={isFriendRequestModalOpen}
        onClose={() => setIsFriendRequestModalOpen(false)}
        requesterPetName={friendRequestData?.requesterPetName}
        requestId={friendRequestData?.requestId}
        onFriendSuccess={handleFriendSuccess}
      />
    </div>
  );
};

export default DatingPage;
