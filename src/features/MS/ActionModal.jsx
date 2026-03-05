import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../../utils/config";
const ACTIONS_DATA = [
  {
    key: 1001,
    category: "Eating",
    name: "Eating",
    increaseStatus: "health_hp",
    increaseValue: 5,
    decreaseStatus: "hunger",
    decreaseValue: -20,
    exp: 10,
  },
  {
    key: 1002,
    category: "Cleaning",
    name: "Cleaning",
    increaseStatus: "cleanliness",
    increaseValue: 30,
    decreaseStatus: "stress",
    decreaseValue: -5,
    exp: 5,
  },
  {
    key: 1003,
    category: "Sleep",
    name: "Sleep 1",
    increaseStatus: "health_hp",
    increaseValue: 40,
    decreaseStatus: "stress",
    decreaseValue: -30,
    exp: 5,
  },
  {
    key: 1004,
    category: "Sleep",
    name: "Sleep 2",
    increaseStatus: "health_hp",
    increaseValue: 40,
    decreaseStatus: "hunger",
    decreaseValue: 20,
    exp: 5,
  },
  {
    key: 1005,
    category: "Playing",
    name: "Playing 1",
    increaseStatus: "affection",
    increaseValue: 10,
    decreaseStatus: "hunger",
    decreaseValue: 10,
    exp: 15,
  },
  {
    key: 1006,
    category: "Playing",
    name: "Playing 2",
    increaseStatus: "hunger",
    increaseValue: 10,
    decreaseStatus: "stress",
    decreaseValue: -15,
    exp: 20,
  },
  {
    key: 1007,
    category: "Volunteer",
    name: "Volunteer 1",
    increaseStatus: "altruism",
    increaseValue: 10,
    decreaseStatus: "health_hp",
    decreaseValue: -5,
    exp: 25,
  },
  {
    key: 1008,
    category: "Volunteer",
    name: "Volunteer 2",
    increaseStatus: "empathy",
    increaseValue: 5,
    decreaseStatus: "health_hp",
    decreaseValue: -10,
    exp: 25,
  },
  {
    key: 1009,
    category: "Chat",
    name: "Chat 1",
    increaseStatus: "empathy",
    increaseValue: 5,
    decreaseStatus: null,
    decreaseValue: null,
    exp: 10,
  },
  {
    key: 1010,
    category: "Chat",
    name: "Chat 2",
    increaseStatus: "affection",
    increaseValue: 5,
    decreaseStatus: null,
    decreaseValue: null,
    exp: 10,
  },
  {
    key: 1011,
    category: "Chat",
    name: "Chat 3",
    increaseStatus: "knowledge",
    increaseValue: 5,
    decreaseStatus: null,
    decreaseValue: null,
    exp: 10,
  },
  {
    key: 1012,
    category: "Playing",
    name: "Playing 3",
    increaseStatus: "logic",
    increaseValue: 10,
    decreaseStatus: "stress",
    decreaseValue: -5,
    exp: 15,
  },
];

const ActionModal = ({ category, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const actions = ACTIONS_DATA.filter((a) => a.category === category);

  const handleAction = async (actionKey) => {
    setLoading(true);
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${SERVER_URL}/api/pets/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ actionKey }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Action failed");
      }
      setMessage(`성공적으로 수행했습니다! 펫 상태가 업데이트 되었습니다.`);

      // 액션 성공 시 상위 컴포넌트(MS.jsx)에 갱신된 펫 정보 전달
      if (onUpdate && data.pet) {
        onUpdate(data.pet);
      }

      // 다른 브라우저 창/탭(Main 페이지 등)을 켜두었을 경우 실시간 동기화를 위해 브로드캐스트 이벤트 발송
      if (data.pet) {
        const channel = new BroadcastChannel("pet_update_channel");
        channel.postMessage({ type: "UPDATE_PET", pet: data.pet });
        channel.close();
      }

      // 모달만 닫기 (Main으로 이동하지 않음)
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error(error);
      setMessage(`오류 발생: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          ✖
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center text-[#00B4FF]">
          {category} Actions
        </h2>

        {message && (
          <div
            className={`p-3 mb-4 rounded-lg text-sm text-center ${message.includes("오류") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
          >
            {message}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 rounded-lg overflow-hidden">
            <thead className="text-xs text-gray-700 uppercase bg-blue-50">
              <tr>
                <th scope="col" className="px-3 py-3">
                  Todo
                </th>
                <th scope="col" className="px-3 py-3">
                  IncreaseValue
                </th>
                <th
                  scope="col"
                  className="px-3 py-3"
                  title="변화 스탯 (증가 혹은 감소)"
                >
                  DecreaseValue
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  Exp
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  Run
                </th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr
                  key={action.key}
                  className="bg-white border-b hover:bg-gray-50 transition"
                >
                  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {action.name}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-green-600 font-bold">
                      +{action.increaseValue}
                    </span>{" "}
                    {action.increaseStatus}
                  </td>
                  <td className="px-3 py-3">
                    {action.decreaseStatus ? (
                      <span
                        className={`${action.decreaseValue < 0 ? "text-red-500" : "text-blue-500"} font-bold`}
                      >
                        {action.decreaseValue > 0
                          ? `+${action.decreaseValue}`
                          : action.decreaseValue}{" "}
                        {action.decreaseStatus}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-[#00B4FF]">
                    +{action.exp}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      disabled={loading}
                      onClick={() => handleAction(action.key)}
                      className="px-3 py-1.5 bg-[#00B4FF] text-white rounded-lg hover:bg-blue-600 active:scale-95 transition whitespace-nowrap disabled:opacity-50"
                    >
                      실행
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
