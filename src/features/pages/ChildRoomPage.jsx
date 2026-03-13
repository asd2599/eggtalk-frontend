import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiHeart,
  FiSettings,
  FiStar,
  FiCoffee,
  FiSmile,
  FiEdit3,
  FiClock,
  FiTrash2,
  FiZap,
  FiSun,   // ✅ 아이콘 추가
  FiMoon,  // ✅ 아이콘 추가
} from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

const ChildRoomPage = () => {
  const navigate = useNavigate();
  const [childPet, setChildPet] = useState(null);
  const [myPet, setMyPet] = useState(null);
  const [spousePet, setSpousePet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSpouseOnline, setIsSpouseOnline] = useState(false);
  const [isSpouseInRoom, setIsSpouseInRoom] = useState(false);
  const [hatchProgress, setHatchProgress] = useState(0);
  const [isHatchGameActive, setIsHatchGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  // 대기 및 제안 모달용 State 추가
  const [waitingAction, setWaitingAction] = useState(null); // 내가 제안 후 대기 중인 액션 (FEED, CLEAN, PLAY)
  const [proposedAction, setProposedAction] = useState(null); // 배우자가 제안한 액션 객체 { actionType, requesterName }

  const timerRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const hasAlerted = useRef(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, []);

  // ✅ 다크모드 토글 함수 추가
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  useEffect(() => {
    const fetchChildPet = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }

        const response = await api.get("/api/pets/child", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 200 && response.data.childPet) {
          setChildPet(new Pet(response.data.childPet));
          setMyPet(new Pet(response.data.myPet));
          if (response.data.spousePet) {
            setSpousePet(new Pet(response.data.spousePet));
          }
        } else {
          if (!hasAlerted.current) {
            hasAlerted.current = true;
            alert("교배를 통해 얻은 자식 펫이 없습니다.");
            navigate("/main");
          }
        }
      } catch (error) {
        if (error.response?.status === 404) {
          if (!hasAlerted.current) {
            hasAlerted.current = true;
            alert(
              "교배를 통해 얻은 자식 펫이 없습니다. 교배를 먼저 진행해보세요.",
            );
            navigate("/main");
          }
        } else {
          console.error("자식 펫 로딩 실패:", error);
          if (!hasAlerted.current) {
            hasAlerted.current = true;
            alert("자식 펫 정보를 가져오는데 실패했습니다.");
            navigate("/main");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChildPet();
  }, [navigate]);

  useEffect(() => {
    if (!childPet || !myPet || !spousePet) return;

    socket.emit("join_child_room", {
      childId: childPet.id,
      petId: myPet.id,
      petName: myPet.name,
    });

    socket.emit("get_online_users", (users) => {
      setIsSpouseOnline(users.includes(spousePet.name));
    });

    const handleOnlineUsers = (users) => {
      setIsSpouseOnline(users.includes(spousePet.name));
    };

    const handleNewLogin = (petName) => {
      if (petName === spousePet.name) setIsSpouseOnline(true);
    };

    const handleSpouseEntered = (petName) => {
      if (petName === spousePet.name) setIsSpouseInRoom(true);
    };

    const handleSpouseLeft = (petName) => {
      if (petName === spousePet.name) setIsSpouseInRoom(false);
    };

    const handleFarewellProposed = () => {
      if (
        window.confirm(
          `배우자가 자식 펫과의 작별(파양)을 원합니다.\n동의하시면 자식 펫이 삭제되며 부모 펫의 관계가 초기화됩니다.\n동의하시겠습니까?`,
        )
      ) {
        socket.emit("child_pet_farewell_response", {
          childId: childPet.id,
          approved: true,
        });
      } else {
        socket.emit("child_pet_farewell_response", {
          childId: childPet.id,
          approved: false,
        });
      }
    };

    const handleFarewellApproved = async () => {
      try {
        const token = localStorage.getItem("token");
        await api.delete(`/api/pets/abandon/${childPet.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(
          "작별이 완료되었습니다. 아이의 흔적을 정리하고 메인으로 돌아갑니다. ✨",
        );
      } catch (error) {
        console.error("Farewell API failed:", error);
      } finally {
        navigate("/main");
      }
    };

    const handleFarewellRejected = () => {
      alert("배우자가 작별에 동의하지 않았습니다. 😿");
    };

    const handleActionProposed = ({ actionType, requesterName }) => {
      // confirm 창 대신 State 업데이트로 UI에 모달 띄우기 유도
      setProposedAction({ actionType, requesterName });
    };

    const handleActionSync = ({ actionType }) => {
      // 두 사람이 모두 동의하여 게임 페이지로 넘어가기 전 모달 닫기
      setWaitingAction(null);
      setProposedAction(null);

      const pathMap = {
        FEED: "/child-room/feed",
        CLEAN: "/child-room/clean",
        PLAY: "/child-room/play",
      };
      navigate(pathMap[actionType]);
    };

    const handleActionRejected = ({ actionType }) => {
      // 제안 거절됨 - 대기 모달 닫기
      setWaitingAction(null);

      const actionKr =
        actionType === "FEED"
          ? "창의력 이야기"
          : actionType === "CLEAN"
            ? "스무고개 퀴즈"
            : "역할극 게임";
      // TODO: 나중에 이 alert도 커스텀 모달로 대체할 수 있으나, 일단 모달이 닫히면서 자연스럽게 알 수 있도록 유지
      alert(`배우자가 [${actionKr}] 활동에 동의하지 않았습니다. 😿`);
    };

    const handleChildRoomStatus = ({
      isSpouseInRoom,
      onlineUsers,
      hatchProgress,
    }) => {
      setIsSpouseInRoom(isSpouseInRoom);
      if (hatchProgress !== undefined) setHatchProgress(hatchProgress);
      if (onlineUsers && spousePet) {
        setIsSpouseOnline(onlineUsers.includes(spousePet.name));
      }
    };

    const handleHatchProgress = ({ progress }) => {
      setHatchProgress(progress);
      if (progress >= 100) {
        clearInterval(timerRef.current);
        handleHatchSuccess();
      }
    };

    const handleHatchStarted = ({ duration }) => {
      setHatchProgress(0);
      setTimeLeft(duration);
      setIsHatchGameActive(true);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleHatchFailure();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleRenameProposed = ({ newName, requesterName }) => {
      if (
        window.confirm(
          `${requesterName}님이 펫의 이름을 '${newName}'(으)로 변경하자고 합니다. 동의하시나요?`,
        )
      ) {
        socket.emit("child_pet_rename_response", {
          childId: childPet.id,
          approved: true,
          newName,
        });
      } else {
        socket.emit("child_pet_rename_response", {
          childId: childPet.id,
          approved: false,
        });
      }
    };

    const handleRenameApproved = async ({ newName }) => {
      try {
        const token = localStorage.getItem("token");
        const response = await api.patch(
          `/api/pets/${childPet.id}/name`,
          { name: newName },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (response.status === 200) {
          setChildPet((prev) => {
            const updated = new Pet(prev);
            updated.name = newName;
            return updated;
          });
          alert(`펫의 이름이 '${newName}'(으)로 변경되었습니다! ✨`);
        }
      } catch (error) {
        console.error("Rename API failed:", error);
      }
    };

    const handleRenameRejected = () => {
      alert("배우자가 이름 변경에 동의하지 않았습니다. 😿");
    };

    socket.on("online_users_list", handleOnlineUsers);
    socket.on("new_user_login", handleNewLogin);
    socket.on("spouse_entered_child_room", handleSpouseEntered);
    socket.on("spouse_left_child_room", handleSpouseLeft);
    socket.on("child_room_status", handleChildRoomStatus);
    socket.on("hatch_progress_updated", handleHatchProgress);
    socket.on("hatch_started", handleHatchStarted);
    socket.on("child_pet_rename_proposed", handleRenameProposed);
    socket.on("child_pet_rename_approved", handleRenameApproved);
    socket.on("child_pet_rename_rejected", handleRenameRejected);
    socket.on("child_pet_farewell_proposed", handleFarewellProposed);
    socket.on("child_pet_farewell_approved", handleFarewellApproved);
    socket.on("child_pet_farewell_rejected", handleFarewellRejected);
    socket.on("child_action_proposed", handleActionProposed);
    socket.on("child_action_sync", handleActionSync);
    socket.on("child_action_rejected", handleActionRejected);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.emit("leave_child_room", {
        childId: childPet.id,
        petName: myPet.name,
      });
      socket.off("online_users_list", handleOnlineUsers);
      socket.off("new_user_login", handleNewLogin);
      socket.off("spouse_entered_child_room", handleSpouseEntered);
      socket.off("spouse_left_child_room", handleSpouseLeft);
      socket.off("child_room_status", handleChildRoomStatus);
      socket.off("hatch_progress_updated", handleHatchProgress);
      socket.off("hatch_started", handleHatchStarted);
      socket.off("child_pet_rename_proposed", handleRenameProposed);
      socket.off("child_pet_rename_approved", handleRenameApproved);
      socket.off("child_pet_rename_rejected", handleRenameRejected);
      socket.off("child_pet_farewell_proposed", handleFarewellProposed);
      socket.off("child_pet_farewell_approved", handleFarewellApproved);
      socket.off("child_pet_farewell_rejected", handleFarewellRejected);
      socket.off("child_action_proposed", handleActionProposed);
      socket.off("child_action_sync", handleActionSync);
      socket.off("child_action_rejected", handleActionRejected);
    };
  }, [childPet?.id, myPet?.name, spousePet?.name, navigate]);

  const handleHatchFailure = () => {
    setIsHatchGameActive(false);
    alert("시간 내에 부화하지 못했습니다. 다시 시도해 보세요! 😿");
    socket.emit("hatch_reset", { childId: childPet.id });
  };

  const handleHatchSuccess = async () => {
    if (childPet.isHatched) return;

    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        "/api/pets/hatch",
        { childId: childPet.id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 200) {
        setChildPet(new Pet(response.data.pet));
        setIsHatchGameActive(false);
        alert("축하합니다! 새로운 생명이 부화했습니다! 🎉");
      }
    } catch (error) {
      console.error("Hatch API failed:", error);
    }
  };

  const handleHatchTap = () => {
    if (!isHatchGameActive || hatchProgress >= 100 || timeLeft <= 0) return;
    socket.emit("hatch_tap", { childId: childPet.id });
  };

  const handleRenameClick = () => {
    const newName = window.prompt(
      "아이의 새로운 이름을 입력해주세요:",
      childPet.name,
    );
    if (newName && newName !== childPet.name) {
      socket.emit("child_pet_rename_request", {
        childId: childPet.id,
        newName,
        requesterName: myPet.name,
      });
      alert("배우자에게 이름 변경 승인 요청을 보냈습니다. 기다려 주세요! ⏳");
    }
  };

  const handleStartHatchGame = () => {
    if (!isSpouseInRoom) return;
    socket.emit("hatch_start_request", { childId: childPet.id });
  };

  const handleAction = (actionType) => {
    if (!isSpouseInRoom) {
      alert("배우자가 방에 있어야 함께 활동할 수 있습니다. 😿");
      return;
    }

    // 제안 요청 전송 후 대기 모달 오픈
    socket.emit("child_action_request", {
      childId: childPet.id,
      actionType,
      requesterName: myPet.name,
    });
    setWaitingAction(actionType);
  };

  const handleFarewellRequest = () => {
    if (!isSpouseInRoom) return;
    if (
      window.confirm(
        "정말로 자식 펫과 작별하시겠습니까?\n이 작업은 취소할 수 없으며, 상대방의 동의가 필요합니다.",
      )
    ) {
      socket.emit("child_pet_farewell_request", {
        childId: childPet.id,
        requesterName: myPet.name,
      });
      alert("배우자에게 작별(파양) 동의안을 보냈습니다. 기다려 주세요! ⏳");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center flex-col items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-sky-400 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
          Loading Nursery...
        </p>
      </div>
    );
  }

  if (!childPet) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f1a] p-4 lg:p-10 font-sans flex flex-col transition-colors relative overflow-x-hidden">
      
      {/* ✅ 우측 상단 다크모드 전환 아이콘 */}
      <button 
        onClick={toggleTheme} 
        className="fixed top-4 right-4 lg:top-10 lg:right-10 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-400 z-[60] shadow-sm transition-all"
      >
        {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
      </button>

      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-100 dark:bg-sky-400/5 rounded-full blur-[120px] pointer-events-none opacity-60"></div>
      
      <div className="w-full flex justify-between items-center mb-10 z-10 relative max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/main")}
          className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full font-black text-[11px] text-slate-400 hover:text-sky-400 uppercase tracking-widest shadow-sm transition transform hover:scale-105"
        >
          ← 내 펫으로
        </button>
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-full font-black text-[11px] shadow-xl uppercase tracking-widest italic">
          <FiHeart className="animate-pulse" /> 공동 육아실
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-4xl mx-auto">
        <div className="w-full bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-[3.5rem] p-8 lg:p-16 flex flex-col items-center justify-center shadow-sm mb-8 relative">
          
          <div className="absolute top-6 left-6 lg:top-10 lg:left-10 flex flex-col items-center gap-2 transform transition-transform hover:-translate-y-2 z-20">
            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-inner relative overflow-hidden">
              {myPet && (
                <div className="w-full h-full pointer-events-none relative">
                  {myPet.draw("w-full h-full scale-[1.3] translateY-[5%]")}
                </div>
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
              {myPet?.name}
            </span>
          </div>

          <div className="absolute top-6 right-6 lg:top-10 lg:right-10 flex flex-col items-center gap-2 transform transition-transform hover:-translate-y-2 z-20">
            <div className="relative">
              <div className="w-16 h-16 lg:w-24 lg:h-24 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-inner relative overflow-hidden group">
                {spousePet && (
                  <div className="w-full h-full pointer-events-none relative transition-opacity group-hover:opacity-80">
                    {spousePet.draw("w-full h-full scale-[1.3] translateY-[5%]")}
                  </div>
                )}
              </div>
              <div className="absolute -top-3 -right-3 flex flex-col gap-1 items-end z-30 pointer-events-none">
                {isSpouseOnline && (
                  <div className="flex items-center gap-1.5 bg-sky-400 text-slate-950 text-[8px] px-2 py-1 rounded-full font-black uppercase shadow-lg border border-white dark:border-slate-900">
                    <span className="w-1 h-1 bg-slate-950 rounded-full animate-pulse"></span>
                    접속 중
                  </div>
                )}
                {isSpouseInRoom && (
                  <div className="flex items-center gap-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[8px] px-2 py-1 rounded-full font-black uppercase shadow-lg animate-bounce-slight border border-white dark:border-slate-900">
                    <FiZap className="text-[10px]" /> 👀 시청 중
                  </div>
                )}
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
              {spousePet?.name || "배우자"}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-2 z-10 pt-12 lg:pt-0">
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
              {childPet.name} <span className="text-sky-400 font-sans not-italic">.</span>
            </h1>
            {isSpouseInRoom && childPet.isHatched && (
              <button
                onClick={handleRenameClick}
                className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl hover:text-sky-400 transition-all border border-slate-100 dark:border-slate-700 shadow-sm"
              >
                <FiEdit3 className="text-sm" />
              </button>
            )}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12 z-10 italic text-center">
            사랑으로 보듬어 줄 시간입니다
          </p>

          <div
            onClick={handleHatchTap}
            className={`w-64 h-64 lg:w-80 lg:h-80 relative flex items-center justify-center mb-12 transform transition hover:scale-105 duration-500 z-10 ${!childPet.isHatched ? "rounded-[3.5rem] bg-slate-50 dark:bg-slate-950 shadow-inner border border-slate-100 dark:border-slate-800" : ""} ${isHatchGameActive ? "cursor-pointer active:scale-95" : ""}`}
          >

            {childPet && (
              <div
                className={`w-full h-full flex items-center justify-center ${childPet.isHatched ? "animate-float" : "animate-wiggle"}`}
                style={{ position: "relative" }}
              >
                {!childPet.isHatched ? (
                  <div
                    className="w-full h-full rounded-[3.5rem] flex flex-col items-center justify-center text-white mix-blend-overlay"
                    style={{
                      backgroundColor: childPet.color,
                      overflow: "hidden",
                    }}
                  >
                    <span className="text-6xl lg:text-8xl font-black opacity-40">
                      ⬤
                    </span>
                    {isHatchGameActive && (
                      <span className="text-[11px] font-black uppercase tracking-widest mt-4 opacity-60 animate-pulse italic">
                        여길 눌러!
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-[85%] h-[85%] pointer-events-none relative flex items-center justify-center drop-shadow-[0_20px_50px_rgba(125,211,252,0.3)]">
                    {childPet.draw("w-full h-full scale-[1.2]")}
                  </div>
                )}
              </div>
            )}

            {isHatchGameActive && (
              <div className="absolute -bottom-24 w-full flex flex-col items-center gap-4 animate-fade-in">
                <div
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl bg-white dark:bg-slate-900 shadow-xl border ${timeLeft <= 5 ? "border-sky-400 text-sky-400 animate-bounce" : "border-slate-100 dark:border-slate-800 text-slate-400"}`}
                >
                  <FiClock className={timeLeft <= 5 ? "animate-spin-slow" : ""} />
                  <span className="text-xs font-black tracking-widest uppercase">
                    남은 시간: {timeLeft}s
                  </span>
                </div>
                <div className="w-64 h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800">
                  <div
                    className={`h-full bg-sky-400 shadow-[0_0_15px_rgba(125,211,252,0.6)] transition-all duration-300 ${timeLeft <= 5 ? "animate-pulse" : ""}`}
                    style={{ width: `${hatchProgress}%` }}
                  />
                </div>
                <span className="text-[9px] font-black text-sky-400 animate-pulse uppercase tracking-[0.4em] italic">
                  성공률 ({hatchProgress}%)
                </span>
              </div>
            )}
          </div>

          {!childPet.isHatched && !isHatchGameActive && (
            <button
              onClick={handleStartHatchGame}
              disabled={!isSpouseInRoom}
              className="mb-8 px-12 py-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 font-black text-[11px] rounded-2xl shadow-2xl uppercase tracking-[0.2em] italic transform transition hover:scale-[1.03] active:scale-95 disabled:opacity-30 disabled:hover:scale-100 flex items-center gap-2"
            >
              <FiStar className={isSpouseInRoom ? "animate-spin-slow" : ""} />
              {isSpouseInRoom
                ? "협동 부화 시작하기"
                : "배우자를 기다리는 중..."}
            </button>
          )}

          {childPet.isHatched && (
            <div className="w-full space-y-12 animate-fade-in">
              <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-12 w-full">
                {[
                  { label: "포만감", val: childPet.hunger, color: "bg-sky-400" },
                  { label: "청결도", val: childPet.cleanliness, color: "bg-sky-500" },
                  { label: "체력", val: childPet.healthHp, color: "bg-slate-700" },
                  { label: "스트레스", val: childPet.stress, color: "bg-slate-400" }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      {stat.label}
                    </span>
                    <div className="w-24 h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700">
                      <div
                        className={`h-full ${stat.color} transition-all duration-1000`}
                        style={{ width: `${stat.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-10 border-t border-slate-50 dark:border-slate-800/50">
                <div className="flex items-center justify-center gap-2 mb-8">
                  <div className="w-1 h-1 bg-sky-400 rounded-full"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">
                    {childPet.tendency} 성격 매트릭스
                  </span>
                  <div className="w-1 h-1 bg-sky-400 rounded-full"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-4 w-full">
                  {[
                    { label: "지식", val: childPet.knowledge },
                    { label: "애정", val: childPet.affection },
                    { label: "이타심", val: childPet.altruism },
                    { label: "논리", val: childPet.logic },
                    { label: "공감", val: childPet.empathy },
                    { label: "외향", val: childPet.extroversion },
                    { label: "유머", val: childPet.humor },
                    { label: "개방성", val: childPet.openness },
                    { label: "솔직함", val: childPet.directness },
                    { label: "호기심", val: childPet.curiosity },
                  ].map((stat, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter text-center">
                        {stat.label}
                      </span>
                      <span className="text-xs font-mono font-black text-slate-900 dark:text-slate-100">
                        {stat.val}
                      </span>
                      <div className="w-14 h-1 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-400/50"
                          style={{ width: `${Math.min(stat.val, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {childPet.isHatched && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl animate-fade-in px-4">
            {[
              { label: "창의력 이야기", icon: FiCoffee, type: "FEED" },
              { label: "스무고개 퀴즈", icon: FiSettings, type: "CLEAN" },
              { label: "역할극 게임", icon: FiSmile, type: "PLAY" }
            ].map((btn, i) => (
              <button
                key={i}
                onClick={() => handleAction(btn.type)}
                disabled={actionLoading}
                className="group relative h-20 bg-white dark:bg-slate-900/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center gap-1.5 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-sky-400/5 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <btn.icon className="text-xl text-slate-400 group-hover:text-sky-400 relative z-10 transition-all group-hover:scale-110" />
                <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white relative z-10 uppercase tracking-widest text-center">
                  {btn.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {childPet && (
          <div className="mt-12 w-full max-w-2xl flex justify-center animate-fade-in pb-10">
            <button
              onClick={handleFarewellRequest}
              disabled={!isSpouseInRoom}
              className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                isSpouseInRoom
                  ? "bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-100 dark:border-slate-800 hover:shadow-lg active:scale-95 cursor-pointer"
                  : "bg-transparent text-slate-300 border border-dashed border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-40"
              }`}
            >
              <FiTrash2 className="text-sm" />
              자식 펫과 작별하기 {!isSpouseInRoom && "(배우자 대기 중...)"}
            </button>
          </div>
        )}
      </div>

      {/* --- 제안 대기 모달 --- */}
      {waitingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0b0f1a] p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-sm text-center transform scale-100 animate-in zoom-in-95 duration-300 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
              배우자를 기다리는 중...
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-bold leading-relaxed">
              아이에게{" "}
              <b className="text-sky-600 dark:text-sky-400">
                {waitingAction === "FEED"
                  ? "창의력 이야기"
                  : waitingAction === "CLEAN"
                    ? "스무고개 퀴즈"
                    : "역할극 게임"}
              </b>
              (을)를 제안했습니다.
              <br />
              배우자의 응답을 기다리고 있어요! ⏳
            </p>
          </div>
        </div>
      )}

      {/* --- 제안 수락 모달 --- */}
      {proposedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0b0f1a] p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-sm text-center transform scale-100 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-sky-100 dark:border-sky-900/30">
              {proposedAction.actionType === "FEED" && (
                <FiCoffee className="text-4xl text-sky-500 animate-bounce" />
              )}
              {proposedAction.actionType === "CLEAN" && (
                <FiSettings className="text-4xl text-sky-500 animate-bounce" />
              )}
              {proposedAction.actionType === "PLAY" && (
                <FiSmile className="text-4xl text-sky-500 animate-bounce" />
              )}
            </div>

            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
              <span className="text-sky-600 dark:text-sky-400">
                {proposedAction.requesterName}
              </span>
              님의 제안!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 mx-auto leading-relaxed font-bold">
              자식 펫에게{" "}
              <b className="text-sky-600 dark:text-sky-400">
                {proposedAction.actionType === "FEED"
                  ? "창의력 이야기"
                  : proposedAction.actionType === "CLEAN"
                    ? "스무고개 퀴즈"
                    : "역할극 게임"}
              </b>{" "}
              활동을 함께 하러 갈까요?
            </p>

            <div className="flex w-full gap-3">
              <button
                onClick={() => {
                  socket.emit("child_action_response", {
                    childId: childPet.id,
                    approved: false,
                    actionType: proposedAction.actionType,
                  });
                  setProposedAction(null);
                }}
                className="flex-1 py-4 rounded-2xl font-black text-sm bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 transition-colors"
              >
                나중에
              </button>
              <button
                onClick={() => {
                  socket.emit("child_action_response", {
                    childId: childPet.id,
                    approved: true,
                    actionType: proposedAction.actionType,
                  });
                  setProposedAction(null);
                  setWaitingAction(proposedAction.actionType);
                }}
                className="flex-1 py-4 rounded-2xl font-black text-sm bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 shadow-md active:scale-95 transition-all"
              >
                좋아요! 💕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildRoomPage;