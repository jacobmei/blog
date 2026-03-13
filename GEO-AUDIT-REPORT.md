# GEO Audit Report: Jacob Mei Labs

**審計日期：** 2026-03-11
**URL：** https://jacobmei.com
**業務類型：** Publisher（個人知識中心 / 思想型部落格）
**分析頁面數：** 31（18 篇文章 + 7 主要頁面 + 6 標籤頁）

---

## Executive Summary

**總體 GEO 分數：51/100（Poor）**

jacobmei.com 擁有紮實的技術基礎（靜態網站、Sitemap、llms.txt、JSON-LD），內容也有明確的作者身份與專業經歷，但**品牌在 AI 訓練語料庫的能見度幾乎為零**（無 Wikipedia、無 Reddit、無 YouTube、無第三方引用），嚴重拖低整體 GEO 分數。提升重點應放在「讓外部平台幫你說話」，而非進一步優化網站本身。

### 分數明細

| 類別 | 分數 | 權重 | 加權分 |
|------|------|------|--------|
| AI Citability（引用可讀性） | 55/100 | 25% | 13.75 |
| Brand Authority（品牌權威） | 28/100 | 20% | 5.60 |
| Content E-E-A-T | 65/100 | 20% | 13.00 |
| Technical GEO（技術基礎） | 72/100 | 15% | 10.80 |
| Schema & Structured Data | 58/100 | 10% | 5.80 |
| Platform Optimization | 25/100 | 10% | 2.50 |
| **總體 GEO 分數** | | | **51/100** |

---

## 重要問題（Critical）

無 Critical 等級問題。AI 爬蟲未被封鎖，網站正常可索引。

---

## 高優先問題（High Priority，1 週內處理）

### H1 — llms.txt 無法正常抓取
- **位置：** https://jacobmei.com/llms.txt
- **狀況：** robots.txt 已宣告 `LLMS-txt: https://jacobmei.com/llms.txt`，但 WebFetch 嘗試取得時回傳首頁內容，疑似路由未正確對應或 Content-Type 有誤。
- **建議：** 確認 `src/pages/llms.txt.ts` 的路由與輸出格式，確保回傳 `text/plain` 並符合 llms.txt 標準格式。

### H2 — 無 Twitter Card meta 標籤
- **位置：** 全站
- **狀況：** 多頁面確認無 `twitter:card`、`twitter:title`、`twitter:description`、`twitter:image` 標籤。
- **影響：** 社群分享預覽品質差，也影響部分 AI 系統的 metadata 解析。
- **建議：** 在 Layout 或 BaseHead 元件加入 Twitter Card meta tags。

### H3 — 文章缺少 `HowTo` Schema
- **位置：** `/blog/2026/0308-1w7eml/`（gmail-statement-fetcher 教學）、`/blog/2026/0304-1xo3tz/`（IssueOps 教學）等技術教學文章
- **狀況：** 這類步驟型教學文章沒有 `HowTo` schema，AI 系統無法將其識別為操作指南。
- **建議：** 對含有「Step 1/2/3」或「如何...」結構的文章加入 HowTo JSON-LD。

### H4 — 品牌在 AI 訓練語料庫的錨點極弱
- **狀況：** Wikipedia 無頁面、Reddit 無提及、YouTube 無頻道、無媒體報導引用 jacobmei.com。
- **影響：** AI 系統（ChatGPT、Claude、Perplexity）無法透過第三方來源確認 Jacob Mei 的實體身份與專業權威，導致引用意願低。
- **建議：** 詳見「30 天行動計畫」。

---

## 中優先問題（Medium Priority，1 個月內處理）

### M1 — Sitemap 缺少 `<lastmod>`
- **狀況：** `sitemap-0.xml` 中所有 URL 均無 lastmod 日期。
- **建議：** Astro sitemap 整合設定加入 `lastmod: true`，讓搜尋引擎與 AI 爬蟲知道內容的新鮮度。

### M2 — 文章長短落差過大，稀釋內容品質信號
- **狀況：** 文章長度從 77 字（〈女兒的第一支舞〉）到 3,337 字不等，差距 43 倍。
- **影響：** 短文章無法成為 AI 引用的候選段落（最低需 ~100 字）。
- **建議：** 極短文章考慮改為私人日誌或合併，或加入更多背景描述。

### M3 — 缺少 `SpeakableSpecification` Schema
- **狀況：** 文章未標記哪些段落適合語音摘要。
- **建議：** 對摘要段落加入 `speakable` 屬性，Google Assistant / AI 語音平台引用機率提高。

