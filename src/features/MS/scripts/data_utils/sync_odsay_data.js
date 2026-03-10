import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getApiKey() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return null;
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/VITE_ODSAY_API_KEY=([^\s]+)/);
  return match ? match[1].trim() : null;
}

const API_KEY = getApiKey();
const BASE_URL = 'https://api.odsay.com/v1/api';
const AXIOS_CONFIG = {
  headers: {
    Referer: 'http://localhost:5173/',
    Origin: 'http://localhost:5173',
  },
};

// 노선별 확실한 실존 역 명칭 (공식 좌표 추출용)
const LANE_REP_STATIONS = {
  '1호선': { start: '서울역', end: '청량리' },
  '2호선': { start: '강남', end: '잠실' },
  '3호선': { start: '교대', end: '압구정' },
  '4호선': { start: '서울역', end: '혜화' },
  '5호선': { start: '여의도', end: '광화문' },
  '6호선': { start: '공덕', end: '이태원' },
  '7호선': { start: '가산디지털단지', end: '논현' },
  '8호선': { start: '잠실', end: '석촌' },
  '9호선': { start: '노량진', end: '신논현' },
  신분당선: { start: '강남', end: '판교' },
  수인분당선: { start: '수원', end: '기흥' },
  경의중앙선: { start: '회기', end: '용산' },
  경춘선: { start: '망우', end: '평내호평' },
  서해선: { start: '초지', end: '소사' },
  우이신설선: { start: '신설동', end: '북한산우이' },
  공항철도: { start: '서울역', end: '김포공항' },
  김포골드라인: { start: '김포공항', end: '구래' },
};

async function safeGet(url) {
  try {
    const res = await axios.get(url, AXIOS_CONFIG);
    if (!res.data || res.data.error) return null;
    return res.data;
  } catch (e) {
    return null;
  }
}

async function fetchData() {
  if (!API_KEY) {
    console.error('[ERROR] VITE_ODSAY_API_KEY not found');
    process.exit(1);
  }

  const finalCoords = {};
  const finalPaths = {};

  console.log('[1/4] 실시간 역 좌표 기반 고정밀 트래킹 시작...');

  for (const [laneName, reps] of Object.entries(LANE_REP_STATIONS)) {
    console.log(`\n>>> [${laneName}] 처리 중...`);

    try {
      // 1. 역 검색을 통해 정확한 호출 좌표 획득
      const sRes = await safeGet(
        `${BASE_URL}/searchStation?lang=0&stationName=${encodeURIComponent(reps.start)}&CID=1000&apiKey=${encodeURIComponent(API_KEY)}`,
      );
      await new Promise((r) => setTimeout(r, 1500));
      const eRes = await safeGet(
        `${BASE_URL}/searchStation?lang=0&stationName=${encodeURIComponent(reps.end)}&CID=1000&apiKey=${encodeURIComponent(API_KEY)}`,
      );

      if (!sRes || !eRes) continue;

      const sInfo =
        sRes.result.station.find((s) => s.laneName.includes(laneName)) ||
        sRes.result.station[0];
      const eInfo =
        eRes.result.station.find((s) => s.laneName.includes(laneName)) ||
        eRes.result.station[0];

      // 2. 경로 검색
      await new Promise((r) => setTimeout(r, 1500));
      const srchRes = await safeGet(
        `${BASE_URL}/searchPubTransPathT?SX=${sInfo.x}&SY=${sInfo.y}&EX=${eInfo.x}&EY=${eInfo.y}&SearchType=1&apiKey=${encodeURIComponent(API_KEY)}`,
      );

      if (srchRes && srchRes.result.path) {
        const pathData = srchRes.result.path[0];
        const metroSubPath = pathData.subPath.find((p) => p.trafficType === 1);

        if (metroSubPath) {
          finalCoords[laneName] = {};
          metroSubPath.stations.forEach((st) => {
            finalCoords[laneName][st.stationName] = {
              lat: parseFloat(st.y),
              lng: parseFloat(st.x),
              id: st.stationID,
            };
          });

          const mapObj = pathData.info.mapObj;
          if (mapObj) {
            await new Promise((r) => setTimeout(r, 1500));
            const laneRes = await safeGet(
              `${BASE_URL}/loadLane?mapObject=0:0@${mapObj}&apiKey=${encodeURIComponent(API_KEY)}`,
            );
            if (laneRes && laneRes.result.lane) {
              const targetLaneData = laneRes.result.lane.find(
                (l) => l.class === 2,
              );
              if (targetLaneData) {
                const polyline = [];
                targetLaneData.section.forEach((sec) => {
                  sec.graphPos.forEach((pos) =>
                    polyline.push({ lat: pos.y, lng: pos.x }),
                  );
                });
                finalPaths[laneName] = polyline;
                console.log(
                  `   - 성공: ${metroSubPath.stations.length}개 역, ${polyline.length}개 궤적 도출`,
                );
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`   - [ERROR] ${laneName} 실패:`, err.message);
    }
  }

  const outputDir = path.resolve(process.cwd(), 'src/features/MS/data');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, 'subwayCoords_v3.js'),
    `export const SUBWAY_STATION_COORDS_V3 = ${JSON.stringify(finalCoords, null, 2)};`,
  );
  fs.writeFileSync(
    path.join(outputDir, 'subwayPaths_v3.js'),
    `export const SUBWAY_PATHS_V3 = ${JSON.stringify(finalPaths, null, 2)};`,
  );

  console.log('\n[4/4] 모든 데이터 추출 및 저장 완료!');
}

fetchData();
