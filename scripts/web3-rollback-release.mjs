#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    recordPath: "docs/web3-ipfs-releases.json",
    toReleaseId: "",
    toCid: "",
    ipnsKey: "self",
    ensName: process.env.PUBLIC_TIP_ENS_NAME?.trim() || "mashbean.eth",
    dryRun: true
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--record" && args[i + 1]) options.recordPath = String(args[++i]).trim();
    if (arg === "--to-release-id" && args[i + 1]) options.toReleaseId = String(args[++i]).trim();
    if (arg === "--to-cid" && args[i + 1]) options.toCid = String(args[++i]).trim();
    if (arg === "--ipns-key" && args[i + 1]) options.ipnsKey = String(args[++i]).trim();
    if (arg === "--name" && args[i + 1]) options.ensName = String(args[++i]).trim();
    if (arg === "--live") options.dryRun = false;
  }
  return options;
};

const readRecords = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Release record file must be a JSON array");
  return parsed;
};

const pickTarget = (records, options) => {
  if (options.toReleaseId) {
    return records.find((item) => item?.releaseId === options.toReleaseId) ?? null;
  }
  if (options.toCid) {
    return records.find((item) => item?.cid === options.toCid) ?? null;
  }
  const candidates = records.filter((item) => item?.cid);
  return candidates.length >= 2 ? candidates[candidates.length - 2] : null;
};

const runNodeScript = (scriptPath, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${scriptPath}) with exit code ${code}`));
    });
  });

const main = async () => {
  const options = parseArgs();
  const recordPathAbs = path.resolve(options.recordPath);
  const records = await readRecords(recordPathAbs);
  const target = pickTarget(records, options);

  if (!target || !target.cid) {
    throw new Error("Rollback target not found. Use --to-release-id or --to-cid.");
  }

  const ipnsName = [...records].reverse().find((item) => item?.ipns?.name)?.ipns?.name ?? null;

  const plan = {
    dryRun: options.dryRun,
    targetReleaseId: target.releaseId ?? null,
    targetCid: target.cid,
    ipnsKey: options.ipnsKey,
    ensName: options.ensName,
    ipnsName
  };

  if (options.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  await runNodeScript(path.resolve("scripts/web3-update-ipns.mjs"), [
    "--cid",
    target.cid,
    "--key",
    options.ipnsKey,
    "--record",
    options.recordPath,
    "--release-id",
    target.releaseId ?? ""
  ]);

  if (ipnsName) {
    await runNodeScript(path.resolve("scripts/web3-update-ens-contenthash.mjs"), [
      "--name",
      options.ensName,
      "--ipns",
      ipnsName,
      "--record",
      options.recordPath,
      "--release-id",
      target.releaseId ?? ""
    ]);
  }

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        targetReleaseId: target.releaseId ?? null,
        targetCid: target.cid,
        ensUpdated: Boolean(ipnsName)
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(`[web3-rollback-release] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
