---
title: 繁體中文全文搜尋引擎實戰筆記（四）：從 Meilisearch 翻到 SQLite，Hit@1 從 39% 到 64%
description: 三月那篇實戰筆記（三）寫完，我以為這套 Meilisearch 六層 pipeline 就是終點。一個月後我把整個底層引擎換成 SQLite + libsimple，再從 char-AND 換到 jieba pre-tokenized FTS5。Hit@5 從 72.7% 升到 81.8%，但用 Hit@1 看真正的故事是 39.4% 升到 63.6%（+24.2pp）。平均延遲從 18.5 秒降到 2.1 秒。這篇記錄為什麼要翻、翻的過程、以及哪些地方我搞錯了方向。
pubDate: 2026-04-27 22:00+08:00
author: jacobmei
category: AI與科技
tags:
  - 資料庫
  - 教會
  - 聖經
draft: false
featured: false
shortCode: doe7dw
---

# 繁體中文全文搜尋引擎實戰筆記（四）：從 Meilisearch 翻到 SQLite，Hit@1 從 39% 到 64%

> 三月那篇[實戰筆記（三）](/blog/2026/0320-7gwwf6/)寫完，我以為這套 Meilisearch 六層 pipeline 就是終點。一個月後我把整個底層引擎換成 SQLite + libsimple，再從 char-AND 換到 jieba pre-tokenized FTS5。Hit@5 從 72.7% 升到 81.8%，但用 Hit@1 看真正的故事是 **39.4% 升到 63.6%（+24.2pp）**。平均延遲從 18.5 秒降到 2.1 秒。這篇記錄為什麼要翻、翻的過程、以及哪些地方我搞錯了方向。

---

## TL;DR

| 維度 | 之前（Meilisearch + 6 層 pipeline） | 現在（SQLite + jieba FTS5） | Δ |
|---|---|---|---|
| **Hit@1（top-1 對題率）** | **39.4%** | **63.6%** | **+24.2pp** |
| **Hit@3** | **66.7%** | **75.8%** | **+9.1pp** |
| **Hit@5** | **72.7%** | **81.8%** | **+9.1pp** |
| **MRR@5** | 0.527 | **0.700** | **+0.173** |
| **平均延遲** | **18,480 ms** | **2,109 ms** | **快 8.8 倍** |
| 語料 | 7,647 articles / 59,409 chunks | 12,094 articles / 34,006 chunks | 文章 +58%，chunks -43% |
| 中文分詞控制權 | Meili Rust jieba（簡體訓練，無法替換） | 完全自主（jieba 繁中 + CKIP + alias + OOV） |
| 後端技術棧 | Meilisearch + Docker + ollama embed source + cross-encoder reranker | 單檔 `.db` + libsimple 共享庫 + numpy in-memory matrix |
| 維護模型 | 多服務 + Docker compose | 一個 `.db` 檔，scp 即部署 |

換完之後，整個系統從「能跑但每次調參都怕踩到 silent fallback」變成「跑得快、可解釋、可改」。

---

## 關於上面那些數字的口徑

文中的 Hit@k 不是標準 IR 那個 Hit@k——我寫的是放寬版：33 題基準集，每題人工標 5–10 個 expected_keywords，top-k 裡只要有一篇 title + content 命中 ≥3 個 keyword，這題就算「對題」。Hit@k 就是對題題數 / 33。MRR@5 用同樣的對題判定，取第一篇對題的 reciprocal rank。

我沒標 ground-truth article_id，因為一個題目的「對題文章」常常不只一篇，標 keyword 維護起來輕鬆得多。代價是它對「相關但用詞剛好沒重疊」的文章嚴格了一點，而且後面會看到，受 `CONTENT_CAP` 截斷影響——這個截斷自己會吃掉訊號，等於 metric 自帶 false negative。

---

## 為什麼還要再翻一次？四個我已經繞不過去的痛點

實戰筆記（三）寫完之後，我又跑了一個月實際使用。在這段期間，幾個結構性的問題一個一個浮出來：

### 痛點 1：Meili 的中文 tokenizer 是黑箱，且訓練資料是簡體

Meilisearch 的中文 tokenizer 是 Rust 寫的 jieba port，內建詞典是簡體中文訓練的。我能做的只有：
- 在 dictionary 加同義詞（不是真正的分詞詞）
- 預先用 CKIP 把 content 切好再丟進去（`content_ckip` 欄位）

