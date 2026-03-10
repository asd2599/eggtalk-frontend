import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pet from '../pets/pet';

import ActionModal from './ActionModal';
import { SUBWAY_STATION_COORDS_V2 } from './subwayCoords';
// //! [Original Code] import { SUBWAY_PATHS } from './subwayPaths';
import SubwayIcon from './components/SubwayIcon';
import { SUBWAY_LINE_MAP } from './subwayLineMap';
import { api } from '../../utils/config';
import SubwaySearch from './components/SubwaySearch';
import RouteResult from './components/RouteResult';
import RouteList from './components/RouteList';
import odsayService, {
  loadLineTrack,
  getCachedLane,
  cacheLaneData,
} from './utils/odsayService';
import { snapToPolyline, calculateBearing } from './utils/snapToTrack';
import { Polyline } from 'react-kakao-maps-sdk';

// //* [Mentor's Tip] 지하철 호선별 고유 브랜드 색상 정의 (UI 직관성 향상)
export const SUBWAY_LINE_COLORS = {
  '1호선': '#0052A4',
  '1호선(경인선)': '#0052A4',
  '1호선(경부선)': '#0052A4',
  '2호선': '#00A84D',
  '2호선(본선)': '#00A84D',
  '2호선(신정지선)': '#00A84D',
  '2호선(성수지선)': '#00A84D',
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
  김포골드라인: '#AD8605',
  지하철: '#666666',
  '수도권 광역급행철도 A노선': '#D60024',
  경강선: '#003DA5',
  인천1호선: '#7CA8D5',
  인천2호선: '#ED8B00',
  의정부경전철: '#FDA600',
  용인경전철: '#5BB025',
};

// //* [Added Code] 노선별 렌더링 우선순위 (환승역 겹침 방지)
export const SUBWAY_LINE_ZINDEX = {
  '1호선': 101,
  '2호선': 102,
  '3호선': 103,
  '4호선': 104,
  '5호선': 105,
  '6호선': 106,
  '7호선': 107,
  '8호선': 108,
  '9호선': 109,
  신분당선: 111,
  수인분당선: 112,
  경의중앙선: 113,
  공항철도: 114,
  우이신설선: 115,
  서해선: 116,
};

// //* [Modified Code] 카카오맵 연동 컴포넌트 및 로더 훅(Hook) 추가
import {
  Map,
  MapMarker,
  useKakaoLoader,
  ZoomControl,
  CustomOverlayMap,
} from 'react-kakao-maps-sdk';

