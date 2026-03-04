import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pet from '../pets/pet';

// //* [Modified Code] 하단 6개 메뉴에 대응하는 모달 UI 컴포넌트 Import
import ActionModal from './ActionModal';

// //* [Modified Code] 카카오맵 연동 컴포넌트 및 로더 훅(Hook) 추가
import {
  Map,
  MapMarker,
  useKakaoLoader,
  ZoomControl,
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

  // //* [Modified Code] Pet 레벨/경험치 UI 및 모달 팝업 상태 추가
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
            draggable={false} // 마우스로 지도를 강제로 움직이는 것을 금지 (오직 펫 컨트롤만 허용)
            zoomable={true} // 마우스 휠을 통한 줌인/줌아웃 명시적 허용
            keyboardShortcuts={true}
          >
            <ZoomControl
              position={
                window.kakao ? window.kakao.maps.ControlPosition.RIGHT : 2
              }
            />
            {/* 진짜 카카오맵 위에 표시되는 펫 마커 오버레이 */}
            {/* 위치는 항상 지도의 중앙(방향키 이동 시 지도가 같이 이동하므로 펫은 상대적으로 화면 최중앙에 고정) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-24 h-24 bg-white/90 rounded-full border-4 border-[#00B4FF] shadow-[0_8px_15px_rgba(0,0,0,0.3)] flex items-center justify-center animate-bounce">
              <span className="text-[#00B4FF] font-extrabold text-2xl drop-shadow-sm">
                펫
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
