import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // 버스 API 우회를 위한 CORS 프록시 설정
      '/api/bus': {
        target: 'http://ws.bus.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bus/, ''),
      },
      // 지하철 API 우회를 위한 CORS 프록시 설정
      '/api/subway': {
        target: 'http://swopenapi.seoul.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/subway/, ''),
      },
      // ODsay API 우회를 위한 CORS 프록시 설정
      '/api/odsay': {
        target: 'https://api.odsay.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/odsay/, ''),
      },
    },
  },
});
