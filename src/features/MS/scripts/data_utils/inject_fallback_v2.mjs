/**
 * [inject_fallback_v2.mjs]
 * 역할: inject_fallback.mjs의 개선 버전으로, MS.jsx 내에 이미 주입된 FALLBACK 코드가 있다면
 * 정규식을 이용해 깔끔하게 걷어내고 최신 좌표 체계(SUBWAY_STATION_COORDS_V2)를 기반으로
 * 다시 주입하는 멱등성(Idempotency)이 보장된 안전한 폴백 주입 스크립트입니다.
 */
import fs from 'fs';
import { SUBWAY_STATION_COORDS_V2 } from './src/features/MS/subwayCoords.js';

const fallbackObj = {
  경의중앙선: SUBWAY_STATION_COORDS_V2['경의중앙선'],
  경춘선: SUBWAY_STATION_COORDS_V2['경춘선'],
  서해선: SUBWAY_STATION_COORDS_V2['서해선'],
  우이신설선: SUBWAY_STATION_COORDS_V2['우이신설선'],
  공항철도: SUBWAY_STATION_COORDS_V2['공항철도'],
  수인분당선: SUBWAY_STATION_COORDS_V2['수인분당선'],
  신분당선: SUBWAY_STATION_COORDS_V2['신분당선'],
  김포골드라인: SUBWAY_STATION_COORDS_V2['김포골드라인'],
  '2호선': SUBWAY_STATION_COORDS_V2['2호선'], // 2호선 성수신정 지선 포함
};

const injection = `
// //* [Added Code] 브라우저 캐시 무효화 및 모듈 로드 실패를 원천 차단하기 위한 펌웨어급 강제 주입 좌표
const FALLBACK_NEW_LINES = ${JSON.stringify(fallbackObj, null, 2)};
`;

let msContent = fs.readFileSync('src/features/MS/MS.jsx', 'utf8');

// 이미 있으면 제거하고 다시 주입
if (msContent.includes('const FALLBACK_NEW_LINES')) {
  msContent = msContent.replace(
    /\/\/ \/\/[\s\S]*?const FALLBACK_NEW_LINES = \{[\s\S]*?\};\n/,
    '',
  );
}

msContent = msContent.replace(/(import .*;\n)+/, '$&\n' + injection);

// Usage replacement
// Regex to avoid double replacing if already ran
if (!msContent.includes('FALLBACK_NEW_LINES[lineName]?.[stationName]')) {
  msContent = msContent.replace(
    /let stationCoords =([\s\S]*?)SUBWAY_STATION_COORDS_V2\[lineName\]\?\.\[stationName \+ '역'\];/,
    `let stationCoords =
                SUBWAY_STATION_COORDS_V2[lineName]?.[stationName] ||
                SUBWAY_STATION_COORDS_V2[lineName]?.[stationName + '역'] ||
                FALLBACK_NEW_LINES[lineName]?.[stationName] || 
                FALLBACK_NEW_LINES[lineName]?.[stationName + '역'];`,
  );

  msContent = msContent.replace(
    /const noSpaceName = stationName\.replace\(\/\\s\+\/g, ''\);\s*stationCoords =([\s\S]*?)SUBWAY_STATION_COORDS_V2\[lineName\]\?\.\[noSpaceName \+ '역'\];/,
    `const noSpaceName = stationName.replace(/\\s+/g, '');
                stationCoords =
                  SUBWAY_STATION_COORDS_V2[lineName]?.[noSpaceName] ||
                  SUBWAY_STATION_COORDS_V2[lineName]?.[noSpaceName + '역'] ||
                  FALLBACK_NEW_LINES[lineName]?.[noSpaceName] || 
                  FALLBACK_NEW_LINES[lineName]?.[noSpaceName + '역'];`,
  );

  msContent = msContent.replace(
    /const strippedName = stationName\.replace\(\/역\$\/, ''\);\s*stationCoords =([\s\S]*?)SUBWAY_STATION_COORDS_V2\[lineName\]\?\.\[strippedName \+ '역'\];/,
    `const strippedName = stationName.replace(/역$/, '');
                stationCoords =
                  SUBWAY_STATION_COORDS_V2[lineName]?.[strippedName] ||
                  SUBWAY_STATION_COORDS_V2[lineName]?.[strippedName + '역'] ||
                  FALLBACK_NEW_LINES[lineName]?.[strippedName] || 
                  FALLBACK_NEW_LINES[lineName]?.[strippedName + '역'];`,
  );
}

fs.writeFileSync('src/features/MS/MS.jsx', msContent);
console.log('SUCCESS: Injected FALLBACK_NEW_LINES into MS.jsx');
