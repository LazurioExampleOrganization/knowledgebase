import { defineCollection, z } from 'astro:content'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'

const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: z.object({
      status: z.enum([
        'draft',
        'review',
        'published',
        'canonical',
        'historical',
        'archived',
        'usable',
      ]).optional(),
      owner: z.string().optional(),
      last_verified: z.union([z.string(), z.date()]).optional(),
      confidence: z.string().optional(),
      source_type: z.string().optional(),
      source_paths: z.array(z.string()).optional(),
      aliases: z.array(z.string()).optional(),
    }),
  }),
})

export const collections = { docs }
