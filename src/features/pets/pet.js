import React from "react";

/**
 * Pet 클래스
 * - DB에서 가져온 펫 데이터를 객체화하여 관리합니다.
 * - 색상 정보 등을 바탕으로 이미지 경로를 산출하는 편의 메소드를 포함합니다.
 */
export default class Pet {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.name = data.name;
    this.color = data.color || "blue"; // fallback color
    this.level = data.level || 1;
    this.exp = data.exp || 0;

    // 상태 수치
    this.hunger = data.hunger ?? 100;
    this.cleanliness = data.cleanliness ?? 100;
    this.healthHp = data.health_hp ?? 100;
    this.stress = data.stress ?? 0;

    // 감정 및 성향 지수
    this.knowledge = data.knowledge ?? 0;
    this.affection = data.affection ?? 0;
    this.altruism = data.altruism ?? 0;
    this.logic = data.logic ?? 0;
    this.empathy = data.empathy ?? 0;

    // 신규 감정 및 성향 지수
    this.extroversion = data.extroversion ?? 0;
    this.humor = data.humor ?? 0;
    this.openness = data.openness ?? 0;
    this.directness = data.directness ?? 0;
    this.curiosity = data.curiosity ?? 0;

    this.tendency = data.tendency || "neutral";

    // 메타 데이터
    this.lastChatTime = data.last_chat_time;
    this.todayChatCount = data.today_chat_count ?? 0;
  }

  /**
   * 펫의 색상을 기반으로 출력할 기본 이미지 경로를 반환합니다. (추후 호환성용 유지)
   */
  getImagePath() {
    return `/images/shapes/${this.color}_body_circle.png`;
  }

  /**
   * 펫의 레이어(Body, Face)를 조합한 React 컴포넌트(요소)를 반환합니다.
   * - 우선 얼굴표정만(face_neutral) 오버레이하여 반영합니다. (손은 이번에 제외)
   */
  draw(className = "") {
    const body = `/images/shapes/${this.color}_body_circle.png`;
    const faceType = "neutral";
    const face = `/images/faces/face_${faceType}.png`;

    return React.createElement(
      "div",
      { className: `relative ${className}` },
      React.createElement("img", {
        src: body,
        alt: "pet-body",
        className: "absolute inset-0 w-full h-full object-contain z-0",
      }),
      React.createElement("img", {
        src: face,
        alt: "pet-face",
        className: "absolute inset-0 w-full h-full object-contain z-10",
      }),
    );
  }

  /**
   * 다음 레벨업까지 필요한 경험치를 계산하는 임시 로직
   */
  getMaxExp() {
    return this.level * 100; // 레벨 * 100 이 Max 경험치라고 가정
  }
}