第二條是我在實戰筆記（三）拚出來的 workaround，但它有兩個副作用：
- 索引欄位數量翻倍（`*_bigram` + `*_ckip`）→ 索引大小膨脹約 3 倍
- 兩個欄位的分詞結果不一致時，bm25 排序會抖動，但我看不到抖動的 root cause

最關鍵的是：**我沒有辦法換 tokenizer**。如果我哪天想試 mmseg、ICU、tantivy，整個 index 要重建，且 Meilisearch 沒有提供標準插槽。

### 痛點 2：phrase df 不可信

Meilisearch 對多字詞的 phrase 查詢，預設行為是 OR 而非 AND（除非加 quoted phrase syntax）。這直接導致排序看到的「文檔頻率」失準：

```
查詢「長期憂鬱」
SQLite 上自己算 phrase df = 202 篇（兩字必須相鄰）
Meili 同樣 query 的 hits 回傳 = 8,207 篇
```

嚴格來說這兩個數字**不同量綱**——一個是 phrase df（兩字必須相鄰），一個是 OR-擴展後的 hits count。但量級差距本身就說明 Meili 在做 IDF 計算時看到的「長期憂鬱」，跟我以為的「長期憂鬱」不是同一個 token。bm25 的 IDF 根據 df 算，當「長期憂鬱」的 IDF 看起來跟「神」差不多的時候，我知道排序底層出問題了。

### 痛點 3：cross-encoder reranker 在 ARM CPU 上死結

實戰筆記（三）最後一段更新提到我把 BGE-reranker-v2-m3 換成 Qwen3-Reranker-0.6B ONNX INT8，從 OOM 變成 4 秒/10 篇。

但 4 秒就是 4 秒。一個查詢平均 10-15 秒延遲，使用者一輩子都不會回來。我嘗試過的所有 cross-encoder 結構（BGE-base、BGE-v2-m3、Qwen3-Reranker），延遲都在這個量級——**因為 cross-encoder 本質上要對每個 (query, passage) pair 重跑一次模型**，沒辦法 batch encode 後 reuse。

那時下了個結論：**「要準就要更多 reranker 資料 → 更慢 → ARM CPU 吃不消，這是死結。」** 不是 reranker 不好，是這個架構選擇下，reranker 變成必要但又不能跑得起來。

### 痛點 4：silent fallback 的歷史包袱

實戰筆記（三）有整段在懺悔六層 pipeline 的 silent fallback 教訓。即使 R7 確認全機制運作，這個架構的本質問題沒有消失——**只要任何一層用 try-except + log.warning 設計，下一次靜默退化就會再來**。

要解決它，要嘛在每一層都加嚴格 health check（已做，但維護負擔重），要嘛把 pipeline 變短到 silent fallback 沒地方藏。

我選了後者。

---

## 12 輪 prototype 找到的最簡架構

2026-04-25，我在 `tests/prototypes/` 下用 12 個 Python 腳本（P0 → P4 + B/B3/B2 系列）做了一次徹底的設計空間搜索。結論濃縮成 5 句話：

1. **方向**：SQLite FTS5 + `wangfenjin/simple` 取代 Meilisearch
2. **實測對題率**：P4（信心閘 + cosine 二梯打分）= 34–37%，追平 Meilisearch full pipeline
3. **真正動機不是速度**（Faiss vs Meili 向量延遲差不多），是 **tokenizer 自主 + 真實 df + bm25 可調**
4. **架構簡化**：砍 reranker default、砍 `*_ckip` 三欄位、chunks 只切 5 類強制必切
5. **未解仍是語料缺**（Q9 文學風、Q36 民俗信仰），不是檢索瓶頸

選的最終架構：

```
Storage:    SQLite + libsimple FTS5（單 .db 檔，無 Docker）
Index:      simple unigram 字符級（*_ckip / *_bigram 全砍）
Tokenizer:  Index 端 = simple；Query 端 = jieba + CKIP 1466 + alias 137 + OOV 24
Vector:     numpy in-memory matrix + BGE-M3 INT8 ONNX，doc vector 預存 SQLite BLOB
Chunking:   5 類強制必切（ccbible / apologetics / cccowe / CT / tgc-theology）
Search:     一梯 articles BM25（strict→loose）→ 信心閘 5 條件 → 二梯 cosine 打分
Reranker:   砍 cross-encoder 預設，改 BGE-M3 cosine 二梯打分（query encode + numpy.dot）
```


