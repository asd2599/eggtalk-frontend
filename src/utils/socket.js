import { io } from "socket.io-client";

// 애플리케이션 전역에서 사용할 단일(Singleton) 소켓 인스턴스
// 폴링 에러 및 중복 연결 문제를 방지합니다.
const socket = io("http://localhost:8000", {
  autoConnect: true,
  reconnection: true, // 자동 재연결 활성화
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"], // 웹소켓 우선 연결 (Polling 거부 에러 방지)
});

export default socket;
