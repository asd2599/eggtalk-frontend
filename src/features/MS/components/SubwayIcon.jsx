import React from 'react';

/**
 * SubwayIcon 컴포넌트
 * @param {string} direction - 'up' (상행), 'down' (하행), 'none' (기본)
 * @param {number} width - 아이콘 너비 (기본값: 24)
 * @param {number} angle - 회정 각도 (Degree)
 * @returns {JSX.Element} SVG 기반의 지하철 아이콘
 */
const SubwayIcon = ({ direction = 'none', width = 24, angle = 0 }) => {
  return (
    <svg
      width={width}
      viewBox="0 0 60 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `rotate(${angle}deg)`,
        transition: 'transform 0.5s ease-in-out',
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
        stroke="#64748b"
        strokeWidth="2"
      />
      <path d="M 10 15 Q 30 0 50 15 Z" fill="#334155" />
      <path d="M 10 105 Q 30 120 50 105 Z" fill="#334155" />
      <rect x="18" y="25" width="24" height="70" fill="#cbd5e1" rx="2" />

      {/* 방향에 따른 화살표 렌더링 */}
      {direction === 'up' && (
        <path
          d="M 30 35 L 18 55 L 26 55 L 26 85 L 34 85 L 34 55 L 42 55 Z"
          fill="#10b981"
        /> // 초록색 상행
      )}
      {direction === 'down' && (
        <path
          d="M 30 85 L 42 65 L 34 65 L 34 35 L 26 35 L 26 65 L 18 65 Z"
          fill="#8b5cf6"
        /> // 보라색 하행
      )}
      {/* direction이 'none'일 때는 화살표를 그리지 않고 빈 지붕만 보여줍니다. */}
    </svg>
  );
};

export default SubwayIcon;