幾個關鍵決策：

### 為什麼砍 chunks 路（從 4 路降到 1+1 fallback）

實戰筆記（三）的 Multi-scale RRF 把 articles + chunks × (BM25 + semantic) 四路 RRF 平等融合。我以為這是純贏，但 P2 prototype 跑出來戲劇性退步：

```
Q73「香港牧師心理健康」articles 路 5/5 對題
RRF 把 chunks 路的詩篇 77 / 詩 57 哀歌 + 路加醫療 noise 等比加權拉進 top-5
→ 把對題的「香港牧師心理健康」「救命我不在乎上帝」擠出 top-5
→ 5/5 退到 2-3/5
```

根因：RRF 平等對待四路，但 articles 路品質本身就高，chunks 邊際價值小，noise 成本反而大。

最後改成**條件式 fallback**：articles strict 結果 ≥5 不碰 chunks，<5 才補。在 7 題基準集上，chunks fallback 0/7 觸發。生產上會有少數 sparse-poor query 觸發，是純 safety net。

### 為什麼跳過 entity scoring

實戰筆記（三）裡 entity-aware scoring 是我最得意的機制。但 V3 session 跑了一輪 NER 字典從 128 條擴到 2282 條（17.8 倍），coverage 平均完全無變化（32.3% → 32.3%），17 個主題類別零變化。

根因：80 題大多是抽象神學提問（「神為何讓苦難」、「耶穌是誰」），router 判 intent=topic 而非 entity，**entity scoring 直接被跳過**。NER 新加的 2154 條多是低頻人名地名，對抽象 query 派不上用場。

> 這是我這次最重要的反省：實戰筆記（三）的 entity scoring 在「具名主角搜尋」這個 narrow case 上很有效，但在 RAG 問答場景（90% 是抽象問題）幾乎用不到。**做過頭了，且我不知道，因為當時的 metric 沒有區分「有主角的查詢」和「無主角的查詢」**。

### 為什麼 cosine 二梯打分（dense score fusion）取代 cross-encoder

> 這不是 rerank（cross-encoder 那種對 (query, passage) pair 重跑模型），而是把 BM25 召回的候選用預存 doc embedding 補一個 cosine score 做 fusion——`combined = α × bm25_rank_score + (1 − α) × cosine`。下文一律稱「cosine 二梯打分」，避免跟 cross-encoder rerank 混為同概念。

`embed-server` 已經在 process 裡跑著（給 vector search 用），把 doc vectors 預存進 SQLite BLOB（49.5 MB，12k × 1024 float32）。query encode 一次，跟 in-memory matrix 做 dot product，~5 ms/題。

代價是這不是 cross-encoder，理論上排序精度上限低些。但實測對題率在 33 題基準集上**追平 + 略勝** Meilisearch full pipeline 含 cross-encoder（P4 34–37% vs Meili A 34%）。

換句話說：對這個語料 + 這種 query，cosine 二梯打分已經夠用，cross-encoder 的邊際價值在 ARM CPU 延遲下不划算。

---

## 上線後的演進：v0.7 → v1.1 → F5

prototype 結論落地之後，我從 v0.7 開始一路調 baseline。每一次都拿同一份 33 題基準集，跑相同 metric（任 1 篇命中 ≥3 個 expected_keywords），跟前一版直接對比：

| 版本 | Index tokenizer | Hit@1 | Hit@3 | Hit@5 | MRR@5 | 延遲 | 主要改動 |
|---|---|---|---|---|---|---|---|
| Meili A（之前架構） | bigram + CKIP 雙欄位 | 39.4% | 66.7% | 72.7% | 0.527 | 18,480 ms | 4 路 + reranker + entity scoring |
| v0.7 | libsimple unigram char-AND | 42.4% | 51.5% | 63.6% | 0.487 | 1,453 ms | α=0.4¹ BM25-only |
| v0.8 | libsimple unigram char-AND | 39.4% | 51.5% | 66.7% | 0.478 | 1,453 ms | α=0.25¹ |
| **v0.9** | libsimple unigram char-AND | **57.6%** | 69.7% | 72.7% | 0.639 | 1,587 ms | **+ Hybrid（BM25 + Vector）= +18.2pp Hit@1** |
| v1.0 | libsimple unigram char-AND | 63.6% | 72.7% | 75.8% | 0.689 | 2,120 ms | + Query Rewriting（Groq llama-3.3-70b）|
| **v1.1 (F5)** | **jieba pre-tokenized + unicode61 按空格切** | **63.6%** | **75.8%** | **81.8%** | **0.700** | **2,109 ms** | **+ articles_fts_v2 / chunks_fts_v2** ⭐ |

