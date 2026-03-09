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
  const timerRef = useRef(null);

  const hasAlerted = useRef(false);

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

    // 소켓 방 입장
    socket.emit("join_child_room", {
      childId: childPet.id,
      petName: myPet.name,
    });

    // 온라인 유저 목록 확인 (배우자 접속 여부)
    socket.emit("get_online_users", (users) => {
      setIsSpouseOnline(users.includes(spousePet.name));
    });

    // 소켓 이벤트 리스너
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

      // 기존 타이머 클리어 후 새로 시작
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
        // DB 실제 업데이트 API 호출 (모두가 동의한 시점에 수행)
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
    };
  }, [childPet?.id, myPet?.name, spousePet?.name]);

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

  const handleAction = async (actionType) => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        "/api/pets/child/action",
        { actionType },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.status === 200 && response.data.childPet) {
        setChildPet(new Pet(response.data.childPet));
      }
    } catch (error) {
      console.error("액션 실행 실패:", error);
      alert("액션을 처리하는 도중 문제가 생겼습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center flex-col items-center min-h-screen bg-[#fff9ee] dark:bg-[#1a1c29]">
        <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-4" />
        <p className="text-rose-400 font-bold uppercase tracking-widest text-sm">
          Loading Nursery...
        </p>
      </div>
    );
  }

  if (!childPet) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 dark:from-slate-900 dark:to-[#1a1423] p-4 lg:p-10 font-sans flex flex-col transition-colors relative">
      <div className="w-full flex justify-between items-center mb-10 z-10 relative">
        <button
          onClick={() => navigate("/main")}
          className="px-6 py-2.5 bg-white dark:bg-slate-800 rounded-full font-bold text-sm text-slate-500 hover:text-rose-500 shadow-sm transition transform hover:scale-105"
        >
          ← 내 펫으로
        </button>
        <div className="flex items-center gap-2 px-6 py-2.5 bg-white/60 dark:bg-slate-800/60 rounded-full font-black text-rose-500 shadow-sm backdrop-blur-md">
          <FiHeart className="animate-pulse" /> 공동 육아방
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-4xl mx-auto">
        <div className="w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-rose-100 dark:border-rose-900/30 rounded-[3rem] p-10 flex flex-col items-center justify-center shadow-xl shadow-rose-200/20 dark:shadow-rose-900/10 mb-8 relative">
          {/* 내 펫 (좌측 상단) */}
          <div className="absolute top-6 left-6 lg:top-8 lg:left-8 flex flex-col items-center gap-2 transform transition-transform hover:-translate-y-2 z-20">
            <div className="w-20 h-20 lg:w-28 lg:h-28 bg-white/50 dark:bg-slate-700/50 rounded-full flex items-center justify-center border-2 border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden">
              {myPet && (
                <div className="w-full h-full pointer-events-none relative">
                  {myPet.draw("w-full h-full scale-[1.3] translateY-[5%]")}
                </div>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
              {myPet?.name}
            </span>
          </div>

          {/* 배우자 펫 (우측 상단) */}
          <div className="absolute top-6 right-6 lg:top-8 lg:right-8 flex flex-col items-center gap-2 transform transition-transform hover:-translate-y-2 z-20">
            <div className="relative">
              <div className="w-20 h-20 lg:w-28 lg:h-28 bg-white/50 dark:bg-slate-700/50 rounded-full flex items-center justify-center border-2 border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden group">
                {spousePet && (
                  <div className="w-full h-full pointer-events-none relative transition-opacity group-hover:opacity-80">
                    {spousePet.draw(
                      "w-full h-full scale-[1.3] translateY-[5%]",
                    )}
                  </div>
                )}
              </div>
              {/* 툴팁 느낌의 뱃지들 (이미지 바깥쪽 - 우측 상단 배치) */}
              <div className="absolute -top-4 -right-4 flex flex-col gap-1 items-end z-30 pointer-events-none">
                {isSpouseOnline && (
                  <div className="flex items-center gap-1 bg-green-500 text-white text-[9px] px-2 py-1 rounded-full font-black uppercase shadow-lg animate-pulse-slow border-2 border-white dark:border-slate-800">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    온라인
                  </div>
                )}
                {isSpouseInRoom && (
                  <div className="flex items-center gap-1 bg-rose-500 text-white text-[9px] px-2 py-1 rounded-full font-black uppercase shadow-lg animate-bounce-slight whitespace-nowrap border-2 border-white dark:border-slate-800">
                    👀 시청 중
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
              {spousePet?.name || "배우자"}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-2 z-10">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-rose-100 uppercase tracking-tight">
              {childPet.name}
            </h1>
            {isSpouseInRoom && childPet.isHatched && (
              <button
                onClick={handleRenameClick}
                className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors shadow-sm group"
              >
                <FiEdit3 className="text-slate-400 group-hover:text-rose-500 transition-colors" />
              </button>
            )}
          </div>
          <p className="text-sm font-bold text-slate-400 mb-8 z-10">
            사랑으로 보듬어 줄 시간입니다
          </p>

          <div
            onClick={handleHatchTap}
            className={`w-64 h-64 lg:w-80 lg:h-80 relative flex items-center justify-center mb-8 transform transition hover:scale-105 duration-500 z-10 ${!childPet.isHatched ? "rounded-full bg-linear-to-br from-rose-100 to-amber-50 dark:from-slate-700 dark:to-slate-900 shadow-inner" : ""} ${isHatchGameActive ? "cursor-pointer active:scale-95" : ""}`}
          >
            {/* Draw child pet using the Pet class logic and generic rendering structure */}
            {childPet && (
              <div
                className={`w-full h-full flex items-center justify-center ${childPet.isHatched ? "animate-float" : "animate-wiggle"}`}
                style={{ position: "relative" }}
              >
                {!childPet.isHatched ? (
                  <div
                    className="w-full h-full rounded-full flex flex-col items-center justify-center text-white mix-blend-overlay"
                    style={{
                      backgroundColor: childPet.color,
                      overflow: "hidden",
                    }}
                  >
                    <span className="text-5xl lg:text-7xl font-black opacity-30">
                      ⬤
                    </span>
                    {isHatchGameActive && (
                      <span className="text-[10px] font-black uppercase tracking-tighter mt-2 opacity-50 animate-pulse">
                        Click Me!
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-[85%] h-[85%] pointer-events-none relative flex items-center justify-center">
                    {childPet.draw("w-full h-full scale-[1.2]")}
                  </div>
                )}
              </div>
            )}

            {/* Hatching Progress Bar & Timer */}
            {isHatchGameActive && (
              <div className="absolute -bottom-20 w-full flex flex-col items-center gap-3 animate-fade-in">
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border ${timeLeft <= 5 ? "border-rose-500 text-rose-500 animate-bounce" : "border-slate-100 dark:border-slate-700 text-slate-600"}`}
                >
                  <FiClock
                    className={timeLeft <= 5 ? "animate-spin-slow" : ""}
                  />
                  <span className="text-sm font-black tracking-tighter">
                    남은 시간: {timeLeft}s
                  </span>
                </div>
                <div className="w-56 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner border-2 border-white dark:border-slate-600">
                  <div
                    className={`h-full bg-linear-to-r from-rose-400 to-orange-400 shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all duration-300 ${timeLeft <= 5 ? "animate-pulse" : ""}`}
                    style={{ width: `${hatchProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-rose-500 animate-pulse uppercase tracking-widest">
                  Fast Tap! ({hatchProgress}%)
                </span>
              </div>
            )}
          </div>

          {!childPet.isHatched && !isHatchGameActive && (
            <button
              onClick={handleStartHatchGame}
              disabled={!isSpouseInRoom}
              className="mb-8 px-10 py-4 bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 disabled:from-slate-300 disabled:to-slate-400 text-white font-black text-sm rounded-full shadow-lg transform transition hover:scale-105 active:scale-95 disabled:hover:scale-100 flex items-center gap-2"
            >
              <FiStar className={isSpouseInRoom ? "animate-spin-slow" : ""} />
              {isSpouseInRoom
                ? "협동 부화 시작하기"
                : "배우자를 기다리는 중..."}
            </button>
          )}

          {/* Stats Only shown after hatched */}
          {childPet.isHatched && (
            <div className="w-full space-y-8 animate-fade-in">
              {/* Primary Survival Stats */}
              <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8 w-full">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    포만감
                  </span>
                  <div className="w-32 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${childPet.hunger}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    청결도
                  </span>
                  <div className="w-32 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 rounded-full"
                      style={{ width: `${childPet.cleanliness}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    체력
                  </span>
                  <div className="w-32 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full"
                      style={{ width: `${childPet.healthHp}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    스트레스
                  </span>
                  <div className="w-32 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${childPet.stress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Personality & Tendency Stats Grid */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-md uppercase tracking-tighter">
                    Tendency
                  </span>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                    {childPet.tendency} 아이
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-2 w-full">
                  {[
                    {
                      label: "지식",
                      val: childPet.knowledge,
                      color: "bg-blue-400",
                    },
                    {
                      label: "애정",
                      val: childPet.affection,
                      color: "bg-rose-400",
                    },
                    {
                      label: "이타심",
                      val: childPet.altruism,
                      color: "bg-emerald-400",
                    },
                    {
                      label: "논리",
                      val: childPet.logic,
                      color: "bg-indigo-400",
                    },
                    {
                      label: "공감",
                      val: childPet.empathy,
                      color: "bg-pink-400",
                    },
                    {
                      label: "외향",
                      val: childPet.extroversion,
                      color: "bg-orange-400",
                    },
                    {
                      label: "유머",
                      val: childPet.humor,
                      color: "bg-yellow-400",
                    },
                    {
                      label: "개방성",
                      val: childPet.openness,
                      color: "bg-teal-400",
                    },
                    {
                      label: "솔직함",
                      val: childPet.directness,
                      color: "bg-violet-400",
                    },
                    {
                      label: "호기심",
                      val: childPet.curiosity,
                      color: "bg-cyan-400",
                    },
                  ].map((stat, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase">
                        {stat.label}
                      </span>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                        {stat.val}
                      </span>
                      <div className="w-16 h-1 bg-slate-50 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stat.color}`}
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

        {/* Action Buttons Only shown after hatched */}
        {childPet.isHatched && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl animate-fade-in">
            <button
              onClick={() => handleAction("FEED")}
              disabled={actionLoading}
              className="group relative h-24 bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center gap-2 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-emerald-500/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <FiCoffee className="text-2xl text-emerald-500 relative z-10 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 relative z-10 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400 uppercase tracking-widest">
                분유 주기
              </span>
            </button>

            <button
              onClick={() => handleAction("CLEAN")}
              disabled={actionLoading}
              className="group relative h-24 bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center gap-2 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-sky-500/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <FiSettings className="text-2xl text-sky-500 relative z-10 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 relative z-10 transition-colors group-hover:text-sky-600 dark:group-hover:text-sky-400 uppercase tracking-widest">
                목욕 시키기
              </span>
            </button>

            <button
              onClick={() => handleAction("PLAY")}
              disabled={actionLoading}
              className="group relative h-24 bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center gap-2 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-rose-500/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <FiSmile className="text-2xl text-rose-500 relative z-10 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 relative z-10 transition-colors group-hover:text-rose-600 dark:group-hover:text-rose-400 uppercase tracking-widest">
                놀아 주기
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildRoomPage;
