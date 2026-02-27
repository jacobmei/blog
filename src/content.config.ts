import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    lead: z.string().nullish(),
    pubDate: z.coerce.date().nullish(),
    updatedDate: z.coerce.date().nullish(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    category: z.string().nullish(),
    cover: image().or(z.string()).nullish(),
    coverAlt: z.string().nullish(),
    lang: z.string().nullish(),
    canonicalURL: z.string().url().nullish(),
    author: z.string().nullish(),
    series: z.string().nullish(),
    seriesOrder: z.number().int().positive().nullish(),
    slug: z.string().nullish(),
    shortCode: z.string().nullish(),
    contentHash: z.string().nullish(),
    signature: z.string().nullish(),
    signer: z.string().nullish(),
    signatureVersion: z.string().nullish()
  })
});

export const collections = { blog };
