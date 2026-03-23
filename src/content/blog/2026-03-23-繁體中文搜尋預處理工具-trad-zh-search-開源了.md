---
title: 繁體中文搜尋預處理工具 trad-zh-search 開源了
description: 我把在 Meilisearch 上踩了很煩的繁體中文分詞坑，提取成一個搜尋引擎無關的 Python 套件。CKIP 分詞 + bigram 索引 + 可選用領域字典，pip install 就能用。這篇記錄為什麼要做這個工具、它解決了什麼問題、以及我在過程中學到的幾件事。
pubDate: 2026-03-23 16:00+08:00
author: jacobmei
category: AI與科技
tags:
  - Meilisearch
  - 中文分詞
  - CKIP
  - 開源
  - Python
draft: false
featured: false
cover: ./assets/2026-03-23.jpg
---
# 繁體中文搜尋預處理工具 trad-zh-search 開源了

> 我把在 Meilisearch 上踩了很煩的繁體中文分詞坑，提取成一個搜尋引擎無關的 Python 套件。CKIP 分詞 + bigram 索引 + 可選用領域字典，`pip install` 就能用。這篇記錄為什麼要做這個工具、它解決了什麼問題、以及我在過程中學到的幾件事。

---

## 前情提要

如果你看過我之前寫的 [繁體中文全文搜尋引擎實戰筆記系列](https://jacobmei.com/blog/2026/0320-1gj9sx/) ，你就知道我在 Meilisearch 上踩了一大輪中文分詞的坑。

核心問題其實就一句話：**主流搜尋引擎的中文分詞都是用 jieba，而 jieba 是用簡體中文訓練的，對繁體中文的分詞品質不好 XD (結束）**

這問題已經很多年了，但一直沒有一個好的解決方案。你可以自己在前端做分詞處理、可以自己在後端加欄位、可以自己建字典 …… 但每個專案都在重新造輪子。

所以我把這幾個月的實戰經驗整理了一下，拆成一個獨立的 Python 套件：[trad-zh-search](https://github.com/notoriouslab/trad-zh-search)，結果好像也是在造輪子 XD

---

## 痛點到底有多痛

先看一組真實對比。同一段文字，jieba 和 CKIP + 自訂字典的分詞結果：

| 原文 | jieba 分詞 | CKIP + 自訂字典 |
|------|-----------|----------------|
| 聖靈充滿的經歷 | 聖靈 / 充滿 / 的 / 經歷 | **聖靈充滿** / 的 / 經歷 |
| 因信稱義的教義 | 因信 / **稱義的** / 教義 | **因信稱義** / 的 / **教義** |
| 台北靈糧堂的主日崇拜 | 台北 / 靈糧堂 / 的 / 主日 / 崇拜 | **台北靈糧堂** / 的 / 主日崇拜 |
| 靈糧教牧宣教神學院 | 靈糧 / 教牧 / 宣教 / 神學院 | **靈糧教牧宣教神學院** |

jieba 把「稱義的」黏在一起（語法錯誤）、「聖靈充滿」拆成兩個詞（術語不認得）、機構全名全部切碎（專有名詞沒有）。

這些不是挑出來的極端案例，而是繁體中文都會遇到的查詢斷字詞問題，jieba 家族也有人幫忙做了繁體套件，但我覺得不太適合我的用途，所以我改用 CKIP 系列，心酸旅程可以參考我之前寫的文章～

---

## 解法：三層疊加

研究與測試了一段時間後，我發現繁體中文搜尋的問題**不在搜尋引擎，在預處理**。做好分詞和索引，任何搜尋引擎都能受益。

最後疊加了三層：

### 第一層：CKIP 分詞

中研院開發的 [ckip-transformers](https://github.com/ckiplab/ckip-transformers)，用 Transformer 模型做繁體中文分詞，品質遠超 jieba。我選了最小的 albert-tiny 模型——只有 50MB，CPU 就能跑，而且跑了一輪 benchmark 後發現和 bert-base（大 10 倍）的分詞結果**幾乎一樣**。

### 第二層：Bigram 索引

把中文字兩兩組合：「聖靈充滿」→「聖靈」「靈充」「充滿」。

這是一個很笨但很有效的方法——確保任何子字串都能搜到，不管分詞器怎麼切，CKIP 提供精確匹配，bigram 保底不漏。

### 第三層：領域字典

告訴分詞器哪些詞不要拆開。「台北靈糧堂」是一個完整的機構名，不要切成「台北/靈糧/堂」。

字典從哪來？用 CKIP 的 NER（命名實體辨識）從文章裡自動提取人名、機構名、地名，然後人工微調，我從 8,000+ 篇文章提取出 900+ 個專有名詞。

---

## 實戰數據

在 8,000+ 篇繁體中文文章上跑了 80 組 benchmark query：

- **CKIP + bigram**：21% 的查詢 Top-1 結果獲得改善（17 好轉，3 變差）
- **albert-tiny vs bert-base**：分詞結果完全一致，速度快 4 倍
- **自訂字典**（915 詞）：搜「靈糧教牧宣教神學院」直接命中，不再被切碎

改善的幅度不算驚天動地，但這是在已經有 embedding + hybrid search 的基礎上再疊加的效果。光靠 embedding 搜尋已經能解決 80% 的問題，分詞 + bigram 處理的是剩下那 20%——而那 20% 往往是使用者最在意的精確查詢。

---

## trad-zh-search：搜尋引擎無關的預處理工具

把上面三層打包成一個 Python 套件，和搜尋引擎完全解耦：

```bash
pip install trad-zh-search
```

三行就能用：

```python
from trad_zh_search import tokenize

result = tokenize("轉型正義委員會的調查報告")
print(result.bigrams)   # ['轉型', '型正', '正義', '義委', ...]
print(result.tokens)    # CKIP 分詞結果
print(result.used_ckip) # True / False
```

### 不用手寫字典

最省心的功能是自動建字典 —— 丟一批文件進去，CKIP NER 自動提取專有名詞：

```python
from trad_zh_search import build_dictionary, save_dictionary

texts = [open(f).read() for f in my_articles]
my_dict = build_dictionary(texts, min_freq=2)
save_dictionary(my_dict, "my_domain.yaml")
```

NER 提取完再人工過一遍就好，比從零開始寫字典輕鬆太多了。

### 不綁定搜尋引擎

目前有 Meilisearch adapter，一行就能把分詞結果轉成 Meilisearch 的多欄位格式。未來會加 Elasticsearch、SQLite FTS5、Orama 等 adapter。

核心邏輯和搜尋引擎完全無關——你拿 `TokenResult` 裡的 tokens 和 bigrams 去餵任何搜尋引擎都行。

### 不裝 CKIP 也能用

CKIP 底層需要 PyTorch（~700MB），不是每個環境都方便裝，trad-zh-search 設計成 CKIP 為可選依賴——沒裝的話自動退回 bigram-only 模式，降級但可用，仍然比純 jieba 好。

---

## 開源 & 字典

這個工具完全開源（MIT），GitHub 在這裡：

👉 [https://github.com/notoriouslab/trad-zh-search](https://github.com/notoriouslab/trad-zh-search)

首發附帶了一份**基督教繁中字典**——從教會文章裡提取的 915 個專有名詞（人名、機構名、神學術語），加上 137 組別名映射和 14 組同義詞。這份字典本身就是用 trad-zh-search 的 `build_dictionary` 產生的，算是自己吃自己的狗食 XD

字典本身也歡迎貢獻——如果你有法律、醫療、教育等領域的繁中專有名詞，歡迎開 PR 加入。

---

## 幾個學到的教訓

### 1. NLP 最佳分詞 ≠ 搜尋最佳分詞

CKIP 的 97.6% F1 是語法正確度指標，但搜尋更重視 recall（不漏結果）。所以我們不是只用 CKIP，而是 CKIP + bigram 疊加——精確匹配靠 CKIP，召回靠 bigram。

### 2. 自動提取字典有盲點

NER 只認命名實體（人名/機構/地名），不認領域術語。我一開始用 NER 提取了 1,400 個詞，直到抽檢才發現——整本聖經 66 卷書的書卷名一個都沒有。「以西結書」在 CKIP 眼裡被切成「以西/結書」，但 NER 不會把它標記為實體。

教訓：**自動提取後一定要跑領域覆蓋率檢查。**

### 3. 字典清理比提取更花時間

NER 從 8,000 篇文章提取了 1,400 個詞，清理到最後剩 915 個。要移除的包括：通用英文名（David、Grace）、一般姓名（非公眾人物）、NER 黏合錯誤（兩個人名黏在一起）。自動提取給你起跑線，但最後一哩路還是要人工稍微過濾一下。

### 4. 預處理比搜尋引擎重要

投入在分詞和 bigram 預處理上的時間，比調整搜尋引擎參數的 ROI 高很多，做好預處理，換任何搜尋引擎都能直接受益。

---

## 技術棧一覽

```
你的文本 → trad-zh-search → 搜尋引擎（Meilisearch / Elasticsearch / ...）
```

| 元件 | 是什麼 | 需要裝嗎 |
|------|--------|---------|
| CKIP (ckip-transformers) | 中研院繁中分詞，Transformer 模型 | 選裝 |
| albert-tiny | CKIP 分詞模型，~50MB，CPU 可跑 | 隨 CKIP 自動下載 |
| Bigram | CJK 字符兩兩組合，保底不漏 | 內建 |
| 領域字典 | YAML 專有名詞表 | 內建基督教字典，也可自建 |
| PyYAML | YAML 讀寫 | 自動安裝 |

**最小安裝**只需要 PyYAML，就能用 bigram 模式。完整安裝加上 CKIP 約 750MB（主要是 PyTorch）。

---

## 相關連結

- **GitHub**: [notoriouslab/trad-zh-search](https://github.com/notoriouslab/trad-zh-search)
- **PyPI**: [trad-zh-search](https://pypi.org/project/trad-zh-search/)
- **系列文章**：
  - [（一）繁體中文全文搜尋引擎實戰筆記：選型與架構設計](https://jacobmei.com/blog/2026/0320-1gj9sx/)
  - [（二）繁體中文全文搜尋引擎實戰筆記：建置實戰與測試](https://jacobmei.com/blog/2026/0320-1kx9dt/)
  - [（三）繁體中文全文搜尋引擎實戰筆記：進階優化與系統評估](https://jacobmei.com/blog/2026/0320-7gwwf6/)

如果你也在做繁體中文搜尋，歡迎試用、回報問題、或貢獻字典，然後可以的話，也記得在 github 上給我一個星星 :P
