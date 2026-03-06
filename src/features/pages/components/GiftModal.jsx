import React, { useState } from "react";
import { FiX, FiGift, FiAlertCircle } from "react-icons/fi";
import { api } from "../../../utils/config";
import { useGift } from "../../../contexts/GiftContext";

const GiftModal = ({ isOpen, onClose, targetPetName, onGiftSuccess }) => {
  const { giftList, loading, error } = useGift();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedGift, setSelectedGift] = useState(null);

  const handleSendGift = async () => {
    if (!selectedGift) return;
    if (!targetPetName) {
      alert("대상을 찾을 수 없습니다.");
      return;
    }

    if (
      window.confirm(
        `${targetPetName}에게 [${selectedGift.name}]을(를) 선물하시겠습니까?`,
      )
    ) {
      setSending(true);
      try {
        // 백엔드로 대상 펫 이름과 변경할 스테이터스 전송
        const response = await api.post("/api/pets/gift", {
          targetPetName,
          giftName: selectedGift.name,
          stats: selectedGift.stats,
          message: message.trim(),
        });

        if (response.status === 200) {
          // 성공 처리 (상위 컴포넌트로 알림 이벤트 발송 등)
          if (onGiftSuccess) {
            onGiftSuccess(
              selectedGift.name,
              targetPetName,
              message.trim(),
              response.data.reply,
              selectedGift.stats, // 증감 스탯 정보를 함께 전달
            );
          }
          setMessage(""); // 텍스트 초기화
          setSelectedGift(null);
          onClose(); // 성공 시 자동으로 모달 닫기
        }
      } catch (err) {
        console.error("선물 보내기 에러:", err);
        const errMsg = err.response?.data?.message || err.message;
        alert(`선물 보내기 실패: ${errMsg}`);
      } finally {
        setSending(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30">
              <FiGift className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                선물하기
              </h2>
              <p className="text-xs text-gray-500 font-bold">
                <span className="text-pink-500">{targetPetName}</span>에게
                마음을 전달하세요!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* 모달 바디 (목록) */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50 dark:bg-[#0b0f1a]">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FiAlertCircle className="text-4xl text-red-400 mb-3 opacity-50" />
              <p className="font-bold text-sm text-red-500">{error}</p>
            </div>
          ) : giftList.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-bold text-sm">
              현재 준비된 선물이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {giftList.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => setSelectedGift(gift)}
                  disabled={sending}
                  className={`group p-5 rounded-[2rem] border shadow-sm transition-all text-left flex gap-4 items-start active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                    selectedGift?.id === gift.id
                      ? "bg-pink-50 dark:bg-pink-900/20 border-pink-400 ring-2 ring-pink-400/50"
                      : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-pink-300 dark:hover:border-pink-500/50"
                  }`}
                >
                  {/* 아이콘 이미지 영역 (Iconify URL 사용) */}
                  <div className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl flex-shrink-0 flex items-center justify-center pt-1 group-hover:scale-110 transition-transform shadow-inner">
                    <img
                      src={gift.iconUrl}
                      alt={gift.name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        // 이미지 로드 실패 시 대체 아이콘 처리
                        e.target.onerror = null;
                        e.target.src =
                          "https://api.iconify.design/mdi:gift.svg?color=%23f472b6";
                      }}
                    />
                  </div>

                  {/* 선물 정보 */}
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate text-[15px] group-hover:text-pink-500 transition-colors">
                      {gift.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {gift.description}
                    </p>

                    {/* 능력치 배지 */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {gift.rawMainStat && (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full tracking-tighter">
                          {gift.rawMainStat}
                        </span>
                      )}
                      {gift.rawSubStat && (
                        <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-black rounded-full tracking-tighter">
                          {gift.rawSubStat}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 선물 메시지 입력 영역 (선물이 선택되었을 때만 노출) */}
        {selectedGift && (
          <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 px-1">
                💌 [{selectedGift.name}] 선물과 함께 보낼 메시지 (선택사항)
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending || loading}
                placeholder="상대방 펫에게 전하고 싶은 말을 적어주세요..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-[13px] px-5 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all font-medium placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
                maxLength={100}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sending) {
                    handleSendGift();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSendGift}
              disabled={sending || loading}
              className="w-full py-4 mt-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:from-pink-700 active:to-rose-700 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FiGift className="text-lg" />
              보내기
            </button>
          </div>
        )}

        {/* 하단 푸터 (로딩 오버레이) */}
        {sending && (
          <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="w-10 h-10 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin shadow-lg"></div>
            <p className="mt-4 font-black text-pink-600 dark:text-pink-400 animate-pulse text-sm">
              로켓 배송 중...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GiftModal;
