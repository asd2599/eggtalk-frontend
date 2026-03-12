/**
 * @file odsayService.js
 * @description ODsay API를 통한 지하철 경로 탐색 및 실제 선로 궤적(loadLane) 수집 서비스
 * @module features/MS/utils/odsayService
 *
 * //* [Modified Code] searchPubTransPathT + loadLane(0:0@info.mapObj) 방식 적용
 * ODsay 공식 가이드 기반: path[].info.mapObj → loadLane(mapObject=0:0@{mapObj}) → lane[].section[].graphPos[]
 */

// //* [Added Code] v12.0: 공통 axios 인스턴스 (백엔드 경유)
import { api } from '../../../utils/config';
import { SUBWAY_STATION_COORDS_V2 } from '../subwayCoords';
import { calibratePolyline } from './snapToTrack';

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
    // const fullMapObject = `0:0@${mapObj}`;
    // console.log('[ODsay loadLane] 호출:', fullMapObject);

    // //* [Modified Code] 백엔드에서 lane 데이터를 가져오도록 변경 가능하나, 
    // //* 현재는 프론트엔드 가공 로직 유지를 위해 백엔드 API로 우회 호출
    const res = await api.get('/api/subway/load-lane', {
      params: { mapObject: mapObj },
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

/**
 * //* [Added Code] Tmap API를 통해 실제 도보 경로 궤적 좌표를 가져온다.
 * @param {number} startX - 출발지 경도 (lng)
 * @param {number} startY - 출발지 위도 (lat)
 * @param {number} endX - 도착지 경도 (lng)
 * @param {number} endY - 도착지 위도 (lat)
 * @param {string} startName - 출발지 이름 (옵션)
 * @param {string} endName - 도착지 이름 (옵션)
 * @returns {Promise<Array<{lat, lng}>>}
 */
const fetchTmapPedestrianPath = async (startX, startY, endX, endY, startName, endName) => {
  if (!startX || !startY || !endX || !endY) return null;
  try {
    const res = await api.get('/api/tmap/pedestrian', {
      params: {
        startX,
        startY,
        endX,
        endY,
        startName: startName || '출발지',
        endName: endName || '도착지'
      }
    });

    if (res.data?.success && res.data?.result) {
      return res.data.result; // //* [Modified Code] 반환 갱신: { path, totalDistance, totalTime }
    }
    return null;
  } catch (err) {
    console.warn('[Tmap Pedestrian] 호출 실패:', err.message);
    return null;
  }
};

const odsayService = {
  async searchStation(stationName) {
    try {
      // //* [Modified Code] 백엔드에서 이미 필터링된 데이터를 줄 수도 있으므로 구조 유연화
      const res = await api.get('/api/subway/search-station', {
        params: { stationName },
      });
      
      const result = res.data?.result;
      if (!result || (!result.station && !result.poi)) {
        // //* [Added Code] 역 검색 실패 시 POI 검색으로 자동 폴백
        const poiRes = await this.searchPOI(stationName);
        return poiRes.length > 0 ? poiRes[0] : null;
      }

      if (result.station) {
        const stations = Array.isArray(result.station) ? result.station : [result.station];
        if (stations.length > 0) {
          const subwayStations = stations.filter((s) => s.stationClass === 2);
          return subwayStations.length > 0 ? subwayStations[0] : stations[0];
        }
      }

      // 역 검색 결과 없으면 POI 폴백
      const poiRes = await this.searchPOI(stationName);
      return poiRes.length > 0 ? poiRes[0] : null;
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
      const res = await api.get('/api/subway/search-poi', {
        params: { searchKeyword },
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
      startName = start.name || start.poiName || start.stationName;
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
      endName = end.name || end.poiName || end.stationName;
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

    // //* [Added Code] v12.0: 순수 도보(pathType === 3) 요청 시 Tmap API로 완전 우회 (Mocking)
    if (pathType === 3) {
      const walkResult = await fetchTmapPedestrianPath(SX, SY, EX, EY, startName, endName);
      if (!walkResult || !walkResult.path || walkResult.path.length === 0) {
        throw new Error('검색된 도보 경로가 없습니다.');
      }
      
      // //* [Fixed] 백엔드가 재시작되지 않았을 경우를 대비하여 rawFeatureCollection에서도 추출 시도
      const properties = walkResult.rawFeatureCollection?.features?.[0]?.properties || {};
      const totalDist = walkResult.totalDistance || properties.totalDistance || 0;
      const totalTimeSec = walkResult.totalTime || properties.totalTime || 0;
      const totalTimeMin = Math.ceil(totalTimeSec / 60);

      // ODsay 응답 형식(formattedPath)으로 완벽하게 Mocking하여 반환
      return [{
        pathType: 3, // 통합/도보
        totalTime: totalTimeMin,
        totalDistance: totalDist,
        totalWalkDistance: totalDist,
        totalFare: 0,
        transferCount: 0,
        firstStartStation: startName,
        lastEndStation: endName,
        mapObj: null, // 도보는 mapObj (ODsay 궤적) 없음
        subPaths: [
            {
                trafficType: 3, 
                distance: totalDist, 
                sectionTime: totalTimeMin, 
                startX: SX, 
                startY: SY, 
                endX: EX, 
                endY: EY 
            }
        ],
        raw: {
            subPath: [
                {
                    trafficType: 3, 
                    distance: totalDist, 
                    sectionTime: totalTimeMin, 
                    startX: SX, 
                    startY: SY, 
                    endX: EX, 
                    endY: EY 
                }
            ]
        },
        queryOrigin: { lat: parseFloat(SY), lng: parseFloat(SX) },
        queryDest: { lat: parseFloat(EY), lng: parseFloat(EX) },
        isWalkOnly: true
      }];
    }

    // 2단계: 백엔드 통합 경로 검색 API 호출
    let pathRes;
    try {
      pathRes = await api.get('/api/subway/search-path', {
        params: {
          sx: SX,
          sy: SY,
          ex: EX,
          ey: EY,
          searchType,
          pathType,
        },
      });
    } catch (err) {
      // //* [Fixed] 백엔드가 500을 반환할 때 실제 에러 메시지를 추출 (기존: axios generic 메시지만 노출)
      const serverMsg = err.response?.data?.error;
      throw new Error(serverMsg || err.message);
    }

    if (pathRes.data?.error) {
      throw new Error(pathRes.data.error || '경로 검색 오류');
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
        queryOrigin: { lat: parseFloat(SY), lng: parseFloat(SX) },
        queryDest: { lat: parseFloat(EY), lng: parseFloat(EX) },
      };
    });

    // //* [Added Code] v10.0: 최단거리(2) 선택 시 클라이언트 사이드 정렬
    if (searchType === 2) {
      formattedPaths.sort((a, b) => a.totalDistance - b.totalDistance);
    }

    // //* [Modified Code] v10.0: 도보 코드는 상단에서 가로챘으므로 제거

    return formattedPaths;
  },

  /**
   * //* [New Function] 선택된 경로의 상세 정보(타임라인, 지도 궤적)를 구축합니다.
   * @param {Object} selectedPath - 사용자가 선택한 경로 객체
   */
  // //* [Modified Code] 전체 경로(도보+대중교통) 세그먼트를 subPath 순서대로 구축하도록 개편
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
          // //* [Added Code] 지도 이동을 위해 구간의 시작 좌표를 저장
          startX: stations[0]?.x,
          startY: stations[0]?.y,
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
          // //* [Added Code] 지도 이동을 위해 구간의 시작 좌표를 저장
          startX: stations[0]?.x,
          startY: stations[0]?.y,
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
            // //* [Added Code] 지도 이동을 위해 도보 구간의 시작 좌표를 저장
            startX: sub.startX,
            startY: sub.startY,
          });
        }
      }
    }

    // //* [Modified Code] subPath 순서대로 segments를 구축 (도보 점선 + 대중교통 실선)
    const segments = [];
    const stationPath = [];

    // 1) loadLane 데이터를 미리 가져옴 (대중교통 구간의 정밀 궤적용)
    const mapObj = selectedPath.raw.info?.mapObj;
    const allLaneData = mapObj ? await fetchLaneData(mapObj) : [];

    // //* [Added Code] loadLane 데이터를 lane.type 기준으로 인덱싱 (subPath 매칭용)
    // 같은 type(호선)이 여러번 나올 수 있으므로 배열로 관리
    const laneDataByType = {};
    allLaneData.forEach((lane) => {
      if (!laneDataByType[lane.type]) laneDataByType[lane.type] = [];
      laneDataByType[lane.type].push(lane);
    });
    // 각 type별 사용 인덱스 추적 (동일 호선 다중 구간 대응)
    const laneUsageIdx = {};

    // //* [Added Code] 출발지/도착지 좌표 추적 (검색 원본 좌표)
    let originCoord = selectedPath.queryOrigin || null;
    let destCoord = selectedPath.queryDest || null;

    let lastPoint = originCoord; // 도보 연결용 이전 노드 좌표 추적

    // 2) subPath를 순서대로 순회하며 segments 구축
    for (let i = 0; i < subPaths.length; i++) {
      const sub = subPaths[i];
      const type = sub.trafficType;
      const isLast = i === subPaths.length - 1;

      if (type === 3) {
        // //! [Original Code] 도보 구간 — 기존에는 세그먼트 생성 없이 타임라인만 추가
        // //* [Modified Code] 도보 구간: 이전 노드의 끝 좌표부터 다음 노드의 시작 좌표까지 점선 연결(직접 계산)
        let walkStart = lastPoint;
        let walkEnd = null;

        if (isLast) {
          walkEnd = destCoord;
        } else {
          // 다음 대중교통 구간의 첫 번째 정거장 좌표를 도보의 목적지로 설정
          const nextSub = subPaths[i + 1];
          if (nextSub && (nextSub.trafficType === 1 || nextSub.trafficType === 2)) {
            const nextStations = nextSub.passStopList?.stations || [];
            if (nextStations.length > 0) {
              walkEnd = { lat: parseFloat(nextStations[0].y), lng: parseFloat(nextStations[0].x) };
            }
          }
        }

        // 혹시 위치를 못 찾았다면 ODsay 응답값으로 폴백
        if (!walkStart) {
          walkStart = { lat: parseFloat(sub.startY), lng: parseFloat(sub.startX) };
        }
        if (!walkEnd) {
          walkEnd = { lat: parseFloat(sub.endY), lng: parseFloat(sub.endX) };
        }

        if (
          walkStart?.lat && !isNaN(walkStart.lat) && 
          walkEnd?.lat && !isNaN(walkEnd.lat) && 
          sub.distance > 0
        ) {
          // //* [Modified Code] Tmap API를 호출하여 실제 도보 경로 궤적 확보
          let walkPathCoordinates = [];
          try {
            const walkResult = await fetchTmapPedestrianPath(
              walkStart.lng,
              walkStart.lat,
              walkEnd.lng,
              walkEnd.lat
            );
            if (walkResult && walkResult.path) {
              walkPathCoordinates = walkResult.path;
            }
          } catch (e) {
            console.warn('[Tmap] 도보 궤적 확보 실패, 직선으로 폴백합니다.', e);
          }

          // Tmap 결과가 없으면 기존처럼 직선 배열로 폴백
          if (!walkPathCoordinates || walkPathCoordinates.length === 0) {
            walkPathCoordinates = [walkStart, walkEnd];
          }

          segments.push({
            laneName: '도보',
            color: '#888888',
            path: walkPathCoordinates,
            strokeStyle: 'dash',
          });
        }

        if (walkEnd && !isNaN(walkEnd.lat)) {
          lastPoint = walkEnd;
        }

      } else if (type === 1 || type === 2) {
        // //* [Modified Code] 대중교통 구간: loadLane 궤적 매칭 → 매칭 실패 시 stations 좌표 폴백
        const lane = sub.lane?.[0] || {};
        const stations = sub.passStopList?.stations || [];

        // loadLane에서 해당 노선(subwayCode 또는 lane.type)에 대응하는 궤적 찾기
        const laneType = lane.subwayCode || lane.type;
        let matchedLane = null;

        if (laneType && laneDataByType[laneType]) {
          const idx = laneUsageIdx[laneType] || 0;
          if (laneDataByType[laneType][idx]) {
            matchedLane = laneDataByType[laneType][idx];
            laneUsageIdx[laneType] = idx + 1;
          }
        }

        // loadLane 매칭 실패 시 전체 laneData에서 첫 번째 미사용 lane 사용 시도
        if (!matchedLane && allLaneData.length > 0) {
          for (const ld of allLaneData) {
            const ldType = ld.type;
            const usedCount = laneUsageIdx[ldType] || 0;
            const totalCount = (laneDataByType[ldType] || []).length;
            if (usedCount < totalCount) {
              // 아직 사용되지 않은 lane이 있으면 시도하지 않음 (다른 subPath용)
            }
          }
        }

        let segPath = [];
        let segColor = '#666666';
        let segName = '대중교통';

        if (type === 1) {
          // 지하철
          segName = lane.name || '지하철';
          segColor = LANE_TYPE_COLOR[lane.subwayCode] || '#0052A4';

          if (matchedLane && matchedLane.points.length > 1) {
            // loadLane 궤적 사용 + 보정
            const calibLaneName = LANE_TYPE_NAME[matchedLane.type] || segName;
            const stationCoords = SUBWAY_STATION_COORDS_V2[calibLaneName] || {};
            segPath = calibratePolyline(matchedLane.points, stationCoords);
          }
        } else {
          // 버스
          const busInfo = BUS_TYPE_INFO[lane.type] || { name: '버스', color: '#666666' };
          segName = `${lane.busNo || '버스'} (${busInfo.name})`;
          segColor = busInfo.color;

          if (matchedLane && matchedLane.points.length > 1) {
            segPath = matchedLane.points;
          }
        }

        // //* [Added Code] loadLane 매칭 실패 시 stations 좌표로 폴백
        if (segPath.length < 2 && stations.length >= 2) {
          segPath = stations
            .map((s) => {
              const lat = parseFloat(s.y);
              const lng = parseFloat(s.x);
              if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                return { lat, lng };
              }
              // 로컬 좌표 DB에서 검색
              const localCoord = findLocalCoords(s.stationName);
              return localCoord || null;
            })
            .filter(Boolean);
        }

        if (segPath.length > 0) {
          segments.push({
            laneName: segName,
            color: segColor,
            path: segPath,
            strokeStyle: 'solid',
          });
        }

        // stationPath 구축 (마커용)
        stations.forEach((s) => {
          const lat = parseFloat(s.y);
          const lng = parseFloat(s.x);
          if (!isNaN(lat) && !isNaN(lng)) {
            stationPath.push({
              name: s.stationName,
              lat,
              lng,
              line: type === 1 ? (lane.name || '지하철') : (lane.busNo || '버스'),
            });
          }
        });

        // //* [Added Code] 본 구간의 마지막 좌표를 lastPoint로 업데이트하여 다음 도보의 시작점으로 사용
        if (stations.length > 0) {
          const lastSt = stations[stations.length - 1];
          lastPoint = { lat: parseFloat(lastSt.y), lng: parseFloat(lastSt.x) };
        }

        // 출발지/도착지 좌표 폴백 (도보 구간이 없는 경우)
        if (!originCoord && i === 0 && stations.length > 0) {
          originCoord = { lat: parseFloat(stations[0].y), lng: parseFloat(stations[0].x) };
        }
        if (i === subPaths.length - 1 && stations.length > 0) {
          const lastStation = stations[stations.length - 1];
          if (!destCoord) {
            destCoord = { lat: parseFloat(lastStation.y), lng: parseFloat(lastStation.x) };
          }
        }
      }
    }

    return {
      ...selectedPath,
      walkTime: totalWalkTime,
      timeline: formattedTimeline,
      segments: segments,
      path: stationPath,
      // //* [Added Code] 출발지/도착지 실제 좌표 (마커 렌더링용)
      origin: originCoord,
      destination: destCoord,
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

        // //* [Modified Code] 백엔드 통합 경로 검색 API 호출 (PreLoad 전용)
        const pathRes = await api.get('/api/subway/search-path', {
          params: {
            sx: startSt.x,
            sy: startSt.y,
            ex: endSt.x,
            ey: endSt.y,
            searchType: 0,
            pathType: 1, // 지하철 우선
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
