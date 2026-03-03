import { tagCatalog, type TagCatalogItem } from "@/data/tagCatalog";
import { researchTagCatalog } from "@/data/researchTagCatalog";

export interface PostTagInput {
  title: string;
  description?: string;
  body?: string;
  tags?: string[];
  category?: string; // 新增：明確的分類類別
  catalog?: TagCatalogItem[]; // 新增：可選的目錄
}

export interface ClassifiedTags {
  topics: string[];
  keywords: string[];
  secondaryKeywords: string[];
  keywordScores: Array<{ keyword: string; score: number; tier: "primary" | "secondary" }>;
  metaTags: string[];
}

const TOPIC_KEYS = new Set(tagCatalog.map((item) => item.key));
const RESEARCH_TOPIC_KEYS = new Set(researchTagCatalog.map((item) => item.key));

const IGNORE_TAGS = new Set([
  "matters",
  "imported",
  "astro",
  "migration",
  "github pages",
  "hello"
]);

const TOPIC_ALIASES: Record<string, string> = {
  ai: "AI與科技",
  "人工智慧": "AI與科技",
  did: "AI與科技",
  "數位身分": "AI與科技",
  "digital identity": "AI與科技",

  dao: "治理與民主",
  "審議式民主": "治理與民主",
  "公共治理": "治理與民主",
  democracy: "治理與民主",
  governance: "治理與民主",

  web3: "web3",
  "網路與社群": "網路與社群",
  matters: "網路與社群",
  "網路國家": "網路與社群",
  "抗審查": "網路與社群",

  nft: "web3",
  tezos: "web3",
  ethereum: "web3",
  "區塊鏈": "web3",
  "以太坊": "web3",
  "加密貨幣": "web3",

  "運動健康": "運動健康",
  "棒球": "運動健康",
  "健康": "運動健康",
  "運動": "運動健康",
  "親子": "運動健康",
  "飲食": "運動健康"
};

// 研究專屬主題提示
const RESEARCH_TOPIC_HINTS = [
  { topic: "church-history", regex: /歷史|創堂|赵世光|趙世光|寇世遠|鄭昌國|周神助|傳承|堂慶|70周年/i },
  { topic: "governance", regex: /治理|章程|董事|執事|管理|會議|決策|組織/i },
  { topic: "mission", regex: /宣教|福音|傳道|植堂|大使命|使命/i },
  { topic: "spirituality", regex: /聖靈|更新|禱告|靈修|默想|恩典/i },
  { topic: "biography", regex: /見證|自傳|人物|採訪|訪談|訪問/i }
];

const TOPIC_HINTS: Array<{ topic: string; regex: RegExp }> = [
  { topic: "運動健康", regex: /運動|健康|棒球|體育|身心|健康|親子|飲食/i },
  { topic: "信仰", regex: /靈修|基督教|禱告|見證|教會|靈糧堂|執事|牧師|奉獻/i },
  { topic: "AI與科技", regex: /\bai\b|人工智慧|數位身分|did|隱私|科技|技術/i },
  { topic: "治理與民主", regex: /治理|民主|政策|審議|公民|dao|公共財|資助|制度/i },
  { topic: "網路與社群", regex: /網路與社群|網路國家|網路架構|matters|言論自由|抗審查|去中心化平台|社群|平台|網絡/i },
  { topic: "web3", regex: /\bnft\b|web3|tezos|ethereum|區塊鏈|以太坊|加密/i }
];

