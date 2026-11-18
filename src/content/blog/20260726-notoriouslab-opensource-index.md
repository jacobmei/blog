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
cover: ./assets/notoriouslab.png
---

我的開源專案都放在 [github.com/notoriouslab](https://github.com/notoriouslab)。專案多了之後，發現別人（跟未來的自己）很難一眼看出哪個做什麼，所以寫這篇當總目錄：每個專案一段話講清楚它解決什麼問題、適合誰用。以後有新專案或大改版，就直接更新這篇。

這些專案有共同的底色：**中文優先、本地優先、隱私優先**。很多好工具對繁體中文支援很差，很多好服務要你把資料交出去，這兩件事我都不想妥協，所以自己動手。

## 健康與生活

### [health-workbench](https://github.com/notoriouslab/health-workbench)

目前版本：v0.9.2｜GitHub ★ 100｜安裝檔下載 300+｜[官方網站](https://notoriouslab.github.io/health-workbench/)

把健保「健康存摺」、Apple 健康與 CPAP 呼吸器的下載檔，整理成一份越養越深的本機家庭健康紀錄。健康存摺只查得到最近三年，逐次把新檔案拖進來就能無限期累積，重複的部分自動跳過。App 裡有總覽、就醫時間軸、以藥品為核心的用藥清單（附成分與官方仿單連結）、檢驗趨勢、睡眠呼吸與全文搜尋；要給家人看或帶去回診，可匯出成單一 HTML 或 EPUB，收到的人不必安裝這個 App，摺疊、搜尋與趨勢圖照樣能互動。macOS／Windows 桌面 App，不需帳號、不上雲，macOS 版已簽章公證可直接開啟。

v0.8 把畫面改成總覽／就醫／用藥／檢驗／測量／睡眠呼吸六個分頁，用藥卡展開可看食藥署許可證登記的適應症原文（離線可看、只引述不解讀），檢驗趨勢的參考值灰帶把健保常見的「[低][高]」與「<150」格式都畫對了，Apple 資料改讀每日彙總表，載入時間砍半，還能一鍵釋放空間。v0.9 加了「看診用」區塊：近日用藥還剩幾天、近 7／30 天居家量測、最近一次抽血、值得一提的變化，可以印成一頁摘要卡帶去門診；用藥清單也分成「目前在吃」與「過往」兩區列印。v0.9.1 修正檢驗名稱對照：不同院所把同一項寫成 LDL-Cholesterol 或 LDL-C 不再被當成兩項，既有資料升版後自動重新對照，不必重新匯入；知識庫並補上血脂與代謝共 49 條。v0.9.2 依健保署官方格式校正健康存摺的讀檔：住院紀錄顯示為就醫事件、XML 格式可讀全部 14 類資料，大小寫不一或只有一筆的欄位也不再漏讀；之後匯入新下載的檔案時，舊版漏掉的整筆紀錄會補進來。

這個工具只做個人健康資料的備份、匯整與呈現，不提供任何醫療判斷建議；畫面上數值的意義請諮詢醫事人員。

![health-workbench 總覽（示範資料）](https://raw.githubusercontent.com/notoriouslab/health-workbench/main/docs/screenshots/overview.png)

## 地圖與教育

### [trailpaint（路小繪）](https://github.com/notoriouslab/trailpaint)

目前版本：v1.8.4｜GitHub ★ 18｜[官方網站](https://trailpaint.org/)｜[線上直接用](https://trailpaint.org/app/)

把一般的地圖快速變成漂亮的教育性、導覽性生態地圖。適合步道解說、園區導覽、生態教育這類需要「好看又有資訊量」地圖的場景。零後端、資料留在瀏覽器、可離線用。

v1.5 是 Editor 介面改版：空專案先給三張行動卡（匯入照片、貼上 AI JSON、從地圖開始），桌機換成頂部動作列加左右側面板，手機點地圖就能加景點；匯入照片按拍攝時間排序，多日行程自動每天一條路線。v1.6 底圖全面換新：預設改 Protomaps 向量地圖，地名標籤跟著介面語言切中／英／日，Retina 更銳利；新增 OpenStreetMap 步道底圖，山徑與林道細節最完整，登山路線首選。v1.6.5 可個別隱藏多天路線，隱藏狀態貫徹到分享連結、圖片與 GeoJSON 匯出，這版全部功能由社群貢獻者 @jswei014 完成。v1.8 新增「定點時間軸」播放：地圖停在同一個地點，拉時間軸看這裡不同年代的樣子，側欄列出那一年存在的階段、出處、老地圖與照片；新故事有[大安森林公園](https://trailpaint.org/stories/taipei-daan-park/)、大安區百年與「公館到景美：水圳兩百年」。v1.8.3 起故事照片拆成獨立檔案（故事檔從 78MB 降到約 0.6MB），可以分享某個景點在某一年的連結；v1.8.4 每個故事頁在地圖下方列出全部景點與出處。

![trailpaint 編輯器畫面](https://raw.githubusercontent.com/notoriouslab/trailpaint/main/examples/trailpaint-hero.jpg)

## 中文文本處理與搜尋

### [doc-cleaner](https://github.com/notoriouslab/doc-cleaner)

目前版本：v1.7.1｜GitHub ★ 311｜安裝檔下載 1,700+｜[官方網站](https://notoriouslab.github.io/doc-cleaner/)

日常文件轉 Markdown 的瑞士刀，涵蓋 PDF、Office、Apple Keynote／Numbers、EPUB 電子書等 16 種格式。中文友好、表格保留、全程本地執行不外傳。適合要把各種格式文件餵給 AI 或知識庫的人。

v1.7.1 起 macOS 版改用 Developer ID 簽章並通過 Apple 公證，[DMG](https://github.com/notoriouslab/doc-cleaner/releases/latest) 下載後雙擊就開，不必再右鍵開啟或到系統設定放行；同一版也修掉 Windows 拖放匯入失效的老問題。

### [vault-curate](https://github.com/notoriouslab/vault-curate)

目前版本：v1.15.2｜GitHub ★ 163｜Obsidian 官方市集下載 8,200+｜[官方網站](https://notoriouslab.github.io/vault-curate/index.zh-TW.html)

Obsidian 的混合語意搜尋與 AI 策展插件：BM25 關鍵字、裝置端 WebGPU embedding、模糊標題比對三路混合，中文／CJK 表現特別好。可選的 AI 功能會自動生成筆記描述與主題式 MOC。本地優先，不需要 API key。已上架 [Obsidian 社群插件](https://community.obsidian.md/plugins/vault-curate)。

v1.5 起支援手機版：桌機負責建索引，索引跟著 vault 一起同步（iCloud、Obsidian Sync、Syncthing 都行），手機與平板唯讀共用同一份，全程單一寫入者，不會有同步衝突。

v1.6 到 v1.8 把中文關鍵字搜尋補到位：異體字自動折疊（規劃／規畫、臺北／台北、計劃／計畫，輸入哪種都找得到）；兩個字的短查詢也能命中長詞（搜「台北」找得到只寫「台北車站」的筆記，實測從 81 篇只找到 24 篇變成全數命中）；藏了很久沒生效的同義詞清單修回來了，暱稱與組織簡稱可以自己教。另外新增搜尋結果一鍵匯出成 Obsidian Canvas，索引會在啟動時自我修復（外部刪掉的筆記不再殘留），AI 策展可以指定另一台 LLM server，跑 mlx_lm.server 上的 gpt-oss 比 Ollama 快約 7 倍。

v1.9 到 v1.13 把搜尋做得更貼近「找得到、點得到」：結果改顯示命中的那一段原文並高亮，點開直接捲到該段；整串輸入筆記標題或用雙引號包住的句子，會直接排到第一名；內建模型原本每篇筆記只讀到一小部分（實測一個 vault 有 56% 的文字沒進模型），現在整篇讀完，深藏在長文裡的段落也能用語意找到（58 個測試查詢，第一名命中從 43 提升到 54）。搜尋預設改為涵蓋所有筆記，不再漏掉被遺忘的舊筆記；AI 策展可指定輸出語言，中文描述不再一開頭就是「本文探討」；Canvas 卡片縮小時會顯示最具辨識度的標籤，模型下載來源可換成鏡像站。

v1.14 到 v1.15 改進 AI 策展：描述改成從頭到尾平均讀六段，不再只看開頭與結尾（盲測長筆記的重點涵蓋多約 30%），並在完整句子處收尾；embedding 與 AI 策展的伺服器各有自己的 API key，結尾帶 `/v1` 的 OpenAI 相容網址（例如 OpenRouter）也能用；AI 策展失敗時，通知會直接說出伺服器給的原因（key 錯、額度用完、模型下架等）。

![vault-curate 搜尋介面](https://raw.githubusercontent.com/notoriouslab/vault-curate/main/docs/vault-curate.png)

### [trad-zh-search](https://github.com/notoriouslab/trad-zh-search)

目前版本：v0.2.0｜GitHub ★ 23｜[PyPI](https://pypi.org/project/trad-zh-search/)

專為繁體中文設計的文本預處理工具：CKIP 分詞加 bigram 索引生成，附可擴充的領域字典系統。它不是搜尋引擎，而是讓你手上的主流搜尋引擎（MiniSearch、Elasticsearch 等）真正看得懂繁體中文的那一層。

### [wenji（文集）](https://github.com/notoriouslab/wenji)

目前版本：v0.6.2｜[PyPI](https://pypi.org/project/wenji/)

中文優先的 Markdown RAG 引擎：混合 BM25、向量檢索與 rerank，多軸分類，內建評測意識。丟 `.md` 進去，就能搜。適合想給自己的筆記或文件庫接上檢索能力的人。

v0.6 系列把「搜」推進到「問」：獨立的 `/ask` 頁面串流回答、支援追問、引用可展開到命中的原文段落，答案改以段落文字而非整篇摘要為依據，問「某份長文件裡的某個數字」準很多；主題摘要與概念比較搬到獨立的 `/aggregate` 頁。同時補了一輪安全加固（模型輸出與語料的 HTML 一律跳脫，堵掉間接 prompt injection 帶出的 XSS），並新增可選的 OpenCC s2twp 輸出轉換，模型偶爾冒出簡體也會被轉回繁體。

## AI 協作與 token 效率

### [bu-ketao（不客套）](https://github.com/notoriouslab/bu-ketao)

GitHub ★ 57

繁體中文 LLM 輸出壓縮規則集，砍掉 AI 回應裡的客套與冗詞，約 72% token 壓縮、語意零損失。適合每天跟 AI 大量對話、受夠廢話的人。

### [browser-mcp-lite](https://github.com/notoriouslab/browser-mcp-lite)

目前版本：v1.0.3｜GitHub ★ 42

極簡且有身分驗證的 MCP server，讓 AI 直接操作你真正的瀏覽器：約 500 行程式碼、token 驗證、Chrome Extension MV3、走 accessibility tree。適合想讓 Claude 等 AI 讀寫登入態網頁、又不想跑肥大方案的人。

### [issueops-digest](https://github.com/notoriouslab/issueops-digest)

GitHub ★ 31

把 GitHub Issue 當操作介面：填關鍵字即觸發 Actions 自動搜尋、AI 篩選並回傳摘要。免後台、fork 即用，適合懶人情報收集。

![issueops-digest 的 Telegram Bot 流程：搜尋指令、進度通知與收錄確認](https://raw.githubusercontent.com/notoriouslab/issueops-digest/main/sample/2026-03-06-02.png)

## 影片製作

### [Script2Film](https://github.com/notoriouslab/script2film)

目前版本：v1.1.0｜[官方網站](https://notoriouslab.github.io/script2film/)

給 AI agent 用的影片／解說片工具組：給它一段想法或一份稿子，Claude Code 這類 agent 照文件一步步做出有旁白、字幕、圖表與主持人的成片。核心流程（本機克隆聲音、逐字對時、27 種程式畫的場景、剪接、出片檢查）都在自己的 Mac 上跑，不用帳號，也不用 API 金鑰；VideoExpress 生成鏡頭、TalkingPhotos 主持人、Concat 組裝、YouTube 上傳都是選用。Claude Code、Google Antigravity，以及 opencode 搭本機 Qwen 或 DeepSeek，都只讀文件就做出過通過檢查的片。

1.0.0（2026-11-17）由原本的 Video Prompt Studio 擴充改名而來，Prompt Studio 現在是其中的一個工具（`tools/prompt-studio/`，[線上版](https://notoriouslab.github.io/script2film/studio.html)）。v1.1.0 加入在自己的 Google Colab 上跑 MiniMax H3（生成鏡頭、會對嘴的主持人；授權不涵蓋美國、歐盟、英國、南韓）與 MiniMax Music 3（歌曲或純配樂），對話可以分給不同角色的聲音，燒進畫面的字幕可以把關鍵字變色、中文旁白也能只上英文字幕，最後一句講完畫面會多留一秒讓表情收尾。做法的實例見〈[每日得力一分鐘是怎麼每天自動做出來的](/blog/2026/1112-1jv4g2/)〉。

![Script2Film](https://raw.githubusercontent.com/notoriouslab/script2film/main/docs/site/og-zh.jpg)

## 個人財務自動化

### [personal-cfo](https://github.com/notoriouslab/personal-cfo)

GitHub ★ 15

展示非專業投資人如何用確定性運算做退休軌道監控的參考實作：銀行帳單進，財務報表出，資料全部留在本地。Fork 後改 `config.yaml` 就能依自己的情況使用。

![personal-cfo 退休投影報表](https://raw.githubusercontent.com/notoriouslab/personal-cfo/main/examples/sample_output/2026-03-16-04.png)

### [gmail-statement-fetcher](https://github.com/notoriouslab/gmail-statement-fetcher)

目前版本：v1.0.3｜GitHub ★ 19

自動從 Gmail 下載銀行對帳單 PDF。規則由 JSON 設定檔驅動，新增銀行不需改程式碼，支援 IMAP 與 OAuth 2.0，內建去重。跟 personal-cfo 是上下游關係：這個負責進料，那個負責分析。

## 更新紀錄

- 2026-11-18：prompt-studio 擴充改名為 Script2Film（v1.1.0），獨立成「影片製作」一節；health-workbench v0.9.2（健康存摺格式對齊官方規格、住院紀錄）、trailpaint v1.8.4（定點時間軸與三個新故事）、vault-curate v1.15.2（AI 策展讀整篇、各自的 API key、失敗原因）；Star 數與下載數重新對過。
- 2026-10-08：vault-curate v1.13.0（命中段落預覽、標題精確置頂、整篇讀入內建模型、Canvas 標籤框）、health-workbench v0.9.1（檢驗名稱對照修正）、prompt-studio v0.9.0（VideoExpress v3.5 語法、Tone 軸）；Star 數與下載數重新對過。
- 2026-09-17：章節順序調整，健康與地圖兩節移到最前面；各專案補上官方網站、PyPI 連結與安裝檔下載數。vault-curate v1.8.0（異體字折疊、二字短查詢、同義詞、Canvas 匯出）、wenji v0.6.2（/ask 問答頁與安全加固）、prompt-studio v0.8.0（改名 Video Prompt Studio、三層 AI Expand，並修正失效的截圖連結）、health-workbench v0.9.0（六分頁、藥品適應症、看診摘要卡）、trailpaint v1.6.5（Protomaps／OSM 底圖、路線隱藏）；版號、Star 數與 Obsidian 下載數重新對過。
- 2026-08-18：新增 health-workbench（第 12 個專案）。doc-cleaner v1.7.1（macOS 簽章公證，DMG 雙擊即開）、vault-curate v1.5.0（手機版）、trailpaint v1.5.0（Editor 介面改版）；版號與 Star 數全部重新對過。
- 2026-07-26：首發，收錄 11 個專案，附版號、Star 數與截圖。
