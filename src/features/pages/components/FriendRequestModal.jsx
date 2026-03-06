import React, { useState } from "react";
import { FiX, FiUserPlus, FiCheck } from "react-icons/fi";
import { api } from "../../../utils/config";

const FriendRequestModal = ({
  isOpen,
  onClose,
  requesterPetName,
  requestId,
  onFriendSuccess,
}) => {
  const [processing, setProcessing] = useState(false);

  // 친구 수락 핸들러
  const handleAccept = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.put(
        "/api/friends/accept",
        { request_id: requestId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.status === 200) {
        if (onFriendSuccess) {
          onFriendSuccess(requesterPetName, true); // true: 수락
        }
        onClose();
      }
    } catch (err) {
      console.error("친구 수락 에러:", err);
      const errMsg = err.response?.data?.message || err.message;
      alert(`친구 수락 실패: ${errMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  // 친구 거절 핸들러
  const handleReject = async () => {
    if (!window.confirm("정말 친구 요청을 거절하시겠습니까?")) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.put(
        "/api/friends/reject",
        { request_id: requestId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.status === 200) {
        if (onFriendSuccess) {
          onFriendSuccess(requesterPetName, false); // false: 거절
        }
        onClose();
      }
    } catch (err) {
      console.error("친구 거절 에러:", err);
      const errMsg = err.response?.data?.message || err.message;
      alert(`친구 거절 실패: ${errMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col items-center p-8">
        {/* 상단 아이콘 */}
        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 animate-bounce-slight">
          <FiUserPlus className="text-white text-3xl ml-1" />
        </div>

        {/* 텍스트 영역 */}
        <div className="text-center mb-8">
          <h2 className="text-[1.2rem] font-black text-gray-900 dark:text-white leading-tight mb-2">
            새로운 친구 요청
          </h2>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
            <span className="text-indigo-500 dark:text-indigo-400 text-base">
              {requesterPetName}
            </span>
            님이
            <br />
            친구를 맺고 싶어 합니다!
          </p>
        </div>

        {/* 버튼 영역 */}
        <div className="flex w-full gap-3">
          <button
            onClick={handleReject}
            disabled={processing}
            className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <FiX className="text-lg" />
            거절
          </button>
          <button
            onClick={handleAccept}
            disabled={processing}
            className="flex-1 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <FiCheck className="text-lg" />
            수락
          </button>
        </div>

        {/* 오버레이 로딩 */}
        {processing && (
          <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin shadow-lg"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendRequestModal;
