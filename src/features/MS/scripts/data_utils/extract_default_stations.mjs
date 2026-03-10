/**
 * [extract_default_stations.mjs]
 * 역할: Kakao API 등의 좌표 검색 실패로 인해 기본값(서울시청 구좌표: 37.5665, 126.978)
 * 으로 들어간 역들을 subwayCoords.js 에서 정규식으로 역추적하여
 * 수정이 필요한 타겟 역 명단을 추출하는 유틸리티 스크립트입니다.
 */

import fs from 'fs';
import path from 'path';

// //* [Modified Code] 배포 및 다른 환경에서도 실행 가능하도록 cwd() 기반 동적 상대경로 적용
const filePath = path.join(
  process.cwd(),
  'src',
  'features',
  'MS',
  'subwayCoords.js',
);
const content = fs.readFileSync(filePath, 'utf8');

const defaultLat = 37.5665;
const defaultLng = 126.978;

// Regular expression to find station mappings
// Matches: stationName: { lat: value, lng: value },
const regex =
  /^\s+["']?([^"']+)["']?:\s+{\s+lat:\s+([\d.]+),\s+lng:\s+([\d.]+)\s+},/gm;

const defaultStations = new Set();
let match;

while ((match = regex.exec(content)) !== null) {
  const name = match[1];
  const lat = parseFloat(match[2]);
  const lng = parseFloat(match[3]);

  if (lat === defaultLat && lng === defaultLng) {
    defaultStations.add(name);
  }
}

console.log(JSON.stringify(Array.from(defaultStations)));