> ¹ α 是 cosine 二梯打分的 fusion 權重：`combined_score = α × bm25_rank_score + (1 − α) × cosine`。α 越低代表 cosine 比重越高。v0.7 → v0.8 把 α 從 0.4 降到 0.25 後 cosine 主導，但仍是純 BM25 候選池在跑（沒進 v0.9 的 vector 召回）。

> **這張表是 ship 後一週做的事後 analysis 才看到的**。最初我只看 Hit@5（top-5 任 1 命中 ≥3 keywords）「對題率」這個 metric，所以原本 commit message 寫的是 v1.1 = 27/33 = 81.8%。但加上 Hit@1 之後才看到真正的故事不是 Hit@5 +9.1pp，是 **Hit@1 +24.2pp**——這個底層引擎搬遷把「打開搜尋第一篇就對題」的機率幾乎翻倍。後面「反思」段會詳述這個 metric 改進。

幾個轉折：

### v0.9：Hybrid 在 BM25-only 死局上補了一刀

Hit@5 從 v0.7 的 63.6% 跳到 v0.9 的 72.7%，加了 9.1 個百分點，幾乎全部來自 hybrid retrieval。**Hit@1 跳得更兇：42.4% → 57.6% (+15.2pp)，整個架構演進中最大的單次 Hit@1 跳躍。** 在 SQLite + libsimple 字符 unigram 的 char-AND 召回層上，「禱/告/感/覺」字符任意組合就能命中，cosine 二梯打分看不到真對題的（被擠出 top-15 候選池）。Vector top-10 直接補進候選池，cosine 看得到了，自然救回來。

### v1.0：Query Rewriting 解了「生活語言 vs 神學語言」的詞彙錯位

輸入「禱告沒有感覺怎麼辦」測系統，top-5 全是字面命中「禱告」「感覺」的散文（含「禱/告/感/覺」字符組合的隨機段落），沒有一篇直接講「禱告冷淡」這個主題的。

Groq llama-3.3-70b 改寫後：

```
輸入：禱告沒有感覺怎麼辦
輸出：禱告枯竭 信仰鬆懈 靈修低潮 禱告技巧 屬靈成長
```

改寫之後 top-3 變成「你的禱告需要的不是新方法 / 我們的禱告神學比我們的感覺更重要 / 禱告無用？」，全部直擊主題。

並行 4-way merge（原 query BM25 + 原 query vector + rewrite query BM25 + rewrite query vector），timeout 1.5 秒，失敗 fallback 純原 query。對題率多 1 題（25/33 = 75.8%）。

這層的價值不在 baseline 數字（+1 題），在**真實使用感受**——使用者打入生活語言時，系統能召回神學家在用的詞彙。33 題基準集大多寫得像神學家問問題，所以 baseline 沒看到全貌。

### F5（v1.1）：jieba pre-tokenized FTS5 v2 解 char-AND 拼湊命中

v1.0 已經 75.8%，但「禱告沒有感覺怎麼辦」打開 article 詳情頁，matched_chunks 仍會 highlight 含「禱/告/感/覺」字符任意組合的 chunk——比如某段同時提到「禱告書」跟「直覺」就被當成命中。Query rewriting 解了主搜尋層，但 article 內 chunks_fts char-AND 仍是字符拼湊。

> **F5 不是 patch v1 的 libsimple 表，是另開 `articles_fts_v2` / `chunks_fts_v2` 用 unicode61 + jieba pre-tokenize**。v0.9–v1.0 的 hybrid 都是在 libsimple 表上跑，F5 之後主搜尋切到 v2，舊表保留作 fallback（`FTS_VERSION` 環境變數一個 export 就 rollback），預計 v2 穩定 1-2 週後再 drop 舊表。

