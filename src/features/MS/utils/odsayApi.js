/**
 * @file odsayApi.js
 * @description ODsay API를 활용하여 지하철 경로 및 대중교통 경로 데이터를 조회하는 유틸리티
 * @module features/MS/utils/odsayApi
 */

// ODsay 환경변수 키는 VITE_ 전두사가 붙은 것을 사용
const ODSAY_API_KEY = import.meta.env.VITE_ODSAY_API_KEY;
const BASE_URL = 'https://api.odsay.com/v1/api';

/**
 * ODsay 출발역-도착역 ID 기반 지하철 경로 조회 함수
 * @param {string|number} startStationId - ODsay 기준 출발역 고유 ID (예: 120)
 * @param {string|number} endStationId - ODsay 기준 도착역 고유 ID (예: 201)
 * @param {number} [searchOpt=1] - 옵션 (1: 최단 시간, 2: 최소 환승)
 * @param {number} [cityCode=1000] - 도시 코드 (수도권: 1000)
 * @returns {Promise<Object>} 파싱된 지하철 경로 정보 객체
 */
export const fetchSubwayPath = async (
  startStationId,
  endStationId,
  searchOpt = 1,
  cityCode = 1000,
) => {
  if (!ODSAY_API_KEY) {
    throw new Error(
      'ODsay API Key가 설정되지 않았습니다. (.env의 VITE_ODSAY_API_KEY 확인)',
    );
  }

  const url = `${BASE_URL}/subwayPath?lang=0&CID=${cityCode}&SID=${startStationId}&EID=${endStationId}&Sopt=${searchOpt}&apiKey=${encodeURIComponent(ODSAY_API_KEY)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`[ODsay API 에러] ${data.error.msg}`);
    }

    const result = data.result;

    // 경로 요약 정보와 상세 역 정보를 구조화하여 반환
    return {
      globalStartName: result.globalStartName,
      globalEndName: result.globalEndName,
      travelTimeMin: result.globalTravelTime,
      distanceKm: result.globalDistance,
      stationCount: result.globalStationCount,
      fare: result.fare, // 요금
      // 경로에 포함된 모든 통과 역들의 정보
      stations: result.stationSet?.line?.flatMap((line) => line.station) || [],
      // 환승 정보 등이 담긴 드라이브 정보
      driveInfo: result.driveInfoSet?.driveInfo || [],
    };
  } catch (error) {
    console.error('Failed to fetch subway path:', error);
    throw error;
  }
};

/**
 * ODsay 출발-도착 좌표 기반 지하철 전용 경로 조회 함수 (searchPubTransPathT)
 * @param {number} startLng - 출발지 경도 (X)
 * @param {number} startLat - 출발지 위도 (Y)
 * @param {number} endLng - 도착지 경도 (X)
 * @param {number} endLat - 도착지 위도 (Y)
 * @returns {Promise<Object>} 파싱된 지하철 대중교통 경로 정보 객체
 */
export const fetchPubTransPath = async (startLng, startLat, endLng, endLat) => {
  if (!ODSAY_API_KEY) {
    throw new Error('ODsay API Key가 설정되지 않았습니다.');
  }

  // SearchType=1 (지하철 전용)
  const url = `${BASE_URL}/searchPubTransPathT?lang=0&SX=${startLng}&SY=${startLat}&EX=${endLng}&EY=${endLat}&OPT=0&SearchType=1&apiKey=${encodeURIComponent(ODSAY_API_KEY)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`[ODsay API 에러] ${data.error.msg}`);
    }

    // 첫 번째 추천 경로 탐색
    const firstPath = data.result.path[0];

    return {
      pathType: firstPath.pathType,
      info: {
        totalTime: firstPath.info.totalTime,
        payment: firstPath.info.payment,
        totalDistance: firstPath.info.totalDistance,
        firstStartStation: firstPath.info.firstStartStation,
        lastEndStation: firstPath.info.lastEndStation,
      },
      // 세부 이동 경로(도보, 지하철 노선 탑승 구간 등)
      subPaths: firstPath.subPath.filter((p) => p.trafficType === 1), // trafficType 1은 지하철
    };
  } catch (error) {
    console.error('Failed to fetch public transit path:', error);
    throw error;
  }
};
