#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const KNOWN_KEYS = new Set([
  "title",
  "date",
  "last_modified_at",
  "updated",
  "draft",
  "published",
  "categories",
  "category",
  "tags",
  "excerpt",
  "summary",
  "permalink",
  "layout",
  "cover",
  "coverAlt",
  "cover_alt",
  "image",
  "image_alt",
  "lang",
  "canonical_url",
  "canonicalURL",
  "author",
  "series",
  "seriesOrder",
  "series_order",
  "slug"
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;

    const arg = raw.slice(2);
    const [k, inlineValue] = arg.split("=", 2);
    if (inlineValue !== undefined) {
      args[k] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[k] = true;
      continue;
    }

    args[k] = next;
    i += 1;
  }
  return args;
}

function asString(value) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
}

function toArray(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  const raw = String(value).trim();
  if (!raw) return [];
  if (raw.includes(",")) return raw.split(",").map((v) => v.trim()).filter(Boolean);
  return [raw];
}

function toDateString(value) {
  if (!value) return undefined;
  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T00:00:00+08:00`;
  }

  const normalized = raw
    .replace(" +0800", "+08:00")
    .replace(" +0000", "+00:00")
    .replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function inferDateFromFilename(filename) {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})-/);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}-${match[3]}T00:00:00+08:00`;
}

function detectLiquid(text) {
  const warnings = [];
  if (/{%[\s\S]*?%}/.test(text)) {
    warnings.push("Detected Liquid tag syntax `{% ... %}` in body.");
  }
  if (/{{[\s\S]*?}}/.test(text)) {
    warnings.push("Detected Liquid variable syntax `{{ ... }}` in body.");
  }
  return warnings;
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/[>#*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveDescription(data, body) {
  const direct = asString(data.summary ?? data.excerpt);
  if (direct) return direct;

  const plain = stripMarkdown(body);
  if (!plain) return "待補描述";
  return plain.length > 140 ? `${plain.slice(0, 140)}…` : plain;
}

function toOptionalNumber(value, warnings, fieldName) {
  if (value === null || value === undefined || String(value).trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    warnings.push(`Field ${fieldName} is not a valid number and was dropped.`);
    return undefined;
  }
  return parsed;
}

function inferSlugFromPermalink(permalink) {
  const raw = asString(permalink);
  if (!raw) return undefined;
  const cleaned = raw.split("?")[0].replace(/\/+$/g, "");
  const parts = cleaned.split("/").filter(Boolean);
  const tail = parts.at(-1);
  if (!tail) return undefined;
  return tail
    .normalize("NFKC")
    .toLocaleLowerCase("zh-TW")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashText(input) {
  let hash = 2166136261;
  for (const ch of input) {
    hash ^= ch.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parseScalar(raw) {
  const text = raw.trim();
  if (!text) return "";

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }

  if (/^(true|false)$/i.test(text)) {
    return text.toLowerCase() === "true";
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }

  if (/^\[(.*)\]$/.test(text)) {
    const inner = text.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((item) => item.trim())
      .map((item) => {
        if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) {
          return item.slice(1, -1);
        }
        return item;
      })
      .filter(Boolean);
  }

  return text;
}

function parseFrontmatterBlock(block) {
  const data = {};
  const lines = block.split(/\r?\n/);
  let currentListKey = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listMatch = line.match(/^\s*-\s*(.+)$/);
    if (listMatch && currentListKey) {
      if (!Array.isArray(data[currentListKey])) data[currentListKey] = [];
      data[currentListKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!match) {
      currentListKey = null;
      continue;
    }

    const key = match[1];
    const valueText = match[2];

    if (valueText === "") {
      data[key] = [];
      currentListKey = key;
      continue;
    }

    data[key] = parseScalar(valueText);
    currentListKey = null;
  }

  return data;
}

function extractFrontmatter(raw) {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { data: {}, content: raw };
  }

  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== "---") {
    return { data: {}, content: raw };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { data: {}, content: raw };
  }

  const frontmatterText = lines.slice(1, endIndex).join("\n");
  const body = lines.slice(endIndex + 1).join("\n");

  return {
    data: parseFrontmatterBlock(frontmatterText),
    content: body
  };
}

