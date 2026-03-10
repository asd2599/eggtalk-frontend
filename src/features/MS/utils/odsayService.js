/**
 * @file odsayService.js
 * @description ODsay API를 통한 지하철 경로 탐색 및 실제 선로 궤적(loadLane) 수집 서비스
 * @module features/MS/utils/odsayService
 *
 * //* [Modified Code] searchPubTransPathT + loadLane(0:0@info.mapObj) 방식 적용
 * ODsay 공식 가이드 기반: path[].info.mapObj → loadLane(mapObject=0:0@{mapObj}) → lane[].section[].graphPos[]
 */

import axios from 'axios';
import { SUBWAY_STATION_COORDS_V2 } from '../subwayCoords';
import { calibratePolyline } from './snapToTrack';

const API_KEY = import.meta.env.VITE_ODSAY_API_KEY;
const BASE_URL = 'https://api.odsay.com/v1/api'; // //* [Modified Code] 실배포 시에는 .env의 설정을 따르거나 실제 API 주소 사용

// //* [Added Code] v11.0: API 호출 오남용 방지를 위한 요청 캐시 (과금 방지용)
const requestCache = new Map();

// //* [Added Code] 버스 노선 타입별 색상 및 명칭 정의 (시각적 일관성 확보)
const BUS_TYPE_INFO = {
  1: { name: '일반', color: '#33CC99' },
  2: { name: '좌석', color: '#FF6600' },
  3: { name: '마을', color: '#5BB025' },
  4: { name: '직행좌석', color: '#E60012' },
  5: { name: '공항', color: '#0065B3' },
  6: { name: '간선급행', color: '#E60012' },
  11: { name: '간선', color: '#0068B7' },
  12: { name: '지선', color: '#5BB025' },
  13: { name: '순환', color: '#F2B70A' },
  14: { name: '광역', color: '#E60012' },
  15: { name: '심야', color: '#2E2F82' },
  26: { name: '급행', color: '#E60012' },
};

// 지하철 노선별 공식 브랜드 색상 (loadLane lane.type으로도 매칭)
const LINE_COLOR_MAP = {
  '1호선': '#0052A4',
  // '1호선(경인선)': '#0052A4',
  // '1호선(경부선)': '#0052A4',
  '2호선': '#00A84D',
  // '2호선(본선)': '#00A84D',
  // '2호선(신정지선)': '#00A84D',
  // '2호선(성수지선)': '#00A84D',
  '3호선': '#EF7C1C',
  '4호선': '#00A5DE',
  '5호선': '#996CAC',
  '6호선': '#CD7C2F',
  '7호선': '#747F00',
  '8호선': '#E6186C',
  '9호선': '#BDB092',
  '수도권 1호선': '#0052A4',
  '수도권 2호선': '#00A84D',
  '수도권 3호선': '#EF7C1C',
  '수도권 4호선': '#00A5DE',
  '수도권 5호선': '#996CAC',
  '수도권 6호선': '#CD7C2F',
  '수도권 7호선': '#747F00',
  '수도권 8호선': '#E6186C',
  '수도권 9호선': '#BDB092',
  수도권1호선: '#0052A4',
  수도권2호선: '#00A84D',
  수도권3호선: '#EF7C1C',
  수도권4호선: '#00A5DE',
  수도권5호선: '#996CAC',
  수도권6호선: '#CD7C2F',
  수도권7호선: '#747F00',
  수도권8호선: '#E6186C',
  수도권9호선: '#BDB092',
  신분당선: '#D4003B',
  수인분당선: '#F5A200',
  경의중앙선: '#77C4A3',
  경춘선: '#0C8E72',
  서해선: '#81A914',
  우이신설선: '#B7C452',
  공항철도: '#0090D2',
  김포골드라인: '#AD8605',
  지하철: '#666666',
};

// //* [Mentor's Tip] loadLane 응답의 lane.type은 노선 번호 (1=1호선, 2=2호선, ...)
const LANE_TYPE_COLOR = {
  1: '#0052A4',
  2: '#00A84D',
  3: '#EF7C1C',
  4: '#00A5DE',
  5: '#996CAC',
  6: '#CD7C2F',
  7: '#747F00',
  8: '#E6186C',
  9: '#BDB092',
  100: '#0090D2',
  101: '#77C4A3',
  104: '#0C8E72',
  107: '#81A914',
  108: '#F5A200',
  109: '#B7C452',
  110: '#AD8605',
  111: '#D4003B',
  112: '#6789CA',
  113: '#FDA600',
};

