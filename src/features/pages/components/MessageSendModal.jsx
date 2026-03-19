import React, { useState } from "react";
import { FiSend, FiX, FiAlertCircle, FiCheck } from "react-icons/fi";
import api from "../../../utils/config";
import socket from "../../../utils/socket";

const MessageSendModal = ({ isOpen, onClose, receiverId, receiverPetName, senderPetName, senderPetColor, onMessageSuccess }) => {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSending(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/api/messages",
        { receiver_id: receiverId, content: content.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        // 소켓 실시간 알림 전송 (DB 저장된 ID와 함께 전송)
        socket.emit("send_direct_message", {
          ...res.data.data,
          sender_pet_name: senderPetName,
          sender_pet_color: senderPetColor,
          receiverPetName: receiverPetName // 수신 소켓 조회를 위해 필요
        });

        if (onMessageSuccess) onMessageSuccess(receiverPetName);
        setContent("");
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("쪽지 전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-md rounded-[2.5rem] p-8 lg:p-10 shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-in relative">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <FiX size={20} />
        </button>

        <div className="w-14 h-14 bg-slate-900 dark:bg-sky-400 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl shadow-sky-500/10">
          <FiSend className="text-xl text-sky-400 dark:text-slate-950" />
        </div>

        <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-1 leading-none">
          Send Message <span className="text-sky-400 font-sans not-italic">.</span>
        </h2>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-widest italic">
          To: <span className="text-slate-900 dark:text-sky-400">{receiverPetName}</span>
        </p>

        <form onSubmit={handleSend} className="space-y-6">
          <div className="relative group">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="친구에게 전할 메시지를 입력하세요..."
              className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 dark:text-white font-bold text-[13px] shadow-inner transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 h-32 resize-none"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sky-500 text-[11px] font-bold bg-rose-50 dark:bg-sky-900/20 p-3 rounded-xl animate-shake">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:text-slate-900 dark:hover:text-slate-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isSending}
              className="flex-1 py-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-500/10 transition-all hover:scale-[1.02] disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiCheck className="text-sm" />
                  <span>전송하기</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageSendModal;
