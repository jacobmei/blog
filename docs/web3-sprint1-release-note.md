# Web3 Sprint 1 Release Note

## 完成項目

1. 環境設定與防呆
- 新增必要 env 讀取與驗證：
  - `PUBLIC_TIP_ENS_NAME`
  - `PUBLIC_WEB3_RPC_URL`
  - `PUBLIC_WEB3_CHAIN_ID`
  - `PUBLIC_SIGNER_ENS_NAME`（可選，未設定則回退 `PUBLIC_TIP_ENS_NAME`）
- 簽名私鑰改採 `WEB3_SIGNER_PRIVATE_KEY`（本機 `.env.local` / CI secret）。

2. 打賞元件（文章頁已上線）
- 新增：`/Users/mashbean/Codex/src/components/Web3TipJar.astro`
- 文章頁整合：`/Users/mashbean/Codex/src/pages/blog/[...slug].astro`
- 功能：
  - ENS 名稱展示與解析地址
  - EIP-681 付款連結（0.001 / 0.01 ETH）
  - QR code
  - 一鍵複製地址

3. ENS 驗證與 Anti-spoofing
- 新增：`/Users/mashbean/Codex/src/utils/ens.ts`
- 驗證流程：
  - forward: `name -> address`
  - reverse: `address -> primary name`
  - reverse-forward 二次確認
- 僅在一致時顯示 `Verified ENS`，其餘降級顯示 `Unverified ENS`。

4. 文章簽名驗證
- schema 新增 frontmatter 欄位：
  - `contentHash`
  - `signature`
  - `signer`
  - `signatureVersion`
- 新增：`/Users/mashbean/Codex/src/utils/articleSignature.ts`
- 文章頁顯示狀態：
  - `已簽名`
  - `未簽名`
  - `簽名異常`
- 新增可展開簽名細節面板（簽署地址、恢復地址、ENS 狀態、contentHash、signatureVersion）。

5. 離線簽名腳本
- 新增：`/Users/mashbean/Codex/scripts/sign-blog-posts.mjs`
- 指令：
  - `npm run sign:posts`
  - `npm run sign:posts -- --dry-run`
  - `npm run sign:posts -- --file <file>`
  - `npm run sign:posts:check`

6. 規格與文件
- 新增：`/Users/mashbean/Codex/docs/web3-signature-spec.md`
- 新增：`/Users/mashbean/Codex/docs/web3-delegated-signing-runbook.md`
- 更新 README（Web3 env 與簽名流程）

## 驗收結果

執行命令：
- `npm run check`
- `npm run build`
- `npm run sign:posts -- --dry-run`
- `npm run sign:posts`
- `npm run sign:posts:check`

結果：
- `check`: 通過（0 errors）
- `build`: 通過（Indexed 588 pages）
- `sign:posts -- --dry-run`: `changed=189 total=189`
- `sign:posts`: `changed=189 total=189`
- `sign:posts:check`: `verified=189 unsigned=0`

## 已知限制與風險

1. 新增文章仍需手動簽名
- 發佈前需執行 `npm run sign:posts`（或 CI 自動化）。

2. ENS 驗證依賴 RPC 可用性
- RPC 不可用時，打賞與 ENS 驗證會降級但頁面可建置。

3. 簽名權限管理
- `WEB3_SIGNER_PRIVATE_KEY` 僅可放在本機/CI secret，不能進版控。
- 建議逐步轉向 delegated signer（例如 `signer.mashbean.eth`）降低主錢包暴露面。
