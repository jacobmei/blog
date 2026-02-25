export const TOPIC_ROUTE_CODE_MAP: Record<string, string> = {
  "數位藝術": "art",
  "治理與民主": "gov",
  "公共網路": "internet",
  "AI與科技": "ai_tech",
  "薄荷薄荷專欄": "mintmint",
  web3: "web3"
};

const ROUTE_CODE_TOPIC_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(TOPIC_ROUTE_CODE_MAP).map(([topic, code]) => [code, topic])
);

export const topicToRouteSegment = (topic: string): string =>
  TOPIC_ROUTE_CODE_MAP[topic] ?? encodeURIComponent(topic);

export const routeSegmentToTopic = (segment: string): string =>
  ROUTE_CODE_TOPIC_MAP[segment] ?? decodeURIComponent(segment);
