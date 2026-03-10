/**
 * [fix_coords.mjs]
 * 역할: subwayCoords.js의 모든 지하철역을 순회하며 Kakao Local API를 통해
 * 역별 메인 중심 좌표를 새롭게 Fetch 해오고, 그 결과를 덮어쓰는(Migration)
 * 1차 좌표 갱신 스크립트입니다.
 */
import fs from 'fs';

// //* [Modified Code] .env 파일에서 카카오맵 API 키 로드
const envFile = fs.readFileSync('.env', 'utf-8');
const match = envFile.match(/VITE_KAKAO_MAP_KEY=(.*)/);
const VITE_KAKAO_MAP_KEY = match ? match[1].trim() : '';
const ORIGIN = 'http://localhost:5173';

async function fetchCoords(line, station) {
  let query = `${line.replace('호선', '호선 ')} ${station}역`;
  // Some lines don't have 호선, like 경의중앙선, 수인분당선, 신분당선, 서해선.
  // Wait, the API might not like "경의중앙선 시청역". It's fine for "1호선 시청역" but maybe "서해선 시흥시청역" works?
  if (!line.includes('호선')) {
    query = `${line} ${station}역`;
  }

  const headers = {
    Authorization: `KakaoAK ${VITE_KAKAO_MAP_KEY}`,
    Referer: ORIGIN + '/',
    Origin: ORIGIN,
    KA: `sdk/1.0.0 os/javascript lang/ko-KR res/1920x1080 device/web_browser origin/${encodeURIComponent(ORIGIN)}`,
  };

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=SW8`,
    { headers },
  );
  if (!res.ok) {
    console.error(
      `Failed to fetch for ${query}: ${res.status} ${res.statusText}`,
    );
    return null; // fallback
  }
  const data = await res.json();
  if (data.documents && data.documents.length > 0) {
    return {
      lat: parseFloat(data.documents[0].y),
      lng: parseFloat(data.documents[0].x),
    };
  }
  // Try without line
  const res2 = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(station + '역')}&category_group_code=SW8`,
    { headers },
  );
  const data2 = await res2.json();
  if (data2.documents && data2.documents.length > 0) {
    return {
      lat: parseFloat(data2.documents[0].y),
      lng: parseFloat(data2.documents[0].x),
    };
  }

  // Try just station
  const res3 = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(station)}&category_group_code=SW8`,
    { headers },
  );
  const data3 = await res3.json();
  if (data3.documents && data3.documents.length > 0) {
    return {
      lat: parseFloat(data3.documents[0].y),
      lng: parseFloat(data3.documents[0].x),
    };
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

  let count = 0;
  for (const line in updatedCoords) {
    for (const station in updatedCoords[line]) {
      const coords = updatedCoords[line][station];
      const newCoords = await fetchCoords(line, station);
      if (newCoords) {
        updatedCoords[line][station] = newCoords;
        console.log(`[${line}] ${station}: ${newCoords.lat}, ${newCoords.lng}`);
      } else {
        console.log(`[${line}] ${station}: NOT FOUND`);
      }
      // 80ms delay for rate limit
      await new Promise((r) => setTimeout(r, 80));
      count++;
      if (count % 20 === 0) console.log(`Processed ${count} stations...`);
    }
  }

  console.log(`Processed all ${count} stations. Saving to file...`);

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
  console.log('Written successfully to src/features/MS/subwayCoords.js.');
}

run().catch(console.error);
