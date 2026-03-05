# 1. Build stage (Node.js를 사용하여 의존성 설치 및 프로덕션 빌드 수행)
FROM node:20-alpine as build-stage
WORKDIR /app

# 패키지 캐싱 최적화를 위해 package.json 계열 먼저 복사dockerfile 만들기
COPY package*.json ./
RUN npm ci

# 소스 코드 복사 및 Vite 빌드 실행 (결과물은 /app/dist 에 생성됨)
COPY . .
RUN npm run build


# 2. Production stage (Nginx를 사용하여 정적 웹 서빙)
FROM nginx:alpine as production-stage

# SPA(React Router) 동작을 위해 기본 Nginx 설정을 커스텀 파일로 교체
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build stage에서 생성된 프론트엔드 정적 웹 리소스들을 Nginx 서빙 폴더로 복사
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 웹 서버의 기본 포트 80 노출
EXPOSE 80

# Nginx 데몬 포그라운드 실행
CMD ["nginx", "-g", "daemon off;"]
