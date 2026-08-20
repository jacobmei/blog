---
title: Obsidian 全平台同步實作，免費方案心得分享
description: 為了讓 Android 平板也能用，我把 Obsidian 從 iCloud 搬到 Oracle 自架的 CouchDB。
pubDate: 2026-08-15 23:40+08:00
tags:
  - Obsidian
  - CouchDB
  - self-hosting
  - Cloudflare
  - oracle
author: jacobmei
category: AI與科技
draft: false
featured: false
shortCode: obsync1
cover: ./assets/20260815-self-hosted-obsidian-sync.png
---

# Obsidian 全平台同步實作

我的 Obsidian 筆記之前一直放在 Github 上，然後 iPhone, iPad 透過 Möbius Sync plus 來同步，這個小軟體是讓 iOS 能夠有讀取更多檔案目錄與同步的能力，但它設定有點複雜，要排除的例外規則設定也很麻煩，一個沒搞好，就可能會讓 iPhone 上的同步資料爆炸。

所以我後來比較常用 iCloud 當做 Obsidian Vault 的基地，這樣 Mac桌機和筆電、iPad、iPhone 等 Apple 家族都用得好好的。

結果，我想到還有一台 Onyx 文石的 Android 平板也能開同一份筆記，這個方案就破功了，Android 沒有很好的 iCloud 同步檔案夾方案 。

所以經過短暫的研究，我覺得自幹一個「免費的 Obsidian 全平台同步架構」：

Oracle Free Cloud 方案免費機開 CouchDB，每個 Obsidian 安裝 Self-hosted LiveSync 外掛程式，Oracle Free Cloud 主機掛 Cloudflare Tunnel 提供 HTTPS，R2 或 GitHub 只做定期備份。

看起來有點複雜，用 AI 幫忙做，不到一個小時完工，現在各種機型與系統的 Obsidian Vault 都可以完美同步了，哈哈。

## 曾經想過這是不是過度工程？

搞一個資料庫伺服器，還要顧備份、升級、測試等，本來怎麼想都不划算。

但是 Oracle 機器搭配 Cloudflare Tunnel，連域名都可以在 Cloudflare 上搞定，對於我本來就有用 Oracle Free Cloud 主機掛 Cloudflare 域名服務的人來說，要做的事情其實很少，而且沒有額外花費。

順便提一下 Oracle Free Cloud 最近的大改動，Oracle 在 2026 年 6 月把 Always Free 的 ARM 額度從 4 OCPU / 24GB 砍半到 2 OCPU / 12GB，8 月 18 日起強制執行，超規的實例會被直接終止，還沒調整設定的人記得要去改一下，免得被額外收費或是主機被回收。

還有就是我用的是 R2 物件儲存方案，這就意味**不可能**有即時同步。官方文件寫得很清楚，LiveSync 的 LiveSync 模式需要 CouchDB 或 WebRTC P2P，S3 相容儲存不支援。

## AI 幫我搞規劃與設定約三十分鐘

伺服器端其實很快。CouchDB 3.5.2 起起來、跑官方的 provisioning 腳本（它會設好九項設定，包括強制認證、CORS 來源、50MB 文件上限）、加 ingress、建 DNS、驗證，三十分鐘不到就全部完成。

過程中卡了兩個小坑，都是環境問題。那台機器只有獨立的 `docker-compose` binary，沒有 `docker compose` plugin，而我一開始把 fallback 指令的成功輸出誤讀成 plugin 可用。另一個是沒裝 `unzip`，導致 Deno 裝不起來，而錯誤被我自己寫的 `>/dev/null` 吞掉，`set -e` 直接讓腳本靜默中止。
## 接下來就是筆記（Valut 庫）搬家

因為 LiveSync 不能和 iCloud 並用，vault 必須搬出 iCloud 目錄。

由於我的 Valut 裡的檔案基本上都在雲端，本機上常用的不到四成，所以這是搬家前要知道的事情，比較快的方法是下載後打包搬家。

我讓 AI 把檔案清單切片，多個 rsync 同時跑：

```bash
find . -type f > all.txt
split -l "$per" all.txt part-        # 注意：不是 split -n l/16
for p in part-*; do
    rsync -a --files-from="$p" "$SRC/" "$DST/" &
done
wait
```

註解那行又是一個坑。`split -n l/16`（自動切成 16 份）是 GNU coreutils 的參數，**macOS 的 BSD split 沒有**，它會安靜地不產生任何分片檔，接著 16 個 rsync 各自拿著 glob 字面值去讀不存在的檔案。我第一次跑完，log 顯示「已啟動 1 個 rsync、耗時 0 秒」，什麼都沒搬。

在跑全量之前，可以先用 40 個檔案跑一遍，8 秒完成、sha256 全對，就可以放全量下去。

## 除錯：從伺服器端分辨「沒推上去」和「沒拉下來」

四台裝置串起來之後，我在 iPhone 上改了一個檔案，但是另外幾台沒反應。