F5 的設計從 indexing 層解決：

```sql
articles_fts_v2 USING fts5(
    title,            -- jieba 切詞 + 空格 join 版（給 unicode61 phrase MATCH）
    title_raw,        -- 原文（UNINDEXED，給前端顯示）
    content,
    content_raw,
    tags,
    tags_raw,
    ...
    tokenize = 'unicode61'
);
```

build 時 jieba 切詞 + 空格 join，FTS5 內建 unicode61 tokenizer 按空格切——「禱告」就是一個 token，不是「禱」+「告」兩個字符。phrase search `"禱告"` 真正 token-level 精確匹配。

實際靠的是 pre-tokenize 前處理，**unicode61 本身不認中文邊界**——這也是為什麼 build 端跟 query 端的 jieba 詞典必須一致（dict SSOT 紀律）。任何時候改詞典沒重 build → 索引 token 跟 query token 對不上 → phrase search 全 miss。

我踩了一個坑：v2 表的 indexed 欄位是切詞版（為了 phrase search），但 search_service 直接讀這個欄位回前端 → 網頁出現「你 的 禱告 需要 的 不是 新 方法」這種空格分隔的 title，視覺很糟。

修法是 v2 schema 加 `_raw` UNINDEXED 欄位雙寫原文，SELECT 時用 alias 把 `title_raw AS title` 投影回欄位名稱，row schema 不變、上層代碼零改動。chunks 的 snippet highlight 在 v2 改成 Python-side 自寫（從 `chunk_text_raw` 對 jieba phrase/unigram 包 `<mark>`），避免 fts5 snippet 函數帶空格。

最後 Hit@5 **27/33 = 81.8%**，0 題 regression。救起的兩題是 Q10「靈魂出竅、瀕死經歷」和 Q17「耶穌死後和復活之間的那三天」。

值得注意的是 **F5 對 Hit@1 沒進一步推進**（v1.0 跟 v1.1 都是 63.6%）。F5 的價值在 Hit@5 / Hit@3——是把「中等 rank 的 noise 拿掉」「打開 article 看 chunks 不再拼湊」這類精度提升，不是把「真對題的拉到第一名」。Hit@1 在 v0.9 + v1.0 兩波就到天花板了。

> **這次學到的最關鍵教訓**：把搜尋層的 indexing 跟顯示層分開，不要讓 fts5 indexed 欄位的物理形式（為了 tokenizer 而切詞 + 空格）洩漏到前端。`_raw` 欄位的代價是 +50% 儲存（490 MB → ~750 MB），對 Oracle 這台機器不痛，但離線版要重新評估。

---

## 之前架構 vs 現在架構：橫向總覽

| 面向 | 之前（Meilisearch + 六層） | 現在（SQLite + 三層） |
|---|---|---|
| Hit@1（top-1 對題率） | 39.4% | **63.6%** |
| Hit@5（top-5 對題率） | 72.7% | **81.8%** |
| MRR@5 | 0.527 | **0.700** |
| 平均延遲 | 18.5 秒 | **2.1 秒** |
| 索引大小 | ~3x 膨脹（`*_ckip` + `*_bigram` 雙欄位） | 單欄位（v2 加 `_raw` 後 +50%） |
| chunks 數 | 59,409 | 34,006（5 類強制必切） |
| 中文 tokenizer | Meili Rust jieba（簡體訓練、不可換） | jieba 繁中 + CKIP + alias + OOV，自主 |
| Reranker | Cross-encoder（BGE-v2-m3 → Qwen3-Reranker-0.6B），4 秒/題 | BGE-M3 cosine（in-process numpy dot），5 ms/題 |
| Pipeline 層數 | 6 層（含 multi-scale RRF + entity scoring + reranker） | 3 層（BM25 strict→loose / Hybrid + Vector / cosine 二梯打分） |
| Silent fallback 風險 | 每一層都有，需嚴格 health check | 砍掉到剩三層，silent 沒地方藏 |
| 部署 | Docker + Meilisearch + ollama-embed + reranker container | 單 `.db` 檔 + libsimple `.so` + Python search service |
| 升級 tokenizer / vector | 全量 reindex（重跑 1-2 小時 + 6 GB index data 重建） | 單一 `build_indexes_v2.py` 6 分鐘 |
| 觀測性 | 6 層輸出，調哪一層不確定 | 3 層直接看 SQL EXPLAIN + Python 變數 |

