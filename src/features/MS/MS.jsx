import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pet from '../pets/pet';

import ActionModal from './ActionModal';
import { SUBWAY_STATION_COORDS } from './subwayCoords';
import { SUBWAY_PATHS } from './subwayPaths';
import SubwayIcon from './components/SubwayIcon';
import { SUBWAY_LINE_MAP } from './subwayLineMap';
import { SERVER_URL } from '../../utils/config';

// //* [Mentor's Tip] 두 좌표(위경도) 사이의 각도(Bearing)를 계산하는 수학 함수입니다.
// 0도는 북쪽, 90도는 동쪽, 180도는 남쪽, 270도는 서쪽을 가리킵니다.
const calculateBearing = (startLat, startLng, endLat, endLng) => {
  const dy = endLat - startLat;
  const dx = endLng - startLng;
  const angle = Math.atan2(dx, dy) * (180 / Math.PI);
  return angle;
};

// //* [Mentor's Tip] 지하철 호선별 고유 브랜드 색상 정의 (UI 직관성 향상)
export const SUBWAY_LINE_COLORS = {
  '1호선': '#0052A4',
  '2호선': '#00A84D',
  '3호선': '#EF7C1C',
  '4호선': '#00A5DE',
  '5호선': '#996CAC',
  '6호선': '#CD7C2F',
  '7호선': '#747F00',
  '8호선': '#E6186C',
  '9호선': '#BDB092',
  신분당선: '#D4003B',
  수인분당선: '#F5A200',
  경의중앙선: '#77C4A3',
  경춘선: '#0C8E72',
  서해선: '#81A914',
  우이신설선: '#B7C452',
  공항철도: '#0090D2',
};

// //* [Modified Code] 카카오맵 연동 컴포넌트 및 로더 훅(Hook) 추가
import {
  Map,
  MapMarker,
  useKakaoLoader,
  ZoomControl,
  CustomOverlayMap,
} from 'react-kakao-maps-sdk';

// //* [Modified Code] 하단 6개 박스의 독립적인 상태(이름, 아이콘)를 관리하기 위한 배열 모델 데이터 추가
const ACTION_MENUS = [
  { id: 1, name: 'Eating', icon: '🍔' },
  { id: 2, name: 'Cleaning', icon: '🧹' },
  { id: 3, name: 'Sleeping', icon: '💤' },
  { id: 4, name: 'Playing', icon: '🎾' },
  { id: 5, name: 'Volunteer', icon: '🤝' },
  { id: 6, name: 'Chatting', icon: '💬' },
];

