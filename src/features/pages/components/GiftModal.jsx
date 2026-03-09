import React, { useState } from "react";
import { FiX, FiGift, FiAlertCircle } from "react-icons/fi";
import { api } from "../../../utils/config";
import { useGift } from "../../../contexts/GiftContext";

const GiftModal = ({ isOpen, onClose, targetPetName, onGiftSuccess }) => {
  const { giftList, loading, error } = useGift();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedGift, setSelectedGift] = useState(null);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const handleSelectGift = (gift) => {
    setSelectedGift(selectedGift?.id === gift.id ? null : gift);
  };

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
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        setSending(true);
        try {
          const response = await api.post("/api/pets/gift", {
            targetPetName,
            giftName: selectedGift.name,
            stats: selectedGift.stats,
            message: message.trim(),
          });

          if (response.status === 200) {
            onGiftSuccess?.(
              selectedGift.name,
              targetPetName,
              message.trim(),
              response.data.reply,
              selectedGift.stats
            );
            setMessage("");
            setSelectedGift(null);
            onClose();
          }
        } catch (err) {
          const errMsg = err.response?.data?.message || err.message;
          alert(`교감 시도하기 실패: ${errMsg}`);
        } finally {
          setSending(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  const statNameMap = {
    health_hp: "체력", hunger: "포만감", cleanliness: "청결도",
    stress: "스트레스", affection: "애정도", altruism: "이타심",
    empathy: "공감능력", knowledge: "지식", logic: "논리력",
    extroversion: "외향성", humor: "유머감각", openness: "개방성",
    directness: "솔직함", curiosity: "호기심",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800 transition-colors">
        
        {/* 상단 헤더 */}
        <div className="px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0b0f1a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 dark:bg-sky-400 rounded-xl flex items-center justify-center shadow-lg transition-colors">
              <FiGift className="text-sky-300 dark:text-slate-950 text-xl" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                교감하기 <span className="text-sky-400 font-sans not-italic">.</span>
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                <span className="text-sky-500 dark:text-sky-400 font-black">{targetPetName}</span>과 마음을 나누어 보세요!
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-100 dark:border-slate-800">
            <FiX className="text-lg" />
          </button>
        </div>

        {/* 리스트 영역 */}
        <div className="p-5 overflow-y-auto no-scrollbar flex-1 bg-white dark:bg-[#0b0f1a]">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-slate-100 dark:border-slate-800 border-t-sky-400 rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
              <FiAlertCircle className="text-5xl text-rose-400/50 mb-4" />
              <p className="font-black text-xs uppercase tracking-widest text-rose-500">{error}</p>
            </div>
          ) : giftList.length === 0 ? (
            <div className="text-center py-20 text-slate-300 dark:text-slate-700 font-black uppercase tracking-[0.3em] text-[9px] bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
              교감할 아이템이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
              {giftList.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => handleSelectGift(gift)}
                  disabled={sending}
                  className={`group p-4 rounded-[1.8rem] border transition-all text-left flex gap-3.5 items-start active:scale-95 disabled:opacity-50 ${
                    selectedGift?.id === gift.id
                      ? "bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-white shadow-2xl"
                      : "bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/60 hover:shadow-xl hover:border-sky-200"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all ${
                    selectedGift?.id === gift.id ? "bg-slate-800 dark:bg-slate-200" : "bg-slate-100 dark:bg-slate-700"
                  }`}>
                    <img src={gift.iconUrl} alt={gift.name} className="w-8 h-8 object-contain"
                      onError={(e) => { e.target.src = "https://api.iconify.design/mdi:gift.svg?color=%237dd3fc"; }} />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <h3 className={`font-black truncate text-[14px] tracking-tight ${selectedGift?.id === gift.id ? "text-white dark:text-slate-900" : "text-slate-900 dark:text-white"}`}>
                      {gift.name}
                    </h3>
                    <p className={`text-[10px] font-bold truncate mt-0.5 ${selectedGift?.id === gift.id ? "text-slate-300 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}>
                      {gift.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(gift.stats || {}).map(([key, val]) => (
                        <span key={key} className={`px-2 py-0.5 text-[8px] font-black rounded-full tracking-tighter uppercase ${
                          selectedGift?.id === gift.id ? "bg-sky-400 text-slate-900" : "bg-sky-50 dark:bg-sky-900/40 text-sky-500 dark:text-sky-300"
                        }`}>
                          {statNameMap[key] || key} {val > 0 ? `+${val}` : val}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 메시지 및 전송 버튼 */}
        {selectedGift && (
          <div className="px-7 pt-5 pb-10 lg:pb-7 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0b0f1a] flex flex-col gap-3 transition-colors">
            <div className="animate-fade-in-up">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-300 mb-2 px-1 uppercase tracking-widest italic">
                💌 펫에게 보낼 메시지 (선택사항)
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending || loading}
                placeholder="전하고 싶은 말을 입력하세요..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white text-[12px] px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all font-bold"
                onKeyDown={(e) => e.key === "Enter" && !sending && handleSendGift()}
              />
            </div>
            <button
              onClick={handleSendGift}
              disabled={sending || loading}
              className="w-full py-4 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 font-black text-[11px] rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-[0.1em] italic"
            >
              <FiGift className="text-base" /> 교감 시도!
            </button>
          </div>
        )}

        {/* 로딩 오버레이 & 커스텀 Alert 생략 (기존 로직과 동일) */}
        {/* ... (sending 로딩 처리 및 Alert 모달 코드는 기존과 동일하게 유지) ... */}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </div>
  );
};

export default GiftModal;