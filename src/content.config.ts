import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const notes = defineCollection({
  // Load Markdown and MDX files in the `src/content/notes/` directory.
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  // Type-check frontmatter using a schema
  schema: () =>
    z.object({
      title: z.string(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      image: z.string().optional(),
      // For hierarchical organization
      chapter: z.number().optional(), // e.g., 1, 2, 3
      section: z.number().optional(), // e.g., 1, 2, 3 (within a chapter)
      description: z.string().optional(),
      docType: z.string().optional()
    })
})

const about = defineCollection({
  // Load Markdown files in the `src/content/about/` directory.
  loader: glob({ base: './src/content/about', pattern: '**/*.md' }),
  // Type-check frontmatter using a schema
  schema: z.object({})
})

export const collections = { notes, about }