### M4 — 文章內容無外部來源引用
- **狀況：** 技術文章多為個人經驗分享，未引用外部研究報告、統計數據或媒體來源。
- **影響：** E-E-A-T 的 Trustworthiness 信號弱。
- **建議：** 每篇技術文章加入 2-3 個外部可信來源連結。

---

## 低優先問題（Low Priority）

### L1 — Open Graph 標籤未在 HTML head 明確輸出
- 從頁面原始碼確認，og:image 等資料存在於 JSON-LD 中，但標準 `<meta property="og:...">` 標籤需再確認是否在 HTML head 正確輸出。

### L2 — `article:author` meta 標籤
- 建議在文章頁加入 `<meta property="article:author" content="...">` 以強化 Facebook/LinkedIn 分享時的作者歸屬。

### L3 — `/research/` 完全封鎖 AI 爬蟲
- robots.txt `Disallow: /research/` 封鎖所有爬蟲（含 AI）。若研究區有高品質公開內容，可考慮選擇性開放。

---

## 分類深度分析

### AI Citability：55/100

**優點：**
- 主要技術文章長度達 2,800–3,337 字，有足夠的可引用段落密度
- PAIOP 零信任治理文章有 FAQ 區塊，問答格式對 AI 引用非常友好
- gmail-statement-fetcher 教學有自成一體的工具說明段落

**缺點：**
- 缺乏統計數據與外部研究引用（AI 傾向引用有數據支撐的內容）
- 技術文章缺少「一段話總結」的 TL;DR 段落
- 無 `HowTo` / `FAQPage` schema 覆蓋所有適用文章
- 部分文章極短（77 字）完全無法被引用

**可引用示例（PAIOP 文章）：**
> 「LLM 無狀態設計才是 AI 輔助開發最深的坑——不是 AI 不夠聰明，而是它天生不記得你的規則。」

這個 meta description 本身就是一個優質引用句，建議在文章開頭加入 100-150 字的自成一體摘要段落。

---

### Brand Authority：28/100

| 平台 | 狀態 | 評估 |
|------|------|------|
| LinkedIn | ✅ 強 | 500+ 連結、可驗證 C-suite 職稱、JKOPay 董事長 |
| GitHub | ✅ 有 | jacobmei 帳號存在 |
| Spotify | ✅ 有 | 聖經讀經 podcast |
| Facebook | ⚠️ 弱 | 個人頁 + 粉專，但非專業內容導向 |
| Wikipedia | ❌ 無 | 完全無條目 |
| Reddit | ❌ 無 | 無任何提及 |
| YouTube | ❌ 無 | 無頻道 |
| 媒體報導 | ❌ 無 | 無第三方引用 jacobmei.com |
| Mashbean | ❌ 無 | 此品牌名稱完全無認知度 |

**核心問題：** AI 系統（尤其 ChatGPT、Perplexity）的知識主要來自 Wikipedia、Reddit、新聞媒體。目前 Jacob Mei 的專業形象幾乎只存在於 LinkedIn，而這個平台對 AI 模型的訓練貢獻有限。

---

### Content E-E-A-T：65/100

**Experience（體驗）：** 强（20+ 年電商/金融實戰經歷，文章充滿第一人稱實踐經驗）
**Expertise（專業）：** 强（JKOPay 董事長、Next Bank 副總、Sinopac EVP，深厚領域知識）
**Authoritativeness（權威）：** 弱（無外部媒體引用，無 Wikipedia 條目）
**Trustworthiness（可信度）：** 中（CC 授權、聯絡資訊、個人真實身份，但無 HTTPS badge 顯示、無 About 頁面明確列出現職驗證連結）

---

### Technical GEO：72/100

| 項目 | 狀態 |
|------|------|
| 靜態網站（Astro 5） | ✅ AI 爬蟲友好 |
| HTTPS | ✅ |
| Sitemap | ✅ 存在，結構正確 |
| robots.txt | ✅ 允許所有爬蟲，有 llms.txt 宣告 |
| llms.txt | ⚠️ 宣告存在但抓取異常 |
| content-index.json | ⚠️ 宣告存在，未驗證內容 |
| Twitter Card | ❌ 未偵測到 |
| Sitemap lastmod | ❌ 未提供 |
| AI 爬蟲明確許可規則 | ⚠️ 無針對 GPTBot/ClaudeBot 的明確規則 |

