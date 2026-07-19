---
title: 懶人理財自動化第一步：用 gmail-statement-fetcher 自動下載所有對帳單
description: 「懶人理財自動化工具組合拳」 的第一環， gmail-statement-fetcher。這工具：每天自動檢查 Gmail 有沒有銀行、信用卡、證券寄來的對帳單，解密下載 + 檔名幫你整理好
pubDate: 2026-03-08 18:11+08:00
author: jacobmei
category: AI與科技
tags:
  - AI
  - 開發
  - 科技
  - 對帳單
draft: false
featured: false
cover: ./assets/2026-03-08.jpg
howto:
  name: 用 gmail-statement-fetcher 自動下載 Gmail 銀行對帳單
  description: 設定 Python 工具定期自動從 Gmail 擷取銀行、信用卡對帳單 PDF，支援 IMAP 和 OAuth 2.0 認證，並自動整理檔名
  steps:
    - name: 下載專案
      text: 執行 git clone https://github.com/notoriouslab/gmail-statement-fetcher.git，進入專案目錄
    - name: 設定銀行規則
      text: 複製 config.example.json 為 config.json，填入各銀行寄件人 email 與主旨關鍵字
    - name: 設定 Gmail 認證
      text: 複製 .env.example 為 .env，選擇 IMAP 應用程式密碼或 OAuth 2.0 其中一種認證方式
    - name: 執行工具
      text: 執行 python3 fetcher.py，對帳單 PDF 將自動下載至 ./downloads/ 資料夾，檔名含機構名稱與年月
    - name: 設定每日自動排程
      text: 使用 crontab 加入定時排程：0 9 * * * cd /path/to/gmail-statement-fetcher && python3 fetcher.py
shortCode: "1w7eml"
---
## 我的痛點與動機

說來有點糗，我雖然在金融業工作，但自己的理財習慣很弱，過去頂多用 Excel 整理一下，最近兩年會把資料丟給 AI 模型看看，但從來沒有養成固定的節奏。結果就是 —— 我是我們家投資效率最差的人。都快要 60 了，好像真的應該認真面對這件事了 XD

所以我給自己定了一個很低的門檻：**我不需要每天進場廝殺的工具，只要每週或每月能定期看一眼自己的狀況就夠了。**

既然銀行每個月都會寄電子對帳單，那就從這裡下手——乾脆做個懶人全自動化財務檢視工具。

今天要分享的是 **「懶人理財自動化工具組合拳」** 的第一環， **gmail-statement-fetcher**。後面還有文件清理（轉成 Markdown）和分析工具，不過每個工具也都可以單獨拿去用，不一定要整套。

### 這工具做一件很簡單的事

- 每天自動檢查 Gmail 有沒有銀行、信用卡、證券寄來的對帳單
    
- 下載後自動補上金融機構名稱 + 年月的乾淨檔名
    
- 有加密壓縮檔的，順手解開
    

其實不限金融機構——只要在設定檔裡加上對應的寄件人和主旨關鍵字，Gmail 裡任何有附件的信件都能抓。就看你自己想拿來幹嘛。

### 這需求這麼成熟，為什麼還自己寫？

GitHub 上確實有一堆可以擷取 Gmail 附件的腳本，但有的功能太複雜，有的沒有解密，還是要自己補。我又很在意重複抓到同一封信，總之加加減減還是得自己補一堆，那就乾脆重寫一個——反正現在 AI Coding 很方便 XD

**gmail-statement-fetcher** 的核心設計是「設定驅動」：比對規則全部放在一個 JSON 設定檔裡，新增銀行完全不用動程式，只要補「哪個寄件人、主旨包含什麼關鍵字」就好。

我自己覺得貼心的設計啦：

- **UID 去重**：同一封郵件不會下載兩次，每天排程跑也不怕有重複檔案
    
- **IMAP 與 OAuth 2.0 都支援**：主流是跑 OAuth，但我裝在 Oracle Free Cloud 上，所以還是用 IMAP
    
- **自動從主旨抓年月**：輸出 `永豐銀行_信用卡對帳單_2026_02.pdf` 這種檔名，不用再手動改
    
- **解密 ZIP 與 PDF**：有些銀行寄加密壓縮檔，設好密碼就自動解開
    
- **基本安全沒偷懶**：token 用 0600 權限存放、ZIP 解壓上限 100MB、日誌過濾控制字元
    

## 五分鐘 ? 讓它動起來

### 下載專案

bash

`git clone https://github.com/notoriouslab/gmail-statement-fetcher.git cd gmail-statement-fetcher`

這工具很陽春，但假如你覺得有用，順手給個星星的話大感激 XD

### 設定銀行規則

bash

`cp config.example.json config.json`

設定檔裡預先放了幾個我自己用過的台灣銀行範例，包括永豐、中國信託、台新等，直接改就好。

幾個細節：

- `short_name` 會出現在檔名裡，中英文都可以
    
- `doc_type_rules` 按主旨關鍵字決定檔案類型，第一個匹配的優先
    
- `subject_date_pattern` 從主旨抓年月，抓不到會改用郵件寄送日期救援
    

## 設定 Gmail 認證方式

bash

`cp .env.example .env`

兩種方式選一個：

### IMAP + 應用程式密碼（適合伺服器排程）

1. Google 帳號啟用兩步驟驗證
    
2. 「安全性」→「應用程式密碼」，產生一組 16 位密碼
    
3. `.env` 填入：
    

text

`AUTH_METHOD=imap GMAIL_USER=你的@gmail.com GMAIL_APP_PASSWORD=16位密碼`

### OAuth 2.0（個人電腦用，授權範圍更小，相對安全）

1. [Google Cloud Console](https://console.cloud.google.com/) 建立專案，啟用 Gmail API
    
2. 建立 OAuth 憑證（桌面應用程式類型），下載 `credentials.json` 放進專案目錄
    
3. 安裝套件：`pip install google-auth-oauthlib google-api-python-client python-dotenv`
    
4. `.env` 填入 `AUTH_METHOD=oauth`
    

第一次跑會開瀏覽器要授權，之後就不用管了。

### 跑跑看

bash

`python3 fetcher.py`

PDF 全部存進 `./downloads/`，檔名像 `MyBank_CreditCard_2026_02.pdf`。

不確定規則設得對不對，先 dry-run 看看：

bash

`python3 fetcher.py --dry-run --verbose`

只顯示會匹配哪些郵件和預計的檔名，什麼都不會真的下載。

## 最後設定

### 每天自動檢查

bash

`0 9 * * * cd /path/to/gmail-statement-fetcher && python3 fetcher.py`

沒辦法裝 `python-dotenv` 的話，README 有 wrapper script 的寫法，主要是防止 `.env` 裡的 `$` 或空格在 cron 環境被誤解析。

### 解密 ZIP

銀行設定加一行搞定：

json

`"zip_password": "你的密碼"`

### 解密 PDF

要另外裝 `pikepdf`：

bash

`pip install pikepdf~=9.0`

然後設定：

json

`"pdf_password": "你的密碼"`

沒裝的話不會爆，會把加密 PDF 原封不動存下來，然後警告你一聲。

## 組合拳第一招！

後面還有：

- **doc-cleaner**：把 PDF/DOCX/XLSX/TXT 轉成結構化 Markdown，中文和表格特別友好，掃描檔也能處理
    
- **personal-cfo**：月度審計與退休規劃，結合前面下載的對帳單，自動計算支出、資產配置
    

我自己是已經整套跑起來在用了，但要分離出來個別整理還要一點時間——希望自己有動力繼續完成，哈哈。

---
