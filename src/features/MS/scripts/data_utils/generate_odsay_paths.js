import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 기존 좌표 데이터를 불러와 출발/도착역의 위경도를 찾기 위함
import { SUBWAY_STATION_COORDS_V2 } from '../../subwayCoords.js';
import { SUBWAY_LINE_MAP } from '../../subwayLineMap.js';

// ODsay API 정보 (실제 사용 시 환경변수 또는 하드코딩 교체)
const API_KEY = process.env.VITE_ODSAY_API_KEY || 'v+SZ+5KB49GBg6RR8LO7SQ';
const BASE_URL = 'https://api.odsay.com/v1/api';

const OUTPUT_DIR = path.join(__dirname, '../../paths_odsay');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 각 노선별 시작역과 종착역 (가장 긴 경로를 통해 전체 노선 그래픽을 얻기 위함)
const TARGET_LINES = [
  '2호선',
  '1호선',
  '3호선',
  '4호선',
  '5호선',
  '6호선',
  '7호선',
  '8호선',
  '9호선',
  '신분당선',
  '수인분당선',
  '경의중앙선',
  '경춘선',
  '서해선',
  '공항철도',
];

async function fetchLineGraphic(lineName) {
  const stations = SUBWAY_LINE_MAP[lineName];
  if (!stations || stations.length < 2) return;

  console.log(`\n[${lineName}] 경로 데이터 추출 시작...`);

  // 첫 역과 마지막 역을 기종점으로 API 호출
  // 2호선 같은 순환선 처리: 시청 -> 시청 (혹은 한 바퀴 도는 경로)
  let startName = stations[0];
  let endName = stations[stations.length - 1];

  // 2호선 예외 처리 (순환선이므로 중간 역을 끊어서 2번 호출하거나 충정로->시청 같은 긴 경로 사용)
  if (lineName === '2호선') {
    startName = '시청';
    endName = '충정로';
  }

  const startCoords =
    SUBWAY_STATION_COORDS_V2[lineName]?.[startName] ||
    SUBWAY_STATION_COORDS_V2[lineName]?.[startName + '역'];
  const endCoords =
    SUBWAY_STATION_COORDS_V2[lineName]?.[endName] ||
    SUBWAY_STATION_COORDS_V2[lineName]?.[endName + '역'];

  if (!startCoords || !endCoords) {
    console.log(
      `[${lineName}] 기종점 좌표를 찾을 수 없습니다. (${startName}, ${endName})`,
    );
    return;
  }

  try {
    const sx = startCoords.lng;
    const sy = startCoords.lat;
    const ex = endCoords.lng;
    const ey = endCoords.lat;

    console.log(
      `경로 검색: ${startName}(${sx},${sy}) -> ${endName}(${ex},${ey})`,
    );
    const pathUrl = `${BASE_URL}/searchPubTransPathT?lang=0&SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&OPT=0&SearchType=1&apiKey=${encodeURIComponent(API_KEY)}`;

    const pathRes = await axios.get(pathUrl);
    if (pathRes.data.error) {
      console.error(`[${lineName}] Path API Error:`, pathRes.data.error);
      return;
    }

    // 첫 번째 경로에서 mapObj 추출 (지하철 경로)
    const firstPath = pathRes.data.result.path.find(
      (p) => p.pathType === 1 || p.pathType === 3,
    );
    if (!firstPath) {
      console.error(`[${lineName}] 지하철 경로를 찾을 수 없습니다.`);
      return;
    }

    const mapObj = firstPath.info.mapObj;

    console.log(`그래픽 데이터 로드 (mapObj: ${mapObj.substring(0, 15)}...)`);
    const graphUrl = `${BASE_URL}/loadLane?mapObject=0:0@${mapObj}&apiKey=${encodeURIComponent(API_KEY)}`;
    const graphRes = await axios.get(graphUrl);

    if (graphRes.data.error) {
      console.error(`[${lineName}] Graph API Error:`, graphRes.data.error);
      return;
    }

    const lanes = graphRes.data.result.lane;
    let allPoints = [];

    lanes.forEach((lane) => {
      if (lane.class === 2 && lane.section) {
        // 2는 지하철
        lane.section.forEach((sec) => {
          if (sec.graphPos) {
            sec.graphPos.forEach((pos) => {
              allPoints.push({ lat: pos.y, lng: pos.x });
            });
          }
        });
      }
    });

    console.log(`[${lineName}] 추출된 좌표 수: ${allPoints.length}`);

    // 파일 저장
    const content = `// 자동 생성된 ODsay 지하철 노선 그래픽 데이터\n// 호선: ${lineName}\nexport const PATH_${lineName.replace(/[\(\)]/g, '_')} = ${JSON.stringify(allPoints, null, 2)};\n`;
    fs.writeFileSync(path.join(OUTPUT_DIR, `${lineName}.js`), content);
  } catch (e) {
    console.error(`[${lineName}] Exception:`, e.message);
  }
}

async function runAll() {
  for (const line of TARGET_LINES) {
    await fetchLineGraphic(line);
    // API Rate Limit 방지용 딜레이 (1초)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // index.js (exports 파일) 생성
  const exportsContent =
    TARGET_LINES.map(
      (line) =>
        `export { PATH_${line.replace(/[\(\)]/g, '_')} } from './${line}.js';`,
    ).join('\n') +
    `\n\nexport const ODSAY_PATHS = {\n` +
    TARGET_LINES.map(
      (line) => `  '${line}': PATH_${line.replace(/[\(\)]/g, '_')}`,
    ).join(',\n') +
    `\n};\n`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.js'), exportsContent);
  console.log(
    '\n모든 노선 그래픽 데이터 추출 완료! paths_odsay/index.js 확인.',
  );
}

runAll();