function quoteYamlString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function serializeYaml(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      if (value.length === 0) {
        lines.push("  []");
      } else {
        for (const item of value) {
          if (typeof item === "number" || typeof item === "boolean") {
            lines.push(`  - ${item}`);
          } else {
            lines.push(`  - ${quoteYamlString(item)}`);
          }
        }
      }
      continue;
    }

    if (typeof value === "boolean" || typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${quoteYamlString(value)}`);
    }
  }
  return lines.join("\n");
}

function mapFrontmatter(frontmatter, sourcePath, body, warnings) {
  const sourceName = path.basename(sourcePath).replace(/\.(md|markdown)$/i, "");
  const title = asString(frontmatter.title) ?? sourceName.replace(/-/g, " ");
  const pubDateSource = frontmatter.date ?? inferDateFromFilename(sourceName);
  const pubDate = toDateString(pubDateSource);

  if (!pubDate) {
    throw new Error("Cannot parse `date` and filename does not contain a valid date prefix.");
  }

  const updatedDate = toDateString(frontmatter.last_modified_at ?? frontmatter.updated);
  const categories = toArray(frontmatter.categories ?? frontmatter.category);
  const tags = toArray(frontmatter.tags);

  const category = categories[0];
  if (categories.length > 1) {
    warnings.push(`Multiple categories found (${categories.join(", ")}). Use first category only.`);
  }

  const draft = frontmatter.draft === true || frontmatter.published === false;
  const description = deriveDescription(frontmatter, body);

  const cover = asString(frontmatter.cover ?? frontmatter.image);
  const coverAlt = asString(frontmatter.coverAlt ?? frontmatter.cover_alt ?? frontmatter.image_alt);
  const lang = asString(frontmatter.lang);
  let canonicalURL = asString(frontmatter.canonicalURL ?? frontmatter.canonical_url);

  if (canonicalURL) {
    try {
      new URL(canonicalURL);
    } catch {
      warnings.push("canonicalURL is not a valid absolute URL and was dropped.");
      canonicalURL = undefined;
    }
  }

  const author = asString(frontmatter.author);
  const series = asString(frontmatter.series);
  const seriesOrder = toOptionalNumber(
    frontmatter.seriesOrder ?? frontmatter.series_order,
    warnings,
    "seriesOrder"
  );
  let slug = asString(frontmatter.slug);

  if (frontmatter.layout) {
    warnings.push("`layout` was removed (not used in Astro content collections).");
  }

  if (frontmatter.permalink) {
    if (!slug) {
      slug = inferSlugFromPermalink(frontmatter.permalink);
      if (slug) {
        warnings.push("`slug` inferred from `permalink`.");
      } else {
        warnings.push("Could not infer slug from `permalink`. Check permalink map report.");
      }
    }
  }

  for (const key of Object.keys(frontmatter)) {
    if (!KNOWN_KEYS.has(key)) {
      warnings.push(`Unmapped frontmatter key: ${key}`);
    }
  }

  const mapped = {
    title,
    description,
    pubDate,
    ...(updatedDate ? { updatedDate } : {}),
    ...(draft ? { draft: true } : {}),
    tags,
    ...(category ? { category } : {}),
    ...(cover ? { cover } : {}),
    ...(coverAlt ? { coverAlt } : {}),
    ...(lang ? { lang } : {}),
    ...(canonicalURL ? { canonicalURL } : {}),
    ...(author ? { author } : {}),
    ...(series ? { series } : {}),
    ...(seriesOrder !== undefined ? { seriesOrder } : {}),
    ...(slug ? { slug } : {})
  };

  return {
    mapped,
    legacyPermalink: asString(frontmatter.permalink)
  };
}

function buildOutputName(sourceFile) {
  return path.basename(sourceFile).replace(/\.(markdown|md)$/i, ".md");
}

function buildAstroUrl(mapped, outputName) {
  const pub = toDateString(mapped.pubDate) ?? inferDateFromFilename(outputName) ?? new Date().toISOString();
  const date = new Date(pub);
  const year = date.getFullYear();
  const monthDay = `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const identity = `${outputName}|${pub}|${asString(mapped.slug) ?? ""}`;
  const shortCode = hashText(identity).toString(36).padStart(6, "0").slice(0, 6);
  return `/blog/${year}/${monthDay}-${shortCode}/`;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeText(filePath, content) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, content, "utf8");
}

