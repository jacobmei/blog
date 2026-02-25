#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import fg from "fast-glob";

const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toPosixPath = (value) => value.split(path.sep).join("/");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    distDir: "dist",
    recordPath: "docs/web3-ipfs-releases.json",
    maxRetries: 3,
    retryBaseMs: 1200,
    pinName: ""
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run") options.dryRun = true;
    if (arg === "--dist" && args[i + 1]) options.distDir = args[++i];
    if (arg === "--record" && args[i + 1]) options.recordPath = args[++i];
    if (arg === "--max-retries" && args[i + 1]) options.maxRetries = Number(args[++i]);
    if (arg === "--retry-ms" && args[i + 1]) options.retryBaseMs = Number(args[++i]);
    if (arg === "--name" && args[i + 1]) options.pinName = String(args[++i]).trim();
  }

  if (!Number.isInteger(options.maxRetries) || options.maxRetries < 1) {
    throw new Error("Invalid --max-retries value");
  }
  if (!Number.isInteger(options.retryBaseMs) || options.retryBaseMs < 0) {
    throw new Error("Invalid --retry-ms value");
  }

  return options;
};

const listDistFiles = async (distDirAbs) => {
  const files = await fg(["**/*"], {
    cwd: distDirAbs,
    absolute: true,
    onlyFiles: true,
    dot: false
  });
  return files
    .map((absPath) => ({
      absPath,
      relPath: toPosixPath(path.relative(distDirAbs, absPath))
    }))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));
};

const computeDistDigest = async (entries) => {
  const hash = crypto.createHash("sha256");
  for (const entry of entries) {
    const content = await fs.readFile(entry.absPath);
    hash.update(entry.relPath);
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
};

const getGitSha = async () => {
  try {
    const head = await fs.readFile(path.resolve(".git/HEAD"), "utf8");
    const trimmed = head.trim();
    if (trimmed.startsWith("ref: ")) {
      const ref = trimmed.slice(5).trim();
      const refPath = path.resolve(".git", ref);
      return (await fs.readFile(refPath, "utf8")).trim();
    }
    return trimmed;
  } catch {
    return "unknown";
  }
};

const buildPinataFormData = async (entries, pinName) => {
  const form = new FormData();
  for (const entry of entries) {
    const content = await fs.readFile(entry.absPath);
    const blob = new Blob([content]);
    form.append("file", blob, entry.relPath);
  }
  form.append("pinataMetadata", JSON.stringify({ name: pinName }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1, wrapWithDirectory: true }));
  return form;
};

const uploadDirectoryToPinata = async ({ entries, jwt, pinName, maxRetries, retryBaseMs }) => {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const form = await buildPinataFormData(entries, pinName);
      const response = await fetch(PINATA_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`
        },
        body: form
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Pinata upload failed (${response.status}): ${text.slice(0, 400)}`);
      }

      const payload = await response.json();
      if (!payload?.IpfsHash) {
        throw new Error("Pinata upload response missing IpfsHash");
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(retryBaseMs * attempt);
      }
    }
  }

  throw lastError ?? new Error("Pinata upload failed");
};

const ensureArrayFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`${filePath} must contain a JSON array`);
    }
    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const main = async () => {
  const options = parseArgs();
  const distDirAbs = path.resolve(options.distDir);
  const recordPathAbs = path.resolve(options.recordPath);

  const stat = await fs.stat(distDirAbs).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Dist directory not found: ${distDirAbs}. Run npm run build first.`);
  }

  const entries = await listDistFiles(distDirAbs);
  if (entries.length === 0) {
    throw new Error(`Dist directory is empty: ${distDirAbs}`);
  }

  const releaseId = new Date().toISOString().replace(/[:.]/g, "-");
  const gitSha = await getGitSha();
  const distDigest = await computeDistDigest(entries);
  const pinName = options.pinName || `mashbean-blog-${releaseId}`;

  const baseRecord = {
    releaseId,
    releasedAt: new Date().toISOString(),
    gitSha,
    provider: "pinata",
    distDir: toPosixPath(path.relative(process.cwd(), distDirAbs)),
    fileCount: entries.length,
    distDigest
  };

  if (options.dryRun) {
    const dryRunRecord = {
      ...baseRecord,
      dryRun: true,
      cid: null,
      gatewayUrl: null
    };
    console.log(JSON.stringify(dryRunRecord, null, 2));
    return;
  }

  const pinataJwt = process.env.IPFS_PINATA_JWT?.trim();
  if (!pinataJwt) {
    throw new Error("Missing IPFS_PINATA_JWT env var");
  }

  const result = await uploadDirectoryToPinata({
    entries,
    jwt: pinataJwt,
    pinName,
    maxRetries: options.maxRetries,
    retryBaseMs: options.retryBaseMs
  });

  const cid = String(result.IpfsHash);
  const releaseRecord = {
    ...baseRecord,
    dryRun: false,
    cid,
    pinSize: result.PinSize ?? null,
    pinTimestamp: result.Timestamp ?? null,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}/`,
    ipfsUrl: `ipfs://${cid}/`
  };

  await fs.mkdir(path.dirname(recordPathAbs), { recursive: true });
  const existing = await ensureArrayFile(recordPathAbs);
  existing.push(releaseRecord);
  await fs.writeFile(recordPathAbs, `${JSON.stringify(existing, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(releaseRecord, null, 2));
};

main().catch((error) => {
  console.error(`[web3-publish-ipfs] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