const LANE_TYPE_NAME = {
  1: '1호선',
  2: '2호선',
  3: '3호선',
  4: '4호선',
  5: '5호선',
  6: '6호선',
  7: '7호선',
  8: '8호선',
  9: '9호선',
  100: '공항철도',
  101: '경의중앙선',
  104: '경춘선',
  107: '서해선',
  108: '수인분당선',
  109: '우이신설선',
  110: '김포골드라인',
  111: '신분당선',
  112: 'GTX-A',
  113: '의정부경전철',
};

/**
 * 로컬 좌표 DB에서 역 좌표를 검색한다.
 */
const findLocalCoords = (stationName) => {
  if (!stationName) return null;
  const cleaned = stationName.replace(/역$/, '').replace(/\s+/g, '');
  for (const line in SUBWAY_STATION_COORDS_V2) {
    const stationsInLine = SUBWAY_STATION_COORDS_V2[line];
    const coord =
      stationsInLine[cleaned] ||
      stationsInLine[cleaned + '역'] ||
      stationsInLine[stationName];
    if (coord) return coord;
  }
  return null;
};

/**
 * ODsay loadLane API를 호출하여 실제 선로 궤적 좌표를 노선별로 반환한다.
 * //* [Modified Code] ODsay 공식 가이드: mapObject = "0:0@" + info.mapObj
 *
 * @param {string} mapObj - bestPath.info.mapObj 값 (예: "2:2:237:238")
 * @returns {Promise<Array<{type: number, points: Array<{lat,lng}>}>>}
 */
const fetchLaneData = async (mapObj) => {
  if (!mapObj) {
    console.warn('[ODsay loadLane] mapObj가 비어있음');
    return [];
  }
  try {
    // ODsay 공식 가이드: "0:0@" + mapObj 형식
    const fullMapObject = `0:0@${mapObj}`;
    console.log('[ODsay loadLane] 호출:', fullMapObject);

    const res = await axios.get(`${BASE_URL}/loadLane`, {
      params: { mapObject: fullMapObject, apiKey: API_KEY },
    });

    const data = res.data;

    if (data?.error) {
      console.warn('[ODsay loadLane] API 에러:', data.error);
      return [];
    }

    // 공식 응답 구조: data.result.lane[]
    const laneArray = data?.result?.lane;
    if (!Array.isArray(laneArray) || laneArray.length === 0) {
      console.warn(
        '[ODsay loadLane] lane 배열 없음:',
        JSON.stringify(data).slice(0, 300),
      );
      return [];
    }

    // //* [Modified Code] 각 lane의 type과 section[].graphPos[] 추출
    const lanes = [];
    laneArray.forEach((lane) => {
      const laneType = lane.type; // 노선 번호 (2=2호선 등)
      const sections = lane.section || lane.sections || [];
      const points = [];

      (Array.isArray(sections) ? sections : []).forEach((sec) => {
        const graphPos = sec.graphPos || sec.point || sec.points || [];
        (Array.isArray(graphPos) ? graphPos : []).forEach((pos) => {
          const lat = parseFloat(pos.y ?? pos.lat);
          const lng = parseFloat(pos.x ?? pos.lng);
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            points.push({ lat, lng });
          }
        });
      });

      if (points.length > 0) {
        lanes.push({ type: laneType, points });
      }
    });

    console.log(
      `[ODsay loadLane] ${lanes.length}개 lane, 총 ${lanes.reduce((a, l) => a + l.points.length, 0)}개 좌표`,
    );
    return lanes;
  } catch (err) {
    console.warn('[ODsay loadLane] 호출 실패:', err.message);
    return [];
  }
};

