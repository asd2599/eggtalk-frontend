import React, { useState, useEffect } from "react";
import { FiMessageSquare, FiX } from "react-icons/fi";

const GiftReplyModal = ({ isOpen, replyMsg, targetName, stats, onClose }) => {
  const [randomMsg, setRandomMsg] = useState("");

  // ✅ 스탯별 맞춤 문구 데이터베이스
  const customMessages = {
    affection: [
      "너의 마음이 느껴져... 나도 네가 정말 좋아! ❤️",
      "에헤헤, 우리 사이가 더 돈독해진 것 같아!",
      "이렇게 사랑받아도 되는 거야? 행복해!"
    ],
    knowledge: [
      "오! 뭔가 머릿속이 맑아지는 기분이야. 지식이 늘었어!",
      "새로운 걸 배우는 건 언제나 즐거워. 고마워!",
      "나 이제 조금 더 똑똑해진 것 같지 않아?"
    ],
    stress: [
      "후아... 덕분에 쌓였던 스트레스가 싹 풀리는 기분이야!",
      "마음이 정말 편안해졌어. 고마워, 릴랙스~ 🌿",
      "기분이 날아갈 것 같아! 걱정이 다 사라졌어."
    ],
    healthHp: [
      "기운이 펄펄 나! 몸이 아주 튼튼해진 것 같아!",
      "에너지가 충전됐어! 고마워, 힘이 불끈불끈해!",
      "컨디션 최고! 역시 너밖에 없어."
    ],
    default: [
      "정말 고마워! 기분이 너무 좋아.",
      "와아! 나 주려고 준비한 거야? 감동이야!",
      "히히, 역시 나를 제일 잘 아는 건 너뿐이야!"
    ]
  };

  useEffect(() => {
    if (isOpen) {
      // 1. 서버에서 온 특별한 메시지가 있다면 그걸 보여줌
      if (replyMsg) {
        setRandomMsg(replyMsg);
        return;
      }

      // 2. 어떤 스탯이 가장 많이 올랐는지 확인
      let topStat = "default";
      if (stats && typeof stats === "object") {
        // stats 객체에서 가장 높은 값을 가진 키를 찾음
        const entries = Object.entries(stats);
        if (entries.length > 0) {
          // [ ["affection", 5], ["stress", -2] ] 형태에서 숫자가 큰 것을 찾음
          const sorted = entries.sort((a, b) => b[1] - a[1]);
          topStat = sorted[0][0]; 
        }
      }

      // 3. 해당 스탯 문구 세트 선택 (없으면 default)
      const messagePool = customMessages[topStat] || customMessages.default;
      const randomIndex = Math.floor(Math.random() * messagePool.length);
      setRandomMsg(messagePool[randomIndex]);
    }
  }, [isOpen, replyMsg, stats]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-[340px] rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col border border-slate-100 dark:border-slate-800 animate-scale-in">
        
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-sky-50/50 to-white dark:from-slate-900/50 dark:to-[#0b0f1a]">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center shadow-inner">
               <FiMessageSquare className="text-sky-400 text-lg" />
             </div>
             <div className="text-left">
               <h2 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                 교감 성공 <span className="text-sky-400 font-sans not-italic">!</span>
               </h2>
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                 <span className="text-sky-500 font-black">{targetName}</span>의 반응
               </p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-100 dark:border-slate-700">
             <FiX className="text-lg" />
           </button>
        </div>

        {/* 바디 */}
        <div className="p-8 text-center bg-white dark:bg-[#0b0f1a]">
           <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl mt-2 border border-slate-100 dark:border-slate-800 shadow-inner">
             <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
               "{randomMsg}"
             </p>
           </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-5 bg-white dark:bg-[#0b0f1a] border-t border-slate-50 dark:border-slate-800 flex justify-center">
            <button onClick={onClose} className="w-full py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-[11px] rounded-xl uppercase tracking-[0.1em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
               닫기
            </button>
        </div>
      </div>
    </div>
  );
};

export default GiftReplyModal;