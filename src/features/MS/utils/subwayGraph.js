import { SUBWAY_LINE_MAP } from '../subwayLineMap';
import { SUBWAY_PATHS } from '../subwayPaths';

/**
 * [subwayGraph.js]
 * 역할: 지하철 노선 및 경로 정보를 바탕으로 역 간의 연결 관계와 가중치를 포함한 그래프를 생성합니다.
 * //* [Modified Code] SUBWAY_PATHS의 실제 경로 키를 활용하여 분기 노선에서도 정확한 이웃 역을 찾도록 개선되었습니다.
 */

export const buildSubwayGraph = () => {
  const graph = {};

  // //* [Mentor's Tip] 2호선 지선(신정/성수)은 본선과 환승이 필요하므로 별도의 호선으로 구분하여 처리합니다.
  const SINJEONG_BRANCH_STATIONS = [
    '도림천',
    '양천구청',
    '신정네거리',
    '까치산',
  ];
  const SEONGSU_BRANCH_STATIONS = ['용답', '신답', '용두', '신설동'];

  // 1단계: 노선 내 실제 연결된 역끼리 간선 생성 (가중치: 2분)
  Object.entries(SUBWAY_PATHS).forEach(([line, paths]) => {
    Object.keys(paths).forEach((pathKey) => {
      const [stationA, stationB] = pathKey.split('-');

      let finalLineA = line;
      let finalLineB = line;

      // 2호선 특수 처리 (지선 분리 및 연결 차단)
      // //* [Deep Dive] 신도림과 도림천 사이, 성수와 용답 사이의 연결은 지선으로 분류하여
      // //* 본선(Loop) 노드와 분리된 별도의 노드를 생성하게 합니다.
      if (line === '2호선') {
        const isSinjeongA = SINJEONG_BRANCH_STATIONS.includes(stationA);
        const isSinjeongB = SINJEONG_BRANCH_STATIONS.includes(stationB);
        const isSeongsuA = SEONGSU_BRANCH_STATIONS.includes(stationA);
        const isSeongsuB = SEONGSU_BRANCH_STATIONS.includes(stationB);

        // //* [Critical Fix] 신정지선의 끝점인 까치산역이 문래역 등으로 이어지는 데이터 오류를 원천 차단합니다.
        // //* 까치산은 오직 지선역(신정네거리 등)과만 연결되어야 하며, 문래는 오직 본선역과만 연결되어야 합니다.
        if (isSinjeongA && !isSinjeongB && stationB !== '신도림') return;
        if (isSinjeongB && !isSinjeongA && stationA !== '신도림') return;
        if (isSeongsuA && !isSeongsuB && stationB !== '성수') return;
        if (isSeongsuB && !isSeongsuA && stationA !== '성수') return;

        if (isSinjeongA || isSinjeongB) {
          // 신도림-도림천 같은 간선은 '2호선(신정지선)'으로 취급
          if (stationA === '신도림' || isSinjeongA)
            finalLineA = '2호선(신정지선)';
          if (stationB === '신도림' || isSinjeongB)
            finalLineB = '2호선(신정지선)';
        } else if (isSeongsuA || isSeongsuB) {
          if (stationA === '성수' || isSeongsuA) finalLineA = '2호선(성수지선)';
          if (stationB === '성수' || isSeongsuB) finalLineB = '2호선(성수지선)';
        }
      }

      const nodeA = `${stationA}|${finalLineA}`;
      const nodeB = `${stationB}|${finalLineB}`;

      if (!graph[nodeA]) graph[nodeA] = {};
      if (!graph[nodeB]) graph[nodeB] = {};

      graph[nodeA][nodeB] = 2;
      graph[nodeB][nodeA] = 2;
    });
  });

  // 2단계: 환승역 연결 (가중치: 5분)
  // //* [Added Code] 지선 분리에 따라 신도림(본선) <-> 신도림(신정지선) 간의 환승 연결이 필요합니다.
  const stationLines = {};
  Object.keys(graph).forEach((nodeId) => {
    const [station, line] = nodeId.split('|');
    if (!stationLines[station]) stationLines[station] = [];
    if (!stationLines[station].includes(line)) {
      stationLines[station].push(line);
    }
  });

  Object.entries(stationLines).forEach(([station, lines]) => {
    if (lines.length > 1) {
      lines.forEach((lineA) => {
        lines.forEach((lineB) => {
          if (lineA !== lineB) {
            const nodeA = `${station}|${lineA}`;
            const nodeB = `${station}|${lineB}`;
            if (graph[nodeA] && graph[nodeB]) {
              graph[nodeA][nodeB] = 5;
            }
          }
        });
      });
    }
  });

  return graph;
};
