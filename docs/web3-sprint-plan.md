# Web3 功能導入 Sprint 清單

## 範圍
本計畫不包含：Arweave、SIWE、Lens。
本計畫包含：打賞系統、ENS 驗證、文章簽名驗證、IPFS/IPNS、`.eth.limo` 上線。

## Sprint 目標
在不做 `Arweave / SIWE / Lens` 的前提下，完成：
`打賞 + ENS 驗證 + 文章簽名驗證 + IPFS/IPNS + .eth.limo`

## Sprint 1（7 天）：站內功能可用

### Day 1：專案基線與環境變數
- 任務：定義 `PUBLIC_TIP_ENS_NAME=mashbean.eth`、RPC、`chainId`、簽名用私鑰來源（本機/CI secret）。
- 驗收：本地與 CI 都可讀取設定，缺值會報明確錯誤。

### Day 2-3：打賞元件
- 任務：做打賞區塊（ENS 名稱、解析後地址、EIP-681 link、QR code、copy button）。
- 驗收：文章頁可一鍵開錢包；link 包含正確 chain 與地址。

### Day 3-4：ENS 解析與防 spoofing
- 任務：實作 forward/reverse 驗證，僅在雙向一致時顯示「已驗證 ENS」。
- 驗收：偽造 primary name 不會顯示 verified 標記。

### Day 5-6：文章簽名驗證（離線簽名）
- 任務：為每篇文章產生 `contentHash + signature + signer`；前端驗簽。
- 驗收：內容被改動後驗簽失敗；未簽名文章顯示未驗證狀態。

### Day 7：整合測試與修正
- 任務：端到端跑一次「文章頁 -> 驗 ENS -> 打賞 -> 驗簽」流程。
- 驗收：核心流程無 blocking bug，產出 Sprint 1 release note。

## Sprint 2（7 天）：去中心化發布上線

### Day 1-2：IPFS 發布腳本
- 任務：build 後自動上傳 IPFS、pin、保存 CID（含版本對照）。
- 驗收：每次發布都有唯一 CID，舊 CID 可回訪。

### Day 3-4：IPNS 指向最新版本
- 任務：發布後更新 IPNS 到最新 CID。
- 驗收：IPNS 名稱可解析到新內容，舊版仍可用 CID 存取。

### Day 5：ENS contenthash 綁定
- 任務：把 `mashbean.eth` contenthash 指到 IPNS（或先 IPFS 再切 IPNS）。
- 驗收：contenthash 更新成功，可從 gateway 正常讀取。

### Day 6：`.eth.limo` 驗證
- 任務：確認 `https://mashbean.eth.limo` 可讀到當前版本。
- 驗收：桌機與手機皆可載入；更新流程後網址不需改。

### Day 7：監控與回滾
- 任務：加檢查腳本（CID 可讀、IPNS 可解、contenthash 一致）；保留上一版 CID 快速回滾。
- 驗收：部署失敗可在 5 分鐘內回到上一版。

## 交付定義（DoD）
1. 文章頁固定顯示打賞區且可付款。
2. ENS verified 只在 forward/reverse 通過時顯示。
3. 已簽名文章可驗證，篡改必失敗。
4. 每次部署有 CID，可用 IPNS 指到最新。
5. `mashbean.eth.limo` 可穩定訪問最新站點。

## 里程碑建議
- 里程碑 A（Sprint 1 結束）：站內 Web3 功能可用。
- 里程碑 B（Sprint 2 結束）：去中心化發布流程可用且可回滾。

## 後續可擴充（目前不納入）
- SIWE：錢包登入與權限系統。
- Lens：社交互動整合。
- Arweave：永久保存層。