async function walkMarkdownFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(fullPath)));
      continue;
    }

    if (/\.(md|markdown)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();

  const sourceDir = path.resolve(cwd, args.source ?? "_posts");
  const outputDir = path.resolve(cwd, args.output ?? "src/content/blog");
  const reportPath = path.resolve(cwd, args.report ?? "reports/migration-report.json");
  const permalinkMapPath = path.resolve(cwd, args["permalink-map"] ?? "reports/permalink-map.csv");
  const dryRun = Boolean(args["dry-run"]);

  const files = await walkMarkdownFiles(sourceDir);

  const usedNames = new Set();
  const reportEntries = [];
  const permalinkRows = ["source_file,output_file,legacy_permalink,new_url"];

  let successCount = 0;
  let failedCount = 0;
  let warningCount = 0;

  for (const file of files) {
    const relSource = path.relative(cwd, file);
    const warnings = [];

    try {
      const raw = await fs.readFile(file, "utf8");
      const parsed = extractFrontmatter(raw);

      warnings.push(...detectLiquid(parsed.content));

      const { mapped, legacyPermalink } = mapFrontmatter(parsed.data, file, parsed.content, warnings);

      let outputName = buildOutputName(file);
      if (usedNames.has(outputName)) {
        const stem = outputName.replace(/\.md$/i, "");
        let i = 2;
        while (usedNames.has(`${stem}-${i}.md`)) i += 1;
        outputName = `${stem}-${i}.md`;
        warnings.push(`Output filename collision. Renamed to ${outputName}.`);
      }
      usedNames.add(outputName);

      const outputPath = path.join(outputDir, outputName);
      const relOutput = path.relative(cwd, outputPath);

      const yaml = serializeYaml(mapped).trimEnd();
      const normalizedBody = parsed.content.startsWith("\n") ? parsed.content : `\n${parsed.content}`;
      const contentOut = `---\n${yaml}\n---${normalizedBody}`;

      if (!dryRun) {
        await writeText(outputPath, contentOut);
      }

      if (legacyPermalink) {
        permalinkRows.push(
          `"${relSource}","${relOutput}","${legacyPermalink}","${buildAstroUrl(mapped, outputName)}"`
        );
      }

      warningCount += warnings.length;
      successCount += 1;

      reportEntries.push({
        status: "success",
        source: relSource,
        output: relOutput,
        warnings
      });
    } catch (error) {
      failedCount += 1;
      reportEntries.push({
        status: "failed",
        source: relSource,
        error: error instanceof Error ? error.message : String(error),
        warnings
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    sourceDir: path.relative(cwd, sourceDir),
    outputDir: path.relative(cwd, outputDir),
    summary: {
      total: files.length,
      success: successCount,
      failed: failedCount,
      warnings: warningCount
    },
    entries: reportEntries
  };

  if (!dryRun) {
    await writeText(reportPath, JSON.stringify(report, null, 2));
    await writeText(permalinkMapPath, `${permalinkRows.join("\n")}\n`);
  }

  console.log("Jekyll to Astro migration report");
  console.log(`- total: ${files.length}`);
  console.log(`- success: ${successCount}`);
  console.log(`- failed: ${failedCount}`);
  console.log(`- warnings: ${warningCount}`);
  console.log(`- dryRun: ${dryRun}`);
  console.log(`- report: ${path.relative(cwd, reportPath)}`);
  console.log(`- permalink map: ${path.relative(cwd, permalinkMapPath)}`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
