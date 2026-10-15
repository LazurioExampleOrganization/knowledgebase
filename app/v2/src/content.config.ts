import { defineCollection, z } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";

// The canonical pages live in data/v2/docs, outside the App generation, so
// that the content survives a new App generation unchanged. This is Starlight's
// own docs loader pointed at that directory instead of src/content/docs.
const docs = defineCollection({
  loader: glob({ base: "../../data/v2/docs", pattern: "**/[^_]*.{md,mdx}" }),
  schema: docsSchema({
    extend: z.object({
      status: z
        .enum(["draft", "review", "published", "canonical", "historical", "archived", "usable"])
        .optional(),
      owner: z.string().optional(),
      last_verified: z.union([z.string(), z.date()]).optional(),
      confidence: z.string().optional(),
      source_type: z.string().optional(),
      source_paths: z.array(z.string()).optional(),
      aliases: z.array(z.string()).optional(),
    }),
  }),
});

export const collections = { docs };
