import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiHeart, FiStar } from "react-icons/fi";
import { api } from "../../utils/config";
import socket from "../../utils/socket";
import Pet from "../pets/pet";

const BreedingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const breedingData = location.state?.breedingData;

  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // 라우팅 가드: 비정상 접근 시 홈으로 이동
  useEffect(() => {
    if (!breedingData) {
      alert(
        "정상적인 교배 프로세스를 거치지 않았습니다. 메인 화면으로 이동합니다.",
      );
      navigate("/main");
      return;
    }

    // 상대방이 먼저 클릭해서 결과가 서버에 등록되었을 경우 소켓 이벤트를 받아 현재 화면 동기화
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
      // TODO: 백엔드 API (POST /api/pets/breed) 구현 예정
      const response = await api.post(
        "/api/pets/breed",
        {
          parent1Name: breedingData.requesterPetName,
          parent2Name: breedingData.receiverPetName,
          roomId: breedingData.roomId, // 데이트방 자동 폭파를 위해 추가
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.status === 201 || response.status === 200) {
        setSuccessData(response.data.childPet);

        // 상대방 화명에도 탄생 완료 상태를 표시하기 위해 브로드캐스트 전송
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

  if (!breedingData) return null; // 방어 코드

  // 전달받은 정보가 있으면 인스턴스화
  const requesterPet = breedingData?.requesterPetInfo
    ? new Pet(breedingData.requesterPetInfo)
    : null;
  const receiverPet = breedingData?.receiverPetInfo
    ? new Pet(breedingData.receiverPetInfo)
    : null;

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-rose-600/10 dark:bg-rose-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow"></div>
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-purple-600/10 dark:bg-purple-900/20 blur-[100px] rounded-full mix-blend-screen animate-pulse-slow"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/5 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/10 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl">
        {!successData ? (
          <>
            <div className="flex items-center gap-6 mb-12">
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-white/10 dark:bg-slate-800/50 rounded-full flex items-center justify-center border border-white/20 shadow-inner animate-float-slow overflow-hidden relative">
                  {requesterPet ? (
                    <div className="w-full h-full pointer-events-none relative shadow-md">
                      {requesterPet.draw(
                        "w-full h-full scale-[1.2] translateY-[-10%]",
                      )}
                    </div>
                  ) : (
                    <span className="flex flex-col items-center justify-center h-full w-full">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                        Parent 1
                      </span>
                      <span className="font-black text-rose-300 text-[10px] truncate w-20 text-center">
                        {breedingData.requesterPetName}
                      </span>
                    </span>
                  )}
                </div>
                {requesterPet && (
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {breedingData.requesterPetName}
                  </span>
                )}
              </div>
              <FiHeart className="text-3xl text-rose-500 animate-pulse" />
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-white/10 dark:bg-slate-800/50 rounded-full flex items-center justify-center border border-white/20 shadow-inner animate-float overflow-hidden relative">
                  {receiverPet ? (
                    <div className="w-full h-full pointer-events-none relative shadow-md">
                      {receiverPet.draw(
                        "w-full h-full scale-[1.2] translateY-[-10%]",
                      )}
                    </div>
                  ) : (
                    <span className="flex flex-col items-center justify-center h-full w-full">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                        Parent 2
                      </span>
                      <span className="font-black text-purple-300 text-[10px] truncate w-20 text-center">
                        {breedingData.receiverPetName}
                      </span>
                    </span>
                  )}
                </div>
                {receiverPet && (
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {breedingData.receiverPetName}
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">
              신비로운 만남{" "}
              <span className="text-rose-400 font-sans not-italic">.</span>
            </h1>
            <p className="text-[13px] text-slate-300 font-medium leading-relaxed mb-10">
              두 펫의 마음이 모여 새로운 생명이 탄생할 준비가 되었습니다.
              <br />
              아래 버튼을 눌러 결과의 탄생을 축복해주세요!
            </p>

            <button
              onClick={handleCreateChild}
              disabled={processing}
              className="w-full py-4.5 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white font-black text-[13px] rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.5)] transition-all uppercase tracking-widest italic disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FiStar className="text-lg" />
              {processing ? "생명 탄생 중..." : "새로운 생명 확인하기!"}
            </button>
          </>
        ) : (
          <div className="animate-scale-in">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-yellow-100 to-amber-200 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.3)] mb-8 border-4 border-white/20 relative overflow-hidden">
              <img
                src="/images/pet/egg.png"
                alt="egg"
                className="w-[80%] h-[80%] object-contain animate-bounce drop-shadow-md absolute"
              />
            </div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-3">
              탄생을 축하합니다!
            </h2>
            <p className="text-[13px] text-slate-300 font-bold mb-8">
              새로운 알이 성공적으로 부화할 준비를 마쳤습니다.
              <br />
              메인 화면에서 당신의 새로운 인연을 확인하세요.
            </p>
            <button
              onClick={() => navigate("/main")}
              className="w-full py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-[12px] rounded-2xl transition-all uppercase tracking-widest"
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
