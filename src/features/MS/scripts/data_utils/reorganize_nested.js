/**
 * [reorganize_nested.js]
 * 역할: subwayCoords.js의 1차원 평면적인 좌표 데이터를 노선별(Depth)로 완전히
 * 구조화(Nested Object)하고, 특히 환승역(예: 서울역 1호선/4호선/공항철도 플랫폼)의
 * 물리적 하차 위치(플랫폼) 미세 오차까지 개별 하드코딩하여 정밀도를 올리는 구조 재배치 스크립트입니다.
 */
import fs from 'fs';
import { SUBWAY_LINE_MAP } from './src/features/MS/subwayLineMap.js';
import { SUBWAY_STATION_COORDS } from './src/features/MS/subwayCoords.js';

// Explicitly define platform-specific coordinates for major transfer stations
const platformOverrides = {
  서울역: {
    '1호선': { lat: 37.554648, lng: 126.972559 },
    '4호선': { lat: 37.5532, lng: 126.9727 },
    공항철도: { lat: 37.5516, lng: 126.9678 },
    경의중앙선: { lat: 37.5562, lng: 126.9705 },
  },
  시청: {
    '1호선': { lat: 37.5657, lng: 126.9769 },
    '2호선': { lat: 37.5641, lng: 126.9751 },
  },
  종로3가: {
    '1호선': { lat: 37.5704, lng: 126.9921 },
    '3호선': { lat: 37.5716, lng: 126.9914 },
    '5호선': { lat: 37.5692, lng: 126.9918 },
  },
  동대문역사문화공원: {
    '2호선': { lat: 37.5651, lng: 127.0079 },
    '4호선': { lat: 37.5658, lng: 127.0087 },
    '5호선': { lat: 37.5645, lng: 127.0082 },
  },
  신도림: {
    '1호선': { lat: 37.5087, lng: 126.8913 },
    '2호선': { lat: 37.5093, lng: 126.8901 },
  },
  고속터미널: {
    '3호선': { lat: 37.5046, lng: 127.0053 },
    '7호선': { lat: 37.5042, lng: 127.0044 },
    '9호선': { lat: 37.5052, lng: 127.0058 },
  },
  김포공항: {
    '5호선': { lat: 37.5624, lng: 126.8003 }, // 5호선은 좌측 보라색 라인 쪽에 위치
    '9호선': { lat: 37.5628, lng: 126.8023 }, // 9호선은 상단 갈색 라인 쪽에 위치
    공항철도: { lat: 37.5623, lng: 126.8023 }, // 공항철도는 하늘색 라인 쪽에 위치
    서해선: { lat: 37.5615, lng: 126.8012 }, // 서해선은 하단 쪽에 위치
    김포골드라인: { lat: 37.5619, lng: 126.8018 }, // 김포골드라인 플랫폼
  },
  마곡나루: {
    '9호선': { lat: 37.567, lng: 126.8275 }, // 9호선 플랫폼 약간 좌상단
    공항철도: { lat: 37.5677, lng: 126.8294 }, // 공항철도 플랫폼 고정
  },
  왕십리: {
    '2호선': { lat: 37.5615, lng: 127.0368 },
    '5호선': { lat: 37.561, lng: 127.0373 },
    경의중앙선: { lat: 37.562, lng: 127.0378 },
    수인분당선: { lat: 37.5625, lng: 127.0365 },
  },
  공덕: {
    '5호선': { lat: 37.5432, lng: 126.9516 },
    '6호선': { lat: 37.5428, lng: 126.9525 },
    공항철도: { lat: 37.5419, lng: 126.9508 },
    경의중앙선: { lat: 37.5423, lng: 126.9532 },
  },
  홍대입구: {
    '2호선': { lat: 37.5568, lng: 126.9242 },
    공항철도: { lat: 37.5582, lng: 126.9255 },
    경의중앙선: { lat: 37.559, lng: 126.9262 },
  },
  디지털미디어시티: {
    '6호선': { lat: 37.5776, lng: 126.9002 },
    공항철도: { lat: 37.5765, lng: 126.8995 },
    경의중앙선: { lat: 37.5758, lng: 126.9015 },
  },
  불광: {
    '3호선': { lat: 37.6105, lng: 126.9299 },
    '6호선': { lat: 37.6112, lng: 126.9288 },
  },
  연신내: {
    '3호선': { lat: 37.6191, lng: 126.921 },
    '6호선': { lat: 37.6185, lng: 126.9202 },
  },
  동대문: {
    '1호선': { lat: 37.5714, lng: 127.0097 },
    '4호선': { lat: 37.5721, lng: 127.0105 },
  },
  충무로: {
    '3호선': { lat: 37.5614, lng: 126.9941 },
    '4호선': { lat: 37.5619, lng: 126.9933 },
  },
  교대: {
    '2호선': { lat: 37.4934, lng: 127.0141 },
    '3호선': { lat: 37.4928, lng: 127.0135 },
  },
  잠실: {
    '2호선': { lat: 37.5133, lng: 127.1001 },
    '8호선': { lat: 37.514, lng: 127.1015 },
  },
  천호: {
    '5호선': { lat: 37.5384, lng: 127.1236 },
    '8호선': { lat: 37.5375, lng: 127.1245 },
  },
  수원: {
    '1호선': { lat: 37.2659, lng: 127.0001 },
    수인분당선: { lat: 37.265, lng: 127.0015 },
  },
  금정: {
    '1호선': { lat: 37.3722, lng: 126.9433 },
    '4호선': { lat: 37.373, lng: 126.9442 },
  },
  대곡: {
    '3호선': { lat: 37.6317, lng: 126.8109 },
    경의중앙선: { lat: 37.6325, lng: 126.8118 },
    서해선: { lat: 37.631, lng: 126.81 },
  },
};

