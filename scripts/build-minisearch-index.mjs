/**
 * Build-time: read tokenized docs, build MiniSearch index, serialize to JSON.
 */

import { readFileSync, writeFileSync } from "node:fs";
import MiniSearch from "minisearch";

const INPUT = "dist/search-tokenized.json";
const OUTPUT = "dist/search-minisearch.json";

const docs = JSON.parse(readFileSync(INPUT, "utf-8"));

const miniSearch = new MiniSearch({
  idField: "id",
  fields: ["title_bigram", "desc_bigram", "content_bigram", "tags_bigram"],
  storeFields: ["title", "description", "url", "pubDate", "tags", "topics"],
  tokenize: (text) => text.split(/\s+/).filter(Boolean),
  searchOptions: {
    boost: { title_bigram: 6, tags_bigram: 4, desc_bigram: 2, content_bigram: 1 },
    prefix: true,
  },
});

miniSearch.addAll(docs);

const serialized = JSON.stringify(miniSearch);
writeFileSync(OUTPUT, serialized, "utf-8");

console.log(`[search] MiniSearch index: ${docs.length} docs, ${(serialized.length / 1024).toFixed(0)} KB → ${OUTPUT}`);