const MS = () => {
  // //* [Modified Code] Pet 이름, 레벨/경험치 UI 및 모달 팝업 상태 추가
  const [petName, setPetName] = useState('Pet');
  const [level, setLevel] = useState(1);
  const [expPercent, setExpPercent] = useState(0); // 0 ~ 100 사이의 백분율
  const [activeModal, setActiveModal] = useState(null);

  // //* [Added Code] 지하철 API 에러 상태 및 디버깅용 상태
  const [subwayError, setSubwayError] = useState(null);

  // 펫 데이터 Fetch 및 초기화
  useEffect(() => {
    const fetchPetParams = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        // //! [Original Code] 하드코딩된 로컬 연결 주소
        // const res = await axios.get('http://localhost:8000/api/pets/my', {
        // //* [Modified Code] 로컬호스트 주소를 SERVER_URL 상수로 치환
        const res = await axios.get(`${SERVER_URL}/api/pets/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data && res.data.pet) {
          const p = res.data.pet;
          // //* [Modified Code] 응답 받은 펫 데이터를 기반으로 이름, 레벨, 경험치 상태 초기화
          setPetName(p.name || 'Pet');
          setLevel(p.level || 1);
          const maxExp = (p.level || 1) * 100;
          setExpPercent(Math.min(((p.exp || 0) / maxExp) * 100, 100));
        }
      } catch (err) {
        console.error('Failed to fetch pet data in MS:', err);
      }
    };
    fetchPetParams();
  }, []);

  // 모달에서 액션 성공 시 호출될 콜백 함수 (새로고침 없이 실시간 스탯 반영)
  const handlePetUpdate = (updatedPet) => {
    // //* [Modified Code] 액션 후 갱신된 펫 정보(이름, 레벨, 경험치)를 실시간 반영
    if (updatedPet.name) setPetName(updatedPet.name);
    setLevel(updatedPet.level || 1);
    const maxExp = (updatedPet.level || 1) * 100;
    setExpPercent(Math.min(((updatedPet.exp || 0) / maxExp) * 100, 100));
  };

  // 컴포넌트 마운트 시 브라우저 중앙을 기준으로 하는 펫의 초기 좌표 상태 (위도, 경도)
  // 초기값: 강남역 부근 좌료
  const [petPosition, setPetPosition] = useState({
    lat: 37.498095,
    lng: 127.02761,
  });

  // 맵의 줌 레벨 관리를 위한 상태
  const [mapLevel, setMapLevel] = useState(3);

  // //* [Modified Code] 지도의 영역(Bounds) 좌표 상태 관리 및 Ref 연동 (클로저 이슈 해결)
  const [mapBounds, setMapBounds] = useState(null);
  const mapBoundsRef = React.useRef(null);

  // //* [Modified Code] 지도의 영역이 변경될 때마다 현재 좌측 하단(SW)과 우측 상단(NE) 좌표를 업데이트
  const handleBoundsChange = (map) => {
    const bounds = map.getBounds();
    const newBounds = {
      sw: {
        lat: bounds.getSouthWest().getLat(),
        lng: bounds.getSouthWest().getLng(),
      },
      ne: {
        lat: bounds.getNorthEast().getLat(),
        lng: bounds.getNorthEast().getLng(),
      },
    };
    setMapBounds(newBounds);
    setMapLevel(map.getLevel());

    // //* [Modified Code] Ref에 좌표 Bounds와 현재 Level을 함께 저장하여 비동기 상황(Interval)에서도 최신 상태 참조
    mapBoundsRef.current = {
      bounds: newBounds,
      level: map.getLevel(),
    };
  };

  // 내 위치 받아와서 펫을 내 위치로 이동시키기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPetPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error('Geolocation error:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
  }, []);

  // //* [Modified Code] 공식 카카오맵 로더(Hook) 사용: 바닐라 JS 스크립트 조작 대신 React-way로 가장 안전하게 로드합니다.
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY, // 사용자의 실제 API 키
    libraries: ['clusterer', 'drawing', 'services'], // 필요한 라이브러리들
  });

  // 카카오맵 에러 발생 시 수동 재시도를 할 수 있는 상태를 위해 추가
  const [retryCount, setRetryCount] = useState(0);

  // //* [Modified Code] 다중 버스 위치 상태 및 공공데이터 Fetch 로직 리팩토링
  const [buses, setBuses] = useState([]);

  // //* [Mentor's Tip] 무한 루프 방지: API 통신 한계(QPS 제한)로 서울 전체 버스(수천개 노선)를 한 번에 부르는 것은 불가능합니다.
  // 따라서 주요 간선/지선 버스 노선들을 배열로 선언하여, Promise.all을 통해 동시에 가져오고 1개의 배열로 합치는 기법을 씁니다.
  const SEOUL_BUS_ROUTES = [
    { id: '100100118', name: '143' },
    { id: '100100073', name: '360' },
    { id: '100100418', name: '402' },
    { id: '100100049', name: '260' },
    { id: '100100522', name: '421' },
  ];

  useEffect(() => {
    let intervalId;
    const fetchBusPositions = async () => {
      try {
        const busApiKey = import.meta.env.VITE_BUS_API_KEY;
        if (!busApiKey) return;

        // 병렬 통신(다중 비동기 실행)
        const promises = SEOUL_BUS_ROUTES.map(async (route) => {
          try {
            const url = `/api/bus/api/rest/buspos/getBusPosByRtid?serviceKey=${busApiKey}&busRouteId=${route.id}&resultType=json`;
            const res = await axios.get(url);

            if (res.data?.msgBody?.itemList) {
              const items = Array.isArray(res.data.msgBody.itemList)
                ? res.data.msgBody.itemList
                : [res.data.msgBody.itemList];

              return items.map((item) => ({
                id: item.vehId,
                lat: parseFloat(item.tmY),
                lng: parseFloat(item.tmX),
                plateNo: item.plainNo,
                routeName: route.name, // 시각화를 위해 버스 번호 맵핑
              }));
            }
            return [];
          } catch (routeErr) {
            // 특정 노선 하나가 막히거나 에러를 뱉어도 다른 노선들을 살리기 위해 catch 처리
            console.warn(
              `[DEBUG] Bus Route ${route.name} Timeout or Error:`,
              routeErr.message,
            );
            return [];
          }
        });

        // 5개의 비동기 데이터 통신이 모두 끝날 때까지 대기 후 배열(Array) 합치기(Flatten)
        const results = await Promise.all(promises);
        const allBuses = results.flat();

        console.log('[DEBUG] Bus API Fetch Result (Multi):', allBuses);
        setBuses(allBuses);
      } catch (err) {
        console.error('Failed to fetch bus positions in MS:', err);
      }
    };

    fetchBusPositions();
    intervalId = setInterval(fetchBusPositions, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // //* [Modified Code] 다중 지하철 노선 상태 및 실제 위경도 매핑 로직 추가
  const [subways, setSubways] = useState([]);

  // //* [Mentor's Tip] 핵심: 서울시의 1호선~9호선 및 신분당선, 수인분당선 전체를 가져오기 위한 다중 노선 세팅
  const SEOUL_SUBWAY_LINES = [
    '1호선',
    '2호선',
    '3호선',
    '4호선',
    '5호선',
    '6호선',
    '7호선',
    '8호선',
    '9호선',
    '신분당선',
    '수인분당선',
    '경의중앙선',
    '경춘선',
    '서해선',
    '우이신설선',
    '공항철도',
    '김포골드라인',
  ];

  // //* [Modified Code] API 호출 로직을 함수로 분리하여 useEffect 내외에서 공유
  const fetchSubwayPositions = async (
    currentBounds = null,
    currentLevel = null,
  ) => {
    try {
      const subwayApiKey = import.meta.env.VITE_SUBWAY_API_KEY;
      if (!subwayApiKey) return;

      // //* [Added Code] API 호출 횟수 최적화 1: 줌 레벨 제한
      // 카카오맵 줌 레벨 1(20m) ~ 4(100m) 일 때만 렌더링하도록 강제 필터링 완화 (기존 3(50m) -> 4(100m))
      if (currentLevel !== null && currentLevel > 4) {
        setSubways([]);
        return;
      }

      // //* [Added Code] API 호출 횟수 최적화 2: 화면 바운드 필터링
      // 화면 주변 5km 이내에 지하철역이 단 하나도 없다면 API를 호출하지 않음 (예: 바다, 산간지방 등)
      if (currentBounds) {
        const allStationCoords = Object.values(SUBWAY_STATION_COORDS).flatMap(
          (stations) => Object.values(stations),
        );
        const PRE_PAD = 0.05; // 폭 약 5km. 역 사이 간격이 멀어도 필터링되지 않도록 패딩을 대폭 확대
        const visibleStations = allStationCoords.filter(
          (coord) =>
            coord.lat >= currentBounds.sw.lat - PRE_PAD &&
            coord.lat <= currentBounds.ne.lat + PRE_PAD &&
            coord.lng >= currentBounds.sw.lng - PRE_PAD &&
            coord.lng <= currentBounds.ne.lng + PRE_PAD,
        );

        if (visibleStations.length === 0) {
          setSubways([]);
          return;
        }
      }

      // 병렬 통신(다중 비동기 실행)
      const promises = SEOUL_SUBWAY_LINES.map(async (lineName) => {
        try {
          // //* [Modified Code] 한 번에 가져오는 열차의 수를 20에서 200으로 대폭 상승
          // 2호선처럼 운행 열차가 많은 노선의 경우, 20대만 가져오면 화면 밖 열차만 가져와서 화면 안 열차가 누락되는 버그 해결
          const url = `/api/subway/api/subway/${subwayApiKey}/json/realtimePosition/0/200/${encodeURIComponent(lineName)}`;
          const res = await axios.get(url);

          // //* [Added Code] 서울시 API 특이사항: HTTP 200이면서 본문에 에러(한도초과 등)를 담아 보내는 경우 체크
          const errorData = res.data?.RESULT || res.data?.errorMessage;
          const errorCode = errorData?.CODE || errorData?.code;

          if (errorCode && errorCode !== 'INFO-000') {
            const errorMsg =
              errorData.MESSAGE || errorData.message || '알 수 없는 API 에러';
            console.error(`[Subway API Error] ${lineName}: ${errorMsg}`);
            setSubwayError(`지하철 API (${lineName}): ${errorMsg}`);
            return [];
          }

          if (res.data?.realtimePositionList) {
            const items = Array.isArray(res.data.realtimePositionList)
              ? res.data.realtimePositionList
              : [];

            return items.map((item, index) => {
              const rawStationName = item.statnNm.trim();
              let stationName = rawStationName.split('(')[0].trim();
              stationName = stationName
                .replace('종착', '')
                .replace('출발', '')
                .replace('지선', '')
                .trim();

              let baseLat = 37.566229;
              let baseLng = 126.981498;
              let isMapped = false;

              // //* [Modified Code] 호선명을 포함한 계층형 구조 참조 (플랫폼별 미세 오차 반영)
              let stationCoords =
                SUBWAY_STATION_COORDS[lineName]?.[stationName] ||
                SUBWAY_STATION_COORDS[lineName]?.[stationName + '역'];

              // //* [Added Code] API에서 띄어쓰기가 들어오거나 축약될 경우를 대비한 방어 로직
              if (!stationCoords) {
                const noSpaceName = stationName.replace(/\s+/g, '');
                stationCoords =
                  SUBWAY_STATION_COORDS[lineName]?.[noSpaceName] ||
                  SUBWAY_STATION_COORDS[lineName]?.[noSpaceName + '역'];
              }

              // 특수 케이스: 4.19 민주묘지 (API 응답 문자열 변동성 대응)
              if (!stationCoords && stationName.includes('4.19')) {
                stationCoords =
                  SUBWAY_STATION_COORDS['우이신설선']?.['4.19민주묘지'];
                stationName = '4.19민주묘지'; // 다음 역 계산을 위해 라인맵과 동일하게 이름 정규화
              }

              if (stationCoords) {
                baseLat = stationCoords.lat;
                baseLng = stationCoords.lng;
                isMapped = true;
              }

              // //* [Modified Code] Catmull-Rom 곡선 점 데이터를 활용하기 위해 let으로 변경
              let tempLat = baseLat;
              let tempLng = baseLng;
              let angle = 0;

              const dirArrow =
                item.updnLine === '0' ? '↑' : item.updnLine === '1' ? '↓' : '';

              // //* [Modified Code] 다음 목적지 역 및 곡선 점 데이터를 찾아 진행 방향 각도(angle)와 미세 위치를 계산합니다.
              const lineStations = SUBWAY_LINE_MAP[lineName];
              if (lineStations && isMapped) {
                const currentIndex = lineStations.indexOf(stationName);
                if (currentIndex !== -1) {
                  // 0: 상행/내선 (번호 감소 방향), 1: 하행/외선 (번호 증가 방향)
                  // 1호선 등 일부 노선은 정의에 따라 다를 수 있으나, 기본적으로 리스트 순서를 따릅니다.
                  let nextIndex;
                  if (lineName === '2호선') {
                    // 2호선은 순환선이므로 인덱스 래핑(Wrapping) 처리
                    // 0: 내선순환(시계방향 - 인덱스 증가), 1: 외선순환(반시계방향 - 인덱스 감소)
                    nextIndex =
                      item.updnLine === '0'
                        ? (currentIndex + 1) % lineStations.length
                        : (currentIndex - 1 + lineStations.length) %
                          lineStations.length;
                  } else {
                    nextIndex =
                      item.updnLine === '0'
                        ? currentIndex - 1
                        : currentIndex + 1;
                  }

                  const nextStationName = lineStations[nextIndex];
                  if (
                    nextStationName &&
                    (SUBWAY_STATION_COORDS[lineName]?.[nextStationName] ||
                      SUBWAY_STATION_COORDS[lineName]?.[nextStationName + '역'])
                  ) {
                    const nextCoords =
                      SUBWAY_STATION_COORDS[lineName]?.[nextStationName] ||
                      SUBWAY_STATION_COORDS[lineName]?.[nextStationName + '역'];
                    // === [신규 맵 매칭 & 곡선 애니메이션 로직 시작] ===
                    // 역과 역 사이의 가상 중간점 5개 데이터 가져오기
                    let pathPoints = null;
                    let isReversed = false;

                    let pathForward =
                      SUBWAY_PATHS[lineName]?.[
                        `${stationName}-${nextStationName}`
                      ];
                    let pathBackward =
                      SUBWAY_PATHS[lineName]?.[
                        `${nextStationName}-${stationName}`
                      ];

                    if (pathForward) {
                      pathPoints = pathForward;
                      isReversed = false;
                    } else if (pathBackward) {
                      pathPoints = pathBackward;
                      isReversed = true;
                    }

                    if (pathPoints && pathPoints.length > 0) {
                      // 상태코드에 따라 열차 위치를 중간 곡선 점 위로 밀어줍니다.
                      const sttus = item.trainSttus;
                      let pointIndex = -1;

                      // 출발('2')이면 다음역을 향해 1~2칸 전진, 진입('0')이면 다음역 근처(4~5칸)로 전진
                      if (sttus === '2') {
                        pointIndex = isReversed ? pathPoints.length - 3 : 2;
                      } else if (sttus === '0') {
                        pointIndex = isReversed ? 1 : pathPoints.length - 2;
                      }

                      // 좌표를 실제 선로 위 곡선점으로 변경!
                      if (pointIndex !== -1 && pathPoints[pointIndex]) {
                        tempLat = pathPoints[pointIndex].lat;
                        tempLng = pathPoints[pointIndex].lng;
                      }

                      // 화살표 방향(Bearing)도 건물 너머의 종착역이 아닌, '눈앞의 철로 점'을 바라보게 보정
                      let targetLat = nextCoords.lat;
                      let targetLng = nextCoords.lng;

                      if (sttus === '2') {
                        const targetIndex = isReversed
                          ? pathPoints.length - 4
                          : 3;
                        if (pathPoints[targetIndex]) {
                          targetLat = pathPoints[targetIndex].lat;
                          targetLng = pathPoints[targetIndex].lng;
                        }
                      } else if (sttus === '1' || sttus === '0') {
                        const targetIndex = isReversed
                          ? 0
                          : pathPoints.length - 1;
                        if (pathPoints[targetIndex]) {
                          targetLat = pathPoints[targetIndex].lat;
                          targetLng = pathPoints[targetIndex].lng;
                        }
                      }

                      angle = calculateBearing(
                        tempLat,
                        tempLng,
                        targetLat,
                        targetLng,
                      );
                    } else {
                      // 경로 데이터가 없을 경우 기존 직선 계산 방식 폴백
                      angle = calculateBearing(
                        tempLat,
                        tempLng,
                        nextCoords.lat,
                        nextCoords.lng,
                      );
                    }
                    // === [신규 맵 매칭 & 곡선 애니메이션 로직 끝] ===
                  }
                }
              }

              return {
                id: `${item.trainNo}_${index}`,
                lat: tempLat,
                lng: tempLng,
                line: lineName,
                updnLine: item.updnLine,
                angle: angle, // 계산된 회전 각도 추가
                trainName: `${dirArrow} [${lineName}] ${rawStationName} ${item.trainSttus === '0' ? '진입' : item.trainSttus === '1' ? '도착' : '출발'}`,
              };
            });
          }
          return [];
        } catch (lineErr) {
          console.warn(
            `[DEBUG] Subway Line ${lineName} Error:`,
            lineErr.message,
          );
          return [];
        }
      });

      const results = await Promise.all(promises);
      let allSubways = results.flat();

      // 결과 필터링 (렌더링 최적화)
      if (currentBounds) {
        const RENDER_PAD = 0.01; // 약 1km 반경 여유 마진 (열차가 화면에 부드럽게 진입하도록)
        allSubways = allSubways.filter(
          (subway) =>
            subway.lat >= currentBounds.sw.lat - RENDER_PAD &&
            subway.lat <= currentBounds.ne.lat + RENDER_PAD &&
            subway.lng >= currentBounds.sw.lng - RENDER_PAD &&
            subway.lng <= currentBounds.ne.lng + RENDER_PAD,
        );
      }

      setSubways(allSubways);
      setSubwayError(null); // //* 성공 시 에러 상태 초기화
    } catch (err) {
      console.error('Failed to fetch subway positions:', err);
      // //* [Added Code] 인증 에러(토큰 소진 등) 발생 시 사용자에게 알림
      if (err.response?.status === 401 || err.response?.status === 403) {
        setSubwayError(
          '지하철 API 토큰이 만료되었거나 일일 한도를 초과했습니다. (1000회/일)',
        );
      } else {
        setSubwayError('지하철 정보를 불러오는 중 서버 에러가 발생했습니다.');
      }
    }
  };

  useEffect(() => {
    // 최초 실행 (영역 없이 전체 데이터, mapLevel 초기값 3 전달)
    fetchSubwayPositions(null, 3);
    // //* [Modified Code] 인터벌 내부에서 Ref를 사용하여 항상 최신 영역과 확대 상태를 호출
    const intervalId = setInterval(() => {
      // mapLevel은 React State이므로 클로저에 갇힐 수 있음.
      // 현재 레벨값을 가져오기 위해 mapBoundsRef에 level 정보를 함께 저장하는 방식 고려
      // 임시로 mapLevel을 인자로 전달하되, useEffect 의존성 분리 필요
      fetchSubwayPositions(
        mapBoundsRef.current?.bounds,
        mapBoundsRef.current?.level,
      );
    }, 30000);
    return () => clearInterval(intervalId);
  }, []); // 의존성 배열을 비워 인터벌 중복 방지

  // //* [Modified Code] 지도를 움직일 때마다 즉시 호출하는 대신 1.2초 Debounce 적용 (API 횟수 절약 핵심)
  // mapBounds 여부뿐만 아니라 mapLevel도 최신 상태를 전달해야 하므로 의존성 배열에 추가 및 조건 확인
  useEffect(() => {
    if (!mapBounds) return;

    const timer = setTimeout(() => {
      fetchSubwayPositions(mapBounds, mapLevel);
    }, 1200);

    return () => clearTimeout(timer);
  }, [mapBounds, mapLevel]);

  // 키보드 방향키 이벤트를 감지하여 펫을 이동시키는 플로우 (다중 키 지원)
  useEffect(() => {
    // 팝업이 떠있을 때는 펫이 이동하지 않도록 완전히 차단
    if (activeModal !== null) return;

    // 현재 눌려진 키의 생명주기를 기록하는 상태 객체
    const keysPressed = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    };

    const handleKeyDown = (e) => {
      if (keysPressed.hasOwnProperty(e.key)) {
        keysPressed[e.key] = true;
      }
    };

    const handleKeyUp = (e) => {
      if (keysPressed.hasOwnProperty(e.key)) {
        keysPressed[e.key] = false;
      }
    };

    // 키를 누르고 뗄 때마다 해당 객체의 boolean 값을 반전시킴
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationFrameId; // 루프 추적용 ID

    // 실제 지도상에서의 위경도 이동 속도 (미세한 단위)
    const MOVE_SPEED_LAT = 0.00005;
    const MOVE_SPEED_LNG = 0.00006;

    // 부드러운 대각선 이동을 담당하는 게임 루프 핵심 엔진
    const updatePosition = () => {
      setPetPosition((prev) => {
        let newLat = prev.lat;
        let newLng = prev.lng;

        // 다중 키 입력(if 문 독립 사용)을 통해 대각선 벡터 연산을 수행
        // GPS 지도 개념상 지도 위쪽(Up)은 위도(lat) 상승을 의미함
        if (keysPressed.ArrowUp) newLat += MOVE_SPEED_LAT;
        if (keysPressed.ArrowDown) newLat -= MOVE_SPEED_LAT;
        if (keysPressed.ArrowLeft) newLng -= MOVE_SPEED_LNG;
        if (keysPressed.ArrowRight) newLng += MOVE_SPEED_LNG;

        // 좌표의 변화가 있을 때만 React State에 반영 (리렌더링 최소화)
        if (newLat !== prev.lat || newLng !== prev.lng) {
          return { lat: newLat, lng: newLng };
        }
        return prev;
      });

      // 브라우저 렌더링 프레임 단위로 스스로를 계속 호출
      animationFrameId = requestAnimationFrame(updatePosition);
    };

    // 루프 즉시 발동
    animationFrameId = requestAnimationFrame(updatePosition);

    // 컴포넌트 언마운트 시 키보드 리스너와 루프 프레임을 메모리에서 완전 삭제
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeModal]); // activeModal 환경 변화 시 루프 재설정

  // id 값에 따라 액션 모달을 렌더링하는 함수
  const renderActiveModal = () => {
    switch (activeModal) {
      case 1:
        return (
          <ActionModal
            category="Eating"
            onClose={() => setActiveModal(null)}
            onUpdate={handlePetUpdate}
          />
        );
      case 2:
        return (
          <ActionModal
            category="Cleaning"
            onClose={() => setActiveModal(null)}
            onUpdate={handlePetUpdate}
          />
        );
      case 3:
        return (
          <ActionModal
            category="Sleep"
            onClose={() => setActiveModal(null)}
            onUpdate={handlePetUpdate}
          />
        );
      case 4:
        return (
          <ActionModal
            category="Playing"
            onClose={() => setActiveModal(null)}
            onUpdate={handlePetUpdate}
          />
        );
      case 5:
        return (
          <ActionModal
            category="Volunteer"
            onClose={() => setActiveModal(null)}
            onUpdate={handlePetUpdate}
          />
        );
      case 6:
        return (
          <ActionModal
            category="Chat"
            onClose={() => setActiveModal(null)}
            onUpdate={handlePetUpdate}
          />
        );
      default:
        return null;
    }
  };

  // 도넛 차트를 위한 SVG 원의 둘레 계산
  const radius = 30; // 반지름 설정 변경으로 적절한 크기 비율 조정
  const circumference = 2 * Math.PI * radius;
  // expPercent 값에 비례하여 남겨둘 둘레(offset) 계산
  const strokeDashoffset = circumference - (expPercent / 100) * circumference;

  return (
    <div className="relative w-full h-screen bg-[#FDF0F5] overflow-hidden flex flex-col justify-between z-0">
      {/* 상단 섹션 */}
      <div className="absolute top-0 left-0 w-full z-20 flex justify-between items-start p-4 h-32 pointer-events-none">
        {/* 좌측 상단: 레벨 & EXP 도넛 */}
        <div className="relative flex items-center justify-center w-[80px] h-[80px] pointer-events-auto">
          {/* 바깥 경험치(EXP) 도넛 링 영역 */}
          <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
            {/* 회색 배경 트랙 */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-blue-200"
              strokeWidth="6"
              fill="transparent"
            />
            {/* 실제 채워지는 파란색 경험치 부분 */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-[#00B4FF] transition-all duration-700 ease-out"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* 도넛 내부 레벨 원형 (하늘색 배경 + 흰색 텍스트) */}
          <div className="absolute z-10 w-[54px] h-[54px] bg-[#00B4FF] flex items-center justify-center rounded-full shadow-lg">
            <span className="text-white text-2xl font-black">{level}</span>
          </div>
        </div>
      </div>

      {/* 중앙 메타버스(Metaverse) 렌더링 영역 - 리얼 2D 카카오맵 API 연동 */}
      {/* //* [Modified Code] 지도의 중앙이 항상 펫의 위치(petPosition)를 따라다니도록 구현 */}
      <div className="absolute inset-0 w-full h-full z-0 bg-[#E8F0F4]">
        {/* //* [Added Code] 지하철 API 에러 메시지 알림바 (토큰 소진 등 비상 알림) */}
        {subwayError && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/50 shadow-lg flex items-center gap-2 animate-bounce-slow">
            <span className="text-red-400">⚠️</span>
            <span className="text-white text-xs font-bold tracking-tight">
              {subwayError}
            </span>
            <button
              onClick={() => {
                fetchSubwayPositions(mapBounds);
                setSubwayError(null);
              }}
              className="ml-2 bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded text-[10px] text-white"
            >
              재시도
            </button>
          </div>
        )}

        {/* 에러 발생 시 안내 UI */}
        {error && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 p-6 text-center">
            <span className="text-4xl mb-2">🚨</span>
            <p className="text-red-600 font-bold text-lg mb-2">
              카카오맵을 불러오지 못했습니다.
            </p>
            <div className="bg-white p-4 rounded-lg shadow-sm w-full max-w-md text-left mt-2 border border-red-200">
              <p className="text-gray-700 font-bold text-sm mb-1">
                💡 체크리스트:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>
                  카카오 개발자 콘솔에서 <strong>JavaScript 키</strong>가 맞는지
                  확인
                </li>
                <li>
                  <code className="bg-gray-100 px-1 rounded text-pink-500">
                    http://localhost:5173
                  </code>
                  ,{' '}
                  <code className="bg-gray-100 px-1 rounded text-pink-500">
                    http://localhost:5174
                  </code>
                  ,{' '}
                  <code className="bg-gray-100 px-1 rounded text-pink-500">
                    http://localhost:5175
                  </code>{' '}
                  가 모두 Web 플랫폼에 허용 도메인으로 등록되었는지 확인
                </li>
              </ol>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 active:scale-95 transition-transform"
            >
              새로고침
            </button>
          </div>
        )}

        {/* 로딩 중일 때 스피너 표시 (loading이 false가 되어야 로드 완료를 뜻함) */}
        {!error && loading && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#E8F0F4]">
            <div className="w-12 h-12 border-4 border-[#00B4FF] border-t-transparent rounded-full animate-spin mb-4 shadow-sm"></div>
            <p className="text-[#00B4FF] font-bold text-sm animate-pulse">
              카카오맵을 초기화하는 중입니다...
            </p>
          </div>
        )}

        {/* 로딩 성공(loading === false) 및 에러 없음 상태일 때 지도 마운트 */}
        {!error && !loading && (
          <Map
            center={petPosition} // 지도의 중심좌표를 펫 좌표로 바인딩 (화면 가운데 고정됨)
            style={{ width: '100%', height: '100%' }}
            level={mapLevel} // 지도의 확대 레벨 상태 바인딩
            onBoundsChanged={handleBoundsChange} // //* [Modified Code] 영역 변경 시 좌표 및 레벨 동기화
            draggable={true} // 마우스로 지도를 강제로 움직이는 것을 허용
            zoomable={true} // 마우스 휠을 통한 줌인/줌아웃 명시적 허용
            keyboardShortcuts={true}
          >
            <ZoomControl
              position={
                window.kakao ? window.kakao.maps.ControlPosition.RIGHT : 2
              }
            />

            {/* //* [Modified Code] 카카오 이미지 마커 대신 HTML/CSS 기반의 CustomOverlay로 버스 번호판 시각화 */}
            {buses.map((bus) => (
              <CustomOverlayMap
                key={bus.id}
                position={{ lat: bus.lat, lng: bus.lng }}
                yAnchor={1.2} // 핀의 화살표 꼬리가 지정된 좌표(중앙)를 가리키도록 Y축 위치 보정
              >
                <div className="relative bg-[#00B4FF] text-white rounded-md px-3 py-1 shadow-[0_4px_10px_rgba(0,0,0,0.4)] border-2 border-white flex flex-col items-center animate-bounce-slow">
                  <span className="text-[10px] text-blue-100 font-semibold mb-[-2px] tracking-wider">
                    {bus.plateNo.slice(-4)} {/* 차량 번호판 끝 4자리 */}
                  </span>
                  <span className="text-sm font-extrabold">
                    {bus.routeName}
                  </span>
                  {/* 말풍선 꼬리(화살표) UI */}
                  <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white">
                    <div className="absolute -top-[7px] -left-[4px] w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-[#00B4FF]"></div>
                  </div>
                </div>
              </CustomOverlayMap>
            ))}

            {/* //* [Modified Code] 공공데이터로 받아온 지하철 열차 지도 마커 표현 배열 렌더링 (야구공 대신 지하철 Custom UI로 변경) */}
            {subways.map((subway) => (
              <CustomOverlayMap
                key={subway.id}
                position={{ lat: subway.lat, lng: subway.lng }}
                yAnchor={1.2}
              >
                <div
                  className="relative text-white rounded-full w-10 h-10 shadow-[0_4px_10px_rgba(0,0,0,0.4)] border-2 border-white flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    backgroundColor:
                      SUBWAY_LINE_COLORS[subway.line] || '#FF5252',
                  }}
                >
                  <SubwayIcon
                    direction="up" // 회전을 사용하므로 항상 전진(up) 화살표를 사용하고 각도로 조절
                    angle={subway.angle}
                    width={28}
                  />
                  {/* 작은 이름표 */}
                  <div
                    className="absolute -top-6 whitespace-nowrap text-white text-[11px] font-bold px-2 py-0.5 rounded-sm opacity-95 shadow-sm"
                    style={{
                      backgroundColor:
                        SUBWAY_LINE_COLORS[subway.line] || '#4B5563',
                    }}
                  >
                    {subway.trainName}
                  </div>
                </div>
              </CustomOverlayMap>
            ))}

            {/* 진짜 카카오맵 위에 표시되는 펫 마커 오버레이 */}
            {/* 위치는 항상 지도의 중앙(방향키 이동 시 지도가 같이 이동하므로 펫은 상대적으로 화면 최중앙에 고정) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-15 h-15 bg-white/90 rounded-full border-4 border-[#00B4FF] shadow-[0_8px_15px_rgba(0,0,0,0.3)] flex items-center justify-center animate-bounce">
              <span className="text-[#00B4FF] font-extrabold text-xl drop-shadow-sm">
                {/* //* [Modified Code] 하드코딩된 'Pet' 대신 API로 받아온 실제 펫 이름 표시 */}
                {petName}
              </span>
            </div>
          </Map>
        )}
      </div>

      <div className="w-full absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2 px-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        {/* //* [Modified Code] 고유한 이름과 아이콘을 가진 배열 데이터를 기반으로 개별적인 박스 렌더링 */}
        {ACTION_MENUS.map((menu) => (
          <div
            key={menu.id}
            onClick={() => setActiveModal(menu.id)}
            className="w-16 h-16 bg-blue-100/90 backdrop-blur-md rounded-xl border-[3px] border-[#00B4FF] flex flex-col items-center justify-center shadow-lg cursor-pointer hover:bg-white hover:scale-105 transition-transform duration-200"
          >
            {/* 고유 아이콘 렌더링 영역 */}
            <span className="text-xl mb-0.5">{menu.icon}</span>
            {/* 개별 이름 지정 영역 */}
            <span className="text-[10px] font-bold text-gray-800">
              {menu.name}
            </span>
          </div>
        ))}
      </div>

      {/* 선택된 모달 팝업 렌더링 영역 */}
      {renderActiveModal()}
    </div>
  );
};

export default MS;
