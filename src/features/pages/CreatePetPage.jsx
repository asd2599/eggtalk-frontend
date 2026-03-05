import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../../utils/config";

/**
 * 펫 생성 페이지 컴포넌트
 */
const CreatePetPage = () => {
  const navigate = useNavigate();
  const [petName, setPetName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");

  // 사용 가능한 색상 목록
  const colors = ["blue", "green", "pink", "purple", "red", "yellow"];

  // 펫 속성 전송 (실제 API 요청 시나리오)
  const handleCreatePet = async () => {
    if (!petName.trim()) {
      alert("펫 이름을 입력해주세요!");
      return;
    }

    try {
      const token = localStorage.getItem("token"); // 예시: 로그인 된 유저의 토큰 가져오기 (실제 로직에 맞춰 변경)

      const response = await fetch(`${SERVER_URL}/api/pets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 추후 인증 연동시 주석 해제
        },
        body: JSON.stringify({
          name: petName,
          color: selectedColor,
        }),
      });

      if (response.ok) {
        alert("펫이 성공적으로 생성되었습니다!");
        navigate("/main"); // 메인으로 이동
      } else {
        const errorData = await response.json();
        alert(`펫 생성 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error("error creating pet:", error);
      alert("서버 오류로 인해 펫을 생성하지 못했습니다.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>내 펫 만들기</h1>
        <p style={styles.subtitle}>새로운 친구의 이름과 색상을 정해주세요!</p>

        {/* 이름 입력 */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>펫 이름</label>
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* 색상 선택 (모양은 circle 고정) */}
        <div style={styles.colorGroup}>
          <label style={styles.label}>색상 선택</label>
          <div style={styles.colorSelector}>
            {colors.map((color) => (
              <div
                key={color}
                style={{
                  ...styles.imageWrapper,
                  border:
                    selectedColor === color
                      ? "3px solid #4a90e2"
                      : "3px solid transparent",
                }}
                onClick={() => setSelectedColor(color)}
              >
                <img
                  src={`/images/shapes/${color}_body_circle.png`}
                  alt={`${color} 펫`}
                  style={styles.petImage}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 생성 버튼 */}
        <button style={styles.submitBtn} onClick={handleCreatePet}>
          생성하기
        </button>
      </div>
    </div>
  );
};

// 화면 중앙에 띄울 깔끔한 스타일 적용
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f4f7f6",
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "15px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    width: "400px",
    textAlign: "center",
  },
  title: {
    margin: "0 0 10px 0",
    color: "#333",
    fontSize: "24px",
    fontWeight: "bold",
  },
  subtitle: {
    margin: "0 0 30px 0",
    color: "#777",
    fontSize: "14px",
  },
  inputGroup: {
    textAlign: "left",
    marginBottom: "25px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: "#555",
  },
  input: {
    width: "100%",
    padding: "12px",
    boxSizing: "border-box",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "15px",
    outline: "none",
  },
  colorGroup: {
    textAlign: "left",
    marginBottom: "30px",
  },
  colorSelector: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "10px",
  },
  imageWrapper: {
    cursor: "pointer",
    borderRadius: "50%",
    padding: "2px",
    transition: "transform 0.2s, border 0.2s",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "50px",
    height: "50px",
    backgroundColor: "#eee",
  },
  petImage: {
    width: "40px",
    height: "40px",
    objectFit: "contain",
  },
  submitBtn: {
    width: "100%",
    padding: "15px",
    backgroundColor: "#4a90e2",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};

export default CreatePetPage;
