import React from 'react';

/**
 * SubwayIcon 컴포넌트
 * @param {string} direction - 'up' (상행), 'down' (하행), 'none' (기본)
 * @param {number} width - 아이콘 너비 (기본값: 24)
 * @param {number} angle - 회정 각도 (Degree)
 * @returns {JSX.Element} SVG 기반의 지하철 아이콘
 */
const SubwayIcon = ({
  direction = 'none',
  width = 24,
  angle = 0,
  isExpress = false,
  arrowColor = '#10b981', // //* [Added Code] 노선별 화살표 색상 (기본값: 초록)
}) => {
  return (
    <svg
      width={width}
      viewBox="0 0 60 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'center',
        transition: 'transform 0.5s ease-in-out',
        display: 'block',
      }}
    >
      {/* 지하철 본체 */}
      <rect
        x="10"
        y="5"
        width="40"
        height="110"
        rx="8"
        fill="#e2e8f0"
        // //! [Original Code] 일반 테두리
        // stroke="#64748b"
        // strokeWidth="2"
        // 급행일 경우 붉은색 굵은 테두리와 글로우 효과 적용하여 시각적 강조
        stroke={isExpress ? '#FF3B30' : '#64748b'}
        strokeWidth={isExpress ? '5' : '2'}
        style={
          isExpress
            ? { filter: 'drop-shadow(0 0 4px rgba(255, 59, 48, 0.6))' }
            : {}
        }
      />
      <path d="M 10 15 Q 30 0 50 15 Z" fill="#334155" />
      <path d="M 10 105 Q 30 120 50 105 Z" fill="#334155" />
      <rect x="18" y="25" width="24" height="70" fill="#cbd5e1" rx="2" />

      {/* 방향에 따른 화살표 렌더링 */}
      {direction === 'up' && (
        <path
          d="M 30 35 L 18 55 L 26 55 L 26 85 L 34 85 L 34 55 L 42 55 Z"
          fill={arrowColor} // 하드코딩된 색상 대신 노선색 적용
        />
      )}
      {direction === 'down' && (
        <path
          d="M 30 85 L 42 65 L 34 65 L 34 35 L 26 35 L 26 65 L 18 65 Z"
          fill={arrowColor} // 하드코딩된 색상 대신 노선색 적용
        />
      )}
      {/* direction이 'none'일 때는 화살표를 그리지 않고 빈 지붕만 보여줌 */}
    </svg>
  );
};

export default SubwayIcon;
