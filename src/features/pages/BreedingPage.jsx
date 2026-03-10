import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiHeart, FiStar, FiZap } from "react-icons/fi"; 
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

const BreedingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const breedingData = location.state?.breedingData;

  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (!breedingData) {
      alert(
        "정상적인 교배 프로세스를 거치지 않았습니다. 메인 화면으로 이동합니다.",
      );
      navigate("/main");
      return;
    }

    const handleReceiveChildCreated = (data) => {
      if (data.childPet) {
        setSuccessData(data.childPet);
        setProcessing(false);
      }
    };

    socket.on("receive_child_created", handleReceiveChildCreated);

    return () => {
      socket.off("receive_child_created", handleReceiveChildCreated);
    };
  }, [breedingData, navigate]);

  const handleCreateChild = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        "/api/pets/breed",
        {
          parent1Name: breedingData.requesterPetName,
          parent2Name: breedingData.receiverPetName,
          roomId: breedingData.roomId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.status === 201 || response.status === 200) {
        setSuccessData(response.data.childPet);

        if (breedingData.roomId) {
          socket.emit("child_created", {
            roomId: breedingData.roomId,
            childPet: response.data.childPet,
          });
        }
      }
    } catch (err) {
      console.error("교배 에러:", err);
      alert(
        `교배 처리에 실패했습니다: ${err.response?.data?.message || err.message}`,
      );
      navigate("/main");
    } finally {
      setProcessing(false);
    }
  };

  if (!breedingData) return null;

  const requesterPet = breedingData?.requesterPetInfo
    ? new Pet(breedingData.requesterPetInfo)
    : null;
  const receiverPet = breedingData?.receiverPetInfo
    ? new Pet(breedingData.receiverPetInfo)
    : null;

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-500">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-sky-400/10 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow"></div>
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-slate-400/10 blur-[100px] rounded-full mix-blend-screen animate-pulse-slow"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>
{/* 테스트주석 */}
      <div className="relative z-10 w-full max-w-md bg-white/5 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/10 dark:border-slate-800 rounded-[3.5rem] p-10 flex flex-col items-center text-center shadow-2xl transition-all">
        {!successData ? (
          <>
            <div className="flex items-center gap-6 mb-12">
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-white/5 dark:bg-slate-800/30 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner animate-float-slow overflow-hidden relative transition-all">
                  {requesterPet ? (
                    <div className="w-full h-full pointer-events-none relative drop-shadow-2xl">
                      {requesterPet.draw("w-full h-full scale-[1.3] translateY-[5%]")}
                    </div>
                  ) : (
                    <span className="flex flex-col items-center justify-center h-full w-full">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Parent 1</span>
                      <span className="font-black text-sky-400 text-[10px] truncate w-20 text-center">
                        {breedingData.requesterPetName}
                      </span>
                    </span>
                  )}
                </div>
                {requesterPet && (
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {breedingData.requesterPetName}
                  </span>
                )}
              </div>

              {/* 하트 아이콘 */}
              <div className="relative">
                <FiHeart className="text-3xl text-sky-400 animate-pulse drop-shadow-[0_0_15px_rgba(125,211,252,0.5)]" />
                <FiZap className="absolute -top-2 -right-2 text-xs text-white animate-bounce" />
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-white/5 dark:bg-slate-800/30 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner animate-float overflow-hidden relative transition-all">
                  {receiverPet ? (
                    <div className="w-full h-full pointer-events-none relative drop-shadow-2xl">
                      {receiverPet.draw("w-full h-full scale-[1.3] translateY-[5%]")}
                    </div>
                  ) : (
                    <span className="flex flex-col items-center justify-center h-full w-full">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Parent 2</span>
                      <span className="font-black text-sky-400 text-[10px] truncate w-20 text-center">
                        {breedingData.receiverPetName}
                      </span>
                    </span>
                  )}
                </div>
                {receiverPet && (
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {breedingData.receiverPetName}
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4 leading-none">
              신비로운 만남{" "}
              <span className="text-sky-400 font-sans not-italic">.</span>
            </h1>
            <p className="text-[12px] text-slate-400 font-bold leading-relaxed mb-10 uppercase tracking-tight">
              두 펫의 마음이 모여 새로운 생명이 탄생할 준비가 되었습니다.
              <br />
              아래 버튼을 눌러 결과의 탄생을 축복해주세요!
            </p>

            {/* 버튼 */}
            <button
              onClick={handleCreateChild}
              disabled={processing}
              className="w-full py-5 bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 font-black text-[12px] rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest italic disabled:opacity-30 flex items-center justify-center gap-2"
            >
              <FiStar className={`text-lg ${processing ? "animate-spin" : "animate-pulse"}`} />
              {processing ? "생명 탄생 중..." : "새로운 생명 확인하기!"}
            </button>
          </>
        ) : (
          <div className="animate-scale-in">
            {/* 알 이미지 배경색 */}
            <div className="w-32 h-32 mx-auto bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(125,211,252,0.2)] mb-8 border border-white/10 relative overflow-hidden transition-all">
              <img
                src="/images/pet/egg.png"
                alt="egg"
                className="w-[75%] h-[75%] object-contain animate-bounce drop-shadow-2xl absolute"
              />
            </div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-3">
              탄생을 축하합니다! <span className="text-sky-400">✨</span>
            </h2>
            <p className="text-[12px] text-slate-400 font-black mb-8 uppercase tracking-widest leading-relaxed">
              새로운 알이 성공적으로 부화할 준비를 마쳤습니다.
              <br />
              메인 화면에서 당신의 새로운 인연을 확인하세요.
            </p>
            <button
              onClick={() => navigate("/main")}
              className="w-full py-4.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-black text-[11px] rounded-2xl transition-all uppercase tracking-widest hover:text-white"
            >
              메인으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BreedingPage;