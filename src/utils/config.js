import axios from "axios";

// 사용할 서버의 주소 주석을 해제하여 사용하세요.

// [로컬 테스트용 서버]
//export const SERVER_URL = "http://localhost:8000";

// [운영 배포용 서버] (Github 빌드 시 아래 주석 해제)
export const SERVER_URL = "https://keepinsight.site";

// 공통 BaseURL이 세팅된 axios 인스턴스 싱글톤
export const api = axios.create({
  baseURL: SERVER_URL,
});

export default api;
