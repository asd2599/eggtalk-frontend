import React, { useState } from "react";
import { FiX, FiGift, FiAlertCircle } from "react-icons/fi";
import { api } from "../../../utils/config";
import { useGift } from "../../../contexts/GiftContext";

const GiftModal = ({ isOpen, onClose, targetPetName, onGiftSuccess }) => {
  const { giftList, loading, error } = useGift();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedGift, setSelectedGift] = useState(null);

  // 커스텀 Alert 상태 관리
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const handleSelectGift = (gift) => {
    if (selectedGift?.id === gift.id) {
      setSelectedGift(null);
    } else {
      setSelectedGift(gift);
    }
  };

  // 커스텀 Alert
  const handleSendGift = async () => {
    if (!selectedGift) return;
    if (!targetPetName) {
      alert("대상을 찾을 수 없습니다.");
      return;
    }

    setAlertConfig({
      isOpen: true,
      title: "교감 시도",
      message: `${targetPetName}에게 [${selectedGift.name}]을(를) 선물하시겠습니까?`,
      onConfirm: async () => {
        setAlertConfig((prev) => ({ ...prev, isOpen: false })); // Alert 먼저 닫기
        setSending(true);
        try {
          const response = await api.post("/api/pets/gift", {
            targetPetName,
            giftName: selectedGift.name,
            stats: selectedGift.stats,
            message: message.trim(),
          });

          if (response.status === 200) {
            // ✅ 성공 처리: 스탯 정보와 AI 답장(reply)을 모두 상위 컴포넌트로 전달
            if (onGiftSuccess) {
              onGiftSuccess(
                selectedGift.name,
                targetPetName,
                message.trim(),
                response.data.reply,
                selectedGift.stats, // 증감 스탯 정보를 함께 전달해서 UI에 반영
              );
            }
            // 입력창 초기화 및 모달 닫기
            setMessage("");
            setSelectedGift(null);
            onClose();
          }
        } catch (err) {
          console.error("교감 시도하기 에러:", err);
          const errMsg = err.response?.data?.message || err.message;
          alert(`교감 시도하기 실패: ${errMsg}`);
        } finally {
          setSending(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] border border-slate-100 dark:border-slate-800">
        <div className="px-7 py-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-sky-50/50 to-white dark:from-slate-900/50 dark:to-[#0b0f1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 dark:bg-slate-100 rounded-xl flex items-center justify-center shadow-lg">
              <FiGift className="text-sky-300 dark:text-slate-900 text-lg" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                교감하기{" "}
                <span className="text-sky-400 font-sans not-italic">.</span>
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                <span className="text-sky-500 font-black">{targetPetName}</span>
                과 마음을 나누어 보세요!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-100 dark:border-slate-700"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#0b0f1a]">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-2 border-slate-100 border-t-sky-400 rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FiAlertCircle className="text-4xl text-rose-400/50 mb-3" />
              <p className="font-black text-[11px] uppercase tracking-widest text-rose-500">
                {error}
              </p>
            </div>
          ) : giftList.length === 0 ? (
            <div className="text-center py-16 text-slate-300 dark:text-slate-700 font-black uppercase tracking-[0.3em] text-[9px]">
              교감할 아이템이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {giftList.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => handleSelectGift(gift)}
                  disabled={sending}
                  className={`group p-4 rounded-[1.8rem] border transition-all text-left flex gap-3.5 items-start active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                    selectedGift?.id === gift.id
                      ? "bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-white shadow-xl"
                      : "bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/60 hover:shadow-lg hover:border-sky-200 dark:hover:border-sky-900/50"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner ${
                      selectedGift?.id === gift.id
                        ? "bg-slate-800 dark:bg-slate-200"
                        : "bg-white dark:bg-slate-800"
                    }`}
                  >
                    <img
                      src={gift.iconUrl}
                      alt={gift.name}
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://api.iconify.design/mdi:gift.svg?color=%237dd3fc";
                      }}
                    />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <h3
                      className={`font-black truncate text-[14px] tracking-tight ${
                        selectedGift?.id === gift.id
                          ? "text-white dark:text-slate-900"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {gift.name}
                    </h3>
                    <p
                      className={`text-[10px] font-bold truncate mt-0.5 ${
                        selectedGift?.id === gift.id
                          ? "text-sky-200 dark:text-slate-500"
                          : "text-slate-400"
                      }`}
                    >
                      {gift.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {gift.rawMainStat && (
                        <span
                          className={`px-2 py-0.5 text-[8px] font-black rounded-full tracking-tighter uppercase ${
                            selectedGift?.id === gift.id
                              ? "bg-sky-400 text-slate-900"
                              : "bg-sky-50 dark:bg-sky-900/20 text-sky-500"
                          }`}
                        >
                          {gift.rawMainStat}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedGift && (
          <div className="px-7 py-5 border-t border-slate-50 dark:border-slate-800 bg-white dark:bg-[#0b0f1a] shrink-0 flex flex-col gap-3">
            <div className="animate-fade-in-up">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 mb-2 px-1 uppercase tracking-widest italic">
                💌 펫에게 보낼 메시지 (선택사항)
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending || loading}
                placeholder="전하고 싶은 말을 입력하세요..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white text-[12px] px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900/50 transition-all font-bold placeholder-slate-300 dark:placeholder-slate-700 shadow-inner"
                maxLength={100}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sending) handleSendGift();
                }}
              />
            </div>
            <button
              onClick={handleSendGift}
              disabled={sending || loading}
              className="w-full py-3.5 bg-slate-900 dark:bg-slate-100 hover:scale-[1.01] active:scale-[0.99] text-white dark:text-slate-900 font-black text-[11px] rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-[0.1em] italic"
            >
              <FiGift className="text-base" />
              교감 시도!
            </button>
          </div>
        )}

        {sending && (
          <div className="absolute inset-0 bg-[#0b0f1a]/80 backdrop-blur-md flex flex-col items-center justify-center z-[150] animate-fade-in">
            <div className="w-10 h-10 border-[3px] border-sky-900 border-t-sky-400 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(125,211,252,0.3)]"></div>
            <p className="font-black text-sky-400 animate-pulse text-[10px] tracking-[0.4em] uppercase italic">
              펫과 교감 중...
            </p>
          </div>
        )}
      </div>

      {/* 커스텀 Alert 모달 */}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-[320px] rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-scale-in">
            <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-sky-500">
              <FiAlertCircle className="text-2xl" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">
              {alertConfig.title}
            </h2>
            <p className="text-[12px] font-bold text-slate-400 dark:text-slate-500 mb-8 leading-relaxed whitespace-pre-wrap">
              {alertConfig.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setAlertConfig({ ...alertConfig, isOpen: false })
                }
                className="flex-1 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                아니오
              </button>
              <button
                onClick={alertConfig.onConfirm}
                className="flex-1 py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all"
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftModal;
