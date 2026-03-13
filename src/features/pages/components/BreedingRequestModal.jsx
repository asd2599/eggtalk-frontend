import React, { useState } from "react";
import { FiX, FiHeart, FiCheck } from "react-icons/fi";
import socket from "../../../utils/socket";

const BreedingRequestModal = ({
  isOpen,
  onClose,
  roomId,
  requesterPetName,
  receiverPetName,
  isSender,
}) => {
  const [processing, setProcessing] = useState(false);

  // 교배 수락 핸들러 (받는 사람만 호출 가능)
  const handleAccept = () => {
    setProcessing(true);
    // 소켓을 통해 교배 수락 알림 전송 (이후 서버가 둘 다 리다이렉트 시킴)
    socket.emit("accept_breeding_request", {
      roomId,
      requesterPetName,
      receiverPetName,
    });
    // onClose는 하지 않음 (리다이렉트 될 것이므로 로딩 화면 유지)
  };

  // 교배 거절 핸들러 (받는 사람만)
  const handleReject = () => {
    setProcessing(true);
    socket.emit("reject_breeding_request", {
      roomId,
      requesterPetName,
      receiverPetName,
    });
    setProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col items-center p-10 border border-slate-100 dark:border-slate-800">
        {/* 상단 아이콘 */}
        <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/30 rounded-3xl flex items-center justify-center shadow-xl mb-8 transition-colors">
          <FiHeart className="text-sky-400 dark:text-sky-500 text-4xl animate-pulse" />
        </div>

        {/* 텍스트 영역 */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-3 italic uppercase tracking-tighter">
            {isSender ? "교배 신청 대기 중..." : "새로운 교배 요청"}{" "}
            <span className="text-sky-400 font-sans not-italic">.</span>
          </h2>
          <p className="text-[13px] font-bold text-slate-400 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {isSender ? (
              <>
                <span className="text-sky-500 dark:text-sky-400 font-black text-base">
                  {receiverPetName}
                </span>{" "}
                님의 응답을 기다리고 있습니다!
              </>
            ) : (
              <>
                <span className="text-sky-500 dark:text-sky-400 font-black text-base">
                  {requesterPetName}
                </span>{" "}
                님이 사랑의 교배를 원합니다!
              </>
            )}
          </p>
        </div>

        {/* 버튼 영역 (받는 사람에게만 보임) */}
        {!isSender && (
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
              className="flex-1 py-4 bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 font-black text-[11px] rounded-2xl shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest italic disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FiCheck className="text-base" />
              수락
            </button>
          </div>
        )}

        {/* 보내는 사람은 취소 버튼만 */}
        {isSender && (
          <button
            onClick={onClose}
            className="w-full py-4 text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[11px] uppercase tracking-widest transition-all"
          >
            취소하기
          </button>
        )}

        {/* 오버레이 로딩 */}
        {processing && !isSender && (
          <div className="absolute inset-0 bg-white/60 dark:bg-[#0b0f1a]/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-10 h-10 border-[3px] border-slate-100 dark:border-slate-800 border-t-sky-400 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BreedingRequestModal;