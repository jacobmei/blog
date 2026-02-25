#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ethers } from "ethers";

const execFileAsync = promisify(execFile);

const ENS_REGISTRY_MAINNET = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

const ENS_REGISTRY_ABI = [
  "function resolver(bytes32 node) external view returns (address)"
];

const PUBLIC_RESOLVER_ABI = [
  "function contenthash(bytes32 node) external view returns (bytes)",
  "function setContenthash(bytes32 node, bytes hash) external"
];

const encodeVarint = (value) => {
  if (!Number.isInteger(value) || value < 0) throw new Error("Invalid varint value");
  const out = [];
  let next = value;
  while (next >= 0x80) {
    out.push((next & 0x7f) | 0x80);
    next >>= 7;
  }
  out.push(next);
  return Uint8Array.from(out);
};

const concatBytes = (...parts) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const toHex = (bytes) => `0x${Buffer.from(bytes).toString("hex")}`;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    name: process.env.PUBLIC_TIP_ENS_NAME?.trim() || "mashbean.eth",
    cid: "",
    ipns: "",
    dryRun: false,
    skipChainCheck: false,
    recordPath: "docs/web3-ipfs-releases.json",
    releaseId: ""
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--name" && args[i + 1]) options.name = String(args[++i]).trim();
    if (arg === "--cid" && args[i + 1]) options.cid = String(args[++i]).trim();
    if (arg === "--ipns" && args[i + 1]) options.ipns = String(args[++i]).trim();
    if (arg === "--dry-run") options.dryRun = true;
    if (arg === "--skip-chain-check") options.skipChainCheck = true;
    if (arg === "--record" && args[i + 1]) options.recordPath = String(args[++i]).trim();
    if (arg === "--release-id" && args[i + 1]) options.releaseId = String(args[++i]).trim();
  }

  const hasCid = options.cid !== "";
  const hasIpns = options.ipns !== "";
  if ((hasCid ? 1 : 0) + (hasIpns ? 1 : 0) !== 1) {
    throw new Error("Provide exactly one target: --cid <cid> or --ipns <ipns-name>");
  }
  if (!options.name) throw new Error("Missing ENS name (--name)");
  return options;
};

const readRecords = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Release record must be a JSON array");
    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
};

const encodeIpfsContenthash = async (cid) => {
  const { stdout } = await execFileAsync("ipfs", ["cid", "format", "-v", "1", "-b", "base16", cid], {
    maxBuffer: 1024 * 1024
  });
  const cidBase16 = stdout.trim().toLowerCase();
  if (!cidBase16.startsWith("f")) {
    throw new Error(`Unexpected CID base16 output: ${cidBase16}`);
  }
  const cidBytes = Uint8Array.from(Buffer.from(cidBase16.slice(1), "hex"));
  const codecIpfsNs = encodeVarint(0xe3);
  return concatBytes(codecIpfsNs, cidBytes);
};

const encodeIpnsContenthash = (ipnsName) => {
  const valueBytes = Uint8Array.from(Buffer.from(ipnsName, "utf8"));
  const codecIpnsNs = encodeVarint(0xe5);
  return concatBytes(codecIpnsNs, valueBytes);
};

const getProvider = () => {
  const rpcUrl = process.env.PUBLIC_WEB3_RPC_URL?.trim();
  const chainId = Number(process.env.PUBLIC_WEB3_CHAIN_ID || "1");
  if (!rpcUrl) throw new Error("Missing PUBLIC_WEB3_RPC_URL env var");
  return new ethers.providers.JsonRpcProvider(rpcUrl, chainId);
};

const resolveRecordIndex = (records, options, targetCid) => {
  if (options.releaseId) return records.findIndex((item) => item?.releaseId === options.releaseId);
  if (targetCid) {
    for (let i = records.length - 1; i >= 0; i -= 1) {
      if (records[i]?.cid === targetCid) return i;
    }
  }
  return -1;
};

const main = async () => {
  const options = parseArgs();
  const targetType = options.cid ? "ipfs" : "ipns";
  const target = options.cid || options.ipns;
  const contenthashBytes =
    targetType === "ipfs" ? await encodeIpfsContenthash(options.cid) : encodeIpnsContenthash(options.ipns);
  const contenthashHex = toHex(contenthashBytes);
  const nowIso = new Date().toISOString();

  if (options.dryRun && options.skipChainCheck) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          skipChainCheck: true,
          name: options.name,
          targetType,
          target,
          contenthashHex
        },
        null,
        2
      )
    );
    return;
  }

  const provider = getProvider();
  const node = ethers.utils.namehash(options.name);
  const registry = new ethers.Contract(ENS_REGISTRY_MAINNET, ENS_REGISTRY_ABI, provider);
  const resolverAddress = await registry.resolver(node);
  if (!resolverAddress || resolverAddress === ethers.constants.AddressZero) {
    throw new Error(`No resolver set for ENS name: ${options.name}`);
  }

  const resolverRead = new ethers.Contract(resolverAddress, PUBLIC_RESOLVER_ABI, provider);
  const currentContenthashHex = ethers.utils.hexlify(await resolverRead.contenthash(node));

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          name: options.name,
          targetType,
          target,
          node,
          resolver: resolverAddress,
          currentContenthashHex,
          nextContenthashHex: contenthashHex,
          changed: currentContenthashHex.toLowerCase() !== contenthashHex.toLowerCase()
        },
        null,
        2
      )
    );
    return;
  }

  const privateKey = process.env.WEB3_SIGNER_PRIVATE_KEY?.trim();
  if (!privateKey) throw new Error("Missing WEB3_SIGNER_PRIVATE_KEY env var");

  const signer = new ethers.Wallet(privateKey, provider);
  const resolverWrite = new ethers.Contract(resolverAddress, PUBLIC_RESOLVER_ABI, signer);
  const tx = await resolverWrite.setContenthash(node, contenthashHex);
  const receipt = await tx.wait(1);
  const afterContenthashHex = ethers.utils.hexlify(await resolverRead.contenthash(node));

  if (afterContenthashHex.toLowerCase() !== contenthashHex.toLowerCase()) {
    throw new Error(`Contenthash post-check mismatch: expected ${contenthashHex}, got ${afterContenthashHex}`);
  }

  const recordPathAbs = path.resolve(options.recordPath);
  const records = await readRecords(recordPathAbs);
  const idx = resolveRecordIndex(records, options, targetType === "ipfs" ? options.cid : undefined);
  const update = {
    name: options.name,
    targetType,
    target,
    contenthashHex,
    resolver: resolverAddress,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber ?? null,
    updatedAt: nowIso
  };

  if (idx >= 0) {
    records[idx] = {
      ...records[idx],
      ensContenthash: update
    };
  } else {
    records.push({
      releaseId: `ens-contenthash-${nowIso.replace(/[:.]/g, "-")}`,
      releasedAt: nowIso,
      cid: targetType === "ipfs" ? options.cid : null,
      ensContenthash: update
    });
  }

  await fs.mkdir(path.dirname(recordPathAbs), { recursive: true });
  await fs.writeFile(recordPathAbs, `${JSON.stringify(records, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        ...update
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(`[web3-update-ens-contenthash] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