const odsayService = {
  async searchStation(stationName) {
    try {
      const res = await axios.get(`${BASE_URL}/searchStation`, {
        params: { lang: 0, stationName, CID: 1000, apiKey: API_KEY },
      });
      if (!res.data?.result?.station) {
        console.warn(`[ODsay searchStation] 결과 없음: ${stationName}`);
        return null;
      }
      const stations = res.data.result.station;
      const subwayStations = stations.filter((s) => s.stationClass === 2);
      return subwayStations.length > 0 ? subwayStations[0] : stations[0];
    } catch (e) {
      console.error(`[ODsay searchStation] 실패: ${stationName}`, e.message);
      return null;
    }
  },

  /**
   * //* [Added Code] 통합 장소 검색 (POI)
   * 주소, 건물명, 주요 지점 검색을 지원합니다. (map.odsay.com 벤치마킹)
   * @param {string} searchKeyword - 검색어
   */
  async searchPOI(searchKeyword) {
    // //* [Added Code] v11.0: POI 검색 중복 방지 (500ms Throttle)
    const now = Date.now();
    const lastRequest = requestCache.get(`poi_${searchKeyword}`);
    if (lastRequest && now - lastRequest < 500) return [];
    requestCache.set(`poi_${searchKeyword}`, now);

    try {
      const res = await axios.get(`${BASE_URL}/searchPOI`, {
        params: { lang: 0, searchKeyword, CID: 1000, apiKey: API_KEY },
      });
      if (!res.data?.result?.poi) {
        console.warn(`[ODsay searchPOI] 결과 없음: ${searchKeyword}`);
        return [];
      }
      return res.data.result.poi; // [ { poiName, x, y, ... } ]
    } catch (e) {
      console.error(`[ODsay searchPOI] 실패: ${searchKeyword}`, e.message);
      return [];
    }
  },

  /**
   * //* [Modified Code] searchPubTransPathT + loadLane 연동
   * ODsay 공식 가이드 기반: info.mapObj → loadLane(0:0@mapObj) → lane[].section[].graphPos[]
   */
  /**
   * //* [Modified Code] 통합 대중교통 경로 검색 (지하철+버스+도보)
   * @param {string|object} start - 출발지 명칭 또는 {name, x, y} 객체
   * @param {string|object} end - 도착지 명칭 또는 {name, x, y} 객체
   * @param {number} searchType - 0: 최적경로, 1: 최단시간, 3: 최저환승
   * @param {number} pathType - 0: 전체, 1: 지하철, 2: 버스 //* [Added Code] 수송 수단 필터
   */
  async getPublicTransPath(start, end, searchType = 0, pathType = 0) {
    // //* [Added Code] v11.0: 길찾기 API 호출 오남용 방지 (1200ms Throttle)
    // 연타로 인한 중복 과금 발생을 원천 차단합니다.
    const requestKey = `path_${JSON.stringify(start)}_${JSON.stringify(end)}_${searchType}_${pathType}`;
    const now = Date.now();
    const lastRequest = requestCache.get(requestKey);
    if (lastRequest && now - lastRequest < 1200) {
      console.warn('[ODsay] 중복 호출 방지 활성화 (Throttle)');
      return null;
    }
    requestCache.set(requestKey, now);

    // 1단계: 좌표 확보 (이미 좌표가 있으면 사용, 없으면 검색)
    let SX, SY, EX, EY, startName, endName;

    if (typeof start === 'object' && start.x && start.y) {
      SX = start.x;
      SY = start.y;
      startName = start.name;
    } else {
      const startStation = await this.searchStation(start);
      if (!startStation)
        throw new Error(`출발지를 찾을 수 없습니다: "${start}"`);
      SX = startStation.x;
      SY = startStation.y;
      startName = start;
    }

    if (typeof end === 'object' && end.x && end.y) {
      EX = end.x;
      EY = end.y;
      endName = end.name;
    } else {
      const endStation = await this.searchStation(end);
      if (!endStation) throw new Error(`도착지를 찾을 수 없습니다: "${end}"`);
      EX = endStation.x;
      EY = endStation.y;
      endName = end;
    }

    console.log(
      `[ODsay] ${startName} → ${endName} (${SX},${SY} → ${EX},${EY}) 통합 검색`,
    );

    // 2단계: searchPubTransPathT 호출
    let pathRes;
    try {
      pathRes = await axios.get(`${BASE_URL}/searchPubTransPathT`, {
        params: {
          lang: 0,
          SX: SX,
          SY: SY,
          EX: EX,
          EY: EY,
          OPT: 0,
          // //* [Modified Code] v10.0: 최단거리가 API에 수동 매핑될 수 있으므로 분기 처리
          SearchType: searchType === 2 ? 0 : searchType, // 2는 클라이언트에서 수동 정렬 예정
          // //* [Modified Code] v10.0: 도보(3)는 전체(0)로 호출 후 필터링
          SearchPathType: pathType === 3 ? 0 : pathType,
          apiKey: API_KEY,
        },
      });
    } catch (err) {
      throw new Error(`통합 경로 조회 실패: ${err.message}`);
    }

    if (pathRes.data?.error) {
      throw new Error(pathRes.data.error.msg || '경로 검색 오류');
    }

    const resultPaths = pathRes.data?.result?.path;
    if (!Array.isArray(resultPaths) || resultPaths.length === 0) {
      throw new Error('검색된 대중교통 경로가 없습니다.');
    }

    // //* [Modified Code] 검색된 모든 경로 목록을 반환하도록 개편
    let formattedPaths = resultPaths.map((path) => {
      // //* [Added Code] v10.0: 도보 비중 계산을 위해 subPath 분석
      let walkDist = 0;
      path.subPath.forEach((sub) => {
        if (sub.trafficType === 3) walkDist += sub.distance;
      });

      return {
        pathType: path.pathType, // 1:지하철, 2:버스, 3:통합
        totalTime: path.info.totalTime,
        totalDistance: path.info.totalDistance,
        totalWalkDistance: walkDist, // //* [New Field] 필터링용
        totalFare: path.info.payment || 0,
        transferCount:
          (path.info.subwayTransitCount || 0) +
          (path.info.busTransitCount || 0),
        firstStartStation: path.info.firstStartStation,
        lastEndStation: path.info.lastEndStation,
        mapObj: path.info.mapObj,
        subPaths: path.subPath,
        raw: path,
      };
    });

    // //* [Added Code] v10.0: 최단거리(2) 선택 시 클라이언트 사이드 정렬
    if (searchType === 2) {
      formattedPaths.sort((a, b) => a.totalDistance - b.totalDistance);
    }

    // //* [Added Code] v10.0: 도보(3) 선택 시 필터링 (도보가 포함된 전체 경로 중 추천)
    if (pathType === 3) {
      // ODsay 결과 중 도보 비중이 높거나 우선순위가 높은 것 위주로 필터링 (또는 전체 노출하되 도보 최적화)
      // 여기서는 전체를 보여주되, UI에서 '도보' 강조를 위해 그대로 둠 (또는 도보 전용 검색 메시지 유도)
    }

    return formattedPaths;
  },

  /**
   * //* [New Function] 선택된 경로의 상세 정보(타임라인, 지도 궤적)를 구축합니다.
   * @param {Object} selectedPath - 사용자가 선택한 경로 객체
   */
  getPathDetail: async (selectedPath) => {
    const subPaths = selectedPath.raw.subPath || [];
    const formattedTimeline = [];
    let totalWalkTime = 0;

    for (const sub of subPaths) {
      const type = sub.trafficType; // 1:지하철, 2:버스, 3:도보

      if (type === 1) {
        const lane = sub.lane?.[0] || {};
        const stations = sub.passStopList?.stations || [];
        formattedTimeline.push({
          type: 'SUBWAY',
          line: lane.name || '지하철',
          subwayCode: lane.subwayCode,
          startName: stations[0]?.stationName,
          endName: stations[stations.length - 1]?.stationName,
          stationCount: sub.stationCount,
          time: sub.sectionTime,
          distance: sub.distance,
          stops: stations.map((s) => s.stationName),
        });
      } else if (type === 2) {
        const lane = sub.lane?.[0] || {};
        const stations = sub.passStopList?.stations || [];
        const busInfo = BUS_TYPE_INFO[lane.type] || {
          name: '버스',
          color: '#666666',
        };
        formattedTimeline.push({
          type: 'BUS',
          busNo: lane.busNo,
          busType: busInfo.name,
          color: busInfo.color,
          startName: stations[0]?.stationName,
          endName: stations[stations.length - 1]?.stationName,
          stationCount: sub.stationCount,
          time: sub.sectionTime,
          distance: sub.distance,
          stops: stations.map((s) => s.stationName),
        });
      } else if (type === 3) {
        totalWalkTime += sub.sectionTime;
        if (sub.distance > 0) {
          formattedTimeline.push({
            type: 'WALK',
            time: sub.sectionTime,
            distance: sub.distance,
          });
        }
      }
    }

    const segments = [];
    const stationPath = []; // //* [Added Code] 지도 마커용 정거장 리스트
    const mapObj = selectedPath.raw.info?.mapObj;
    if (mapObj) {
      const laneData = await fetchLaneData(mapObj);
      laneData.forEach((lane) => {
        const laneName = LANE_TYPE_NAME[lane.type] || `노선${lane.type}`;
        const color =
          LANE_TYPE_COLOR[lane.type] ||
          (lane.type < 10 ? '#33CC99' : '#666666');

        let path = lane.points;
        if (lane.type <= 100) {
          const stationCoords = SUBWAY_STATION_COORDS_V2[laneName] || {};
          path = calibratePolyline(lane.points, stationCoords);
        }

        const strokeStyle = lane.type === 3 ? 'dash' : 'solid';
        segments.push({ laneName, color, path, strokeStyle });
      });
    }

    // //* [Added Code] 모든 subPath의 정거장을 순회하며 stationPath 구축
    subPaths.forEach((sub) => {
      if (sub.trafficType === 1 || sub.trafficType === 2) {
        const laneName = sub.lane?.[0]?.name || sub.lane?.[0]?.busNo;
        sub.passStopList?.stations?.forEach((s) => {
          stationPath.push({
            name: s.stationName,
            lat: parseFloat(s.y),
            lng: parseFloat(s.x),
            line: laneName,
          });
        });
      }
    });

    return {
      ...selectedPath,
      walkTime: totalWalkTime,
      timeline: formattedTimeline,
      segments: segments,
      path: stationPath, // //* [Added Code] MS.jsx 마커용
    };
  },
};

