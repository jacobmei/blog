#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

function printUsage() {
  console.log(`Usage: node scripts/batch-generate-images-openai.mjs [options]\n
Options:
  --input <path>         Input JSON file (default: scripts/home-cover-prompts.json)
  --out-dir <path>       Output directory for generated images (default: public/images/covers/home)
  --report <path>        Report JSON path (default: scripts/openai-image-batch-report.json)
  --model <name>         OpenAI image model (default: gpt-image-1)
  --size <WxH>           Image size (default: 1536x1024)
  --quality <value>      Image quality (default: high)
  --format <png|jpeg|webp>  Output format (default: png)
  --compression <0-100>  Compression level for jpeg/webp (default: 90, ignored for png)
  --concurrency <n>      Parallel requests (default: 3)
  --retries <n>          Retry count per image (default: 2)
  --timeout-ms <n>       Request timeout (default: 90000)
  --overwrite            Overwrite existing files
  --dry-run              Validate and print plan without calling API
  --help                 Show this help

Environment:
  OPENAI_API_KEY         Required unless --dry-run
`);
}

function parseArgs(argv) {
  const options = {
    input: "scripts/home-cover-prompts.json",
    outDir: "public/images/covers/home",
    report: "scripts/openai-image-batch-report.json",
    model: "gpt-image-1",
    size: "1536x1024",
    quality: "high",
    format: "png",
    compression: 90,
    concurrency: 3,
    retries: 2,
    timeoutMs: 90000,
    overwrite: false,
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--overwrite") {
      options.overwrite = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    i += 1;

    if (arg === "--input") options.input = value;
    else if (arg === "--out-dir") options.outDir = value;
    else if (arg === "--report") options.report = value;
    else if (arg === "--model") options.model = value;
    else if (arg === "--size") options.size = value;
    else if (arg === "--quality") options.quality = value;
    else if (arg === "--format") options.format = value;
    else if (arg === "--compression") options.compression = Number.parseInt(value, 10);
    else if (arg === "--concurrency") options.concurrency = Number.parseInt(value, 10);
    else if (arg === "--retries") options.retries = Number.parseInt(value, 10);
    else if (arg === "--timeout-ms") options.timeoutMs = Number.parseInt(value, 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error("--concurrency must be an integer >= 1");
  }
  if (!Number.isInteger(options.retries) || options.retries < 0) {
    throw new Error("--retries must be an integer >= 0");
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1000) {
    throw new Error("--timeout-ms must be an integer >= 1000");
  }
  if (!Number.isInteger(options.compression) || options.compression < 0 || options.compression > 100) {
    throw new Error("--compression must be an integer between 0 and 100");
  }

  return options;
}

function toAbsolute(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

function normalizePromptEntry(entry, index) {
  if (typeof entry === "string") {
    return {
      id: `item-${String(index + 1).padStart(3, "0")}`,
      prompt: entry,
      negativePrompt: "",
      outFile: `item-${String(index + 1).padStart(3, "0")}.png`
    };
  }

  if (!entry || typeof entry !== "object") {
    throw new Error(`Invalid item at index ${index}`);
  }

  const prompt = typeof entry.prompt === "string" ? entry.prompt.trim() : "";
  if (!prompt) throw new Error(`Item ${index} missing prompt`);

  const id =
    (typeof entry.file === "string" && entry.file.trim()) ||
    (typeof entry.id === "string" && entry.id.trim()) ||
    `item-${String(index + 1).padStart(3, "0")}`;

  const coverPath = typeof entry.coverPng === "string" ? entry.coverPng.trim() : "";
  let outFile = "";
  if (coverPath) {
    outFile = path.basename(coverPath);
  } else if (typeof entry.outFile === "string" && entry.outFile.trim()) {
    outFile = entry.outFile.trim();
  } else {
    outFile = `${id.replace(/\.md$/i, "")}.png`;
  }

  if (!/\.(png|webp|jpe?g)$/i.test(outFile)) {
    outFile = `${outFile}.png`;
  }

  return {
    id,
    prompt,
    negativePrompt: typeof entry.negativePrompt === "string" ? entry.negativePrompt.trim() : "",
    outFile
  };
}

async function loadItems(inputPath) {
  const raw = await fs.readFile(inputPath, "utf8");
  const data = JSON.parse(raw);

  const sourceItems = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : null;
  if (!sourceItems) throw new Error("Input JSON must be an array or an object with items[]");

  return sourceItems.map((entry, index) => normalizePromptEntry(entry, index));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildPrompt(prompt, negativePrompt) {
  if (!negativePrompt) return prompt;
  return `${prompt}. Avoid: ${negativePrompt}`;
}

async function callImagesApi({ apiKey, model, size, quality, format, compression, prompt, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      model,
      prompt,
      size,
      quality,
      output_format: format
    };
    if (format !== "png") {
      payload.output_compression = compression;
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        typeof json?.error?.message === "string"
          ? `${json.error.message} (HTTP ${res.status})`
          : `HTTP ${res.status}: ${JSON.stringify(json)}`;
      throw new Error(errMsg);
    }

    const b64 = json?.data?.[0]?.b64_json;
    if (typeof b64 !== "string" || !b64.length) {
      throw new Error("No image data returned (missing data[0].b64_json)");
    }

    return Buffer.from(b64, "base64");
  } finally {
    clearTimeout(timer);
  }
}

async function runWithRetries(task, retries) {
  let attempt = 0;
  // Exponential backoff with cap to avoid hammering on rate limits.
  while (true) {
    try {
      return await task(attempt);
    } catch (error) {
      if (attempt >= retries) throw error;
      const waitMs = Math.min(8000, 600 * 2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      attempt += 1;
    }
  }
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const inputPath = toAbsolute(options.input);
  const outDir = toAbsolute(options.outDir);
  const reportPath = toAbsolute(options.report);

  const items = await loadItems(inputPath);
  await fs.mkdir(outDir, { recursive: true });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !options.dryRun) {
    throw new Error("OPENAI_API_KEY is required (or run with --dry-run)");
  }

  const startedAt = new Date().toISOString();
  const reportItems = [];
  let okCount = 0;
  let skipCount = 0;
  let failCount = 0;

  console.log(`[openai-image-batch] input: ${path.relative(ROOT, inputPath)}`);
  console.log(`[openai-image-batch] items: ${items.length}, concurrency: ${options.concurrency}, dryRun: ${options.dryRun}`);

  await runPool(items, options.concurrency, async (item, index) => {
    const outputPath = path.join(outDir, item.outFile);
    const relativeOutput = path.relative(ROOT, outputPath);
    const existsAlready = await exists(outputPath);

    if (existsAlready && !options.overwrite) {
      skipCount += 1;
      reportItems.push({
        index,
        id: item.id,
        status: "skipped",
        reason: "exists",
        output: relativeOutput
      });
      console.log(`[skip] ${item.id} -> ${relativeOutput}`);
      return;
    }

    if (options.dryRun) {
      okCount += 1;
      reportItems.push({
        index,
        id: item.id,
        status: "planned",
        output: relativeOutput,
        promptPreview: item.prompt.slice(0, 120)
      });
      console.log(`[plan] ${item.id} -> ${relativeOutput}`);
      return;
    }

    try {
      const finalPrompt = buildPrompt(item.prompt, item.negativePrompt);
      const imageBuffer = await runWithRetries(
        () =>
          callImagesApi({
            apiKey,
            model: options.model,
            size: options.size,
            quality: options.quality,
            format: options.format,
            compression: options.compression,
            prompt: finalPrompt,
            timeoutMs: options.timeoutMs
          }),
        options.retries
      );

      await fs.writeFile(outputPath, imageBuffer);
      okCount += 1;
      reportItems.push({
        index,
        id: item.id,
        status: "ok",
        output: relativeOutput,
        bytes: imageBuffer.length
      });
      console.log(`[ok] ${item.id} -> ${relativeOutput}`);
    } catch (error) {
      failCount += 1;
      reportItems.push({
        index,
        id: item.id,
        status: "failed",
        output: relativeOutput,
        error: error instanceof Error ? error.message : String(error)
      });
      console.error(`[failed] ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  const report = {
    startedAt,
    completedAt: new Date().toISOString(),
    input: path.relative(ROOT, inputPath),
    outDir: path.relative(ROOT, outDir),
    options: {
      model: options.model,
      size: options.size,
      quality: options.quality,
      format: options.format,
      compression: options.compression,
      concurrency: options.concurrency,
      retries: options.retries,
      timeoutMs: options.timeoutMs,
      overwrite: options.overwrite,
      dryRun: options.dryRun
    },
    summary: {
      total: items.length,
      ok: okCount,
      skipped: skipCount,
      failed: failCount
    },
    items: reportItems
  };

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`[openai-image-batch] report: ${path.relative(ROOT, reportPath)}`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[openai-image-batch] failed:", error);
  process.exitCode = 1;
});