---

## 取捨：我放棄了什麼

換架構是有代價的 .....

**第一件，放掉 cross-encoder 的排序精度上限。** cosine 二梯打分的本質是 query embedding × doc embedding 的內積，模型沒看過 query 跟 passage 的 token-level 交互關係。Cross-encoder 在 query 跟 passage 真的需要 token-level 對齊的場景強得多：否定（「救恩**不是**靠行為」跟「救恩靠行為」是兩件事，但 dense embedding 容易把「不是」當噪音）、限定條件（「保羅在第幾封信第一次提到 X」要精確抓「第幾封 / 第一次」）、多 hop 推理（「跟客西馬尼禱告類似情境的舊約人物」query / passage 要一起讀）。33 題基準集這類 query 不多，所以 cosine 追平 + 略勝是合理結果——但要是未來 query 風格往這方向走，這層就會先垮。

**第二件，entity scoring 整層砍掉。** 實戰筆記（三）裡 entity-aware scoring 是我最得意的機制，對「司布真在 City Vision 的事工」這種具名查詢能硬篩掉沒提到主角的文章。但實際使用上，RAG 問答 90% 是抽象問題（為何苦難、禱告冷淡這些），entity scoring 直接被 router 跳過。F5 的 jieba pre-tokenized 也順便把這層的核心訴求隱性吃掉——「司布真」就是一個 token，BM25 IDF 自己會把這篇拉得很高，不需要額外硬篩。

**第三件，Multi-scale RRF 的長尾召回沒接回來。** 實戰筆記（三）的 RRF 對窄域主題（「植堂」、「以色列宣教」）有 +30-40% 召回。新架構是 hybrid 4-way merge（articles BM25 + articles vector + rewrite BM25 + rewrite vector），文章層級補了一些，但段落層級沒補。如果哪天窄域召回真的變成痛點再說，做法會是 chunks vector 條件式補進候選池，不會復活 RRF 平等加權那條（那條已經在 prototype 階段被量化證明會擠掉對題）。

還有一件不是放棄、但要付學費的事：jieba 詞典變成 SSOT。build 端跟 search 端如果用不同的詞典，indexed token ≠ query token，phrase search 全 miss。所以我把 jieba 載入邏輯抽到 `jieba_setup.py`，build 與 runtime 共 import，CKIP 1466 + alias 137 + OOV_PATCHES 24 三方一致。改詞典沒重 build = 索引全 miss——這條紀律比任何 silent fallback 都更需要 enforce。

---

## 反思

回頭看這次最大的對錯：

prototype 沒偷懶這件事絕對是對的。12 輪 Python 腳本跑了三天才下決定，但如果直接照「換成 SQLite」的 thesis 上線，會錯過 chunks RRF 退步、entity scoring 對抽象 query 失效這些反直覺發現。實戰筆記（三）silent fallback 的痛還在，這次我寧可慢，不要再裝個機制然後不知道有沒有在跑。

baseline 嚴格固定也是對的。33 題基準集 + 同一個 metric 從 v0.7 撐到 v1.1 沒換過，所以每一版的 +pp 都可以直接相減。中途我有衝動想「擴成 50 題」「換 MRR」，忍住了——擴 metric 是 ship 完之後才做的事（後面會講），中途換 metric 等於丟掉一個月的對照組。

每個改動單獨上線這件事也救了我。v0.9 hybrid、v1.0 query rewriting、v1.1 F5 各上一次。如果三條混合 ship，發現對題率 75.8% → 81.8% 我完全不知道哪條貢獻多少；後面 metric 細看才看到「F5 對 Hit@1 沒推進、是 v0.9 跟 v1.0 把 Hit@1 撐到 63.6%」，這種 attribution 一旦混上線就拿不回來。

差點搞錯的有三件，列在這裡當作給未來自己的提醒：

