import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const pagefindBin = join(process.cwd(), "node_modules", ".bin", "pagefind");

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("close", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`exit ${code}`))));
    child.on("error", reject);
  });

try {
  await access(pagefindBin, constants.X_OK);
  await run(pagefindBin, ["--site", "dist", "--glob", "**/*.html"]);
  console.log("[search] Pagefind index generated.");
} catch {
  console.log(
    "[search] Pagefind is not installed in this environment. Using JSON fallback search index only."
  );
}
