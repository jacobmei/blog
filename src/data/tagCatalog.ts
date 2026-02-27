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
    key: "數位藝術",
    title: "數位藝術",
    icon: "🎨",
    description: "生成藝術、展覽策展、藝術評論與收藏脈絡。"
  },
  {
    key: "治理與民主",
    title: "治理與民主",
    icon: "🗳",
    description: "DAO、審議工具、社群決策、制度設計與公共治理。"
  },
  {
    key: "公共網路",
    title: "公共網路",
    icon: "🌐",
    description: "公共議題、公民網路、政策脈絡、社群實作與基礎設施。"
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
  }
];
