export interface TagCatalogItem {
  key: string;
  title: string;
  icon: string;
  description: string;
}

export const tagCatalog: TagCatalogItem[] = [
  {
    key: "web3",
    title: "web3",
    icon: "⛓",
    description: "鏈上資產、收藏、鑄造、交易與錢包生態。"
  },
  {
    key: "運動健康",
    title: "運動健康",
    icon: "🏃‍♂️",
    description: "棒球、各類運動紀錄、身心健康與生活習慣的平衡觀察。"
  },
  {
    key: "治理與民主",
    title: "治理與民主",
    icon: "🗳",
    description: "DAO、審議工具、社群決策、制度設計與公共治理。"
  },
  {
    key: "網路與社群",
    title: "網路與社群",
    icon: "🕸️",
    description: "專題觀察、網路國家、數位社群實作、去中心化架構與基礎設施。"
  },
  {
    key: "AI與科技",
    title: "AI與科技",
    icon: "🤖",
    description: "AI、數位身分、工具演進與科技社會影響。"
  },
  {
    key: "信仰",
    title: "信仰",
    icon: "✝️",
    description: "基督信仰、靈修默想、教會生活與信仰規跡的生命觀察。"
  },
  {
    key: "隨筆",
    title: "隨筆",
    icon: "📝",
    description: "生活雜感、紀錄與未分類的隨手筆記。"
  }
];
