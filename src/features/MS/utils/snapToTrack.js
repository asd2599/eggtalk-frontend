/**
 * @file snapToTrack.js
 * @description 열차 좌표를 노선 궤적(loadLane) 위에 스냅하고, 접선 방향 각도를 계산하는 유틸리티
 *
 * //* [Modified Code] ODsay loadLane 궤적 데이터를 활용하여 열차 아이콘이
 * 실제 철길 위에 위치하고, 화살표가 진행 방향을 따라가도록 하는 핵심 모듈
 */

/**
 * 두 좌표(lat,lng) 사이의 거리 제곱을 반환 (메르카토르 도법 보정 포함)
 */
const distSq = (lat1, lng1, lat2, lng2) => {
  const avgLat = (lat1 + lat2) / 2;
  const cosLat = Math.cos((avgLat * Math.PI) / 180);
  const dLat = lat1 - lat2;
  const dLng = (lng1 - lng2) * cosLat;
  return dLat * dLat + dLng * dLng;
};

/**
 * 점 P를 선분 AB 위에 정사영(projection)하여 가장 가까운 점을 반환한다.
 */
const projectOnSegment = (p, a, b) => {
  const avgLat = (a.lat + b.lat) / 2;
  const cosLat = Math.cos((avgLat * Math.PI) / 180);

  const abLat = b.lat - a.lat;
  const abLng = (b.lng - a.lng) * cosLat;
  const pLat = p.lat - a.lat;
  const pLng = (p.lng - a.lng) * cosLat;

  const lenSq = abLat * abLat + abLng * abLng;

  if (lenSq < 1e-14) {
    return {
      lat: a.lat,
      lng: a.lng,
      t: 0,
      dist2: distSq(p.lat, p.lng, a.lat, a.lng),
    };
  }

  let t = (pLat * abLat + pLng * abLng) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projLat = a.lat + t * abLat;
  const projLng = a.lng + t * (b.lng - a.lng); // 원본 스케일로 복원하여 적용

  return {
    lat: projLat,
    lng: projLng,
    t,
    dist2: distSq(p.lat, p.lng, projLat, projLng),
  };
};

/**
 * 두 점 사이의 bearing(방위각)을 도(degree) 단위로 계산한다.
 * 북쪽 = 0°, 동쪽 = 90°, 남쪽 = 180°, 서쪽 = 270°
 */
/**
 * 두 점 사이의 시각적 각도(Bearing)를 도(degree) 단위로 계산한다.
 * 카카오맵(메르카토르) 평면 지도에 최적화된 픽셀 기반 각도 산출.
 * 북쪽 = 0°, 동쪽 = 90°, 남쪽 = 180°, 서쪽 = 270°
 */
export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const avgLat = (lat1 + lat2) / 2;
  const cosLat = Math.cos((avgLat * Math.PI) / 180);

  const dy = lat2 - lat1;
  const dx = (lng2 - lng1) * cosLat;

  // atan2(dx, dy)는 북쪽 기준 시계방향 각도를 반환 (+x: 동쪽, +y: 북쪽)
  let angle = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (angle + 360) % 360;
};

/**
 * 주어진 좌표를 폴리라인(궤적) 위의 가장 가까운 점에 스냅하고,
 * 해당 위치에서의 접선 방향 각도(bearing)를 반환한다.
 *
 * @param {{lat: number, lng: number}} point - 스냅할 열차 좌표
 * @param {Array<{lat: number, lng: number}>} polyline - 노선 궤적 좌표 배열
 * @returns {{lat: number, lng: number, angle: number, segIndex: number} | null}
 */
export const snapToPolyline = (point, polyline) => {
  if (!point || !polyline || polyline.length < 2) return null;

  let bestDist2 = Infinity;
  let bestPoint = null;
  let bestSegIndex = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const proj = projectOnSegment(point, polyline[i], polyline[i + 1]);
    if (proj.dist2 < bestDist2) {
      bestDist2 = proj.dist2;
      bestPoint = { lat: proj.lat, lng: proj.lng };
      bestSegIndex = i;
    }
  }

  if (!bestPoint) return null;

  const MAX_SNAP_DIST2 = 0.005 * 0.005;
  if (bestDist2 > MAX_SNAP_DIST2) {
    return null;
  }

  // //* [Modified Code] 회전 각도 스무딩 (Smoothed Bearing)
  // 단일 세그먼트의 각도는 데이터 노이즈에 민감하므로, 앞뒤 점들을 포함하여 평균 각도 계산
  const getAngleAt = (idx) => {
    const a = polyline[idx];
    const b = polyline[idx + 1];
    return calculateBearing(a.lat, a.lng, b.lat, b.lng);
  };

  let angle = getAngleAt(bestSegIndex);

  // 앞뒤 세그먼트가 있다면 가중 평균 (곡선에서 부드러운 회전 유도)
  if (polyline.length > 2) {
    let angles = [angle];
    if (bestSegIndex > 0) angles.push(getAngleAt(bestSegIndex - 1));
    if (bestSegIndex < polyline.length - 2)
      angles.push(getAngleAt(bestSegIndex + 1));

    // 각도 평균 계산 (0/360도 경계 처리 - Vector Average)
    const sinSum = angles.reduce(
      (sum, a) => sum + Math.sin((a * Math.PI) / 180),
      0,
    );
    const cosSum = angles.reduce(
      (sum, a) => sum + Math.cos((a * Math.PI) / 180),
      0,
    );
    angle = ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
  }

  return {
    lat: bestPoint.lat,
    lng: bestPoint.lng,
    angle,
    segIndex: bestSegIndex,
  };
};

