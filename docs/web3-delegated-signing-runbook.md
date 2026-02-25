# mashbean.eth 授權簽名流程（建議）

## 目標
在不暴露主錢包私鑰的前提下，讓文章顯示：
- `Verified by signer.mashbean.eth (delegate of mashbean.eth)`

## Step 1. 建立專用簽名錢包
- 新建一個乾淨錢包（只拿來文章簽名，不放資產）。
- 記下地址與私鑰。
- 這把私鑰只用來 `signMessage`。

## Step 2. 建立 ENS 子網域
在 ENS 管理介面為 `mashbean.eth` 建立子網域：
- 名稱：`signer`
- 完整名：`signer.mashbean.eth`
- ETH Address：設為 Step 1 的專用簽名地址

## Step 3. 設定 primary name（反向解析）
用 Step 1 的專用錢包把 primary name 設成：
- `signer.mashbean.eth`

這一步會讓 forward / reverse 檢查完整通過。

## Step 4. 設定環境變數

```bash
PUBLIC_TIP_ENS_NAME=mashbean.eth
PUBLIC_SIGNER_ENS_NAME=signer.mashbean.eth
PUBLIC_WEB3_RPC_URL=https://mainnet.infura.io/v3/<your-key>
PUBLIC_WEB3_CHAIN_ID=1
WEB3_SIGNER_PRIVATE_KEY=0x<signer-private-key>
```

## Step 5. 先試跑，再正式簽名

```bash
npm run sign:posts -- --dry-run
npm run sign:posts
npm run sign:posts:check
```

預期：
- `sign:posts:check` 的 `unsigned` 會下降
- 前端文章頁狀態顯示 `Verified by signer.mashbean.eth (delegate of mashbean.eth)`

## Step 6. 驗收

```bash
npm run check
npm run build
```

## 風險控制
- 不要使用主資產地址的私鑰。
- `WEB3_SIGNER_PRIVATE_KEY` 不寫進 repo，不出現在截圖與 commit。
- 建議只在本機 shell 臨時 export，或放在 CI Secret。
