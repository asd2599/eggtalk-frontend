import fs from 'fs';
import path from 'path';

/**
 * [SYSTEM PRESET] 지하철 좌표 수집 자동화 스크립트 (line4)
 * 이 파일은 .env의 API Key를 직접 포함하지 않고 환경변수(process.env)에서 로드합니다.
 */

const KAKAO_API_KEY = process.env.VITE_KAKAO_MAP_KEY;
const ORIGIN = 'http://localhost:5173';

const target_stations = [
  "진접",
  "오남",
  "별내별가람",
  "당고개",
  "상계",
  "노원",
  "창동",
  "쌍문",
  "수유",
  "미아"
];
const COORDS_FILE_PATH = path.join(process.cwd(), 'src/features/MS/subwayCoords.js');

async function run() {
  if (!KAKAO_API_KEY) {
    console.error('[CRITICAL] VITE_KAKAO_MAP_KEY is missing! Set it in your environment.');
    return;
  }

  console.log(`[START] Fetching coordinates for line4 (${target_stations.length} stations)`);
  let out = {};
  let text = fs.readFileSync(COORDS_FILE_PATH, 'utf8');

  for (const stn of target_stations) {
    if (text.includes(`"${stn}":`) || text.includes(`  ${stn}:`)) {
      continue;
    }

    console.log(`[FETCH] ${stn}역`);
    try {
      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(stn + '역')}`, {
        headers: { 
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
          'Referer': ORIGIN + '/',
          'Origin': ORIGIN,
          'KA': `sdk/1.0.0 os/javascript lang/ko-KR res/1920x1080 device/web_browser origin/${encodeURIComponent(ORIGIN)}`
        }
      });
      const data = await res.json();
      const docs = data.documents || [];
      if (docs.length > 0) {
        out[stn] = { lat: parseFloat(docs[0].y), lng: parseFloat(docs[0].x) };
      }
    } catch (e) {
      console.error(`[ERR] ${stn}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  if (Object.keys(out).length === 0) {
    console.log(`[DONE] No new stations for line4.`);
    return;
  }

  text = text.trim();
  if (text.endsWith('};')) text = text.substring(0, text.length - 2);
  else if (text.endsWith('}')) text = text.substring(0, text.length - 1);
  
  text += `\n\n  // --- Automatically Added (line4) ---\n`;
  for (const [k, v] of Object.entries(out)) {
    text += `  "${k}": { lat: ${v.lat}, lng: ${v.lng} },\n`;
  }
  text += "};\n";

  fs.writeFileSync(COORDS_FILE_PATH, text);
  console.log(`[FINISH] Saved ${Object.keys(out).length} stations.`);
}

run();
