#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    cid: "",
    key: "self",
    recordPath: "docs/web3-ipfs-releases.json",
    releaseId: "",
    dryRun: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--cid" && args[i + 1]) options.cid = String(args[++i]).trim();
    if (arg === "--key" && args[i + 1]) options.key = String(args[++i]).trim();
    if (arg === "--record" && args[i + 1]) options.recordPath = String(args[++i]).trim();
    if (arg === "--release-id" && args[i + 1]) options.releaseId = String(args[++i]).trim();
    if (arg === "--dry-run") options.dryRun = true;
  }

  if (!options.cid) throw new Error("Missing --cid");
  if (!/^bafy[a-z0-9]+$/i.test(options.cid) && !/^Qm[a-zA-Z0-9]{44}$/.test(options.cid)) {
    throw new Error("Invalid CID format");
  }

  return options;
};

const loadRecords = async (recordPath) => {
  try {
    const raw = await fs.readFile(recordPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Record file must be a JSON array");
    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
};

const runIpfs = async (args) => {
  const { stdout, stderr } = await execFileAsync("ipfs", args, {
    maxBuffer: 1024 * 1024
  });
  return `${stdout}${stderr}`.trim();
};

const main = async () => {
  const options = parseArgs();
  const nowIso = new Date().toISOString();
  const publishPath = `/ipfs/${options.cid}`;

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          key: options.key,
          cid: options.cid,
          publishPath,
          updatedAt: nowIso
        },
        null,
        2
      )
    );
    return;
  }

  const publishOutput = await runIpfs(["name", "publish", "--key", options.key, publishPath]);
  const match = publishOutput.match(/Published to (\S+):\s*(\/ipfs\/\S+)/);
  if (!match) {
    throw new Error(`Failed to parse ipfs publish output: ${publishOutput}`);
  }
  const ipnsName = match[1];
  const publishedPath = match[2];
  const resolvedPath = await runIpfs(["name", "resolve", `/ipns/${ipnsName}`]);

  if (resolvedPath !== publishedPath) {
    throw new Error(`IPNS resolve mismatch: expected ${publishedPath}, got ${resolvedPath}`);
  }

  const recordPathAbs = path.resolve(options.recordPath);
  const records = await loadRecords(recordPathAbs);
  const targetIndex =
    options.releaseId !== ""
      ? records.findIndex((item) => item?.releaseId === options.releaseId)
      : [...records].reverse().findIndex((item) => item?.cid === options.cid);

  const resolvedIndex =
    options.releaseId !== ""
      ? targetIndex
      : targetIndex >= 0
        ? records.length - 1 - targetIndex
        : -1;

  const ipnsInfo = {
    name: ipnsName,
    key: options.key,
    path: publishedPath,
    resolvedPath,
    updatedAt: nowIso
  };

  if (resolvedIndex >= 0) {
    records[resolvedIndex] = {
      ...records[resolvedIndex],
      ipns: ipnsInfo
    };
  } else {
    records.push({
      releaseId: `ipns-${nowIso.replace(/[:.]/g, "-")}`,
      releasedAt: nowIso,
      cid: options.cid,
      ipns: ipnsInfo
    });
  }

  await fs.mkdir(path.dirname(recordPathAbs), { recursive: true });
  await fs.writeFile(recordPathAbs, `${JSON.stringify(records, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        cid: options.cid,
        ...ipnsInfo
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(`[web3-update-ipns] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
