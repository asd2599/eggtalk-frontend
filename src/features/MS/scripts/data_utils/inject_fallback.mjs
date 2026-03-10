/**
 * [inject_fallback.mjs]
 * 역할: 브라우저 환경에서 subwayCoords.js 모듈 로드에 실패하거나 캐싱 문제가 발생하여
 * 지도에 열차가 뜨지 않는 치명타를 막기 위해, MS.jsx 컴포넌트 파일 내부에
 * 좌표 데이터를 문자열 형태로 직접 쑤셔넣어(Inject) 펌웨어급 Fallback을 구성하는 긴급 구명 스크립트입니다.
 */
import fs from 'fs';

let coordsContent = fs.readFileSync('src/features/MS/subwayCoords.js', 'utf8');

// Extract properties from '수인분당선' to the end
let match = coordsContent.match(/('수인분당선':[\s\S]*\}\s*\}[\s\S]*);?/);
if (!match) {
  console.log('Failed to extract');
  process.exit(1);
}

let extraLines = match[1];
// Strip trailing semicolon or export closing if any, just to be safe
extraLines = extraLines.replace(/;\s*$/, '').trim();

// Strip the very last '}' which belongs to SUBWAY_STATION_COORDS_V2
if (extraLines.endsWith('}')) {
  extraLines = extraLines.substring(0, extraLines.length - 1).trim();
}

let msContent = fs.readFileSync('src/features/MS/MS.jsx', 'utf8');

if (!msContent.includes('const FALLBACK_NEW_LINES')) {
  const injection = `
// //* [Added Code] 브라우저 캐시 무효화 및 모듈 로드 실패를 원천 차단하기 위한 펌웨어급 강제 주입 좌표
const FALLBACK_NEW_LINES = {
  ${extraLines}
};
`;
  // Inject right after the imports
  msContent = msContent.replace(/(import .*;\n)+/, '$&\n' + injection);

  // Use it in mapping
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

  fs.writeFileSync('src/features/MS/MS.jsx', msContent);
  console.log('Injected FALLBACK_NEW_LINES into MS.jsx');
} else {
  console.log('FALLBACK_NEW_LINES already exists');
}
