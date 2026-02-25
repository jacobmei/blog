# Web3 Healthcheck + Rollback Runbook

## Healthcheck
```bash
npm run web3:healthcheck
```

檢查項目：
- CID gateway 可讀性
- IPNS 解析是否對到預期 CID（若有記錄）
- ENS contenthash 是否一致（若有記錄）
- `.eth.limo` 首頁是否可讀

可選參數：
```bash
node scripts/web3-healthcheck.mjs --release-id <id>
node scripts/web3-healthcheck.mjs --name mashbean.eth --gateway https://gateway.pinata.cloud/ipfs/
node scripts/web3-healthcheck.mjs --no-eth-limo
```

## Rollback（預設 dry-run）
```bash
npm run web3:rollback:dry
```

指定目標：
```bash
node scripts/web3-rollback-release.mjs --to-release-id <release-id>
node scripts/web3-rollback-release.mjs --to-cid <cid>
```

正式回滾（live）：
```bash
node scripts/web3-rollback-release.mjs --live --to-release-id <release-id> --ipns-key self --name mashbean.eth
```

說明：
- live 模式會先更新 IPNS 到目標 CID。
- 若 release 記錄中有可用 `ipns.name`，會再更新 ENS contenthash 指向該 IPNS 名稱。
