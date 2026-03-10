/**
 * [cleanup_coords.mjs]
 * 역할: 기존에 수집된 subwayCoords.js 데이터에서 좌표가 중복되거나 오차가 큰 특정 역들을
 * Kakao Local API로 재검색(다중 키워드 쿼리 적용)하여, 정확한 위치로 좌표 데이터를 다시 덮어쓰고 최적화하는 스크립트입니다.
 */
import fs from 'fs';

// //* [Modified Code] .env 파일에서 카카오 API 키 로드
const envFile = fs.readFileSync('.env', 'utf-8');
const match = envFile.match(/VITE_KAKAO_MAP_KEY=(.*)/);
const VITE_KAKAO_MAP_KEY = match ? match[1].trim() : '';
const ORIGIN = 'http://localhost:5173';

async function fetchBestCoords(line, station) {
  const headers = {
    Authorization: `KakaoAK ${VITE_KAKAO_MAP_KEY}`,
    Referer: ORIGIN + '/',
    Origin: ORIGIN,
    KA: `sdk/1.0.0 os/javascript lang/ko-KR res/1920x1080 device/web_browser origin/${encodeURIComponent(ORIGIN)}`,
  };

  // Try multiple query patterns
  const queries = [
    `${line.replace('호선', '호선 ')} ${station}역`,
    `${station}역 ${line}`,
    `${station}역`,
  ];

  for (const query of queries) {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=SW8`,
      { headers },
    );
    if (!res.ok) continue;
    const data = await res.json();

    if (data.documents && data.documents.length > 0) {
      // Find the best match: place_name should contain station name
      // Sort by relevance (Kakao does this) but verify name
      for (const doc of data.documents) {
        if (doc.place_name.includes(station)) {
          return {
            lat: parseFloat(doc.y),
            lng: parseFloat(doc.x),
            name: doc.place_name,
          };
        }
      }
    }
  }
  return null;
}

async function run() {
  const { SUBWAY_STATION_COORDS } = await import(
    'file:///' +
      process.cwd().replace(/\\/g, '/') +
      '/src/features/MS/subwayCoords.js'
  );

  let updatedCoords = JSON.parse(JSON.stringify(SUBWAY_STATION_COORDS));

  // Stations to specifically re-check (from verification report)
  const reCheck = [
    { line: '3호선', station: '을지로3가' },
    { line: '3호선', station: '충무로' },
    { line: '4호선', station: '충무로' },
    { line: '4호선', station: '명동' },
    { line: '5호선', station: '종로3가' },
    { line: '5호선', station: '을지로4가' },
    { line: '신분당선', station: '정자' },
    { line: '신분당선', station: '미금' },
    { line: '수인분당선', station: '청량리' },
    { line: '수인분당선', station: '회기' },
    { line: '경의중앙선', station: '디지털미디어시티' },
    { line: '경의중앙선', station: '수색' },
    { line: '경춘선', station: '상봉' },
    { line: '경춘선', station: '망우' },
    { line: '우이신설선', station: '정릉' },
    { line: '우이신설선', station: '성신여대입구' },
  ];

  for (const item of reCheck) {
    const result = await fetchBestCoords(item.line, item.station);
    if (result) {
      updatedCoords[item.line][item.station] = {
        lat: result.lat,
        lng: result.lng,
      };
      console.log(
        `Re-fixed [${item.line}] ${item.station} -> ${result.name} (${result.lat}, ${result.lng})`,
      );
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  // Double check ALL stations one last time for any remaining absolute duplicates within the SAME line
  // or suspicious clusters.
  // Actually, I'll just save this and verify again.

  let newCode =
    '// 서울/수도권 주요 지하철역 위경도 좌표 맵핑\nexport const SUBWAY_STATION_COORDS = {\n';
  for (const line in updatedCoords) {
    newCode += `  '${line}': {\n`;
    for (const station in updatedCoords[line]) {
      newCode += `    '${station}': { lat: ${updatedCoords[line][station].lat}, lng: ${updatedCoords[line][station].lng} },\n`;
    }
    newCode += `  },\n`;
  }
  newCode += '};\n';

  fs.writeFileSync('src/features/MS/subwayCoords.js', newCode);
  console.log('Cleanup written successfully.');
}

run().catch(console.error);