// //* [Modified Code] 노선별 loadLane 궤적 캐시 — 열차 아이콘 스냅용
const laneCache = {};

/**
 * 특정 노선의 전체 loadLane 궤적 좌표를 반환한다.
 * 이미 캐시된 경우 캐시에서 반환 (메모리 캐시).
 *
 * @param {string} lineName - 노선 이름 (예: "2호선")
 * @returns {Array<{lat: number, lng: number}>} - 궤적 좌표 배열
 */
export const getLineLaneCache = () => laneCache;

/**
 * 경로 탐색(loadLane) 결과를 노선별 캐시에 저장한다.
 * MS.jsx에서 loadLane 성공 시 호출하여 캐시를 구축.
 *
 * @param {number} laneType - lane.type 값 (2=2호선 등)
 * @param {Array<{lat,lng}>} points - 궤적 좌표 배열
 */
export const cacheLaneData = (laneType, points) => {
  const name = LANE_TYPE_NAME[laneType] || `노선${laneType}`;
  if (!laneCache[name]) {
    laneCache[name] = [];
  }

  // //* [Modified Code] 고정밀 보환(Calibration) 적용
  // 캐시에 저장하기 전, 실제 역 좌표 DB를 기준으로 궤적을 픽셀 단위로 보정함
  const stationCoords =
    SUBWAY_STATION_COORDS_V2[name] ||
    SUBWAY_STATION_COORDS_V2[`수도권 ${name}`] ||
    {};
  const calibratedPoints = calibratePolyline(points, stationCoords);

  // 기존 캐시에 새 좌표 병합 (중복 제거하지 않음 — 순서 보존 중요)
  laneCache[name] = [...laneCache[name], ...calibratedPoints];
  console.log(
    `[ODsay Cache/Calibrated] ${name}: ${laneCache[name].length}개 좌표 보정 후 캐시됨`,
  );
};

