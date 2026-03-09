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
      const response = await api.put("/api/friends/accept", {
        request_id: requestId,
      });

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
      const response = await api.put("/api/friends/reject", {
        request_id: requestId,
      });

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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col items-center p-10 border border-slate-100 dark:border-slate-800">
        
        {/* 상단 아이콘 */}
        <div className="w-20 h-20 bg-slate-900 dark:bg-sky-400 rounded-3xl flex items-center justify-center shadow-xl mb-8 transition-colors">
          <FiUserPlus className="text-sky-300 dark:text-slate-950 text-4xl" />
        </div>

        {/* 텍스트 영역 */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-3 italic uppercase tracking-tighter">
            새로운 친구 요청 <span className="text-sky-400 font-sans not-italic">.</span>
          </h2>
          <p className="text-[13px] font-bold text-slate-400 dark:text-slate-300 leading-relaxed">
            <span className="text-sky-500 dark:text-sky-400 font-black text-base">
              {requesterPetName}
            </span>
            님이
            <br />
            친구를 맺고 싶어 합니다!
          </p>
        </div>

        {/* 버튼 영역 */}
        <div className="flex w-full gap-4">
          <button
            onClick={handleReject}
            disabled={processing}
            className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-400 font-black text-[11px] rounded-2xl transition-all uppercase tracking-widest disabled:opacity-50"
          >
            거절
          </button>
          <button
            onClick={handleAccept}
            disabled={processing}
            className="flex-1 py-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 font-black text-[11px] rounded-2xl shadow-xl shadow-sky-500/10 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest italic disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiCheck className="text-base" />
            수락
          </button>
        </div>

        {/* 오버레이 로딩 */}
        {processing && (
          <div className="absolute inset-0 bg-white/60 dark:bg-[#0b0f1a]/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-10 h-10 border-[3px] border-slate-100 dark:border-slate-800 border-t-sky-400 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendRequestModal;