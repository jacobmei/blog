#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ethers } from "ethers";

const execFileAsync = promisify(execFile);

const ENS_REGISTRY_MAINNET = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const ENS_REGISTRY_ABI = ["function resolver(bytes32 node) external view returns (address)"];
const PUBLIC_RESOLVER_ABI = ["function contenthash(bytes32 node) external view returns (bytes)"];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    recordPath: "docs/web3-ipfs-releases.json",
    releaseId: "",
    ensName: process.env.PUBLIC_TIP_ENS_NAME?.trim() || "mashbean.eth",
    gatewayBase: "https://gateway.pinata.cloud/ipfs/",
    checkEthLimo: true
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--record" && args[i + 1]) options.recordPath = String(args[++i]).trim();
    if (arg === "--release-id" && args[i + 1]) options.releaseId = String(args[++i]).trim();
    if (arg === "--name" && args[i + 1]) options.ensName = String(args[++i]).trim();
    if (arg === "--gateway" && args[i + 1]) options.gatewayBase = String(args[++i]).trim();
    if (arg === "--no-eth-limo") options.checkEthLimo = false;
  }
  return options;
};

const readRecords = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Release record file must be a JSON array");
  return parsed;
};

const pickRecord = (records, releaseId) => {
  if (releaseId) return records.find((item) => item?.releaseId === releaseId) ?? null;
  for (let i = records.length - 1; i >= 0; i -= 1) {
    if (records[i]?.cid) return records[i];
  }
  return null;
};

const checkGateway = async (cid, gatewayBase) => {
  const url = `${gatewayBase.replace(/\/+$/, "")}/${cid}/`;
  const response = await fetch(url, { method: "GET", redirect: "follow" });
  const text = await response.text();
  return {
    url,
    ok: response.ok && /<html/i.test(text),
    status: response.status
  };
};

const checkIpns = async (ipnsName, cid) => {
  const { stdout } = await execFileAsync("ipfs", ["name", "resolve", `/ipns/${ipnsName}`], {
    maxBuffer: 1024 * 1024
  });
  const resolved = stdout.trim();
  return {
    ipnsName,
    resolved,
    expected: `/ipfs/${cid}`,
    ok: resolved === `/ipfs/${cid}`
  };
};

const checkEnsContenthash = async (ensName, expectedHex) => {
  const rpc = process.env.PUBLIC_WEB3_RPC_URL?.trim();
  const chainId = Number(process.env.PUBLIC_WEB3_CHAIN_ID || "1");
  if (!rpc) {
    return {
      ok: false,
      skipped: true,
      reason: "PUBLIC_WEB3_RPC_URL is missing"
    };
  }
  const provider = new ethers.providers.JsonRpcProvider(rpc, chainId);
  const node = ethers.utils.namehash(ensName);
  const registry = new ethers.Contract(ENS_REGISTRY_MAINNET, ENS_REGISTRY_ABI, provider);
  const resolverAddress = await registry.resolver(node);
  if (!resolverAddress || resolverAddress === ethers.constants.AddressZero) {
    return { ok: false, skipped: false, reason: "resolver not set", resolver: resolverAddress };
  }
  const resolver = new ethers.Contract(resolverAddress, PUBLIC_RESOLVER_ABI, provider);
  const currentHex = ethers.utils.hexlify(await resolver.contenthash(node));
  return {
    ok: currentHex.toLowerCase() === String(expectedHex || "").toLowerCase(),
    skipped: false,
    resolver: resolverAddress,
    currentHex,
    expectedHex
  };
};

const checkEthLimo = async (ensName) => {
  const url = `https://${ensName}.limo/`;
  const response = await fetch(url, { method: "GET", redirect: "follow" });
  const text = await response.text();
  return {
    url,
    ok: response.ok && /<html/i.test(text),
    status: response.status
  };
};

const main = async () => {
  const options = parseArgs();
  const recordPathAbs = path.resolve(options.recordPath);
  const records = await readRecords(recordPathAbs);
  const target = pickRecord(records, options.releaseId);
  if (!target) throw new Error("No release record found");
  if (!target.cid) throw new Error("Target release has no CID");

  const checks = {};
  checks.gateway = await checkGateway(target.cid, options.gatewayBase);

  if (target?.ipns?.name) {
    checks.ipns = await checkIpns(target.ipns.name, target.cid);
  } else {
    checks.ipns = { ok: false, skipped: true, reason: "ipns.name missing in release record" };
  }

  if (target?.ensContenthash?.contenthashHex) {
    checks.ensContenthash = await checkEnsContenthash(options.ensName, target.ensContenthash.contenthashHex);
  } else {
    checks.ensContenthash = { ok: false, skipped: true, reason: "ensContenthash.contenthashHex missing in release record" };
  }

  if (options.checkEthLimo) {
    checks.ethLimo = await checkEthLimo(options.ensName);
  }

  const pass = Object.values(checks)
    .filter((item) => !item?.skipped)
    .every((item) => item?.ok === true);

  const result = {
    checkedAt: new Date().toISOString(),
    releaseId: target.releaseId ?? null,
    cid: target.cid,
    checks,
    pass
  };
  console.log(JSON.stringify(result, null, 2));
  if (!pass) process.exit(1);
};

main().catch((error) => {
  console.error(`[web3-healthcheck] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
