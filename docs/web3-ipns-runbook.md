# Web3 IPNS Runbook

## 目的
- 將 IPNS 名稱更新到最新 CID。
- 把 IPNS 名稱與 CID 寫回 `/Users/mashbean/Codex/docs/web3-ipfs-releases.json`。

## 前置條件
- 本機已安裝並可使用 `ipfs` CLI。
- 已有可發布的 CID（先執行 IPFS publish）。
- 已建立可用的 IPNS key（例如 `self` 或自訂 key name）。

## 操作
1. 先試跑
```bash
npm run web3:ipns:update:dry
```
2. 正式更新
```bash
npm run web3:ipns:update -- --cid <cid> --key <ipns-key-name>
```

## 成功條件
- `ipfs name publish` 成功。
- `ipfs name resolve /ipns/<name>` 回傳同一個 `/ipfs/<cid>`。
- `docs/web3-ipfs-releases.json` 新增或更新 `ipns` 欄位。

## 常見錯誤
- `Missing --cid`
  - 忘記帶 CID。
- `Failed to parse ipfs publish output`
  - CLI 輸出格式與預期不同，或 publish 失敗。
- `IPNS resolve mismatch`
  - 發布後解析結果未一致，流程會中止並回傳錯誤。
