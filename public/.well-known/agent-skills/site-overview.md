---
name: site-overview
type: http
version: 1.0.0
---

# Site Overview for LLMs

以 llms.txt 格式回傳站點導覽、近期文章與主題分類，是 AI 代理「第一次訪問」時的最佳入口。

## Usage

```
GET https://jacobmei.com/llms.txt
Accept: text/plain
```

或直接訪問網站根目錄 `/` 並附 `Accept: text/markdown`，Cloudflare Worker 會回傳 llms.txt。

## Response

符合 [llms.txt 標準](https://llmstxt.org/)，結構：

```markdown
# Jacob Mei Blog

> 站點簡介（繁體中文個人 blog，聚焦 fintech、Web3、信仰與哲學）

## Recent Posts

- [文章標題](url): 摘要
- ...

## Topics

- [Fintech](url): 相關文章列表
- [Web3](url): 相關文章列表
- ...

## Resources

- [content-index.json](url): 結構化文章索引
- [rss.xml](url): RSS feed
```

## Related Skills

- `list-posts`：更結構化的 JSON 索引，適合程式處理
- `read-blog-post`：抓取單篇文章 markdown 原檔