F5 的顯示空格 bug 我事前沒想到。v2 build 完跑完 baseline，看到 title 全部變成「你 的 禱告 需要 的 不是 新 方法」，當下還想說「baseline 數字看起來 OK 啊」差點就 ship。後來才意識到使用者打開頁面會看到壞畫面。root cause 是 fts5 的 indexed 欄位 SELECT 出來就是 INSERT 時的形式，沒有「索引看 A、SELECT 看 B」這種單欄位魔法。修法是雙寫 `_raw` UNINDEXED，但這個盲點我從頭到尾沒想過——直到 baseline 跑出來看見才反應過來。

strip-spaces 的 metric 偏差是另一個 surprise。F5 第一次跑 baseline 我加了 `--strip-spaces` flag 強制去空格再 substring match 跑出 78.8%，後來雙寫 `_raw` 上線、metric 直接對原文，跑出 81.8%——比 strip-spaces 版還高 3 pp。原因是 strip-spaces 把原本就有空格的 tags 字串擠在一起，反而 false negative 某些 keyword。我本來以為 strip 是中性操作，結果不是。

chunks RRF 等比加權的 noise，這個其實是實戰筆記（三）的我自己挖的坑——當時我以為 Multi-scale RRF 是純贏，結果這次 P2 prototype 才量化到「擠掉對題」的代價。RRF k=60 對品質差距大的兩路而言 noise 成本 > 邊際召回，這件事如果三月那篇文有對 chunks-only top-5 認真看，當時就能抓到。

---

## Ship 完之後又動了一輪

F5 commit 推上 origin/main 那天晚上，我請 AI 給一份「v1.1 還有什麼該動的」建議書，分 P0/P1/P2 三級。建議書本身不是亂槍打鳥，每項都附「為什麼這樣設計」和反例討論。我看完挑掉幾條覺得不合理的（擴 baseline 那條對一人測試環境意義不大、entity boost 那條看 P0.3 結果再說）就動手。兩天內 ship 了五個項目，這裡寫一下動機跟結果，因為其中兩個直接改變了我對「F5 這次到底救了什麼」的理解。

### dict drift hash（30 行程式碼，永久消除一個 silent failure）

這次最便宜的勝利。jieba 詞典 SSOT 紀律之前靠我手寫筆記提醒自己「改詞典記得 rebuild」——這完全不可靠。改成 build 時對 CKIP + alias 檔案 + OOV_PATCHES list + setup_jieba/tokenize_for_fts source 算一個 sha256 fingerprint 寫進 `build_meta` table，service 啟動時拉一次 runtime fingerprint 比對，不一樣直接拒啟動。35 行 Python，永久把這條紀律從「祈禱沒踩」變成「踩了開不起來」。

### Hit@1 + MRR retrofit，揭穿了我對 F5 的誤判

原本 metric 只看 top-5 對題率，所以一直以為 v1.1 vs Meili A 是 +9.1pp Hit@5 的故事。把 Hit@1 加進來後才看到真正的故事：

- v1.1 vs Meili A 在 Hit@1 上是 +24.2pp（39.4% → 63.6%）
- v0.9 hybrid 那一刀是整個演進中最大的單次 Hit@1 跳躍（+15.2pp）
- F5 對 Hit@1 沒推進——v1.0 跟 v1.1 都是 63.6%

這完全打臉我原本準備的 commit message。F5 的價值不在 top-1 ranking，是 top-2 ~ top-5 那段中間 rank 的 noise 過濾，加上 article 內 chunks snippet 不再字符拼湊。如果一開始就有 Hit@1 看，prototype 階段我可能會更早把資源轉到 hybrid，而不是花時間調 α。

### 6 題失敗的類型學

剩下 6 題 baseline 失敗，原本我在「下一步」段寫的是「大多是語料缺口」——這是猜測不是分析。實際對每題 grep corpus、看 BM25 / vector / cosine 各層的召回，分類成 5 種：

- A：語料完全沒對題文章 → retrieval 層怎麼改都沒救
- B：有語料、jieba 切壞導致 BM25 漏 → 改 tokenizer
- C：有語料、但 corpus 只 1-4 篇真對題 → 邊際語料缺
- D：召回了，但 cosine 排不上 top-5 → 這才是 cross-encoder 該救的戰場
- E：召回 + 排上 top-5 了，但 metric 自己 bug 算 fail

跑出來分布：A:2 / B:0 / C:3 / D:0 / E:1。

