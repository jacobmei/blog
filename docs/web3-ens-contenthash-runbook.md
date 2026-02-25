# Web3 ENS Contenthash Runbook

## 目的
- 更新 ENS `contenthash`，指向最新 `IPNS`（或暫時直指 `IPFS` CID）。
- 寫入交易資訊到 `/Users/mashbean/Codex/docs/web3-ipfs-releases.json`。

## 參數
- `--name <ens-name>`：預設讀 `PUBLIC_TIP_ENS_NAME`（如 `mashbean.eth`）。
- 二選一：
  - `--ipns <ipns-name>`
  - `--cid <ipfs-cid>`

## Dry-run（純編碼）
```bash
npm run web3:ens:contenthash:dry
```

## Dry-run（連鏈比對 current/next）
```bash
export PUBLIC_WEB3_RPC_URL="https://mainnet.infura.io/v3/<key>"
export PUBLIC_WEB3_CHAIN_ID=1
npm run web3:ens:contenthash -- --dry-run --name mashbean.eth --ipns <ipns-name>
```

## Live（送交易）
```bash
export PUBLIC_WEB3_RPC_URL="https://mainnet.infura.io/v3/<key>"
export PUBLIC_WEB3_CHAIN_ID=1
export WEB3_SIGNER_PRIVATE_KEY="0x<private-key>"
npm run web3:ens:contenthash -- --name mashbean.eth --ipns <ipns-name>
```

## 成功條件
- 回傳 `txHash`。
- post-check `contenthash` 與預期一致。
- release record 含 `ensContenthash` 區塊：
  - `txHash`
  - `blockNumber`
  - `updatedAt`

## 常見錯誤
- `No resolver set for ENS name`
  - 該 ENS 未設定 resolver。
- `Missing PUBLIC_WEB3_RPC_URL`
  - 未設定 RPC。
- `Missing WEB3_SIGNER_PRIVATE_KEY`
  - Live 模式沒有簽名私鑰。