/**
 * 폴리라인에서 가장 가까운 세그먼트 인덱스만 빠르게 찾는다 (가벼운 버전).
 */
export const findNearestSegment = (point, polyline) => {
  if (!polyline || polyline.length < 2) return -1;

  let bestDist2 = Infinity;
  let bestIdx = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const proj = projectOnSegment(point, polyline[i], polyline[i + 1]);
    if (proj.dist2 < bestDist2) {
      bestDist2 = proj.dist2;
      bestIdx = i;
    }
  }
  return bestIdx;
};

/**
 * //* [Modified Code] 고정밀 궤적 보정 시스템 (Station Anchoring & Advanced Warping)
 * 단순 인덱스 기반이 아닌 누적 거리 비중을 활용하여 미세 오차를 보정합니다.
 *
 * @param {Array<{lat,lng}>} polyline - 조정할 ODsay 궤적
 * @param {Object} stationCoordsMap - 해당 노선에 속한 { 이름: {lat,lng} } 좌표 DB
 * @returns {Array<{lat,lng}>} - 카카오맵 타일에 최적화된 보정 궤적
 */
export const calibratePolyline = (polyline, stationCoordsMap) => {
  if (!polyline || polyline.length < 2 || !stationCoordsMap) return polyline;

  // 1. 각 점의 누적 거리 계산
  const dists = [0];
  let totalDist = 0;
  for (let i = 1; i < polyline.length; i++) {
    totalDist += Math.sqrt(
      distSq(
        polyline[i - 1].lat,
        polyline[i - 1].lng,
        polyline[i].lat,
        polyline[i].lng,
      ),
    );
    dists.push(totalDist);
  }

  // 2. 궤적상에서 각 역의 위치(앵커)와 오차 벡터 찾기
  const anchors = [];
  for (const [name, realCoord] of Object.entries(stationCoordsMap)) {
    let minD2 = Infinity;
    let bestIdx = -1;

    for (let i = 0; i < polyline.length; i++) {
      const d2 = distSq(
        realCoord.lat,
        realCoord.lng,
        polyline[i].lat,
        polyline[i].lng,
      );
      if (d2 < minD2) {
        minD2 = d2;
        bestIdx = i;
      }
    }

    if (bestIdx !== -1 && minD2 < 0.008 * 0.008) {
      anchors.push({
        idx: bestIdx,
        dist: dists[bestIdx],
        deltaLat: realCoord.lat - polyline[bestIdx].lat,
        deltaLng: realCoord.lng - polyline[bestIdx].lng,
        name,
      });
    }
  }

  anchors.sort((a, b) => a.idx - b.idx);
  if (anchors.length === 0) return polyline;

  // 3. 거리 기반 보간 적용
  return polyline.map((point, i) => {
    const curDist = dists[i];
    let dLat = 0,
      dLng = 0;

    if (curDist <= anchors[0].dist) {
      dLat = anchors[0].deltaLat;
      dLng = anchors[0].deltaLng;
    } else if (curDist >= anchors[anchors.length - 1].dist) {
      const last = anchors[anchors.length - 1];
      dLat = last.deltaLat;
      dLng = last.deltaLng;
    } else {
      let startA, endA;
      for (let j = 0; j < anchors.length - 1; j++) {
        if (curDist >= anchors[j].dist && curDist <= anchors[j + 1].dist) {
          startA = anchors[j];
          endA = anchors[j + 1];
          break;
        }
      }

      // 인덱스가 아닌 '거리 비율'로 보간하여 곡선 형태 보존 극대화
      const ratio = (curDist - startA.dist) / (endA.dist - startA.dist);
      dLat = startA.deltaLat + (endA.deltaLat - startA.deltaLat) * ratio;
      dLng = startA.deltaLng + (endA.deltaLng - startA.deltaLng) * ratio;
    }

    return {
      lat: point.lat + dLat,
      lng: point.lng + dLng,
    };
  });
};

export default {
  snapToPolyline,
  calculateBearing,
  findNearestSegment,
  calibratePolyline,
};
