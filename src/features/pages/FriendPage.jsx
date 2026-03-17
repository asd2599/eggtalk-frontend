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
  FiTrash2,
  FiAlertCircle,
  FiSmile,
  FiSend,
  FiMail,
} from "react-icons/fi";
import socket from "../../utils/socket";
import CommonSide from "./CommonSide";
import Pet from "../pets/pet";
import MessageSendModal from "./components/MessageSendModal";

const FriendPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("friends");

  const [friendsList, setFriendsList] = useState([]);
  const [onlinePets, setOnlinePets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [myPetName, setMyPetName] = useState("");
  const [myPetColor, setMyPetColor] = useState("");
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [messageSubTab, setMessageSubTab] = useState("received"); // "received" | "sent"

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

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
    socket.emit("get_online_users", (users) => setOnlinePets(users));
    socket.on("online_users_list", (users) => setOnlinePets(users));

    // 실시간 쪽지 수신 리스너
    socket.on("receive_direct_message", (data) => {
      setReceivedMessages((prev) => [data, ...prev]);
      showToast(`${data.sender_pet_name}님으로부터 쪽지가 왔습니다! 💌`);
    });

    return () => {
      socket.off("online_users_list");
      socket.off("receive_direct_message");
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
      const petRes = await api.get("/api/pets/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (petRes.data.pet) {
        socket.emit("user_login", petRes.data.pet.name);
        setMyPetName(petRes.data.pet.name);
        setMyPetColor(petRes.data.pet.color);
      }
      const res = await api.get("/api/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200) {
        setFriendsList(res.data.friends || []);
      }

      // 받은 쪽지 목록 조회
      const msgRes = await api.get("/api/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (msgRes.data.success) {
        setReceivedMessages(msgRes.data.messages || []);
      }

      // 보낸 쪽지 목록 조회
      const sentMsgRes = await api.get("/api/messages/sent", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (sentMsgRes.data.success) {
        setSentMessages(sentMsgRes.data.messages || []);
      }
    } catch (error) {
      console.error(error);
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
    const id = `toast-${Date.now()}-${Math.random()}`;
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

  const dismissToast = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleRejectOrDelete = (requestId, petName, isDelete = false) => {
    setAlertConfig({
      isOpen: true,
      title: isDelete ? "친구 해제" : "요청 거절",
      message: isDelete
        ? `정말 ${petName}님과 친구 관계를 해제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
        : `${petName}님의 요청을 거절하시겠습니까?`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          await api.put(
            "/api/friends/reject",
            { request_id: requestId },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          showToast(isDelete ? "친구를 끊었습니다." : "요청을 거절했습니다.");
          fetchFriendsData();
          setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          showToast("오류가 발생했습니다.", "error");
        }
      },
    });
  };

  const handleMarkAsRead = async (id) => {
    if (!id || id === "undefined") return;
    try {
      const token = localStorage.getItem("token");
      await api.put(
        `/api/messages/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setReceivedMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!id || id === "undefined") return;
    setAlertConfig({
      isOpen: true,
      title: "쪽지 삭제",
      message: "정말 이 쪽지를 삭제하시겠습니까?",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          await api.delete(`/api/messages/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (messageSubTab === "received") {
            setReceivedMessages((prev) => prev.filter((m) => m.id !== id));
          } else {
            setSentMessages((prev) => prev.filter((m) => m.id !== id));
          }
          showToast("쪽지가 삭제되었습니다.");
          setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          showToast("삭제 실패", "error");
        }
      },
    });
  };

  const EmptyState = ({ icon: Icon, text }) => (
    <div className="flex flex-col items-center justify-center h-64 text-slate-300 dark:text-slate-700 space-y-4 animate-fade-in">
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800">
        <Icon className="text-3xl opacity-30 dark:text-sky-400" />
      </div>
      <p className="text-[11px] font-black tracking-[0.2em] uppercase opacity-60 dark:text-slate-400">
        {text}
      </p>
    </div>
  );

  const StatusBadge = ({ petName }) => {
    const isOnline = onlinePets.includes(petName);
    return (
      <span
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase transition-all ${isOnline ? "bg-sky-50 text-sky-600 dark:bg-sky-400 dark:text-slate-950 border border-sky-100 dark:border-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.2)]" : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-100 dark:border-slate-700"}`}
      >
        <span
          className={`w-1 h-1 rounded-full ${isOnline ? "bg-sky-400 dark:bg-slate-950 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`}
        />
        {isOnline ? "Online" : "Offline"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#0b0f1a]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-[#0b0f1a] transition-colors duration-500 font-sans overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-100 dark:bg-sky-400/5 rounded-full blur-[120px] pointer-events-none opacity-60"></div>

      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 lg:top-8 lg:right-8 p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-sky-400 z-[60] shadow-sm transition-all"
      >
        {isDarkMode ? (
          <FiSun className="text-sm" />
        ) : (
          <FiMoon className="text-sm" />
        )}
      </button>

      <CommonSide activeMenu="친구" />

      <main className="flex-1 h-full overflow-y-auto custom-scrollbar px-6 py-12 lg:px-12 lg:py-16 bg-white dark:bg-[#0b0f1a] transition-all scroll-smooth pb-40 relative z-10">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          <header className="mb-10 text-center lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase leading-none">
              Friend{" "}
              <span className="text-sky-400 dark:text-sky-400 font-sans not-italic">
                List .
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 italic">
              Manage your social network
            </p>
          </header>

          <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 rounded-2xl mb-8 overflow-x-auto no-scrollbar flex-shrink-0 shadow-inner">
            {[
              {
                id: "friends",
                label: "친구",
                icon: FiUsers,
                count: friendsList.length,
              },
              {
                id: "messages",
                label: "쪽지",
                icon: FiMail,
                count: receivedMessages.filter((m) => !m.is_read).length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-max flex justify-center items-center gap-2 py-3 px-5 rounded-xl text-[11px] lg:text-[12px] font-black tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 shadow-xl" : "text-slate-400 hover:text-slate-900 dark:hover:text-sky-300"}`}
              >
                <tab.icon className="text-base opacity-80" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${activeTab === tab.id ? "bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 animate-fade-in-up">
            {activeTab === "friends" &&
              (friendsList.length === 0 ? (
                <EmptyState icon={FiUsers} text="등록된 친구가 없습니다" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friendsList.map((friend) => (
                    <div
                      key={friend.request_id}
                      className="group p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] transition-all flex items-center justify-between shadow-sm hover:border-sky-100 dark:hover:border-sky-900 hover:shadow-xl"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-[1.2rem] flex items-center justify-center border border-slate-100 dark:border-slate-700 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                          {friend.pet_color ? (
                            new Pet({ color: friend.pet_color }).draw(
                              "w-8 h-8 drop-shadow-sm",
                            )
                          ) : (
                            <FiSmile className="text-sky-400 text-xl" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 dark:text-slate-100 text-[14px] uppercase tracking-tighter">
                            {friend.pet_name || `User #${friend.user_id}`}
                          </h3>
                          <div className="mt-1">
                            <StatusBadge petName={friend.pet_name} petId={friend.pet_id} />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedFriend(friend);
                            setIsMessageModalOpen(true);
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-sky-50 dark:bg-sky-900/40 hover:bg-sky-500 dark:hover:bg-sky-400 text-sky-500 dark:text-sky-300 hover:text-white dark:hover:text-slate-950 rounded-2xl transition-all border border-transparent shadow-sm"
                          title="쪽지 보내기"
                        >
                          <FiSend className="text-sm" />
                        </button>
                        <button
                          onClick={() =>
                            handleRejectOrDelete(
                              friend.request_id,
                              friend.pet_name,
                              true,
                            )
                          }
                          className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-100 text-slate-400 hover:text-white dark:hover:text-slate-900 rounded-2xl transition-all border border-transparent shadow-sm"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {activeTab === "messages" && (
              <div className="flex flex-col gap-4">
                {/* 쪽지 서브 탭 UI */}
                <div className="flex gap-2 mb-4 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl w-fit">
                  <button
                    onClick={() => setMessageSubTab("received")}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${messageSubTab === "received" ? "bg-white dark:bg-slate-900 text-sky-500 shadow-sm" : "text-slate-400"}`}
                  >
                    Received
                  </button>
                  <button
                    onClick={() => setMessageSubTab("sent")}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${messageSubTab === "sent" ? "bg-white dark:bg-slate-900 text-sky-500 shadow-sm" : "text-slate-400"}`}
                  >
                    Sent
                  </button>
                </div>

                {(messageSubTab === "received" ? receivedMessages : sentMessages).length === 0 ? (
                  <EmptyState icon={FiMail} text={messageSubTab === "received" ? "받은 쪽지가 없습니다" : "보낸 쪽지가 없습니다"} />
                ) : (
                  <div className="space-y-4">
                    {(messageSubTab === "received" ? receivedMessages : sentMessages).map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => messageSubTab === "received" && !msg.is_read && handleMarkAsRead(msg.id)}
                        className={`p-6 bg-white dark:bg-slate-900/50 border ${messageSubTab === "received" && msg.is_read ? "border-slate-100 dark:border-slate-800 opacity-60" : "border-sky-100 dark:border-sky-900/50 shadow-lg shadow-sky-500/5"} rounded-[2rem] transition-all flex items-start gap-4 text-left cursor-pointer hover:border-sky-400`}
                      >
                        <div
                          className={`w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center border ${messageSubTab === "received" && msg.is_read ? "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700" : "bg-sky-50 dark:bg-sky-900/40 border-sky-100 dark:border-sky-800"}`}
                        >
                          {(messageSubTab === "received" ? msg.sender_pet_color : msg.receiver_pet_color) ? (
                            new Pet({ color: messageSubTab === "received" ? msg.sender_pet_color : msg.receiver_pet_color }).draw(
                              "w-8 h-8",
                            )
                          ) : (
                            <FiMail className="text-sky-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="font-black text-slate-900 dark:text-white text-[13px] uppercase tracking-tighter">
                              {messageSubTab === "received" ? (
                                <>
                                  {msg.sender_pet_name}
                                  {!msg.is_read && (
                                    <span className="ml-2 w-1.5 h-1.5 bg-sky-400 rounded-full inline-block animate-pulse" />
                                  )}
                                </>
                              ) : (
                                `To: ${msg.receiver_pet_name}`
                              )}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600">
                              {new Date(msg.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed break-keep line-clamp-2">
                            {msg.content}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(msg.id);
                          }}
                          className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <FiTrash2 size={14} />
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

      <MessageSendModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        receiverId={selectedFriend?.user_id}
        receiverPetName={selectedFriend?.pet_name}
        senderPetName={myPetName}
        senderPetColor={myPetColor}
        onMessageSuccess={(target) => {
          showToast(`${target}님에게 쪽지를 보냈습니다! 💌`);
          fetchFriendsData(); // 쪽지 리스트 갱신
        }}
      />

      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-[320px] rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-scale-in">
            <div className="w-14 h-14 bg-slate-900 dark:bg-sky-400 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-sky-400 dark:text-slate-950 border border-slate-800 dark:border-sky-300">
              <FiAlertCircle className="text-2xl" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">
              {alertConfig.title}
            </h2>
            <p className="text-[12px] font-bold text-slate-400 dark:text-slate-400 mb-8 leading-relaxed whitespace-pre-wrap">
              {alertConfig.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setAlertConfig({ ...alertConfig, isOpen: false })
                }
                className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                취소
              </button>
              <button
                onClick={alertConfig.onConfirm}
                className="flex-1 py-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all"
              >
                네
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 z-[110] flex flex-col gap-3 pointer-events-none">
        {notifications.map((noti) => (
          <div
            key={noti.id}
            onClick={() => dismissToast(noti.id)}
            className={`bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 shadow-2xl rounded-[1.8rem] py-4 px-6 flex items-center gap-4 pointer-events-auto transition-all cursor-pointer ${noti.isExiting ? "animate-toast-out" : "animate-toast-in"}`}
          >
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${noti.type === "error" ? "bg-slate-900 dark:bg-slate-800 text-slate-100" : "bg-sky-50 dark:bg-sky-900/30 text-sky-400"}`}
            >
              <FiCheck className="text-lg" />
            </div>
            <span className="text-[13px] font-black text-slate-700 dark:text-slate-100 tracking-tight">
              {noti.message}
            </span>
          </div>
        ))}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
};

export default FriendPage;