const finalStructure = {};

for (const line of Object.keys(SUBWAY_LINE_MAP)) {
  finalStructure[line] = {};
  for (const station of SUBWAY_LINE_MAP[line]) {
    // Check override first for platform-level precision
    if (platformOverrides[station] && platformOverrides[station][line]) {
      finalStructure[line][station] = platformOverrides[station][line];
    } else {
      // Fallback to existing coordinate
      const base =
        SUBWAY_STATION_COORDS[station] || SUBWAY_STATION_COORDS[station + '역'];
      if (base) {
        finalStructure[line][station] = { lat: base.lat, lng: base.lng };
      } else {
        // Specifically check for '연신내' coordinates if it wasn't in original flat list
        if (station === '연신내') {
          finalStructure[line][station] = { lat: 37.6185, lng: 126.9202 };
        } else {
          console.warn(`Missing coord for ${station} in line ${line}`);
          finalStructure[line][station] = { lat: 37.5665, lng: 126.978 };
        }
      }
    }
  }
}

let fileContent =
  '// 서울/수도권 주요 지하철역 위경도 좌표 하드코딩 맵핑 (호선별 플랫폼 위치 정밀화)\n';
fileContent += 'export const SUBWAY_STATION_COORDS = {\n';

for (const [line, stations] of Object.entries(finalStructure)) {
  fileContent += `  '${line}': {\n`;
  for (const [station, coord] of Object.entries(stations)) {
    const key =
      station.includes('.') || /^[0-9]/.test(station) || station.includes('(')
        ? `'${station}'`
        : station;
    fileContent += `    ${key}: { lat: ${coord.lat}, lng: ${coord.lng} },\n`;
  }
  fileContent += '  },\n';
}

fileContent += '};\n';

fs.writeFileSync('./src/features/MS/subwayCoords.js', fileContent);
console.log(
  'Successfully updated SUBWAY_STATION_COORDS with nested structure and platform precision.',
);