const TOKEN_STOPWORDS = new Set([
  "以及",
  "或者",
  "如果",
  "因為",
  "所以",
  "這個",
  "那個",
  "我們",
  "你們",
  "他們",
  "自己",
  "目前",
  "可能",
  "沒有",
  "可以",
  "需要",
  "如何",
  "不是",
  "一些",
  "什麼",
  "就是",
  "正在",
  "這篇",
  "文章",
  "內容",
  "世界",
  "台灣",
  "and",
  "the",
  "with",
  "from",
  "that",
  "this",
  "have",
  "will",
  "into",
  "about",
  "your",
  "their",
  "more",
  "than",
  "what",
  "when",
  "where",
  "which",
  "because",
  "https",
  "http",
  "www",
  "com",
  "來源",
  "內文",
  "原文",
  "連結",
  "原文連結",
  "延伸閱讀",
  "圖片來源",
  "圖片擷取",
  "前往閱讀",
  "本文為外部文章索引",
  "本文同步自",
  "本文同步",
  "並已轉為本地可維護格式",
  "並已轉為",
  "本地可維",
  "護格式",
  "含圖片本地化",
  "含圖片本",
  "地化",
  "已保留原始段落與圖片",
  "原文發表於",
  "原文標題",
  "本文為外部文",
  "章索引",
  "此外",
  "因此",
  "例如",
  "然而",
  "最後",
  "一個",
  "一樣",
  "作者",
  "名為",
  "服務",
  "工具",
  "內文",
  "專欄",
  "裡面",
  "其實",
  "是說",
  "我的意思是說",
  "換句話說",
  "就是說",
  "我覺得",
  "比如說",
  "然後",
  "但是",
  "這樣",
  "時候",
  "的時候",
  "的話",
  "大家",
  "非常",
  "這些",
  "那麼",
  "這一個",
  "那一個",
  "一件事情",
  "一件",
  "事情",
  "很多",
  "一直",
  "知道",
  "看到",
  "逐字稿整理",
  "逐字稿",
  "應該",
  "當然"
]);

const GENERIC_KEYWORD_PENALTY: Record<string, number> = {
  nft: 0.32,
  web3: 0.5,
  "區塊鏈": 0.62,
  "加密": 0.62,
  "以太坊": 0.7,
  ethereum: 0.7,
  dao: 0.7,
  ai: 0.65,
  "人工智慧": 0.65
};

const TOPIC_ALIAS_KEYS = new Set(Object.keys(TOPIC_ALIASES));
const TOKEN_BLOCK_PATTERNS: RegExp[] = [
  /^https?:\/\//i,
  /^www\./i,
  /^[\d./:-]+$/,
  /^(來源|原文|連結|內文)/,
  /(本文為外部文章索引|前往閱讀|原文發表於|原文標題|本文同步自|本文同步|並已轉為|本地可維|護格式|圖片本地化|含圖片本|地化|原文連結|延伸閱讀|圖片來源|圖片擷取)/,
  /^(for|from|with|that|this|what|when|where)$/i
];

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#\s*/, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("zh-TW");
}

