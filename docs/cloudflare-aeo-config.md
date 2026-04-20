# Cloudflare AEO 設定（for jacobmei.com）

> 目的：讓 jacobmei.com 通過 [isitagentready.com](https://isitagentready.com/) 的 AEO（Agent Experience Optimization）體檢。
> 靜態檔已於 `public/.well-known/` 建置完成，本文件記錄 Cloudflare dashboard 上需手動設定的 Transform Rules。

## 1. Link Response Headers（RFC 8288）

**位置**：Cloudflare Dashboard → `jacobmei.com` → Rules → Transform Rules → **Modify Response Header** → Create rule

**Rule name**：`Agent Discovery Link Headers`

**When incoming requests match**：
```
(http.request.uri.path eq "/") or (http.request.uri.path eq "/index.html")
```

**Then, modify response headers**：

| Operation  | Header name | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Set static | `Link`      | `</llms.txt>; rel="https://llmstxt.org/"; type="text/plain", </.well-known/mcp/server-card.json>; rel="service-desc"; type="application/json", </.well-known/agent-card.json>; rel="service-meta"; type="application/json", </.well-known/agent-skills/index.json>; rel="https://agentskills.io/rel/index"; type="application/json", </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </rss.xml>; rel="alternate"; type="application/rss+xml", </sitemap-index.xml>; rel="sitemap"; type="application/xml"` |

> 注意：單一 `Link` header 可包含多個以逗號分隔的 link-value。若 CF UI 不接受長字串，可拆成多條 Append 規則（同一 header name 允許多次 append）。

## 2. Content-Type for `/.well-known/api-catalog`

`api-catalog` 沒有副檔名，GitHub Pages 預設回 `application/octet-stream`。需強制設為 `application/linkset+json`。

**位置**：Transform Rules → **Modify Response Header** → Create rule

**Rule name**：`api-catalog linkset media type`

**When**：
```
http.request.uri.path eq "/.well-known/api-catalog"
```

**Set static**：`Content-Type` = `application/linkset+json`

## 3. 既有規則回顧（memory 已記錄）

- **Content-Signal header**：對所有路徑注入 `Content-Signal: ai-train=yes, search=yes, ai-input=yes`
- **Worker content negotiation**：`Accept: text/markdown` 時回傳對應 `.md` 鏡像（首頁特例 → `/llms.txt`）

## 4. 驗證

部署後用下列指令檢查：

```bash
# Link headers
curl -sI https://jacobmei.com/ | grep -i '^link:'

# api-catalog Content-Type
curl -sI https://jacobmei.com/.well-known/api-catalog | grep -i '^content-type:'

# agent skills index
curl -s https://jacobmei.com/.well-known/agent-skills/index.json | jq .

# MCP server card
curl -s https://jacobmei.com/.well-known/mcp/server-card.json | jq '.serverInfo'
```

## 5. 未處理項目

以下 isitagentready 項目因 blog 無保護資源、無登入流程，刻意跳過：

- OAuth/OIDC discovery（`openid-configuration`、`oauth-authorization-server`）
- OAuth Protected Resource Metadata（`oauth-protected-resource`）
- WebMCP（`navigator.modelContext`）— 需真互動工具才有意義，評估後再說
