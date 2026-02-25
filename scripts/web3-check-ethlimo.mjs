#!/usr/bin/env node
const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    ensName: process.env.PUBLIC_TIP_ENS_NAME?.trim() || "mashbean.eth",
    articlePath: "/blog/",
    dryRun: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--name" && args[i + 1]) options.ensName = String(args[++i]).trim();
    if (arg === "--article-path" && args[i + 1]) options.articlePath = String(args[++i]).trim();
    if (arg === "--dry-run") options.dryRun = true;
  }

  if (!options.ensName) throw new Error("Missing ENS name");
  if (!options.articlePath.startsWith("/")) options.articlePath = `/${options.articlePath}`;
  return options;
};

const probe = async (url) => {
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow"
  });
  const text = await response.text();
  return {
    url,
    status: response.status,
    ok: response.ok,
    finalUrl: response.url,
    elapsedMs: Date.now() - startedAt,
    hasHtml: /<html/i.test(text)
  };
};

const main = async () => {
  const options = parseArgs();
  const baseUrl = `https://${options.ensName}.limo`;
  const homeUrl = `${baseUrl}/`;
  const articleUrl = `${baseUrl}${options.articlePath}`;

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          homeUrl,
          articleUrl
        },
        null,
        2
      )
    );
    return;
  }

  const home = await probe(homeUrl);
  const article = await probe(articleUrl);
  const pass = home.ok && article.ok && home.hasHtml && article.hasHtml;
  const result = { dryRun: false, home, article, pass };
  console.log(JSON.stringify(result, null, 2));
  if (!pass) process.exit(1);
};

main().catch((error) => {
  console.error(`[web3-check-ethlimo] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
