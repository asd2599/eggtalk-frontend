import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pet from '../pets/pet';

// //* [Modified Code] 하단 6개 메뉴에 대응하는 모달 UI 컴포넌트 Import
import ActionModal from './ActionModal';
import { SUBWAY_STATION_COORDS } from './subwayCoords';

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
  // //! [Original Code] 임시 헤더와 하단 박스 구조
  // <div className="relative w-full h-screen bg-gray-500">
  // ...

  // //* [Modified Code] Pet 이름, 레벨/경험치 UI 및 모달 팝업 상태 추가
  const [petName, setPetName] = useState('Pet');
  const [level, setLevel] = useState(1);
  const [expPercent, setExpPercent] = useState(0); // 0 ~ 100 사이의 백분율
  const [activeModal, setActiveModal] = useState(null);

  // 펫 데이터 Fetch 및 초기화
  useEffect(() => {
    const fetchPetParams = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get('http://localhost:8000/api/pets/my', {
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
  ];

  useEffect(() => {
    let intervalId;
    const fetchSubwayPositions = async () => {
      try {
        const subwayApiKey = import.meta.env.VITE_SUBWAY_API_KEY;
        if (!subwayApiKey) return;

        // 병렬 통신(다중 비동기 실행)을 통해 여러 지하철 노선을 동시에 가져옴
        const promises = SEOUL_SUBWAY_LINES.map(async (lineName) => {
          try {
            // //* [Modified Code] 프록시 우회 주소(/api/subway)를 적용하여 CORS 에러 원천 차단
            const url = `/api/subway/api/subway/${subwayApiKey}/json/realtimePosition/0/20/${encodeURIComponent(lineName)}`;
            const res = await axios.get(url);

            if (res.data?.realtimePositionList) {
              const items = Array.isArray(res.data.realtimePositionList)
                ? res.data.realtimePositionList
                : [];

              return items.map((item, index) => {
                // 1. 역 이름(statnNm)에서 괄호(부역명) 제거 및 '지선' 접미사 파싱
                // 예: "아차산(어린이대공원후문)" -> "아차산", "신도림지선" -> "신도림"
                const rawStationName = item.statnNm.trim();
                let stationName = rawStationName.split('(')[0].trim();
                if (stationName.endsWith('지선')) {
                  stationName = stationName.replace('지선', '');
                }

                // 2. 매핑 테이블에 역 이름이 있으면 그 좌표를 쓰고, 없으면 기존처럼 중심점에서 분산 배치
                let baseLat = 37.566229;
                let baseLng = 126.981498;
                let isMapped = false;

                if (SUBWAY_STATION_COORDS[stationName]) {
                  baseLat = SUBWAY_STATION_COORDS[stationName].lat;
                  baseLng = SUBWAY_STATION_COORDS[stationName].lng;
                  isMapped = true;
                }

                // 매핑된 정확한 역 좌표 주변에 살짝씩 겹치지 않게 분산 (0.001 단위 = 수십미터 내외)
                const tempLat =
                  baseLat + (Math.random() - 0.5) * (isMapped ? 0.001 : 0.02);
                const tempLng =
                  baseLng + (Math.random() - 0.5) * (isMapped ? 0.001 : 0.02);

                // 3. 열차의 현재 방향 (0: 상행/내선, 1: 하행/외선)을 화살표로 매핑
                const dirArrow =
                  item.updnLine === '0'
                    ? '↑'
                    : item.updnLine === '1'
                      ? '↓'
                      : '';

                return {
                  id: `${item.trainNo}_${index}`,
                  lat: tempLat,
                  lng: tempLng,
                  line: lineName, // 호선 정보를 고유 색상 매핑을 위해 저장
                  updnLine: item.updnLine,
                  trainName: `${dirArrow} [${lineName}] ${rawStationName} ${item.trainSttus === '0' ? '진입' : item.trainSttus === '1' ? '도착' : '출발'}`,
                };
              });
            }
            return [];
          } catch (lineErr) {
            console.warn(
              `[DEBUG] Subway Line ${lineName} Timeout or Error:`,
              lineErr.message,
            );
            return []; // 에러 시 빈 배열을 넘겨 다른 노선의 렌더링은 유지시킵니다.
          }
        });

        const results = await Promise.all(promises);
        const allSubways = results.flat();

        console.log('[DEBUG] Subway API Fetch Result (Multi):', allSubways);
        setSubways(allSubways);
      } catch (err) {
        console.error('Failed to fetch subway positions in MS:', err);
      }
    };

    fetchSubwayPositions();
    intervalId = setInterval(fetchSubwayPositions, 30000);

    return () => clearInterval(intervalId);
  }, []);

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
            onZoomChanged={(map) => setMapLevel(map.getLevel())} // 줌인 줌아웃 시 상태 동기화
            draggable={true} // 마우스로 지도를 강제로 움직이는 것을 금지 (오직 펫 컨트롤만 허용)
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
                  <span className="text-xl">
                    {subway.updnLine === '0'
                      ? '🔼'
                      : subway.updnLine === '1'
                        ? '🔽'
                        : '🚇'}
                  </span>
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
