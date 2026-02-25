# Web3 Sprint Checklist

## 使用方式
- 這份文件把 `/Users/mashbean/Codex/docs/web3-sprint-plan.md` 拆成可執行清單。
- 每個任務可直接轉成 1 張 issue。
- 建議欄位：`Owner`、`Estimate`、`Target`、`Status`。

## Sprint 1（7 天）：站內功能可用

### S1-01 環境變數與設定防呆
- [x] 新增並文件化必要設定：`PUBLIC_TIP_ENS_NAME`、`PUBLIC_WEB3_CHAIN_ID`、`PUBLIC_WEB3_RPC_URL`。
- [x] 定義簽名流程用 secrets（本機 `.env` + CI secrets），避免硬編碼私鑰。
- [x] 加入缺值檢查與清楚錯誤訊息（build 階段可提早失敗）。
- Owner:
- Estimate: 0.5 day
- 驗收命令:
```bash
npm run check
npm run build
```
- 完成定義：本地與 CI 都能成功讀取設定；缺值時能看懂錯誤。

### S1-02 打賞元件（EIP-681 + QR + Copy）
- [x] 新增打賞元件：顯示 `mashbean.eth`、解析後地址、付款按鈕。
- [x] 產生 EIP-681 付款連結（含 chainId）。
- [x] 支援 QR code 與一鍵複製地址。
- [x] 將元件嵌入文章頁版型。
- Owner:
- Estimate: 1.0 day
- 驗收命令:
```bash
npm run dev
npm run build
```
- 完成定義：文章頁可直接喚起錢包付款，且連結地址與 chain 正確。

### S1-03 ENS 解析與驗證（Anti-spoofing）
- [x] 實作 ENS 正向解析（name -> address）。
- [x] 實作 ENS 反向解析（address -> primary name）。
- [x] 實作 forward/reverse 一致性檢查，僅一致時顯示 `Verified ENS`。
- [x] 非一致場景顯示降級狀態（不顯示 verified）。
- Owner:
- Estimate: 1.0 day
- 驗收命令:
```bash
npm run check
npm run build
```
- 完成定義：偽造 primary name 不會顯示驗證標記。

### S1-04 文章簽名資料結構
- [x] 定義 frontmatter 欄位：`contentHash`、`signature`、`signer`、`signatureVersion`。
- [x] 選定固定 hash 輸入規格（例如 slug/title/date/body）。
- [x] 在文件中寫明 hash 組成，確保可重現。
- Owner:
- Estimate: 0.5 day
- 驗收命令:
```bash
npm run check
```
- 完成定義：資料結構可被 parser 與前端穩定讀取。

### S1-05 離線簽名腳本與前端驗簽
- [x] 新增腳本：對文章生成簽名並回填 metadata。
- [x] 文章頁加入驗簽流程，通過顯示 `Verified by mashbean.eth`。
- [x] 內容被篡改時，驗簽結果必須失敗。
- [x] 支援未簽名文章的降級顯示。
- Owner:
- Estimate: 1.5 days
- 驗收命令:
```bash
npm run check
npm run build
```
- 完成定義：已簽名文章可通過驗證；修改內容後驗證失敗。

### S1-06 Sprint 1 整合測試與發布註記
- [x] 跑完整流程：文章頁 -> ENS 驗證 -> 打賞 -> 驗簽。
- [x] 補齊已知限制與風險清單。
- [x] 產出 Sprint 1 release note。
- Owner:
- Estimate: 0.5 day
- 驗收命令:
```bash
npm run lint
npm run build
npm run preview
```
- 完成定義：無 blocking bug，且有可追蹤 release note。

## Sprint 2（7 天）：去中心化發布上線

### S2-01 IPFS 發布腳本
- [x] 新增部署腳本：build 後上傳 `dist/` 到 IPFS。
- [x] 實作 pin 流程與失敗重試策略。
- [x] 將 `release -> CID` 記錄到版本檔（`docs/web3-ipfs-releases.json`）。
- Owner:
- Estimate: 1.5 days
- 驗收命令:
```bash
npm run build
npm run web3:ipfs:publish
# 或先試跑
npm run web3:ipfs:publish:dry
```
- 完成定義：每次發布都有 CID，舊 CID 可回訪。

### S2-02 IPNS 更新流程
- [x] 新增 IPNS 發布步驟：把 IPNS 指到最新 CID。
- [x] 輸出 IPNS 名稱與對應 CID 到發布紀錄。
- [x] 增加更新失敗時的中止與告警。
- Owner:
- Estimate: 1.0 day
- 驗收命令:
```bash
npm run web3:ipns:update -- --cid <cid> --key <ipns-key-name>
# 或先試跑
npm run web3:ipns:update:dry
```
- 完成定義：IPNS 解析到最新內容，CID 歷史可回查。

### S2-03 ENS contenthash 綁定
- [x] 新增 contenthash 更新步驟（指向 IPNS；必要時保留直指 IPFS fallback）。
- [x] 發布紀錄保存交易 hash 與生效時間。
- [x] 實作 dry-run 模式，先驗證不送交易。
- Owner:
- Estimate: 1.0 day
- 驗收命令:
```bash
npm run web3:ens:contenthash -- --dry-run --name mashbean.eth --ipns <ipns-name>
npm run web3:ens:contenthash -- --name mashbean.eth --ipns <ipns-name>
```
- 完成定義：`mashbean.eth` contenthash 與發布紀錄一致。

### S2-04 .eth.limo 可用性驗證
- [x] 驗證 `https://mashbean.eth.limo` 可存取首頁與至少 1 篇文章（已提供檢查腳本）。
- [ ] 驗證手機與桌面瀏覽器的可讀性。
- [ ] 確認快取延遲窗口，記錄切版生效時間。
- Owner:
- Estimate: 0.5 day
- 驗收命令:
```bash
npm run web3:ethlimo:check
# 或先試跑
npm run web3:ethlimo:check:dry
```
- 完成定義：不需更改網址即可切到新內容版本。

### S2-05 監控、健康檢查、回滾
- [x] 新增健康檢查腳本：CID 可讀、IPNS 可解、contenthash 一致性。
- [x] 保留上一版 CID 快速回滾命令。
- [x] 寫入 runbook（故障處理步驟）。
- Owner:
- Estimate: 1.0 day
- 驗收命令:
```bash
npm run web3:healthcheck
npm run web3:rollback:dry
```
- 完成定義：部署失敗時可在 5 分鐘內回復上一版。

### S2-06 Sprint 2 上線驗收
- [ ] 全流程演練：build -> IPFS -> IPNS -> ENS contenthash -> .eth.limo 驗證。
- [ ] 輸出最終上線報告（含 CID、IPNS、交易 hash、驗證結果）。
- [ ] 清點待辦與後續優化項目。
- Owner:
- Estimate: 0.5 day
- 驗收命令:
```bash
npm run lint
npm run build
```
- 完成定義：去中心化發布流程可重複執行且有可追蹤紀錄。

## 全域 Definition of Done（DoD）
- [x] 文章頁固定顯示打賞區且可付款。
- [x] ENS verified 僅在 forward/reverse 通過時顯示。
- [x] 已簽名文章可驗證，篡改必失敗。
- [ ] 每次部署都有 CID，且 IPNS 指向最新版本。
- [ ] `mashbean.eth.limo` 可穩定訪問最新站點。

## 建議 issue labels
- `web3`
- `ens`
- `signing`
- `ipfs`
- `ipns`
- `deployment`
- `priority:high`