function denormalizeTag(raw: string): string {
  return raw.trim().replace(/^#\s*/, "").replace(/\s+/g, " ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function stripForTokenize(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[(.*?)\]\((.*?)\)/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[>#_*~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactToken(raw: string): string {
  return raw.trim().replace(/[。、「」『』（）()【】\[\]《》〈〉：:；;,.!?！？"']/g, "");
}

function scoreToken(
  store: Map<string, { label: string; score: number }>,
  rawToken: string,
  weight: number
): void {
  const cleaned = compactToken(rawToken);
  if (!cleaned) return;
  const norm = normalizeTag(cleaned);
  if (!norm || norm.length < 2) return;
  if (TOKEN_BLOCK_PATTERNS.some((pattern) => pattern.test(cleaned) || pattern.test(norm))) return;
  if (/^[a-z0-9./:+-]+$/i.test(norm) && norm.length <= 3) return;
  if (/^\d+$/.test(norm)) return;
  if (/[\u4e00-\u9fff]/.test(cleaned) && cleaned.length > 8) return;
  if (TOKEN_STOPWORDS.has(norm)) return;
  if (IGNORE_TAGS.has(norm)) return;
  if (TOPIC_KEYS.has(cleaned) || TOPIC_KEYS.has(norm)) return;
  if (TOPIC_ALIAS_KEYS.has(norm)) return;

  const value = store.get(norm);
  if (value) {
    value.score += weight;
    if (cleaned.length > value.label.length) value.label = cleaned;
    return;
  }
  store.set(norm, { label: cleaned, score: weight });
}

function collectTerms(text: string, baseWeight: number, store: Map<string, { label: string; score: number }>): void {
  if (!text) return;

  const cjkTerms = text.match(/[\u4e00-\u9fff]{2,6}/g) ?? [];
  for (const token of cjkTerms) {
    scoreToken(store, token, baseWeight);
  }

  const latinTerms = text.match(/[a-zA-Z][a-zA-Z0-9#+./-]{2,}/g) ?? [];
  for (const token of latinTerms) {
    scoreToken(store, token, baseWeight);
  }
}

export function getTopicCatalog(): TagCatalogItem[] {
  return tagCatalog;
}

export function classifyPostTags(input: PostTagInput): ClassifiedTags {
  const rawTags = uniqueStrings((input.tags ?? []).map(denormalizeTag));
  const normalizedTags = rawTags.map((tag) => normalizeTag(tag));

  const topics: string[] = [];
  const keywordStore = new Map<string, { label: string; score: number }>();
  const metaTags: string[] = [];

  const useResearch = input.catalog === researchTagCatalog;
  const currentTopicKeys = input.catalog ? new Set(input.catalog.map(i => i.key)) : TOPIC_KEYS;
  const currentHints = useResearch ? RESEARCH_TOPIC_HINTS : TOPIC_HINTS;

  // 優先處理明確的分類 (Category)
  if (input.category && currentTopicKeys.has(input.category)) {
    topics.push(input.category);
  }

  for (let i = 0; i < rawTags.length; i += 1) {
    const raw = rawTags[i];
    const norm = normalizedTags[i];

    if (currentTopicKeys.has(raw)) {
      topics.push(raw);
      continue;
    }

    if (IGNORE_TAGS.has(norm)) {
      metaTags.push(raw);
      continue;
    }

    const aliasTopic = TOPIC_ALIASES[norm];
    if (aliasTopic && currentTopicKeys.has(aliasTopic)) {
      topics.push(aliasTopic);
    }

    scoreToken(keywordStore, raw, 6);
  }

  const titleText = stripForTokenize(input.title ?? "");
  const descriptionText = stripForTokenize(input.description ?? "");
  const bodyText = stripForTokenize(input.body ?? "");
  const text = `${titleText} ${descriptionText} ${bodyText}`;

  collectTerms(titleText, 4.2, keywordStore);
  collectTerms(descriptionText, 2.8, keywordStore);
  collectTerms(bodyText, 1.1, keywordStore);

  for (const hint of currentHints) {
    if (hint.regex.test(text)) topics.push(hint.topic);
  }

  if (topics.length === 0) {
    topics.push(useResearch ? "church-history" : "隨筆");
  }

  const uniqueTopics = uniqueStrings(topics).filter((topic) => currentTopicKeys.has(topic));

  const scoredKeywords = Array.from(keywordStore.entries())
    .map(([norm, value]) => {
      const penalty = GENERIC_KEYWORD_PENALTY[norm] ?? 1;
      const score = Number((value.score * penalty).toFixed(4));
      return { keyword: value.label, score };
    })
    .filter((item) => item.score >= 1.4)
    .sort((a, b) => b.score - a.score || a.keyword.localeCompare(b.keyword, "zh-Hant"));

  const dedupedKeywords: Array<{ keyword: string; score: number }> = [];
  const seenNorm = new Set<string>();
  for (const item of scoredKeywords) {
    const norm = normalizeTag(item.keyword);
    if (seenNorm.has(norm)) continue;
    seenNorm.add(norm);
    dedupedKeywords.push(item);
  }

  const keywordScores = dedupedKeywords.slice(0, 28).map((item, idx) => ({
    keyword: item.keyword,
    score: item.score,
    tier: idx < 8 ? ("primary" as const) : ("secondary" as const)
  }));
  const keywords = keywordScores.filter((item) => item.tier === "primary").map((item) => item.keyword);
  const secondaryKeywords = keywordScores
    .filter((item) => item.tier === "secondary")
    .map((item) => item.keyword);

  return {
    topics: uniqueTopics,
    keywords,
    secondaryKeywords,
    keywordScores,
    metaTags: uniqueStrings(metaTags)
  };
}

export function getTopicAliasKeywords(topicKey: string): string[] {
  return Object.entries(TOPIC_ALIASES)
    .filter(([, target]) => target === topicKey)
    .map(([alias]) => alias);
}
