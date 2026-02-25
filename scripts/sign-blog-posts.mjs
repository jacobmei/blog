#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { ethers } from "ethers";

const SIGNATURE_VERSION = "mashbean.article.v1";
const BLOG_DIR = path.resolve("src/content/blog");

const normalizeBody = (body) => body.replace(/\r\n/g, "\n").trim();
const normalizeDateISO = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value ?? "").trim();
  return date.toISOString();
};

const buildPayload = ({ slug, title, description, pubDateISO, updatedDateISO, body }) =>
  JSON.stringify({
    version: SIGNATURE_VERSION,
    slug: String(slug ?? "").trim(),
    title: String(title ?? "").trim(),
    description: String(description ?? "").trim(),
    pubDateISO: normalizeDateISO(pubDateISO),
    updatedDateISO: normalizeDateISO(updatedDateISO),
    body: normalizeBody(String(body ?? ""))
  });

const computeHash = (payload) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(payload));
const signingMessage = (contentHash) => `${SIGNATURE_VERSION}:${contentHash}`;

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const dryRun = args.includes("--dry-run");
const fileArgIndex = args.indexOf("--file");
const fileFilter = fileArgIndex >= 0 ? args[fileArgIndex + 1] : null;

if (fileArgIndex >= 0 && !fileFilter) {
  console.error("[sign-blog-posts] Missing value for --file");
  process.exit(1);
}

const privateKey = process.env.WEB3_SIGNER_PRIVATE_KEY?.trim();
if (!privateKey && !checkOnly) {
  console.error("[sign-blog-posts] Missing WEB3_SIGNER_PRIVATE_KEY env var");
  process.exit(1);
}

const wallet = privateKey ? new ethers.Wallet(privateKey) : null;
const signerAddress = wallet?.address ?? null;

const patterns = fileFilter ? [fileFilter] : ["**/*.md", "**/*.mdx"];
const files = await fg(patterns, { cwd: BLOG_DIR, absolute: true });

if (files.length === 0) {
  console.log("[sign-blog-posts] No files matched");
  process.exit(0);
}

let changed = 0;
let verified = 0;
let unsigned = 0;
let invalid = 0;
let errors = 0;

for (const filePath of files) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  const slug = path.basename(filePath).replace(/\.(md|mdx)$/i, "");
  const payload = buildPayload({
    slug,
    title: parsed.data.title,
    description: parsed.data.description,
    pubDateISO: parsed.data.pubDate,
    updatedDateISO: parsed.data.updatedDate,
    body: parsed.content
  });

  const contentHash = computeHash(payload);
  const currentHash = String(parsed.data.contentHash ?? "").trim();
  const currentSig = String(parsed.data.signature ?? "").trim();
  const currentSigner = String(parsed.data.signer ?? "").trim();
  const currentVersion = String(parsed.data.signatureVersion ?? "").trim();

  if (checkOnly) {
    if (!currentHash || !currentSig || !currentSigner) {
      unsigned += 1;
      console.error(`! ${path.relative(process.cwd(), filePath)} missing signature metadata`);
      continue;
    }

    if (!ethers.utils.isAddress(currentSigner)) {
      errors += 1;
      console.error(`! ${path.relative(process.cwd(), filePath)} invalid signer address`);
      continue;
    }

    if (currentVersion && currentVersion !== SIGNATURE_VERSION) {
      errors += 1;
      console.error(
        `! ${path.relative(process.cwd(), filePath)} unsupported signatureVersion=${currentVersion}`
      );
      continue;
    }

    if (currentHash !== contentHash) {
      invalid += 1;
      console.error(`~ ${path.relative(process.cwd(), filePath)} contentHash mismatch`);
      continue;
    }

    try {
      const recovered = ethers.utils.getAddress(ethers.utils.verifyMessage(signingMessage(contentHash), currentSig));
      const expected = ethers.utils.getAddress(currentSigner);
      if (recovered !== expected) {
        invalid += 1;
        console.error(`~ ${path.relative(process.cwd(), filePath)} recovered signer mismatch`);
        continue;
      }
    } catch (error) {
      errors += 1;
      console.error(
        `! ${path.relative(process.cwd(), filePath)} signature verify error: ${
          error instanceof Error ? error.message : "unknown"
        }`
      );
      continue;
    }

    verified += 1;
    continue;
  }

  const signature = await wallet?.signMessage(signingMessage(contentHash));
  if (!signature) {
    console.error(`[sign-blog-posts] Missing signature for ${filePath}`);
    process.exit(1);
  }
  parsed.data.contentHash = contentHash;
  parsed.data.signature = signature;
  parsed.data.signer = signerAddress;
  parsed.data.signatureVersion = SIGNATURE_VERSION;

  const next = matter.stringify(parsed.content, parsed.data);
  if (next !== raw) {
    changed += 1;
    if (!dryRun) {
      await fs.writeFile(filePath, next, "utf8");
    }
  }

  const mark = currentHash === contentHash && currentSig === signature ? "=" : "~";
  console.log(`${mark} ${path.relative(process.cwd(), filePath)}`);
}

if (checkOnly) {
  console.log(`[sign-blog-posts] verified=${verified} invalid=${invalid} unsigned=${unsigned} errors=${errors}`);
  if (invalid > 0 || unsigned > 0 || errors > 0) {
    process.exit(1);
  }
} else {
  console.log(`[sign-blog-posts] changed=${changed} total=${files.length}${dryRun ? " (dry-run)" : ""}`);
}
