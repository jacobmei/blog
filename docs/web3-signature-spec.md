# Web3 文章簽名規格（Sprint 1）

## 版本
- `signatureVersion`: `mashbean.article.v1`

## Canonical payload 組成
簽名前會先組出固定 JSON 字串（`JSON.stringify`），欄位如下：

1. `version`
2. `slug`（目前使用文章檔名，即 `post.id`）
3. `title`
4. `description`
5. `pubDateISO`
6. `updatedDateISO`
7. `body`

其中 `body` 會先做正規化：
- 換行統一成 `\n`
- `trim()` 去掉前後空白

## 雜湊與簽名
1. `contentHash = keccak256(utf8(payload))`
2. `message = "mashbean.article.v1:${contentHash}"`
3. 以 `WEB3_SIGNER_PRIVATE_KEY` 對 `message` 進行 EIP-191 `signMessage`

## 驗證條件
文章頁顯示 `Verified by mashbean.eth` 的條件：
1. frontmatter 存在 `contentHash`、`signature`、`signer`
2. 重新計算後的 `contentHash` 與 frontmatter 一致
3. 由 `signature` recover 的地址與 `signer` 一致

任一條件不符即降級為 `unsigned` 或 `invalid`。