// //* [Added Code] 색상 명도 조정 유틸리티 (배경 노선과 경로 구분용)
// percent: -100 ~ 100 (음수면 어둡게, 양수면 밝게)
const adjustBrightness = (hex, percent) => {
  if (!hex || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const amt = Math.floor((255 * percent) / 100);
  const newR = Math.max(0, Math.min(255, r + amt));
  const newG = Math.max(0, Math.min(255, g + amt));
  const newB = Math.max(0, Math.min(255, b + amt));

  return `#${((1 << 24) | (newR << 16) | (newG << 8) | newB)
    .toString(16)
    .slice(1)}`;
};

// //* [Modified Code] 하단 7개 박스의 독립적인 상태 관리 (Navigation 메뉴 추가)
const ACTION_MENUS = [
  { id: 1, name: 'Eating', icon: '🍔' },
  { id: 2, name: 'Cleaning', icon: '🧹' },
  { id: 3, name: 'Sleeping', icon: '💤' },
  { id: 4, name: 'Playing', icon: '🎾' },
  { id: 5, name: 'Volunteer', icon: '🤝' },
  { id: 6, name: 'Chatting', icon: '💬' },
  { id: 7, name: 'Navigation', icon: '🧭' }, // //* [New Item] 지하철 길찾기 메뉴 추가
];

const MS = () => {
  // //* [Added Code] API 키들을 컴포넌트 레벨에서 한 번만 로드하여 불필요한 환경변수 참조 방지
  const subwayApiKey = import.meta.env.VITE_SUBWAY_API_KEY;
  const busApiKey = import.meta.env.VITE_BUS_API_KEY;

  // //* [Modified Code] Pet 이름, 레벨/경험치 UI 및 모달 팝업 상태 추가
  const [petName, setPetName] = useState('Pet');
  const [level, setLevel] = useState(1);
  const [expPercent, setExpPercent] = useState(0); // 0 ~ 100 사이의 백분율
  const [activeModal, setActiveModal] = useState(null);

  // //* [Added Code] 지하철 API 에러 상태 및 디버깅용 상태
  const [subwayError, setSubwayError] = useState(null);

  // //* [Added Code] 선택된 열차의 ID를 관리하여 정보를 고정 표시하기 위한 상태
  const [selectedTrainId, setSelectedTrainId] = useState(null);

  // //* [Modified Code] 지하철 길찾기 관련 상태 (routePathCoords → routeSegments로 교체)
  const [routeResult, setRouteResult] = useState(null);
  const [routeStartTime, setRouteStartTime] = useState('');
  // //* [Modified Code] 단일 좌표 배열 대신, 노선별 색상 정보를 포함한 세그먼트 배열로 교체
  const [routeSegments, setRouteSegments] = useState([]); // [{laneName, color, path:[{lat,lng}]}]
  const [showSearch, setShowSearch] = useState(false); // //* [New State] 검색창 표시 여부 제어
  const [routeLoading, setRouteLoading] = useState(false); // //* [New State] 경로 탐색 로딩 상태
  const [routeList, setRouteList] = useState([]); // //* [New State] 다중 경로 목록 저장 (v9.0)
  const [isRouteListOpen, setIsRouteListOpen] = useState(false); // //* [New State] 경로 목록 UI 노출 여부 (v9.0)

  // //* [Modified Code] 지하철 길찾기 실행 함수 (ODsay 고정밀 엔진 호출)
  // //* [Mentor's Tip] ODsay의 loadLane 실제 선로 궤적 데이터로 노선별 색상 폴리라인을 그립니다.
  // //* [Modified Code] 대중교통 통합 길찾기 실행 함수 (지하철+버스+도보)
  const handleRouteSearch = async (
    start,
    end,
    time,
    searchType = 0,
    pathType = 0,
  ) => {
    try {
      setRouteLoading(true);
      setRouteStartTime(time);
      // //* [Modified Code] 기존 경로 초기화 후 검색 시작
      setRouteSegments([]);
      setRouteResult(null);

      // //* [Modified Code] 통합 검색 엔진 호출 (searchType, pathType 적용)
      const result = await odsayService.getPublicTransPath(
        start,
        end,
        searchType,
        pathType,
      );

      // //* [Modified Code] 바로 결과를 보여주지 않고 목록을 먼저 노출 (v9.0)
      if (result && result.length > 0) {
        setRouteList(result);
        setIsRouteListOpen(true);
        // setShowSearch(false); // //* [Modified Code] v10.0: 필터링을 위해 검색창 유지
      } else {
        alert('입력하신 경로를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Route search error:', error);
      alert(error.message || '경로 탐색 중 오류가 발생했습니다.');
    } finally {
      setRouteLoading(false);
    }
  };

  /**
   * //* [New Function] 목록에서 선택된 경로의 상세 정보를 가져와 지도에 표시합니다. (v9.0)
   */
  const handleSelectRoute = async (selectedRoute) => {
    try {
      setRouteLoading(true);
      const detail = await odsayService.getPathDetail(selectedRoute);

      setRouteResult(detail);
      setRouteSegments(detail.segments || []);

      // 경로 캐싱 (기존 로직 유지)
      if (detail.segments) {
        detail.segments.forEach((seg) => {
          if (seg.path && seg.path.length > 0) {
            const typeMatch = seg.laneName.match(/(\d+)/);
            const laneType = typeMatch ? parseInt(typeMatch[1]) : 0;
            if (laneType > 0 && laneType < 200) {
              cacheLaneData(laneType, seg.path);
            }
          }
        });
      }

      setIsRouteListOpen(false);

      // 첫 번째 유효 지점으로 이동
      if (detail.segments?.[0]?.path?.[0]) {
        setPetPosition(detail.segments[0].path[0]);
      }
    } catch (error) {
      console.error('Select route error:', error);
      alert('상세 경로를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setRouteLoading(false);
    }
  };

  // 펫 데이터 Fetch 및 초기화
  useEffect(() => {
    const fetchPetParams = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        // 공통 api 인스턴스를 통해 서버에 요청 (토큰 및 기본 주소 자동 매핑)
        const res = await api.get('/api/pets/my');
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
  // //* [Modified Code] 다중 지하철 노선 상태 및 실시간 제어 로직
  const [subways, setSubways] = useState([]);
  const [isSubwayApiDisabled, setIsSubwayApiDisabled] = useState(false); // //* [Added Code] v13.0: 한도 초과 시 호출 차단 플래그
  const [isSubwayRealtimeOn, setIsSubwayRealtimeOn] = useState(false); // //* [Added Code] v14.0: 실시간 정보 수동 On/Off 스위치 (기본 OFF)

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
      // //* [Modified Code] v14.0: 수동 스위치가 꺼져있거나 차단 상태면 호출 안함
      if (!subwayApiKey || isSubwayApiDisabled || !isSubwayRealtimeOn) return;

      // //* [Added Code] API 호출 횟수 최적화 1: 줌 레벨 제한 (v11.0)
      // 사용자의 요청대로 고해상도(50m, 30m, 20m)일 때만 실시간 데이터 로드
      if (currentLevel !== null && currentLevel > 3) {
        if (subways.length > 0) setSubways([]);
        return;
      }

      // //* [Added Code] API 호출 횟수 최적화 2: 화면 바운드 필터링 및 관련 노선 추출
      let linesToFetch = SEOUL_SUBWAY_LINES;
      if (currentBounds) {
        const PRE_PAD = 0.005; // //* [Modified] 화면에서 살짝 벗어난(약 500m) 열차까지만 범위 한정 (API 폭주 방지)

        // 현재 화면 바운드 안에 역이 하나라도 포함된 노선들만 추출
        const visibleLines = SEOUL_SUBWAY_LINES.filter((lineName) => {
          const stations = SUBWAY_STATION_COORDS_V2[lineName] || {};
          return Object.values(stations).some(
            (coord) =>
              coord.lat >= currentBounds.sw.lat - PRE_PAD &&
              coord.lat <= currentBounds.ne.lat + PRE_PAD &&
              coord.lng >= currentBounds.sw.lng - PRE_PAD &&
              coord.lng <= currentBounds.ne.lng + PRE_PAD,
          );
        });

        if (visibleLines.length === 0) {
          setSubways([]);
          return;
        }
        linesToFetch = visibleLines;
        console.log(
          '[DEBUG] Fetching subways for visible lines:',
          linesToFetch,
        );
      }

      // 병렬 통신(다중 비동기 실행) - 전체 노선이 아닌 '필요한 노선'만 호출하여 API 절약
      const promises = linesToFetch.map(async (lineName) => {
        // //* [Modified Code] 해당 노선의 loadLane 궤적이 없으면 백그라운드에서 자동 프리로드
        if (!getCachedLane(lineName)) {
          loadLineTrack(lineName).catch(() => {});
        }
        try {
          // //* [Modified Code] 한 번에 가져오는 열차의 수를 20에서 200으로 대폭 상승
          // 2호선처럼 운행 열차가 많은 노선의 경우, 20대만 가져오면 화면 밖 열차만 가져와서 화면 안 열차가 누락되는 버그 해결
          const url = `/api/subway/api/subway/${subwayApiKey}/json/realtimePosition/0/200/${encodeURIComponent(lineName)}`;
          const res = await axios.get(url);

          // //* [Added Code] 서울시 API 특이사항: HTTP 200/500이면서 에러(한도초과 등)를 담아 보내는 다양한 경우 체크
          const errorData =
            res.data?.RESULT || res.data?.errorMessage || res.data;
          const errorCode =
            errorData?.CODE ||
            errorData?.code ||
            res.data?.CODE ||
            res.data?.code;

          if (errorCode && errorCode !== 'INFO-000') {
            const errorMsg =
              errorData.MESSAGE ||
              errorData.message ||
              res.data?.MESSAGE ||
              res.data?.message ||
              '알 수 없는 API 에러';
            console.error(`[Subway API Error] ${lineName}: ${errorMsg}`);

            // //* [Added Code] v13.0: 한도 초과 시 즉시 모든 요청 차단
            if (errorCode === 'ERROR-337') {
              setSubwayError('지하철 API 일일 한도를 초과했습니다. (1,000회)');
              setIsSubwayApiDisabled(true);
              setIsSubwayRealtimeOn(false); // //* [Added Code] v14.0: 에러 발생 시 스위치도 강제 Off
            }
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
                SUBWAY_STATION_COORDS_V2[lineName]?.[stationName] ||
                SUBWAY_STATION_COORDS_V2[lineName]?.[stationName + '역'];

              // //* [Added Code] API에서 띄어쓰기가 들어오거나 축약될 경우를 대비한 방어 로직
              if (!stationCoords) {
                const noSpaceName = stationName.replace(/\s+/g, '');
                stationCoords =
                  SUBWAY_STATION_COORDS_V2[lineName]?.[noSpaceName] ||
                  SUBWAY_STATION_COORDS_V2[lineName]?.[noSpaceName + '역'];
              }

              // //* [Modified Code] 명칭 예외 처리 — API 역명 ↔ subwayCoords 역명 매핑
              if (!stationCoords) {
                // //* [Modified Code] 알려진 역명 불일치 전체 사전
                const STATION_ALIASES = {
                  // 1호선
                  지제: '평택지제',
                  '총신대입구(이수)': '총신대입구',
                  서동탄: '서동탄',
                  // 4호선
                  이수: '총신대입구',
                  서울역: '서울역',
                  // 7호선
                  '이수(총신대입구)': '이수',
                  불암산: '당고개',
                  // 경의중앙선
                  DMC: '디지털미디어시티',
                  // 일반적 축약 패턴
                  총신대입구: lineName === '7호선' ? '이수' : '총신대입구',
                };

                const aliasName = STATION_ALIASES[stationName] || stationName;
                if (aliasName !== stationName) {
                  stationCoords =
                    SUBWAY_STATION_COORDS_V2[lineName]?.[aliasName] ||
                    SUBWAY_STATION_COORDS_V2[lineName]?.[aliasName + '역'];
                }
              }

              // 특수 케이스: 4.19 민주묘지 (API 응답 문자열 변동성 대응)
              if (!stationCoords && stationName.includes('4.19')) {
                stationCoords =
                  SUBWAY_STATION_COORDS_V2['우이신설선']?.['4.19민주묘지'];
                stationName = '4.19민주묘지'; // 다음 역 계산을 위해 라인맵과 동일하게 이름 정규화
              }

              // //* [Added Code] "역" 접미사가 API에는 있고 데이터에는 없는 경우 (또는 그 반대) 대응
              if (!stationCoords) {
                const strippedName = stationName.replace(/역$/, '');
                stationCoords =
                  SUBWAY_STATION_COORDS_V2[lineName]?.[strippedName] ||
                  SUBWAY_STATION_COORDS_V2[lineName]?.[strippedName + '역'];
              }

              if (stationCoords) {
                baseLat = stationCoords.lat;
                baseLng = stationCoords.lng;
                isMapped = true;
              }

              // //* [Added Code] Global Fallback Mapping: 특정 노선에서 못 찾은 경우 전체 노선에서 역명으로 검색 (환승역 대응)
              if (!isMapped) {
                const searchName = stationName
                  .replace(/역$/, '')
                  .replace(/\s+/g, '');
                for (const line in SUBWAY_STATION_COORDS_V2) {
                  const checkCoords =
                    SUBWAY_STATION_COORDS_V2[line][searchName] ||
                    SUBWAY_STATION_COORDS_V2[line][searchName + '역'];
                  if (checkCoords) {
                    baseLat = checkCoords.lat;
                    baseLng = checkCoords.lng;
                    isMapped = true;
                    console.log(
                      `[PASS] Global fallback match for ${stationName} in ${line}`,
                    );
                    break;
                  }
                }
              }

              // //* [Added Code] 최종적으로 매핑에 실패하여 서울시청으로 폴백되는 열차를 추적합니다. (캐시 문제 등 확인용)
              if (!isMapped) {
                console.warn(
                  `[Mapping FAIL] 노선: ${lineName}, 역명: '${stationName}' (원본: '${item.statnNm}') - 브라우저 캐시를 지우고 새로고침(Ctrl+F5) 해보세요.`,
                );
              }

              // //* [Modified Code] Catmull-Rom 곡선 점 데이터를 활용하기 위해 let으로 변경
              let tempLat = baseLat;
              let tempLng = baseLng;
              let angle = 0;

              const dirArrow =
                item.updnLine === '0' ? '↑' : item.updnLine === '1' ? '↓' : '';

              // //* [Modified Code] 다음 목적지 역 및 곡선 점 데이터를 찾아 진행 방향 각도(angle)와 미세 위치를 계산합니다.
              // //* [Senior Tip] 1호선처럼 분기가 있는 경우, 현재 역이 속한 정확한 지선 데이터를 선택해야 합니다.
              let lineStations = SUBWAY_LINE_MAP[lineName];
              if (lineName === '1호선') {
                // 경부선(수원행)에만 있고 경인선(인천행)에는 없는 역이거나, 가산디지털단지 이후 구간인 경우
                const isGyeongbuRoute =
                  SUBWAY_LINE_MAP['1호선(경부선)'].includes(stationName) &&
                  (!SUBWAY_LINE_MAP['1호선'].includes(stationName) ||
                    stationName === '가산디지털단지');

                if (isGyeongbuRoute) {
                  lineStations = SUBWAY_LINE_MAP['1호선(경부선)'];
                }
              }

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
                    (SUBWAY_STATION_COORDS_V2[lineName]?.[nextStationName] ||
                      SUBWAY_STATION_COORDS_V2[lineName]?.[
                        nextStationName + '역'
                      ])
                  ) {
                    const nextCoords =
                      SUBWAY_STATION_COORDS_V2[lineName]?.[nextStationName] ||
                      SUBWAY_STATION_COORDS_V2[lineName]?.[
                        nextStationName + '역'
                      ];
                    // === [ODsay loadLane 궤적 기반 스냅 & 회전 로직] ===
                    // //* [Modified Code] ODsay loadLane 궤적이 캐시에 있으면 snapToPolyline 우선 사용
                    const cachedTrack = getCachedLane(lineName);

                    if (cachedTrack && cachedTrack.length >= 2) {
                      // ODsay 궤적 위에 열차 스냅
                      const snapped = snapToPolyline(
                        { lat: tempLat, lng: tempLng },
                        cachedTrack,
                      );
                      if (snapped) {
                        tempLat = snapped.lat;
                        tempLng = snapped.lng;

                        // //* [Modified Code] 벡터 내적(Dot Product) 기반 고정밀 회전 방향 판정
                        // 궤적의 접선 방향(snapped.angle)과 실제 목적지 방향(targetAngle) 사이의 벡터 일치도를 계산
                        const targetAngle = calculateBearing(
                          tempLat,
                          tempLng,
                          nextCoords.lat,
                          nextCoords.lng,
                        );

                        // 각도를 라디안으로 변환하여 방향 벡터 구하기
                        const rad1 = snapped.angle * (Math.PI / 180);
                        const rad2 = targetAngle * (Math.PI / 180);

                        const v1 = { x: Math.sin(rad1), y: Math.cos(rad1) }; // 궤적 방향
                        const v2 = { x: Math.sin(rad2), y: Math.cos(rad2) }; // 실제 진행 방향

                        // 내적(Dot Product): v1·v2 = cos(θ). 결과가 음수이면 두 벡터가 반대 방향(90도 초과)임
                        const dot = v1.x * v2.x + v1.y * v2.y;

                        angle =
                          dot < 0 ? (snapped.angle + 180) % 360 : snapped.angle;
                      }
                    } else {
                      // //! [Original Code] SUBWAY_PATHS 정적 데이터를 활용한 정밀 궤적 폴백 로직 (가독성 및 번들 사이즈 최적화를 위해 주석 처리)
                      // let pathPoints = null;
                      // let isReversed = false;
                      // let pathForward = SUBWAY_PATHS[lineName]?.[`${stationName}-${nextStationName}`];
                      // let pathBackward = SUBWAY_PATHS[lineName]?.[`${nextStationName}-${stationName}`];
                      // if (pathForward) { pathPoints = pathForward; isReversed = false; }
                      // else if (pathBackward) { pathPoints = pathBackward; isReversed = true; }
                      // if (pathPoints && pathPoints.length > 0) {
                      //   const sttus = item.trainSttus;
                      //   let pointIndex = -1; let targetIndex = -1;
                      //   if (sttus === '2') { pointIndex = isReversed ? pathPoints.length - 3 : 2; targetIndex = isReversed ? pointIndex - 1 : pointIndex + 1; }
                      //   else if (sttus === '0') { pointIndex = isReversed ? 1 : pathPoints.length - 2; targetIndex = isReversed ? 0 : pathPoints.length - 1; }
                      //   else if (sttus === '1') { pointIndex = -1; targetIndex = isReversed ? pathPoints.length - 2 : 1; }
                      //   if (pointIndex !== -1 && pathPoints[pointIndex]) { tempLat = pathPoints[pointIndex].lat; tempLng = pathPoints[pointIndex].lng; }
                      //   let targetLat = nextCoords.lat; let targetLng = nextCoords.lng;
                      //   if (targetIndex !== -1 && pathPoints[targetIndex]) { targetLat = pathPoints[targetIndex].lat; targetLng = pathPoints[targetIndex].lng; }
                      //   angle = calculateBearing(tempLat, tempLng, targetLat, targetLng);
                      // } else { angle = calculateBearing(tempLat, tempLng, nextCoords.lat, nextCoords.lng); }

                      // //* [Modified Code] 구버전 정적 데이터(SUBWAY_PATHS) 대신 실시간 좌표 기반 직선 베어링 계산 (경량화)
                      angle = calculateBearing(
                        tempLat,
                        tempLng,
                        nextCoords.lat,
                        nextCoords.lng,
                      );
                    }
                    // === [스냅 & 회전 로직 끝] ===
                  }
                }
              }

              // //* [Added Code] 급행 여부 (directAt: '1'이면 급행, '0'이면 일반)
              const isExpress = item.directAt === '1';

              return {
                id: `${item.trainNo}_${index}`,
                lat: tempLat,
                lng: tempLng,
                line: lineName,
                updnLine: item.updnLine,
                angle: angle, // 계산된 회전 각도 추가
                isExpress: isExpress, // 급행 여부 추가
                trainName: `${isExpress ? '[급행] ' : ''}${dirArrow} [${lineName}] ${rawStationName} ${item.trainSttus === '0' ? '진입' : item.trainSttus === '1' ? '도착' : '출발'}`,
              };
            });
          }
          return [];
        } catch (lineErr) {
          console.warn(`[Subway API] Line ${lineName} error:`, lineErr.message);

          // //* [Added Code] v13.0: 개별 노선 에러에서도 한도 초과 시 차단
          const errorData = lineErr.response?.data;
          if (
            errorData?.code === 'ERROR-337' ||
            errorData?.message?.includes('1000건')
          ) {
            setSubwayError('지하철 API 호출 한도 초과 (ERROR-337)');
            setIsSubwayApiDisabled(true);
            setIsSubwayRealtimeOn(false); // //* [Added Code] v14.0: 에러 발생 시 스위치 강제 Off
          }
          return [];
        }
      });

      const results = await Promise.all(promises);
      let allSubways = results.flat();

      // 결과 필터링 (렌더링 최적화)
      if (currentBounds) {
        const RENDER_PAD = 0.02; // //* [Modified] 약 2km 반경 여유 마진 (열차가 화면에 부드럽게 진입하도록)
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
      // //* [Added Code] 인증 에러(토큰 소진 등, ERROR-337 등) 발생 시 사용자에게 알림
      const errorData = err.response?.data;
      if (
        errorData?.code === 'ERROR-337' ||
        errorData?.message?.includes('1000건') ||
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        setSubwayError(
          '지하철 API 토큰이 만료되었거나 일일 한도를 초과했습니다. (1000회/일)',
        );
      } else {
        setSubwayError('지하철 정보를 불러오는 중 서버 에러가 발생했습니다.');
      }
      // //* [Added Code] v13.0: 치명적 에러 시 요청 주기적 중단
      if (err.response?.status === 429) {
        setIsSubwayApiDisabled(true);
      }
    }
  };

  useEffect(() => {
    // 최초 실행 (영역 없이 전체 데이터, mapLevel 초기값 3 전달)
    fetchSubwayPositions(null, 3);
    // //* [Modified Code] 인터벌 내부에서 Ref를 사용하여 항상 최신 영역과 확대 상태를 호출 (부하 감소를 위해 45초로 연장)
    const intervalId = setInterval(() => {
      // //* [Modified Code] v14.0: 수동 On 상태일 때만 정기 업데이트 수행
      if (
        !isSubwayRealtimeOn ||
        isSubwayApiDisabled ||
        (subwayError && subwayError.includes('한도'))
      )
        return;

      // //* [Added Code] v11.0: 줌 레벨이 3 이하일 때만 정기 업데이트 수행
      if (mapBoundsRef.current?.level <= 3) {
        fetchSubwayPositions(
          mapBoundsRef.current?.bounds,
          mapBoundsRef.current?.level,
        );
      } else {
        if (subways.length > 0) setSubways([]);
      }
    }, 45000);
    return () => clearInterval(intervalId);
  }, [subwayError]); // subwayError 상태를 감시하여 한도 초과 시 기민하게 대응

  // //* [Modified Code] 지도를 움직일 때마다 즉시 호출하는 대신 2초 Debounce 적용 (API 횟수 절약 핵심)
  useEffect(() => {
    // //* [Modified Code] v14.0: 수동 On 상태일 때만 디바운스 수행
    if (!mapBounds || isSubwayApiDisabled || !isSubwayRealtimeOn) return;
    if (subwayError && subwayError.includes('한도')) return; // 한도 초과 시 호출 금지

    const timer = setTimeout(() => {
      fetchSubwayPositions(mapBounds, mapLevel);
    }, 2000);

    return () => clearTimeout(timer);
  }, [mapBounds, mapLevel, subwayError, isSubwayApiDisabled]);

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

        // //* [Added Code] 내비게이션 검색창이 열려 있을 때는 캐릭터의 화살표 이동을 차단합니다. (UX 정교화)
        if (showSearch) return prev;

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
      case 7:
        // //* [Mentor's Tip] 길찾기 메뉴는 별도의 모달 대신 Map 위에서 바로 검색창을 띄우는 방식으로 처리합니다.
        // 따라서 activeModal 대신 setShowSearch를 직접 제어합니다.
        return null;
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
                setIsSubwayApiDisabled(false); // //* [Modified Code] v13.0: 차단 해제 후 재시도
                setSubwayError(null);
                setIsSubwayRealtimeOn(true); // //* [Added Code] v14.0: 재시도 시 스위치도 다시 On
                setTimeout(() => {
                  fetchSubwayPositions(
                    mapBoundsRef.current?.bounds,
                    mapBoundsRef.current?.level,
                  );
                }, 100);
              }}
              className="ml-2 bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full text-[10px] text-white font-bold transition-all active:scale-95"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* //* [Added Code] v14.0: 실시간 지하철 위치 토글 버튼 (수동 제어 모드) */}
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 items-end">
          <button
            onClick={() => setIsSubwayRealtimeOn(!isSubwayRealtimeOn)}
            disabled={isSubwayApiDisabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all active:scale-95 border-2 ${
              isSubwayRealtimeOn
                ? 'bg-blue-600 border-blue-400 text-white animate-pulse-subtle'
                : 'bg-white/90 border-gray-200 text-gray-700'
            } ${isSubwayApiDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-105'}`}
          >
            <span className="text-sm font-bold">
              {isSubwayRealtimeOn ? '🚇 실시간 정보 ON' : '🚇 실시간 정보 OFF'}
            </span>
            <div
              className={`w-10 h-5 rounded-full relative transition-colors ${isSubwayRealtimeOn ? 'bg-blue-300' : 'bg-gray-300'}`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isSubwayRealtimeOn ? 'left-5.5' : 'left-0.5'}`}
              />
            </div>
          </button>

          {isSubwayRealtimeOn && !isSubwayApiDisabled && (
            <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-md border border-blue-200 shadow-sm animate-fade-in pointer-events-none">
              <span className="text-[10px] text-blue-700 font-medium">
                ✨ 현재 화면의 열차 위치를 추적 중입니다.
              </span>
            </div>
          )}
          {isSubwayApiDisabled && (
            <div className="bg-red-50/90 backdrop-blur-sm px-3 py-1 rounded-md border border-red-200 shadow-sm pointer-events-none">
              <span className="text-[10px] text-red-600 font-bold">
                ❌ 오늘 API 한도가 모두 소진되었습니다.
              </span>
            </div>
          )}
        </div>

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
            onClick={() => setSelectedTrainId(null)} // //* [Added Code] 지도의 빈 공간 클릭 시 열차 선택 해제
          >
            <ZoomControl
              position={
                window.kakao ? window.kakao.maps.ControlPosition.RIGHT : 2
              }
            />

            {/* //* [Modified Code] 노선별 색상 폴리라인 다중 렌더링 (ODsay segments 데이터 활용) */}
            {routeSegments.map((seg, segIdx) =>
              seg.path.length > 1 ? (
                <Polyline
                  key={`route-seg-${segIdx}-${seg.laneName}`}
                  path={seg.path}
                  strokeWeight={7}
                  // //* [Modified Code] 배경 노선과 구분되도록 명도를 25% 하향하여 선명하게 강조
                  strokeColor={adjustBrightness(seg.color, -25)}
                  strokeOpacity={0.9}
                  // //* [Added Code] 환승/도보 및 수단 변경 구간은 점선(dash)으로 처리
                  strokeStyle={seg.strokeStyle || 'solid'}
                  zIndex={10}
                />
              ) : null,
            )}

            {/* //* [Modified Code] 경로 경유역 마커: 첫 역(초록), 마지막 역(빨강), 중간역(흰색 작은 점) */}
            {routeResult &&
              routeResult.path &&
              routeResult.path
                .filter((s) => s.lat !== null && s.lng !== null)
                .map((station, idx, arr) => {
                  const isFirst = idx === 0;
                  const isLast = idx === arr.length - 1;
                  const dotColor = isFirst
                    ? '#22C55E'
                    : isLast
                      ? '#EF4444'
                      : SUBWAY_LINE_COLORS[station.line] || '#9CA3AF';
                  return (
                    <CustomOverlayMap
                      key={`route-station-${idx}`}
                      position={{ lat: station.lat, lng: station.lng }}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`${
                            isFirst || isLast ? 'w-5 h-5' : 'w-3 h-3'
                          } rounded-full border-2 border-white shadow-[0_2px_4px_rgba(0,0,0,0.35)] z-10`}
                          style={{ backgroundColor: dotColor }}
                        />
                        {(isFirst || isLast) && (
                          <div className="mt-1 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md border border-gray-200 shadow-sm">
                            <span
                              className="text-[10px] font-black whitespace-nowrap"
                              style={{ color: dotColor }}
                            >
                              {isFirst ? '🚉 ' : '🏁 '}
                              {station.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </CustomOverlayMap>
                  );
                })}

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
                    <div className="absolute -top-[7px] -left-[4px] w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#00B4FF]"></div>
                  </div>
                </div>
              </CustomOverlayMap>
            ))}

            {/* //* [Modified Code] 공공데이터로 받아온 지하철 열차 지도 마커 표현 배열 렌더링 (야구공 대신 지하철 Custom UI로 변경) */}
            {subways.map((subway) => {
              // //* [Modified Code] 정밀 수직 오프셋(Perpendicular Offset) 계산
              // //* [Mentor's Tip] 오프셋 거리를 4px로 최소화하여 역의 그래픽 영역을 벗어나지 않으면서도 겹침을 방지합니다.
              const offsetDist = 4;
              const angleRad = ((subway.angle || 0) + 90) * (Math.PI / 180);
              const sideMult = subway.updnLine === '0' ? 1 : -1;
              const offX = Math.sin(angleRad) * offsetDist * sideMult;
              const offY = -Math.cos(angleRad) * offsetDist * sideMult;

              return (
                <CustomOverlayMap
                  key={subway.id}
                  position={{ lat: subway.lat, lng: subway.lng }}
                  yAnchor={0.5} // //* [Modified Code] 아이콘이 궤적 바로 위에 위치하도록 앵커를 중앙으로 보정
                  // //* [Added Code] 노선별 레이어 우선순위 적용 (환승역 겹침 최소화)
                  zIndex={SUBWAY_LINE_ZINDEX[subway.line] || 100}
                >
                  <div style={{ transform: `translate(${offX}px, ${offY}px)` }}>
                    <div
                      // //* [Modified Code] 불필요한 배경 원형 제거 및 호버/클릭 인터랙션 유지
                      className="relative transition-transform hover:scale-110 group cursor-pointer flex items-center justify-center"
                      onClick={(e) => {
                        // //* [Mentor's Tip] 지도의 클릭 이벤트 전파를 막아 펫이 이동하거나 지도가 클릭되는 것을 방지합니다.
                        e.stopPropagation();
                        setSelectedTrainId(
                          selectedTrainId === subway.id ? null : subway.id,
                        );
                      }}
                    >
                      <SubwayIcon
                        direction="up" // 회전을 사용하므로 항상 전진(up) 화살표를 사용하고 각도로 조절
                        angle={subway.angle}
                        width={28}
                        isExpress={subway.isExpress} // 급행 여부 전달
                        // //* [Added Code] 노선 브랜드 컬러를 화살표 색상으로 전달 (가독성 강화)
                        arrowColor={
                          SUBWAY_LINE_COLORS[subway.line] || '#10b981'
                        }
                      />
                      {/* 작은 이름표 */}
                      <div
                        // //* [Modified Code] 기본적으로 투명(opacity-0) 상태로 두고, 부모(아이콘) 호버 시나 클릭 시에만 노출(opacity-100)
                        className={`absolute -top-10 whitespace-nowrap text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xl ring-2 ring-white/20 transition-all duration-300 pointer-events-none z-100
                          ${
                            selectedTrainId === subway.id
                              ? 'opacity-100 translate-y-0 scale-100'
                              : 'opacity-0 group-hover:opacity-100 translate-y-2 scale-95 group-hover:translate-y-0 group-hover:scale-100'
                          }`}
                        style={{
                          backgroundColor:
                            SUBWAY_LINE_COLORS[subway.line] || '#4B5563',
                        }}
                      >
                        {subway.trainName}
                        {/* //* [Added Code] 말풍선 꼬리 */}
                        <div
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent"
                          style={{
                            borderTopColor:
                              SUBWAY_LINE_COLORS[subway.line] || '#4B5563',
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CustomOverlayMap>
              );
            })}

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

        {/* //* [Modified Code] Navigation 메뉴 클릭 시에만 검색창 노출 */}
        {showSearch && (
          <SubwaySearch
            onSearch={handleRouteSearch}
            onClose={() => setShowSearch(false)}
            isLoading={routeLoading}
          />
        )}

        {/* //* [New UI] 검색 결과 경로 목록 (v9.0) */}
        {isRouteListOpen && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-100 w-[90%] max-w-md bg-slate-900/95 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5">
            <RouteList
              routes={routeList}
              isLoading={routeLoading}
              onSelect={handleSelectRoute}
              onClose={() => setIsRouteListOpen(false)}
            />
          </div>
        )}

        {routeResult && (
          <RouteResult
            result={routeResult}
            startTime={routeStartTime}
            onClose={() => {
              setRouteResult(null);
              // //* [Modified Code] routePathCoords → routeSegments 초기화
              setRouteSegments([]);
            }}
          />
        )}
      </div>

      <div className="w-full absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2 px-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        {/* //* [Modified Code] 고유한 이름과 아이콘을 가진 배열 데이터를 기반으로 개별적인 박스 렌더링 */}
        {ACTION_MENUS.map((menu) => (
          <div
            key={menu.id}
            onClick={() => {
              if (menu.id === 7) {
                // //* [Modified Code] Navigation 메뉴 클릭 시 검색창 토글
                setShowSearch(!showSearch);
                setActiveModal(null);
              } else {
                setActiveModal(menu.id);
                setShowSearch(false); // 다른 메뉴 열면 검색창 닫기
              }
            }}
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
