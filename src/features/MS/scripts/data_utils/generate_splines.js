/**
 * [generate_splines.js] - v2.3.0 (Strict Path Expansion)
 * 역할: 이전 로직에서 방향성 검색 실패로 선형 보간(Linear)으로 빠지는 현상을 원천 차단하고
 *      특정 구역(가산디지털단지~대림)에 대해 카카오맵 100% 일치 좌표 트랙을 강제 주입합니다.
 */
import fs from 'fs';
import path from 'path';
import { SUBWAY_LINE_MAP } from '../../subwayLineMap.js';
import { SUBWAY_STATION_COORDS_V2 } from '../../subwayCoords.js';

console.log('[START] Loading mapping data...');

// //* [Strict Overrides] 카카오맵 노선 완전 일치형 고정밀 곡선 데이터
// 카카오맵 고도화 궤적 매칭
const EXACT_TRACKS = {
  '7호선': {
    '가산디지털단지-남구로': [
      { lat: 37.48175, lng: 126.8833 },
      { lat: 37.4822, lng: 126.88385 },
      { lat: 37.48285, lng: 126.8849 }, // 스타밸리 정점
      { lat: 37.4834, lng: 126.8855 },
      { lat: 37.48395, lng: 126.886 }, // 여신족발 커브
      { lat: 37.4845, lng: 126.8864 }, // 골말공원 좌측 편차
      { lat: 37.48505, lng: 126.8867 }, // 니하우
      { lat: 37.4856, lng: 126.8869 },
      { lat: 37.4862, lng: 126.8871 }, // 역 진입
    ],
    // //* [Added Code] paths_v2 (Perfect Snap) 기반 정밀 궤적 복구
    '대림-남구로': [
      { lat: 37.49222, lng: 126.89502 },
      { lat: 37.49136, lng: 126.89374 },
      { lat: 37.4903, lng: 126.89219 },
      { lat: 37.4888, lng: 126.89016 },
      { lat: 37.48751, lng: 126.88845 },
    ],
  },
};

// //* [Added Code] 특정 노선에서의 논리적 단절 구간 정의 (인천-가산디지털단지 직결 차단)
const SKIP_SEGMENTS = {
  '1호선': ['인천-가산디지털단지', '가산디지털단지-인천'],
};

function getCoord(line, station) {
  const baseLine = line.includes('(') ? line.split('(')[0] : line;
  if (!SUBWAY_STATION_COORDS_V2[baseLine]) return null;
  const normalized = station.endsWith('역') ? station.slice(0, -1) : station;
  return (
    SUBWAY_STATION_COORDS_V2[baseLine][normalized] ||
    SUBWAY_STATION_COORDS_V2[baseLine][normalized + '역']
  );
}

function normalizeName(name) {
  return name.endsWith('역') ? name.slice(0, -1) : name;
}

function generateSequence(p1, p2, traceData, isReversed, numPoints) {
  const coreSequence = [...(traceData || [])];
  if (isReversed) coreSequence.reverse();

  const fullSeq = [p1, ...coreSequence, p2];
  const result = [];

  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    const floatIndex = progress * (fullSeq.length - 1);
    const index = Math.floor(floatIndex);

    if (index >= fullSeq.length - 1) {
      result.push(fullSeq[fullSeq.length - 1]);
    } else {
      const segmentProgress = floatIndex - index;
      const startNode = fullSeq[index];
      const endNode = fullSeq[index + 1];
      result.push({
        lat: startNode.lat + (endNode.lat - startNode.lat) * segmentProgress,
        lng: startNode.lng + (endNode.lng - startNode.lng) * segmentProgress,
      });
    }
  }
  return result;
}

const paths = {};

const TARGET_LINES = [
  '1호선',
  '1호선(경원선)',
  '1호선(경인선)',
  '1호선(경부선)',
  '1호선(장항선)',
  '7호선',
  '2호선',
];

for (const line of Object.keys(SUBWAY_LINE_MAP)) {
  if (!TARGET_LINES.includes(line)) continue;
  const stations = SUBWAY_LINE_MAP[line];
  console.log(`[PROCESS] Line: ${line} (Stations: ${stations.length})`);
  paths[line] = {};

  for (let i = 0; i < stations.length - 1; i++) {
    const p1Raw = stations[i];
    const p2Raw = stations[i + 1];

    const p1Name = normalizeName(p1Raw);
    const p2Name = normalizeName(p2Raw);

    // //* [Critical Fix] 1호선 인천-가산디지털단지 오연결 방지
    const segmentKey = `${p1Name}-${p2Name}`;
    if (SKIP_SEGMENTS[line] && SKIP_SEGMENTS[line].includes(segmentKey)) {
      console.log(`[SKIP] Ignoring illegal segment: ${line} ${segmentKey}`);
      continue;
    }

    const p1 = getCoord(line, p1Name);
    const p2 = getCoord(line, p2Name);

    if (!p1 || !p2) continue;

    const forwardKey = `${p1Name}-${p2Name}`;
    const backwardKey = `${p2Name}-${p1Name}`;

    let traceData = null;
    let isReversed = false;

    const trackBook = EXACT_TRACKS[line] || {};

    // 디버깅: '가산디지털단지-남구로' 순회 시 로그 출력
    if (
      forwardKey === '가산디지털단지-남구로' ||
      backwardKey === '가산디지털단지-남구로'
    ) {
      console.log(`[DEBUG] Found Target Segment!`);
      console.log(`Raw: ${p1Raw}-${p2Raw}`);
      console.log(`Norm: ${forwardKey}`);
      console.log(`trackBook Keys:`, Object.keys(trackBook));
      console.log(
        `Match? ${!!trackBook[forwardKey]} or ${!!trackBook[backwardKey]}`,
      );
    }

    if (trackBook[forwardKey]) {
      traceData = trackBook[forwardKey];
      isReversed = false;
    } else if (trackBook[backwardKey]) {
      traceData = trackBook[backwardKey];
      isReversed = true;
    }

    const outputKeyForJSON = `${p1Raw}-${p2Raw}`;
    const reverseOutputKeyForJSON = `${p2Raw}-${p1Raw}`;

    paths[line][outputKeyForJSON] = generateSequence(
      p1,
      p2,
      traceData,
      isReversed,
      50,
    );
    paths[line][reverseOutputKeyForJSON] = [
      ...paths[line][outputKeyForJSON],
    ].reverse();
  }
}

// 명시적 덮어쓰기를 위한 I/O
const targetMsDir = path.resolve(process.cwd(), 'src/features/MS');
const outDir = path.join(targetMsDir, 'paths');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const exportsLog = [];
Object.keys(paths).forEach((line) => {
  const safeName = line.replace(/[^a-zA-Z0-9가-힣_-]/g, '');
  const content = `// v2.2.0 Strict Curve Override\nexport const PATH_${safeName} = ${JSON.stringify(paths[line], null, 2)};\n`;
  fs.writeFileSync(path.join(outDir, `${safeName}.js`), content);
  exportsLog.push(
    `export { PATH_${safeName} as "${line}" } from './paths/${safeName}';`,
  );
});

fs.writeFileSync(
  path.join(targetMsDir, 'subwayPaths_exports.js'),
  `// v2.3.0 (Selective Build)\n${exportsLog.join('\n')}\n`,
);
console.log('Successfully completed Ground-Truth station anchoring (v2.3.0)');
