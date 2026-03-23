import { spawn } from "node:child_process";

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("close", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`exit ${code}`))));
    child.on("error", reject);
  });

try {
  await run("python3", ["scripts/tokenize-search-index.py"]);
  await run("node", ["scripts/build-minisearch-index.mjs"]);
  console.log("[search] Search index build complete.");
} catch (err) {
  console.warn("[search] Index build failed:", err.message);
  console.warn("[search] Falling back to raw search-index.json (no bigrams).");
}
