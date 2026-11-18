---
title: Notoriouslab Github 開源專案總覽
description: notoriouslab 旗下 12 個開源專案的一頁總覽：家庭健康紀錄、生態地圖、中文文本處理與搜尋、AI 協作與影片製作工具、個人財務自動化。每個專案解決什麼問題、適合誰用，這篇會隨改版持續更新。
pubDate: 2026-07-26 19:40+08:00
updatedDate: 2026-11-18 23:30+08:00
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
  - script2film
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
cover: ./assets/2026-11-19-notoriouslab-oss-cover.jpg
coverAlt: notoriouslab 開源專案總覽：十二個專案名稱與一句話用途，中文優先、本地優先、隱私優先
---

我的開源專案都放在 [github.com/notoriouslab](https://github.com/notoriouslab)。專案多了之後，發現別人（跟未來的自己）很難一眼看出哪個做什麼，所以寫這篇當總目錄：每個專案一段話講清楚它解決什麼問題、適合誰用，再加一句最新版本的重點。排序大致依 Star 數與下載數，比較多人用的放前面（trailpaint 與 Script2Film 私心往前排）。以後有新專案或大改版，就直接更新這篇。

這些專案有共同的底色：**中文優先、本地優先、隱私優先**。很多好工具對繁體中文支援很差，很多好服務要你把資料交出去，這兩件事我都不想妥協，所以自己動手。

## [doc-cleaner](https://github.com/notoriouslab/doc-cleaner)

文件轉換｜目前版本：v1.7.1｜GitHub ★ 311｜安裝檔下載 1,700+｜[官方網站](https://notoriouslab.github.io/doc-cleaner/)

日常文件轉 Markdown 的瑞士刀，涵蓋 PDF、Office、Apple Keynote／Numbers、EPUB 電子書等 16 種格式。中文友好、表格保留、全程本地執行不外傳。適合要把各種格式文件餵給 AI 或知識庫的人。

**最新版本**：macOS 版改用 Developer ID 簽章並通過 Apple 公證，[DMG](https://github.com/notoriouslab/doc-cleaner/releases/latest) 下載後雙擊就開；Windows 拖放匯入也修好了。

## [vault-curate](https://github.com/notoriouslab/vault-curate)

Obsidian 插件｜目前版本：v1.15.2｜GitHub ★ 163｜Obsidian 官方市集下載 8,200+｜[官方網站](https://notoriouslab.github.io/vault-curate/index.zh-TW.html)

Obsidian 的混合語意搜尋與 AI 策展插件：BM25 關鍵字、裝置端 WebGPU embedding、模糊標題比對三路混合，中文／CJK 表現特別好。異體字自動折疊（臺北／台北、計劃／計畫都找得到）、兩個字的短查詢也能命中長詞，結果直接顯示命中的那一段並可匯出成 Canvas。可選的 AI 功能會自動生成筆記描述與主題式 MOC。手機與平板可以唯讀共用桌機建好的索引。本地優先，不需要 API key，已上架 [Obsidian 社群插件](https://community.obsidian.md/plugins/vault-curate)。

**最新版本**：AI 策展寫描述時改成從頭到尾讀整篇筆記，長筆記的重點涵蓋多了約三成；embedding 與 AI 策展可以各用自己的伺服器與 API key（例如 AI 策展接 OpenRouter）；失敗時通知會直接說出原因。

![vault-curate 搜尋介面](https://raw.githubusercontent.com/notoriouslab/vault-curate/main/docs/vault-curate.png)

## [health-workbench](https://github.com/notoriouslab/health-workbench)

家庭健康紀錄｜目前版本：v0.9.2｜GitHub ★ 100｜安裝檔下載 300+｜[官方網站](https://notoriouslab.github.io/health-workbench/)

把健保「健康存摺」、Apple 健康與 CPAP 呼吸器的下載檔，整理成一份越養越深的本機家庭健康紀錄。健康存摺只查得到最近三年，逐次把新檔案拖進來就能無限期累積，重複的部分自動跳過。App 裡有總覽、就醫時間軸、用藥清單（附成分、適應症與官方仿單連結）、檢驗趨勢、睡眠呼吸與全文搜尋，還能印一頁「看診用」摘要卡帶去門診；要給家人看，可匯出成單一 HTML 或 EPUB，收到的人不必安裝這個 App。macOS／Windows 桌面 App，不需帳號、不上雲，macOS 版已簽章公證可直接開啟。

**最新版本**：健康存摺的讀檔依健保署官方格式校正，住院紀錄會顯示成就醫事件，以前可能漏讀的紀錄，下次匯入新檔時會補進來。

這個工具只做個人健康資料的備份、匯整與呈現，不提供任何醫療判斷建議；畫面上數值的意義請諮詢醫事人員。

![health-workbench 總覽（示範資料）](https://raw.githubusercontent.com/notoriouslab/health-workbench/main/docs/screenshots/overview.png)

## [trailpaint（路小繪）](https://github.com/notoriouslab/trailpaint)

生態地圖｜目前版本：v1.8.4｜GitHub ★ 18｜[官方網站](https://trailpaint.org/)｜[線上直接用](https://trailpaint.org/app/)

把一般的地圖快速變成漂亮的教育性、導覽性生態地圖。適合步道解說、園區導覽、生態教育這類需要「好看又有資訊量」地圖的場景。匯入照片自動依拍攝時間排出路線，底圖有向量地圖與 OpenStreetMap 步道圖。零後端、資料留在瀏覽器、可離線用。

**最新版本**：新的「定點時間軸」故事：地圖停在同一個地點，拉時間軸看這裡不同年代的樣子，每個階段附出處、老地圖與照片，例如[大安森林公園](https://trailpaint.org/stories/taipei-daan-park/)一個街廓的百年。

![trailpaint 編輯器畫面](https://raw.githubusercontent.com/notoriouslab/trailpaint/main/examples/trailpaint-hero.jpg)

## [Script2Film](https://github.com/notoriouslab/script2film)

影片製作｜目前版本：v1.1.0｜[官方網站](https://notoriouslab.github.io/script2film/)

給 AI agent 用的影片／解說片工具組：給它一段想法或一份稿子，Claude Code 這類 agent 照文件一步步做出有旁白、字幕、圖表與主持人的成片。核心流程（本機克隆聲音、逐字對時、27 種程式畫的場景、剪接、出片檢查）都在自己的 Mac 上跑，不用帳號，也不用 API 金鑰；VideoExpress 生成鏡頭、TalkingPhotos 主持人、YouTube 上傳都是選用。原本的 Video Prompt Studio 現在是其中一個工具（[線上版](https://notoriouslab.github.io/script2film/studio.html)）。實際做法見〈[每日得力一分鐘是怎麼每天自動做出來的](/blog/2026/1112-1jv4g2/)〉。

**最新版本**：可以在自己的 Google Colab 上跑 MiniMax H3（生成鏡頭、會對嘴的主持人）與 MiniMax Music 3（歌曲或純配樂）；對話可以分給不同角色的聲音，字幕可以把關鍵字變色。

![Script2Film](https://raw.githubusercontent.com/notoriouslab/script2film/main/docs/site/og-zh.jpg)

## [bu-ketao（不客套）](https://github.com/notoriouslab/bu-ketao)

AI 協作｜GitHub ★ 57

繁體中文 LLM 輸出壓縮規則集，砍掉 AI 回應裡的客套與冗詞，約 72% token 壓縮、語意零損失。適合每天跟 AI 大量對話、受夠廢話的人。

## [browser-mcp-lite](https://github.com/notoriouslab/browser-mcp-lite)

AI 協作｜目前版本：v1.0.3｜GitHub ★ 42

極簡且有身分驗證的 MCP server，讓 AI 直接操作你真正的瀏覽器：約 500 行程式碼、token 驗證、Chrome Extension MV3、走 accessibility tree。適合想讓 Claude 等 AI 讀寫登入態網頁、又不想跑肥大方案的人。

## [issueops-digest](https://github.com/notoriouslab/issueops-digest)

AI 協作｜GitHub ★ 31

把 GitHub Issue 當操作介面：填關鍵字即觸發 Actions 自動搜尋、AI 篩選並回傳摘要。免後台、fork 即用，適合懶人情報收集。

![issueops-digest 的 Telegram Bot 流程：搜尋指令、進度通知與收錄確認](https://raw.githubusercontent.com/notoriouslab/issueops-digest/main/sample/2026-03-06-02.png)

## [trad-zh-search](https://github.com/notoriouslab/trad-zh-search)

中文搜尋｜目前版本：v0.2.0｜GitHub ★ 23｜[PyPI](https://pypi.org/project/trad-zh-search/)

專為繁體中文設計的文本預處理工具：CKIP 分詞加 bigram 索引生成，附可擴充的領域字典系統。它不是搜尋引擎，而是讓你手上的主流搜尋引擎（MiniSearch、Elasticsearch 等）真正看得懂繁體中文的那一層。

## [gmail-statement-fetcher](https://github.com/notoriouslab/gmail-statement-fetcher)

個人財務｜目前版本：v1.0.3｜GitHub ★ 19

自動從 Gmail 下載銀行對帳單 PDF。規則由 JSON 設定檔驅動，新增銀行不需改程式碼，支援 IMAP 與 OAuth 2.0，內建去重。跟 personal-cfo 是上下游關係：這個負責進料，那個負責分析。

## [personal-cfo](https://github.com/notoriouslab/personal-cfo)

個人財務｜GitHub ★ 15

展示非專業投資人如何用確定性運算做退休軌道監控的參考實作：銀行帳單進，財務報表出，資料全部留在本地。Fork 後改 `config.yaml` 就能依自己的情況使用。

![personal-cfo 退休投影報表](https://raw.githubusercontent.com/notoriouslab/personal-cfo/main/examples/sample_output/2026-03-16-04.png)

## [wenji（文集）](https://github.com/notoriouslab/wenji)

中文搜尋｜目前版本：v0.6.2｜[PyPI](https://pypi.org/project/wenji/)

中文優先的 Markdown RAG 引擎：混合 BM25、向量檢索與 rerank，多軸分類，內建評測意識。丟 `.md` 進去，就能搜。適合想給自己的筆記或文件庫接上檢索能力的人。

**最新版本**：從「搜」推進到「問」：獨立的問答頁串流回答、可以追問，引用能展開到命中的原文段落；另外補了一輪安全加固。

## 更新紀錄

- 2026-11-18：改成依受歡迎程度排序，每個專案改為「專案說明＋最新版本重點」；prompt-studio 改名擴充為 Script2Film；版號、Star 數與下載數重新對過。
- 2026-10-08：vault-curate v1.13.0（命中段落預覽、標題精確置頂、整篇讀入內建模型、Canvas 標籤框）、health-workbench v0.9.1（檢驗名稱對照修正）、prompt-studio v0.9.0（VideoExpress v3.5 語法、Tone 軸）；Star 數與下載數重新對過。
- 2026-09-17：章節順序調整，健康與地圖兩節移到最前面；各專案補上官方網站、PyPI 連結與安裝檔下載數。vault-curate v1.8.0（異體字折疊、二字短查詢、同義詞、Canvas 匯出）、wenji v0.6.2（/ask 問答頁與安全加固）、prompt-studio v0.8.0（改名 Video Prompt Studio、三層 AI Expand，並修正失效的截圖連結）、health-workbench v0.9.0（六分頁、藥品適應症、看診摘要卡）、trailpaint v1.6.5（Protomaps／OSM 底圖、路線隱藏）；版號、Star 數與 Obsidian 下載數重新對過。
- 2026-08-18：新增 health-workbench（第 12 個專案）。doc-cleaner v1.7.1（macOS 簽章公證，DMG 雙擊即開）、vault-curate v1.5.0（手機版）、trailpaint v1.5.0（Editor 介面改版）；版號與 Star 數全部重新對過。
- 2026-07-26：首發，收錄 11 個專案，附版號、Star 數與截圖。
