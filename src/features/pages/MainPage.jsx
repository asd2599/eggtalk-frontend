import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import {
  FiLogOut,
  FiBox,
  FiCpu,
  FiCloud,
  FiMonitor,
  FiSmile,
  FiAward,
  FiMessageCircle,
} from "react-icons/fi";
import Pet from "../pets/pet";
import PetStatusPage from "./PetStatusPage";

const MainPage = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Socket.io 통신 관리 State
  const [activeUserCount, setActiveUserCount] = useState(1);
  const [loginNotifications, setLoginNotifications] = useState([]);

  useEffect(() => {
    // 소켓 초기 연결
    const socket = io("http://localhost:8000");

    socket.on("update_user_count", (count) => {
      setActiveUserCount(count);
    });

    socket.on("new_user_login", (petName) => {
      const id = Date.now() + Math.random();
      setLoginNotifications((prev) => [...prev, { id, petName }]);
      setTimeout(() => {
        setLoginNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 3000);
    });

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
          const loadedPet = new Pet(response.data.pet);
          setPetData(loadedPet);

          // 로그인 성공을 다른 서버에 있는 소켓(유저)들에게 알림 발송
          socket.emit("user_login", loadedPet.name);
        } else {
          // 펫이 없으면 강제로 생성페이지 이동
          navigate("/create-pet");
        }
      } catch (error) {
        console.error("펫 정보를 불러오는 중 에러 발생:", error);
        alert("세션이 만료되었거나 펫 정보를 가져올 수 없습니다.");
        localStorage.removeItem("token");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchPetData();

    // 다른 브라우저 탭(MS 등)에서 발생한 동작을 실시간으로 메인 페이지에 반영
    const channel = new BroadcastChannel("pet_update_channel");
    channel.onmessage = (event) => {
      if (event.data?.type === "UPDATE_PET" && event.data?.pet) {
        // 이미 가져온 클래스가 있다면 새 데이터로 덮어씌워 렌더링
        setPetData(new Pet(event.data.pet));
      }
    };

    return () => {
      channel.close();
      socket.disconnect(); // 언마운트 시 소켓 통신 해제
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 text-slate-500">
        <p className="text-xl font-bold animate-pulse">
          펫 정보를 불러오는 중...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-80 h-80 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 pointer-events-none"></div>

      {/* 왼쪽 네비게이션 사이드바 */}
      <aside className="w-20 lg:w-64 border-r border-gray-50 dark:border-gray-900 flex flex-col justify-between bg-white dark:bg-[#0b0f1a] z-40">
        <div className="p-8 lg:p-10">
          <h2 className="hidden lg:block text-sm font-black text-gray-900 dark:text-white mb-6 tracking-[0.3em] text-center uppercase">
            Dashboard
          </h2>

          {/* Socket.io: 접속 중인 유저 수 위젯 */}
          <div className="hidden lg:flex mb-8 mx-auto bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl py-2 px-3 items-center justify-center gap-2 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 tracking-wider">
              On Air: {activeUserCount}명
            </span>
          </div>

          <nav className="flex flex-col gap-3">
            {[
              {
                icon: FiSmile,
                label: "내 펫 상태",
                path: "/main",
                active: true,
              },
              { icon: FiAward, label: "명예의 전당", path: "/ranking" },
              { icon: FiMessageCircle, label: "대화하기", path: "/chat" },
              { icon: FiBox, label: "DD 모듈", path: "/dd" },
              { icon: FiCloud, label: "MS 모듈", path: "/ms" },
              { icon: FiMonitor, label: "SH 모듈", path: "/sh" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-4 p-3 lg:px-5 lg:py-3.5 rounded-2xl transition-all ${
                  item.active
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl shadow-gray-200 dark:shadow-none"
                    : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                <item.icon className="text-xl" />
                <span className="hidden lg:block text-[13px] font-bold">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* 로그아웃 섹션 */}
        <div className="p-8 lg:p-10 border-t border-gray-50 dark:border-gray-900">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center lg:justify-center gap-3 w-full text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest group"
          >
            <FiLogOut className="text-lg group-hover:scale-110 transition-transform" />
            <span className="hidden lg:block">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 우측 하단 Socket.io 로그인 알림 토스트 (Toast) 플로팅 영역 */}
      <div className="fixed bottom-6 right-6 z-100 flex flex-col gap-3 pointer-events-none">
        {loginNotifications.map((noti) => (
          <div
            key={noti.id}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-emerald-100 dark:border-emerald-900/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up"
          >
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-[14px]">
              🎉
            </div>
            <div className="text-[12px] font-bold text-gray-700 dark:text-gray-200">
              <span className="text-emerald-500 font-black">
                {noti.petName}
              </span>{" "}
              님이 세상에 접속했어요!
            </div>
          </div>
        ))}
      </div>

      {/* 중앙 메인 콘텐츠 (펫 정보 렌더링) */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 overflow-y-auto">
        <PetStatusPage petData={petData} />
      </main>
    </div>
  );
};

export default MainPage;
