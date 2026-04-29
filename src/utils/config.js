import axios from 'axios';

// 환경별 서버 URL 자동 설정
const isProd =
  import.meta.env.PROD || window.location.hostname.includes('gamestack.store');
export const SERVER_URL = isProd
  ? 'https://eggtalk-backend-production.up.railway.app'
  : 'http://localhost:8000';

export const PRESENT_TABLE_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5Nrv_9pLwQVUGH7XRGT2gJ9r7vGoEaG7jBa9ws6T_CilLTsaLLGXXdf2a-HGl6WqT5WwGlwFiZnom/pub?gid=384159399&single=true&output=csv';

// 공통 BaseURL이 세팅된 axios 인스턴스 싱글톤
export const api = axios.create({
  baseURL: SERVER_URL,
});

// 모든 API 요청 전 자동으로 localStorage의 토큰을 헤더에 집어넣음
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 401(인증안됨) 또는 403(만료/권한없음) 발생 시 자동 로그아웃
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      console.warn('인증이 만료되었습니다. 다시 로그인 해주세요.');
      localStorage.removeItem('token');
      localStorage.removeItem('petId');

      if (!window.hasAuthAlerted) {
        window.hasAuthAlerted = true;
        alert('세션이 만료되었습니다. 확인을 누르면 메인으로 이동합니다. 반드시 다시 로그인 해주세요!');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
