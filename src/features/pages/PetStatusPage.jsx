import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiGift, FiActivity, FiSmile } from "react-icons/fi"; // ✅ FiGift, FiSmile 추가
import GiftModal from "./components/GiftModal";
import GiftReplyModal from "./components/GiftReplyModal";

const PetStatusPage = ({ petData }) => {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [replyModalData, setReplyModalData] = useState({
    isOpen: false,
    replyMsg: "",
    targetName: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(Math.min(Math.max(((petData?.exp || 0) / 100) * 100, 0), 100));
    }, 100);
    return () => clearTimeout(timer);
  }, [petData?.exp]);

  return (
    <div className="w-full max-w-[950px] mx-auto transition-all duration-500 font-sans">
      <div className="bg-white dark:bg-[#0b0f1a] rounded-[3rem] lg:rounded-[4rem] p-8 lg:p-14 shadow-2xl lg:shadow-none border border-slate-100 dark:border-slate-900 flex flex-col lg:flex-row gap-12 lg:gap-20 items-stretch h-auto min-h-max mb-1 transition-colors duration-500 overflow-hidden relative z-10">
        
        {/* 배경 은은한 광채 */}
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-sky-100 dark:bg-sky-400/5 rounded-full blur-[100px] pointer-events-none opacity-50"></div>

        {/* [왼쪽 프로필 영역] */}
        <div className="w-full lg:w-[320px] flex flex-col items-center lg:items-stretch flex-shrink-0">
          <div className="aspect-square w-full max-w-[260px] lg:max-w-none bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-slate-800 mb-8 flex items-center justify-center shadow-inner relative overflow-hidden group">
            {petData && petData.draw("w-40 h-40 lg:w-52 lg:h-52 group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl")}
          </div>

          <div className="text-center lg:text-left mb-10">
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none uppercase">{petData?.name}</h2>
            <div className="flex items-center justify-center lg:justify-start gap-2 mt-3">
              <span className="text-[10px] lg:text-[11px] text-sky-400 font-black uppercase tracking-[0.3em]">Level {petData?.level}</span>
              <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{petData?.tendency}</span>
            </div>
          </div>

          <div className="w-full space-y-8">
            <div className="space-y-3 px-1">
              <div className="flex justify-between items-end px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FiActivity /> Status EXP</span>
                <span className="text-[11px] font-black text-sky-400">{Math.floor(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-800">
                <div className="h-full bg-sky-200 dark:bg-sky-900 shadow-[0_0_10px_rgba(186,230,253,0.3)] transition-all duration-1000" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* ✅ [수정] 교감 & 아기 버튼 나란히 배치 */}
            <div className="flex justify-center gap-3">
              {/* 교감 버튼 (아이콘 변경: FiGift) */}
              <button 
                onClick={() => setIsGiftModalOpen(true)} 
                className="flex-1 flex flex-col items-center justify-center py-4 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-sky-200 dark:hover:border-sky-900 transition-all active:scale-95 group shadow-sm max-w-[100px]"
              >
                <FiGift className="text-[18px] text-slate-300 mb-1.5 transition-colors duration-300 group-hover:text-sky-400" />
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white uppercase tracking-tighter">
                  교감
                </span>
              </button>

              {/* 아기 메뉴 버튼 (새로 추가) */}
              <button 
                onClick={() => navigate("/child-room")} 
                className="flex-1 flex flex-col items-center justify-center py-4 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-sky-200 dark:hover:border-sky-900 transition-all active:scale-95 group shadow-sm max-w-[100px]"
              >
                <FiSmile className="text-[18px] text-slate-300 mb-1.5 transition-colors duration-300 group-hover:text-sky-400" />
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white uppercase tracking-tighter">
                  아기
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* [오른쪽 상세 스탯 영역] */}
        <div className="flex-1 flex flex-col gap-10">
          {[
            { title: "Survival Analytics", stats: [{ label: "체력", value: petData?.healthHp }, { label: "배고픔", value: petData?.hunger }, { label: "청결도", value: petData?.cleanliness }, { label: "스트레스", value: petData?.stress }] },
            { title: "Cognitive Matrix", stats: [{ label: "애정도", value: petData?.affection }, { label: "지식", value: petData?.knowledge }, { label: "공감", value: petData?.empathy }, { label: "논리", value: petData?.logic }, { label: "이타성", value: petData?.altruism }] },
            { title: "Behavioral Profile", stats: [{ label: "외향성", value: petData?.extroversion }, { label: "개방성", value: petData?.openness }, { label: "직설성", value: petData?.directness }, { label: "호기심", value: petData?.curiosity }, { label: "유머", value: petData?.humor }] }
          ].map((section, idx) => (
            <section key={idx}>
              <h3 className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em] mb-6 flex items-center gap-3 italic">
                <span className="h-[1px] w-4 bg-slate-200 dark:bg-slate-800"></span>
                {section.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-6">
                {section.stats.map((stat, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-3 group cursor-default">
                    <span className="text-[12px] text-slate-500 dark:text-slate-400 font-bold group-hover:text-slate-900 dark:group-hover:text-sky-100 transition-colors w-14 shrink-0">{stat.label}</span>
                    <div className="flex-1 h-0.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden relative border border-slate-200/20">
                      <div 
                        className="h-full bg-sky-200 dark:bg-sky-900 transition-all duration-1000 shadow-[0_0_8px_rgba(224,242,254,0.3)]" 
                        style={{ width: `${stat.value}%` }} 
                      />
                    </div>
                    <span className="text-[12px] font-black text-slate-400 dark:text-slate-500 font-mono w-8 text-right group-hover:text-sky-400 transition-colors shrink-0">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <GiftModal 
        isOpen={isGiftModalOpen} 
        onClose={() => setIsGiftModalOpen(false)} 
        targetPetName={petData?.name} 
        onGiftSuccess={(giftName, targetName, msg, reply) => {
          setReplyModalData({
            isOpen: true,
            replyMsg: reply,
            targetName: targetName,
          });
        }} 
      />

      <GiftReplyModal 
        isOpen={replyModalData.isOpen} 
        replyMsg={replyModalData.replyMsg} 
        targetName={replyModalData.targetName} 
        onClose={() => setReplyModalData({ ...replyModalData, isOpen: false })} 
      />
    </div>
  );
};

export default PetStatusPage;