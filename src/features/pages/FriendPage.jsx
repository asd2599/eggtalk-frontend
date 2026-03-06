import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/config";
import {
  FiSun,
  FiMoon,
  FiUsers,
  FiUserPlus,
  FiClock,
  FiCheck,
  FiX,
  FiTrash2,
  FiMessageCircle,
  FiAlertCircle,
  FiSmile,
} from "react-icons/fi";
import socket from "../../utils/socket";
import CommonSide from "./CommonSide";

const FriendPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("friends"); // friends | received | sent

  const [friendsList, setFriendsList] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  // 실시간 접속중인 유저 목록 (petName 배열)
  const [onlinePets, setOnlinePets] = useState([]);

  // 알림 토스트 상태
  const [notifications, setNotifications] = useState([]);

  // 초기 테마 및 데이터 로드
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

    fetchFriendsData();

    // 서버로 현재 켜져 있는 접속자 목록(배열) 요청
    socket.emit("get_online_users", (users) => {
      setOnlinePets(users);
    });

    // 다른 유저가 로그인/로그아웃 할 때마다 실시간 갱신
    socket.on("online_users_list", (users) => {
      setOnlinePets(users);
    });

    return () => {
      socket.off("online_users_list");
    };
  }, []);

  const fetchFriendsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      // 내 펫 정보 확인 (에러 핸들링 겸 액세스 검증)
      await api.get("/api/pets/my", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 친구 데이터 일괄 조회
      const res = await api.get("/api/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 200) {
        setFriendsList(res.data.friends || []);
        setReceivedRequests(res.data.receivedRequests || []);
        setSentRequests(res.data.sentRequests || []);
      }
    } catch (error) {
      console.error("친구 데이터 로드 실패:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setNotifications((prev) => [
      ...prev,
      { id, message, type, isExiting: false },
    ]);
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isExiting: true } : n)),
      );
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 300);
    }, 3000);
  };

  // ---------------- API 핸들러 ---------------- //
  const handleAcceptRequest = async (requestId, petName) => {
    try {
      const token = localStorage.getItem("token");
      await api.put(
        "/api/friends/accept",
        { request_id: requestId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast(`${petName}님과 친구가 되었습니다! 🎉`);
      fetchFriendsData();
    } catch (err) {
      console.error(err);
      showToast("수락 처리에 실패했습니다.", "error");
    }
  };

  const handleRejectOrDelete = async (requestId, petName, isDelete = false) => {
    const confirmMsg = isDelete
      ? `정말 ${petName}님과 친구를 끊으시겠습니까?`
      : `${petName}님의 친구 요청을 거절하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem("token");
      await api.put(
        "/api/friends/reject",
        { request_id: requestId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast(
        isDelete
          ? `${petName}님과 친구를 끊었습니다.`
          : "요청을 거절/취소했습니다.",
      );
      fetchFriendsData();
    } catch (err) {
      console.error(err);
      showToast("처리 중 오류가 발생했습니다.", "error");
    }
  };
  // ------------------------------------------ //

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // 데이터 렌더링 헬퍼 컴포넌트들
  const EmptyState = ({ icon: Icon, text }) => (
    <div className="flex flex-col items-center justify-center h-64 text-slate-300 dark:text-slate-700 space-y-4 animate-fade-in">
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center">
        <Icon className="text-3xl opacity-30" />
      </div>
      <p className="text-[11px] font-black tracking-[0.2em] uppercase opacity-60">
        {text}
      </p>
    </div>
  );

  // 실시간 접속 여부에 따른 상태 뱃지 렌더링 헬퍼
  const StatusBadge = ({ petName }) => {
    // 본인이 친구 목록에 자신을 표시하지는 않지만, 확실한 판별을 위해 배열 포함 체크
    const isOnline = onlinePets.includes(petName);
    return (
      <span
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase transition-colors ${
          isOnline
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
            : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-100 dark:border-slate-700"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`}
        />
        {isOnline ? "Online" : "Offline"}
      </span>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden relative">
      {/* 테마 버튼 */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-indigo-400 z-[60] transition-all shadow-sm"
      >
        {isDarkMode ? (
          <FiSun className="text-sm" />
        ) : (
          <FiMoon className="text-sm" />
        )}
      </button>

      {/* 공통 사이드바 */}
      <CommonSide activeMenu="친구 목록" />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar px-6 py-12 lg:px-12 lg:py-16 bg-white dark:bg-[#0b0f1a] transition-all scroll-smooth pb-40">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          {/* 헤더 */}
          <header className="mb-10 text-center lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
              Network <span className="text-indigo-400">Hub</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-3 italic">
              Manage your connections
            </p>
          </header>

          {/* 탭 네비게이션 */}
          <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl mb-8 overflow-x-auto custom-scrollbar flex-shrink-0">
            {[
              {
                id: "friends",
                label: "내 친구",
                icon: FiUsers,
                count: friendsList.length,
              },
              {
                id: "received",
                label: "받은 요청",
                icon: FiUserPlus,
                count: receivedRequests.length,
              },
              {
                id: "sent",
                label: "보낸 요청",
                icon: FiClock,
                count: sentRequests.length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[100px] flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-[11px] lg:text-[12px] font-black tracking-widest uppercase transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-800 text-indigo-500 shadow-sm border border-slate-100 dark:border-slate-700"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                }`}
              >
                <tab.icon className="text-lg opacity-80" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${
                      activeTab === tab.id
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 영역 */}
          <div className="flex-1 bg-white dark:bg-[#0b0f1a] animate-fade-in-up">
            {/* 1. 내 친구 목록 */}
            {activeTab === "friends" && (
              <div className="space-y-4">
                {friendsList.length === 0 ? (
                  <EmptyState icon={FiUsers} text="등록된 친구가 없습니다" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friendsList.map((friend) => (
                      <div
                        key={friend.request_id}
                        className="group p-5 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2rem] hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all flex items-center justify-between shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-[1.2rem] flex items-center justify-center text-indigo-400">
                              <FiSmile className="text-xl" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-start">
                            <h3 className="font-bold text-slate-900 dark:text-gray-100 text-[14px]">
                              {friend.pet_name || `User #${friend.user_id}`}
                            </h3>
                            <StatusBadge petName={friend.pet_name} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {/* 친구 끊기 버튼 */}
                          <button
                            onClick={() =>
                              handleRejectOrDelete(
                                friend.request_id,
                                friend.pet_name || `User #${friend.user_id}`,
                                true,
                              )
                            }
                            className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"
                            title="친구 끊기"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. 받은 요청 목록 */}
            {activeTab === "received" && (
              <div className="space-y-4">
                {receivedRequests.length === 0 ? (
                  <EmptyState icon={FiUserPlus} text="받은 요청이 없습니다" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {receivedRequests.map((req) => (
                      <div
                        key={req.request_id}
                        className="p-5 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-4 mb-5">
                          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-500">
                            <FiAlertCircle className="text-lg" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-gray-100 text-[13px]">
                              {req.pet_name || `User #${req.requester_id}`}
                            </h3>
                            <p className="text-[9px] mt-1 text-slate-400 font-medium uppercase tracking-widest">
                              {req.requester_email}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleRejectOrDelete(
                                req.request_id,
                                req.pet_name || `User #${req.requester_id}`,
                              )
                            }
                            className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl font-bold text-[11px] transition-colors"
                          >
                            거절
                          </button>
                          <button
                            onClick={() =>
                              handleAcceptRequest(
                                req.request_id,
                                req.pet_name || `User #${req.requester_id}`,
                              )
                            }
                            className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-[11px] shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                          >
                            수락
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. 보낸 요청 목록 */}
            {activeTab === "sent" && (
              <div className="space-y-4">
                {sentRequests.length === 0 ? (
                  <EmptyState icon={FiClock} text="보낸 요청이 없습니다" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sentRequests.map((req) => (
                      <div
                        key={req.request_id}
                        className="p-5 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex items-center justify-between opacity-80 shadow-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            수락 대기중
                          </span>
                          <h3 className="font-bold text-slate-900 dark:text-gray-100 text-[13px]">
                            {req.pet_name || `User #${req.receiver_id}`}
                          </h3>
                        </div>
                        <button
                          onClick={() =>
                            handleRejectOrDelete(
                              req.request_id,
                              req.pet_name || `User #${req.receiver_id}`,
                            )
                          }
                          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-rose-500 text-slate-500 rounded-xl font-bold text-[10px] transition-all shadow-sm"
                        >
                          요청 취소
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 토스트 알림 렌더링 */}
      <div className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 z-[110] flex flex-col gap-3 pointer-events-none">
        {notifications.map((noti) => (
          <div
            key={noti.id}
            className={`
              bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 shadow-2xl rounded-[1.5rem] py-3 pl-4 pr-6 flex items-center gap-3 pointer-events-auto transition-all
              ${noti.isExiting ? "animate-toast-out" : "animate-toast-in"}
            `}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${noti.type === "error" ? "bg-rose-50 text-rose-500 dark:bg-rose-900/30" : "bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30"}`}
            >
              {noti.type === "error" ? <FiAlertCircle /> : <FiCheck />}
            </div>
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
              {noti.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendPage;