/**
 * 특정 노선명으로 캐시된 궤적을 반환.
 * @param {string} lineName - "2호선", "수도권 2호선" 등
 * @returns {Array<{lat,lng}>|null}
 */
export const getCachedLane = (lineName) => {
  if (laneCache[lineName]) return laneCache[lineName];
  const shortened = lineName.replace(/^수도권\s*/, '');
  if (laneCache[shortened]) return laneCache[shortened];
  const expanded = `수도권 ${lineName}`;
  if (laneCache[expanded]) return laneCache[expanded];
  return null;
};

// //* [Modified Code] 노선별 자동 궤적 프리로드 — 경로 검색 없이도 열차 스냅 가능
// 각 노선의 대표 구간(첫역↔끝역) searchPubTransPathT → loadLane으로 궤적 확보
const loadingLines = new Set(); // 중복 호출 방지

// //* [Modified Code] 지선/분기 누락 방지를 위한 최소화된 필수 구간 (분기당 1회 호출 원칙)
// 단일 호출 시 누락되는 인천행(1호선), 성수지선(2호선) 등을 커버하기 위한 최적 구성입니다.
const LINE_STATION_PAIRS = {
  '1호선': [
    ['신창', '연천'], // 본선 (경부-경원 라인)
    ['인천', '구로'], // 경인선 지선 (인천-부천-구로)
  ],
  '2호선': [
    ['시청', '신도림'], // 순환선 상단/우측 구간
    ['신도림', '성수'], // 순환선 하단/좌측 구간
    ['성수', '신설동'], // 성수지선
    ['신도림', '까치산'], // 신정지선
  ],
  '3호선': [['대화', '오금']],
  '4호선': [['진접', '오이도']],
  '5호선': [
    ['방화', '상일동'], // 본선
    ['강동', '마천'], // 마천지선
  ],
  '6호선': [['응암', '신내']],
  '7호선': [['장암', '석남']],
  '8호선': [['별내', '모란']],
  '9호선': [['개화', '중앙보훈병원']],
  경의중앙선: [
    ['문산', '지평'], // 본선
    ['서울역', '가좌'], // 서울역 지선
  ],
  수인분당선: [['인천', '청량리']],
  신분당선: [['신사', '광교']],
  경춘선: [['광운대', '춘천']],
  공항철도: [['서울역', '인천공항2터미널']],
  우이신설선: [['북한산우이', '신설동']],
};