這種情況最容易變成瞎猜，但 CouchDB 的複製協定給了一個很乾淨的切分點：

| 端點 | 意義 |
|---|---|
| `_revs_diff` | 推送前的協商：「你缺這些嗎」 |
| `_bulk_docs` | **實際上傳文件** |
| `_changes` | 拉取端取得變更列表 |

查伺服器日誌，20 分鐘內 `_bulk_docs` **次數為 0**。所以不是其他設備沒拉更新的檔案下來，是 iPhone 根本沒送出去，401 和 500 也都是 0，所以不是認證或伺服器問題。

原因是 iOS 把 Obsidian 凍結了，我改完就關軟體了，app 進背景就沒有機會推送，這不是設計上的錯誤，是平台限制，佐證是官方那個「背景保持同步」的選項 `keepReplicationActiveInBackground` 明確標注 Desktop only。

解決方法也很直接：

> [!note]
> 這變成一個實際的使用習慣：**手機或平板上改完筆記，別馬上切走**，停幾秒讓它推出去。資料不會遺失，但會延遲到下次打開 app。

## 文件數字對不攏？

最後驗收的時候，三台行動裝置都顯示 2,550 篇，而我在 Mac 上顯示是 2,523。

差 27。

這種時候最忌諱「差不多啦」 ....

先看副檔名分布，Mac 上除了 2,523 個 md，還有 11 個 png、8 個 base、4 個 html、2 個 json、1 個 yaml、1 個 table。**11+8+4+2+1+1 = 27**，正好是差額。行動端顯示的是「Obsidian 認得的所有檔案」，我計算的是「md 檔」，口徑不同而已。

但還沒完，還有零星的一兩個對不上。繼續追：

- 逐一列出所有非 md 的可同步檔案，發現其中 2 個是隱藏檔（`.gitignore` 和一個 log），LiveSync 不同步隱藏檔，所以實際同步的非 md 是 27 個，`2,523 + 27 = 2,550`，和行動端完全一致。
- 伺服器端數 `f:` 開頭的文件（LiveSync 用 `f:` 存檔案本體、`h:` 存內容 chunk）得到 2,551，比 2,550 多 1。我推測是先前測試時候刪掉的一篇日記留下的軟刪除標記，因為 CouchDB 的 `doc_del_count` 是 0，代表刪除不是走 CouchDB 層。

驗證這個推測：

```bash
curl -X POST .../obsidiannotes/_find \
  -d '{"selector":{"deleted":true},"fields":["_id","deleted"]}'
# 標記 deleted 的文件數: 1
```

**正好 1 個。** 帳全部對平，沒有任何資料遺失，工程師的龜毛焦慮終於被緩解，哈哈。
## 我在這輪除錯裡押錯的地方

寫下來提醒自己，這些都是當下覺得很合理、事後看很明顯的判斷：

1. **用 `find -name "*.icloud"` 判斷有沒有雲端佔位檔**，得到 0 就下結論。實際上該看 flags。這個錯誤讓我晚了快十分鐘才找到真正的瓶頸。
2. **把 fallback 指令的成功輸出當成前一個指令成功**。`docker compose version 2>/dev/null || docker-compose --version` 印出了版本號，我就以為 plugin 可用。
3. **押「檔案沒進本地資料庫」**。Android 新增的檔案沒同步時，我從「大量協商、零上傳」推論它沒被偵測到。結果官方的 `Copy database information for the active file` 一跑，檔案好端端在本地資料庫裡，chunk 齊全、零衝突。真正的狀況是它已經推上伺服器了，卡在 Mac 沒拉下來。**證據推翻了推論，那就換推論。**
4. **報數字時用了跟對方不同的口徑**，害得「2,523 vs 2,550」看起來像資料遺失，白白緊張一場。

還有一個純粹的 bash 陷阱，跟這個專案無關但值得記：

```bash
echo "  md 總數 $S_MD，異常 $MISS 個"
# S_MD，: unbound variable
```

變數後面緊接**全形逗號**，bash 會把多 byte 字元吃進變數名。中文標點貼著變數要寫 `${S_MD}`。

## 現在終於多台同步了

多台裝置同步，實測 Android 新增、Mac 筆電收到。伺服器上的檔案文件、零衝突。內容是端對端加密的，連路徑都經過混淆，所以伺服器上看到的全是 `f:` 加雜湊，我自己去翻資料庫也讀不出檔名和內容，備份有兩層：GitHub 私有 repo、本機獨立副本。

至於主機使用的資源，Oracle Free Cloud 主機 2 OCPU / 12GB 的免費機器，load average 0.24，記憶體還剩 5.5GB，CouchDB 資料目錄 93MB，這些用量對它來說幾乎不存在。

假如你也有 Obsidian Valut 同步的需求，免費的 iCloud 無法滿足多系統的環境，又不想花月租費用原廠 Obsidian Sync 服務，對於 Möbius Sync plus 來同步被搞瘋（？），歡迎來試試我的完全免費方法，哈哈。