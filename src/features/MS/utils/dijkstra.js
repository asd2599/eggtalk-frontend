import { buildSubwayGraph } from './subwayGraph';

/**
 * [dijkstra.js]
 * 역할: 다익스트라 알고리즘을 사용하여 두 역 간의 최단 시간 경로를 계산합니다.
 * //* [Modified Code] 시작/종료 노드의 호선별 검색 및 예외 처리 로직이 강화되었습니다.
 */

export const findShortestPath = (startStation, endStation) => {
  // //* [Mentor's Tip] 매번 그래프를 새로 구축하는 것은 비효율적일 수 있으나,
  // //* 현재 프로젝트 규모에서는 데이터의 실시간성과 단순성을 위해 함수 호출 시 생성합니다.
  const graph = buildSubwayGraph();

  // 시작역과 종료역이 포함된 모든 노드(호선별) 후보 찾기
  // 예: '강남|2호선', '강남|신분당선'
  const startNodes = Object.keys(graph).filter((node) =>
    node.startsWith(`${startStation}|`),
  );
  const endNodes = Object.keys(graph).filter((node) =>
    node.startsWith(`${endStation}|`),
  );

  if (startNodes.length === 0 || endNodes.length === 0) {
    console.warn(
      `[Dijkstra] 역을 찾을 수 없음: ${startStation} -> ${endStation}`,
    );
    return null;
  }

  let shortestResult = null;

  // //* [Deep Dive] 모든 시작 호선 - 종료 호선 조합에 대해 최단 경로를 탐색하여 최적의 루트를 선정합니다.
  startNodes.forEach((startNode) => {
    endNodes.forEach((endNode) => {
      const result = dijkstra(graph, startNode, endNode);
      if (
        result &&
        (!shortestResult || result.distance < shortestResult.distance)
      ) {
        shortestResult = result;
      }
    });
  });

  return shortestResult;
};

// //* [Modified Code] 가독성을 높이기 위해 다익스트라 핵심 로직을 분리 및 주석 강화
const dijkstra = (graph, startNode, endNode) => {
  const distances = {};
  const prev = {};
  const nodes = new Set(Object.keys(graph));

  // 초기화: 모든 노드까지의 거리를 무한대로 설정
  nodes.forEach((node) => {
    distances[node] = Infinity;
    prev[node] = null;
  });

  distances[startNode] = 0;

  while (nodes.size > 0) {
    // 현재 방문하지 않은 노드 중 가장 가까운 노드 선택
    let closestNode = null;
    nodes.forEach((node) => {
      if (closestNode === null || distances[node] < distances[closestNode]) {
        closestNode = node;
      }
    });

    // 더 이상 방문할 수 있는 노드가 없거나 도착점에 도달한 경우 종료
    if (closestNode === null || distances[closestNode] === Infinity) break;
    if (closestNode === endNode) break;

    nodes.delete(closestNode);

    // 인접 노드 거리 갱신 (Relaxation)
    const neighbors = graph[closestNode] || {};
    Object.entries(neighbors).forEach(([neighbor, weight]) => {
      if (!nodes.has(neighbor)) return; // 이미 방문한 노드는 스킵

      const alt = distances[closestNode] + weight;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        prev[neighbor] = closestNode;
      }
    });
  }

  // 경로가 존재하지 않는 경우
  if (distances[endNode] === Infinity) return null;

  // 최단 경로 역추적 (Path Reconstruction)
  const path = [];
  let curr = endNode;
  while (curr !== null) {
    const [name, line] = curr.split('|');
    path.unshift({ name, line });
    curr = prev[curr];
  }

  return {
    distance: distances[endNode],
    path: path,
  };
};
