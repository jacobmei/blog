---
title: Notoriouslab Github 開源專案總覽
description: notoriouslab 旗下 12 個開源專案的一頁總覽：中文文本處理與搜尋、AI 協作工具、個人財務自動化、家庭健康紀錄、生態地圖。每個專案解決什麼問題、適合誰用，這篇會隨改版持續更新。
pubDate: 2026-07-26 19:40+08:00
updatedDate: 2026-08-18 17:33+08:00
tags:
  - 開源
  - side-project
  - doc-cleaner
  - vault-curate
  - trad-zh-search
  - wenji
  - bu-ketao
  - browser-mcp-lite
  - issueops-digest
  - prompt-studio
  - personal-cfo
  - gmail-statement-fetcher
  - trailpaint
  - health-workbench
  - Github
  - obsidian
author: jacobmei
category: AI與科技
draft: false
featured: true
shortCode: osslab
cover: ./assets/notoriouslab.png
---

我的開源專案都放在 [github.com/notoriouslab](https://github.com/notoriouslab)。專案多了之後，發現別人（跟未來的自己）很難一眼看出哪個做什麼，所以寫這篇當總目錄：每個專案一段話講清楚它解決什麼問題、適合誰用。以後有新專案或大改版，就直接更新這篇。

這些專案有共同的底色：**中文優先、本地優先、隱私優先**。很多好工具對繁體中文支援很差，很多好服務要你把資料交出去，這兩件事我都不想妥協，所以自己動手。

## 中文文本處理與搜尋

### [doc-cleaner](https://github.com/notoriouslab/doc-cleaner)

目前版本：v1.7.1｜GitHub ★ 307

日常文件轉 Markdown 的瑞士刀，涵蓋 PDF、Office、Apple Keynote／Numbers、EPUB 電子書等 16 種格式。中文友好、表格保留、全程本地執行不外傳。適合要把各種格式文件餵給 AI 或知識庫的人。

v1.7.1 起 macOS 版改用 Developer ID 簽章並通過 Apple 公證，[DMG](https://github.com/notoriouslab/doc-cleaner/releases/latest) 下載後雙擊就開，不必再右鍵開啟或到系統設定放行；同一版也修掉 Windows 拖放匯入失效的老問題。

### [vault-curate](https://github.com/notoriouslab/vault-curate)

目前版本：v1.5.0｜GitHub ★ 130｜Obsidian 官方市集下載 3,600+

Obsidian 的混合語意搜尋與 AI 策展插件：BM25 關鍵字、裝置端 WebGPU embedding、模糊標題比對三路混合，中文／CJK 表現特別好。可選的 AI 功能會自動生成筆記描述與主題式 MOC。本地優先，不需要 API key。已上架 [Obsidian 社群插件](https://community.obsidian.md/plugins/vault-curate)。

v1.5.0 是手機版：桌機負責建索引，索引跟著 vault 一起同步（iCloud、Obsidian Sync、Syncthing 都行，不用額外設定），手機與平板以唯讀方式讀同一份索引，全程只有一個寫入者，所以不會有同步衝突。手機上能用的有搜尋、找相似、兩種 Discover 模式與關聯圖／語意路徑；建索引、AI 策展與 MOC 生成仍留在桌機。

![vault-curate 搜尋介面](https://raw.githubusercontent.com/notoriouslab/vault-curate/main/docs/vault-curate.png)

### [trad-zh-search](https://github.com/notoriouslab/trad-zh-search)

目前版本：v0.2.0｜GitHub ★ 21

專為繁體中文設計的文本預處理工具：CKIP 分詞加 bigram 索引生成，附可擴充的領域字典系統。它不是搜尋引擎，而是讓你手上的主流搜尋引擎（MiniSearch、Elasticsearch 等）真正看得懂繁體中文的那一層。

### [wenji（文集）](https://github.com/notoriouslab/wenji)

目前版本：v0.5.2

中文優先的 Markdown RAG 引擎：混合 BM25、向量檢索與 rerank，多軸分類，內建評測意識。丟 `.md` 進去，就能搜。適合想給自己的筆記或文件庫接上檢索能力的人。

## AI 協作與 token 效率

### [bu-ketao（不客套）](https://github.com/notoriouslab/bu-ketao)

GitHub ★ 56

繁體中文 LLM 輸出壓縮規則集，砍掉 AI 回應裡的客套與冗詞，約 72% token 壓縮、語意零損失。適合每天跟 AI 大量對話、受夠廢話的人。

### [browser-mcp-lite](https://github.com/notoriouslab/browser-mcp-lite)

目前版本：v1.0.3｜GitHub ★ 42

極簡且有身分驗證的 MCP server，讓 AI 直接操作你真正的瀏覽器：約 500 行程式碼、token 驗證、Chrome Extension MV3、走 accessibility tree。適合想讓 Claude 等 AI 讀寫登入態網頁、又不想跑肥大方案的人。

### [issueops-digest](https://github.com/notoriouslab/issueops-digest)

GitHub ★ 31

把 GitHub Issue 當操作介面：填關鍵字即觸發 Actions 自動搜尋、AI 篩選並回傳摘要。免後台、fork 即用，適合懶人情報收集。

![issueops-digest 的 Telegram Bot 流程：搜尋指令、進度通知與收錄確認](https://raw.githubusercontent.com/notoriouslab/issueops-digest/main/sample/2026-03-06-02.png)

### [prompt-studio](https://github.com/notoriouslab/prompt-studio)

目前版本：v0.6.0

給 AI 影片生成工具（Sora 2、Veo 3.1、Runway、Kling、Seedance 等）的本地 prompt 註冊表與生成器。單一 HTML 檔案，不用 build、不用 server，打開就能用。

![prompt-studio 介面](https://raw.githubusercontent.com/notoriouslab/prompt-studio/main/docs/intro.jpg)

## 個人財務自動化

### [personal-cfo](https://github.com/notoriouslab/personal-cfo)

GitHub ★ 15

展示非專業投資人如何用確定性運算做退休軌道監控的參考實作：銀行帳單進，財務報表出，資料全部留在本地。Fork 後改 `config.yaml` 就能依自己的情況使用。

![personal-cfo 退休投影報表](https://raw.githubusercontent.com/notoriouslab/personal-cfo/main/examples/sample_output/2026-03-16-04.png)

### [gmail-statement-fetcher](https://github.com/notoriouslab/gmail-statement-fetcher)

目前版本：v1.0.3｜GitHub ★ 19

自動從 Gmail 下載銀行對帳單 PDF。規則由 JSON 設定檔驅動，新增銀行不需改程式碼，支援 IMAP 與 OAuth 2.0，內建去重。跟 personal-cfo 是上下游關係：這個負責進料，那個負責分析。

## 健康與生活

### [health-workbench](https://github.com/notoriouslab/health-workbench)

目前版本：v0.7.6｜GitHub ★ 42

把健保「健康存摺」、Apple 健康與 CPAP 呼吸器的下載檔，整理成一份越養越深的本機家庭健康紀錄。健康存摺只查得到最近三年，逐次把新檔案拖進來就能無限期累積，重複的部分自動跳過。App 裡有總覽、就醫時間軸、以藥品為核心的用藥清單（附成分與官方仿單連結）、檢驗趨勢、睡眠呼吸與全文搜尋；要給家人看或帶去回診，可匯出成單一 HTML 或 EPUB，收到的人不必安裝這個 App，摺疊、搜尋與趨勢圖照樣能互動。macOS／Windows 桌面 App，不需帳號、不上雲，macOS 版已簽章公證可直接開啟。

這個工具只做個人健康資料的備份、匯整與呈現，不提供任何醫療判斷建議；畫面上數值的意義請諮詢醫事人員。

![health-workbench 總覽（示範資料）](https://raw.githubusercontent.com/notoriouslab/health-workbench/main/docs/screenshots/overview.png)

## 地圖與教育

### [trailpaint（路小繪）](https://github.com/notoriouslab/trailpaint)

目前版本：v1.5.0｜GitHub ★ 15｜[線上直接用](https://trailpaint.org/app/)

把一般的地圖快速變成漂亮的教育性、導覽性生態地圖。適合步道解說、園區導覽、生態教育這類需要「好看又有資訊量」地圖的場景。零後端、資料留在瀏覽器、可離線用。

v1.5.0 是 Editor 介面改版：空專案先給三張行動卡（匯入照片、貼上 AI JSON、從地圖開始），高頻動作一步到位；桌機換成頂部動作列加左側工具欄、可收合清單欄與右側屬性面板；手機則去模式化，點地圖就能加景點。匯入照片會按拍攝時間自動排序，多日行程按「連結景點」會自動每天生成一條路線。

![trailpaint 編輯器畫面](https://raw.githubusercontent.com/notoriouslab/trailpaint/main/examples/trailpaint-hero.jpg)

## 更新紀錄

- 2026-08-18：新增 health-workbench（第 12 個專案）。doc-cleaner v1.7.1（macOS 簽章公證，DMG 雙擊即開）、vault-curate v1.5.0（手機版）、trailpaint v1.5.0（Editor 介面改版）；版號與 Star 數全部重新對過。
- 2026-07-26：首發，收錄 11 個專案，附版號、Star 數與截圖。
