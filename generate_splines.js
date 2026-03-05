import fs from 'fs';
import { SUBWAY_LINE_MAP } from './src/features/MS/subwayLineMap.js';
import { SUBWAY_STATION_COORDS } from './src/features/MS/subwayCoords.js';

function getCoord(line, station) {
  if (!SUBWAY_STATION_COORDS[line]) return null;
  let st =
    SUBWAY_STATION_COORDS[line][station] ||
    SUBWAY_STATION_COORDS[line][station + '역'];
  if (!st) {
    let noSpace = station.replace(/\s+/g, '');
    st =
      SUBWAY_STATION_COORDS[line][noSpace] ||
      SUBWAY_STATION_COORDS[line][noSpace + '역'];
  }
  return st;
}

function getT(t, p0, p1) {
  const dx = p1.lng - p0.lng;
  const dy = p1.lat - p0.lat;
  const a = Math.pow(dx * dx + dy * dy, 0.25); // alpha = 0.5 for centripetal catmull-rom
  return t + a;
}

function centripetalCatmullRom(p0, p1, p2, p3, t) {
  const t0 = 0.0;
  const t1 = getT(t0, p0, p1);
  const t2 = getT(t1, p1, p2);
  const t3 = getT(t2, p2, p3);

  if (t1 === t0) return p1;
  if (t2 === t1) return p2;
  if (t3 === t2) return p2;

  const tVal = t1 + t * (t2 - t1);

  const ax =
    ((t1 - tVal) / (t1 - t0)) * p0.lng + ((tVal - t0) / (t1 - t0)) * p1.lng;
  const ay =
    ((t1 - tVal) / (t1 - t0)) * p0.lat + ((tVal - t0) / (t1 - t0)) * p1.lat;
  const A = { lng: ax, lat: ay };

  const bx =
    ((t2 - tVal) / (t2 - t1)) * p1.lng + ((tVal - t1) / (t2 - t1)) * p2.lng;
  const by =
    ((t2 - tVal) / (t2 - t1)) * p1.lat + ((tVal - t1) / (t2 - t1)) * p2.lat;
  const B = { lng: bx, lat: by };

  const cx =
    ((t3 - tVal) / (t3 - t2)) * p2.lng + ((tVal - t2) / (t3 - t2)) * p3.lng;
  const cy =
    ((t3 - tVal) / (t3 - t2)) * p2.lat + ((tVal - t2) / (t3 - t2)) * p3.lat;
  const C = { lng: cx, lat: cy };

  const dx =
    ((t2 - tVal) / (t2 - t0)) * A.lng + ((tVal - t0) / (t2 - t0)) * B.lng;
  const dy =
    ((t2 - tVal) / (t2 - t0)) * A.lat + ((tVal - t0) / (t2 - t0)) * B.lat;
  const D = { lng: dx, lat: dy };

  const ex =
    ((t3 - tVal) / (t3 - t1)) * B.lng + ((tVal - t1) / (t3 - t1)) * C.lng;
  const ey =
    ((t3 - tVal) / (t3 - t1)) * B.lat + ((tVal - t1) / (t3 - t1)) * C.lat;
  const E = { lng: ex, lat: ey };

  const fx =
    ((t2 - tVal) / (t2 - t1)) * D.lng + ((tVal - t1) / (t2 - t1)) * E.lng;
  const fy =
    ((t2 - tVal) / (t2 - t1)) * D.lat + ((tVal - t1) / (t2 - t1)) * E.lat;

  return { lat: fy, lng: fx };
}

const paths = {};

for (const line of Object.keys(SUBWAY_LINE_MAP)) {
  const stations = SUBWAY_LINE_MAP[line];
  paths[line] = {};

  for (let i = 0; i < stations.length - 1; i++) {
    const p1Name = stations[i];
    const p2Name = stations[i + 1];

    const p1 = getCoord(line, p1Name);
    const p2 = getCoord(line, p2Name);

    if (!p1 || !p2) continue;

    let p0 = i === 0 ? p1 : getCoord(line, stations[i - 1]) || p1;
    let p3 =
      i === stations.length - 2 ? p2 : getCoord(line, stations[i + 2]) || p2;

    // 2호선 순환선 대응
    if (line === '2호선') {
      if (i === 0) p0 = getCoord(line, stations[stations.length - 1]) || p1;
      if (i === stations.length - 2) p3 = getCoord(line, stations[0]) || p2;
    }

    const segmentPoints = [];
    const numSegments = 6; // 5 intermediate points

    for (let t = 1; t < numSegments; t++) {
      const tVal = t / numSegments;
      segmentPoints.push(centripetalCatmullRom(p0, p1, p2, p3, tVal));
    }

    paths[line][`${p1Name}-${p2Name}`] = segmentPoints;
  }
}

const fileContent = `// 자동 생성된 지하철 노선 곡선 보간(Spline) 경로 중간점 데이터 (Centripetal Catmull-Rom 활용)
// 각 구간마다 5개의 곡선 가짜 점(Waypoints) 들이 들어있습니다.
export const SUBWAY_PATHS = ${JSON.stringify(paths, null, 2)};
`;

fs.writeFileSync('./src/features/MS/subwayPaths.js', fileContent);
console.log(
  'Successfully generated subwayPaths.js with 5 intermediate points per segment.',
);