/**
 * 특정 노선의 loadLane 궤적을 백그라운드에서 자동 로드한다.
 * //* [Modified Code] 분기/지선 포함 — 다중 구간 순회로 전체 노선 커버
 */
export const loadLineTrack = async (lineName) => {
  const shortName = lineName.replace(/^수도권\s*/, '');

  // 이미 로딩 중이면 스킵
  if (loadingLines.has(shortName)) return;
  // 이미 캐시됨 → 스킵
  if (getCachedLane(lineName)) return;

  const pairs = LINE_STATION_PAIRS[shortName];
  if (!pairs || pairs.length === 0) return;

  loadingLines.add(shortName);

  try {
    console.log(
      `[ODsay PreLoad] ${shortName} 궤적 로딩 시작 (${pairs.length}개 구간)`,
    );

    for (const [startName, endName] of pairs) {
      // 루프 내부에서도 다시 한번 캐시 확인 (이전 구간 로드 시 함께 로드되었을 가능성)
      if (getCachedLane(shortName)) break;

      try {
        const [startSt, endSt] = await Promise.all([
          odsayService.searchStation(startName),
          odsayService.searchStation(endName),
        ]);
        if (!startSt || !endSt) {
          console.warn(
            `[ODsay PreLoad] ${shortName} ${startName}→${endName}: 역 검색 실패`,
          );
          continue;
        }

        const pathRes = await axios.get(`${BASE_URL}/searchPubTransPathT`, {
          params: {
            lang: 0,
            SX: startSt.x,
            SY: startSt.y,
            EX: endSt.x,
            EY: endSt.y,
            OPT: 0,
            SearchType: 0,
            SearchPathType: 0,
            apiKey: API_KEY,
          },
        });

        const resultPaths = pathRes.data?.result?.path;
        if (!Array.isArray(resultPaths) || resultPaths.length === 0) continue;

        const bestPath =
          resultPaths.find((p) => p.pathType === 1) || resultPaths[0];
        const mapObj = bestPath.info?.mapObj;
        if (!mapObj) continue;

        const laneData = await fetchLaneData(mapObj);
        if (laneData.length > 0) {
          laneData.forEach((lane) => {
            cacheLaneData(lane.type, lane.points); // 통합된 cacheLaneData 활용 (보정 포함)
          });
          console.log(
            `[ODsay PreLoad] ${shortName} ${startName}→${endName}: +${laneData.reduce((a, l) => a + l.points.length, 0)}좌표`,
          );
        }

        // API 부하 분산: 구간 사이 딜레이를 500ms로 소폭 상향
        await new Promise((r) => setTimeout(r, 500));
      } catch (segErr) {
        console.warn(
          `[ODsay PreLoad] ${shortName} ${startName}→${endName} 실패:`,
          segErr.message,
        );
      }
    }

    const cached = laneCache[shortName];
    console.log(
      `[ODsay PreLoad] ✅ ${shortName} 전체 궤적 완료: ${cached ? cached.length : 0}좌표`,
    );
  } catch (err) {
    console.warn(`[ODsay PreLoad] ${shortName} 실패:`, err.message);
  } finally {
    loadingLines.delete(shortName);
  }
};

export default odsayService;
