import { io } from "socket.io-client";
import { SERVER_URL } from "./config";

// 애플리케이션 전역에서 사용할 단일(Singleton) 소켓 인스턴스
const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"], // 웹소켓 우선 연결 (Polling 거부 에러 방지)
});

export default socket;