意義很大。0 個 D 類代表「conditional cross-encoder」這種大手術沒有打靶——cosine 二梯打分對這 33 題已經夠用。0 個 B 類代表 jieba 切詞無 regression。3 個 C 類本質是邊際語料缺，retrieval 邊際 ROI 低。E 類那 1 題（Q13 一次得救永遠得救）是我自己 baseline metric 的 `CONTENT_CAP=4000` 把 keyword 截掉——而且這只是被抓到的 1 題，實際上 cap 截斷是靜默誤判，無從估計總共吃掉多少訊號。最後我把 cap 提到 20000 應急，但這只是 stop-gap。

換句話說，6 題失敗裡 5 題是內容問題、1 題是 metric 問題、0 題是 retrieval 問題。在 retrieval 層繼續優化的 ROI 已經逼近零，要繼續推就是補語料。

### Groq cache + observability

剩下兩個比較沒戲劇性。Groq query rewriting 加一層 SQLite cache（30 天 TTL），cache hit p50 = 367ms vs cold groq p50 = 708ms，省了 48%。教會場景 query 重複度高，這個 cache 在生產上的 hit rate 應該不錯，等累積一週看數字。我刻意沒做的是「Groq 失敗時用靜態 alias dict 補」——`受苦` 跟 `憂鬱` 是不同量級的詞，靜默擴展會把候選池塞滿苦難神學跟約伯記，把真對題的牧養文章擠掉。這是 IR 教科書級的 query expansion 失敗模式，不要走。

順便加了個 `search_log` table 持久化每次搜尋的 latency / cache_hit / stage / rewrite_source，配 `metrics_dashboard.py` 看 last 1h / 24h / 7d 的 p50/p95/p99 + cache hit rate + top queries 重複度。這個沒救任何 metric，只是 ship 後我拒絕再對黑箱猜測——下次 latency 變慢、cache 停止 work、stage 分布改變，要當天看到，不是事後 post-mortem。

### 取消的項目

P1.5 entity multiplicative boost 跳過——P0.3 顯示具名主角型 query 根本不在失敗集合裡。P2.8 conditional cross-encoder 跳過——0 個 D 類加 Hit@1 已 63.6%，雙重確認沒必要。P1.4 baseline 擴 63 題延後——logos.jacobmei.com 是我一人測試環境，所謂「真實使用者 query」現在還是我自己的 query，擴了 author bias 沒消除多少。等真的有外部使用者再做。

---

## 下一步

baseline 81.8% Hit@5 / 63.6% Hit@1 之後，retrieval 層的 ROI 接近 zero。短期沒有要動的；中期幾件事會碰到：

本地離線版總是要做的——MBA M2 上跑同樣的 SQLite + libsimple，0 網路依賴。儲存 750 MB 對 Mac 沒問題，主要工作量在 ARM macOS 編 libsimple。

補語料是更直接的路。失敗類型學裡 5 題內容問題已經點出三個方向：十字軍歷史、教會長大不熱心、牧師責任邊界。這三類在華文神學圈本來就薄，補料比優化 retrieval 划算。

最後就是看 production 數據——`search_log` 跟 cache hit rate 累積一週後，再決定要不要調 cache TTL、要不要把 query rewriting 規格收緊。我不再憑感覺猜了。

---

## 系列前作

  - [實戰筆記（一）：選型與架構設計](/blog/2026/0320-1gj9sx/)
  - [實戰筆記（二）：建置實戰與測試](/blog/2026/0320-1kx9dt/)
  - [實戰筆記（三）：進階優化與系統評估](/blog/2026/0320-7gwwf6/)
  - [trad-zh-search 開源工具](/blog/2026/0323-ygw9rr/)

---

## 參考資源

- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [wangfenjin/simple](https://github.com/wangfenjin/simple) — SQLite FTS5 中文 tokenizer 擴充（unigram + 拼音）
- [jieba](https://github.com/fxsjy/jieba) — Python 中文分詞
- [BGE-M3](https://huggingface.co/BAAI/bge-m3) — 1024-dim embedding，支援繁中
- [Groq](https://groq.com/) — llama-3.3-70b 快速 inference（query rewriting 用）
- [中文搜尋預處理工具 trad-zh-search](https://jacobmei.com/blog/2026/0323-ygw9rr/) — 我把實戰筆記（三）的 CKIP + alias 邏輯打包成獨立套件