---

### Schema & Structured Data：58/100

**已實作：**
- `Organization` ✅
- `Person`（作者）✅
- `Article` ✅（每篇文章）
- `BreadcrumbList` ✅
- `FAQPage` ✅（首頁 + 部分文章）
- `WebSite` ✅

**缺少：**
- `HowTo` ❌（技術教學文章）
- `BlogPosting` type ❌（目前統一用 `Article`，建議區分）
- `SpeakableSpecification` ❌
- `SiteLinksSearchBox` ❌

---

### Platform Optimization：25/100

jacobmei.com 的內容幾乎只在自身域名上存在，缺乏在 AI 模型高度依賴的平台上的第三方存在。

**AI 模型的引用來源排名（重要性高→低）：**
1. Wikipedia → ❌ 無
2. Reddit 討論 → ❌ 無
3. YouTube 說明影片 → ❌ 無
4. 新聞媒體 → ❌ 無
5. LinkedIn → ✅ 有
6. GitHub → ✅ 有

---

## Quick Wins（本週可執行）

1. **加入 Twitter Card meta tags**（1 小時）— 修改 BaseHead 元件，補全 `twitter:card`、`twitter:title`、`twitter:description`、`twitter:image`，立即提升社群分享與 AI metadata 解析
2. **確認 llms.txt 路由正常**（30 分鐘）— 檢查 `src/pages/llms.txt.ts` 輸出，確保 Content-Type 為 `text/plain`
3. **Sitemap 加入 lastmod**（30 分鐘）— 在 `astro.config.ts` sitemap 設定加入 lastmod，讓 AI 爬蟲知道內容新鮮度
4. **技術文章加 HowTo Schema**（2 小時）— 至少為 gmail-statement-fetcher 和 IssueOps 兩篇文章補上 HowTo JSON-LD
5. **每篇技術文章加入 100–150 字「一段話摘要」**（持續執行）— 放在文章最開頭，自成一體，讓 AI 有高品質引用候選

---

## 30 天行動計畫

### 第 1 週：技術修繕
- [ ] 修復 llms.txt 路由，驗證輸出格式正確
- [ ] 補全全站 Twitter Card meta tags
- [ ] Sitemap 加入 lastmod 日期
- [ ] 為 2 篇技術教學文章加入 HowTo Schema

### 第 2 週：內容優化
- [ ] 為最近 5 篇文章補寫「一段話摘要」（100–150 字，自成一體）
- [ ] 為 PAIOP、gmail-statement-fetcher、IssueOps 文章加入 2–3 個外部來源引用
- [ ] 建立英文版 About 頁面摘要（300 字），提升英語 AI 系統的實體識別

### 第 3 週：品牌錨點建立（優先）
- [ ] 在 LinkedIn 發布一篇以 jacobmei.com 文章為基礎的長文，附原文連結
- [ ] 在 Reddit r/fintech 或 r/Taiwan 發一篇相關主題討論，不做廣告
- [ ] 聯絡 1–2 個台灣科技媒體（數位時代、科技報橘）投稿或接受採訪

### 第 4 週：長期能見度
- [ ] 評估建立 YouTube 頻道：將最有深度的文章錄製 5–10 分鐘說明影片
- [ ] 建立 Wikipedia 條目（個人頁或 JKOPay 公司頁），需有可查證的第三方來源
- [ ] 設定 Google Alerts 監控 "Jacob Mei" 和 "JKOPay" 的外部提及

---

## 附錄：分析頁面清單

| URL | 標題 | 字數 | 主要問題 |
|-----|------|------|---------|
| / | 小梅子 / Jacob Mei Labs | — | 無 Twitter Card |
| /about/ | 梅驊 Jacob Mei | ~550 | 缺英文版摘要 |
| /contact/ | 聯絡 | ~1,200 | 無 |
| /blog/2026/0308-1w7eml/ | 懶人理財自動化 | 2,829 | 缺 HowTo Schema |
| /blog/2026/0304-ad1m1y/ | PAIOP 零信任治理 | 3,337 | 缺外部引用 |
| /blog/2026/0303-1xeq05/ | 從 ChatGPT 到 ChatGOD | 882 | 短，缺 FAQ schema |
| /blog/2026/0226-obfaa5/ | 編年式讀經靈修計畫 | 3,341 | 缺外部引用 |
| /blog/2025/0809-1r73qt/ | 女兒的第一支舞 | 77 | 過短，無引用價值 |
