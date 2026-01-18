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
      image: z.string().optional()
    })
})

const about = defineCollection({
  // Load Markdown files in the `src/content/about/` directory.
  loader: glob({ base: './src/content/about', pattern: '**/*.md' }),
  // Type-check frontmatter using a schema
  schema: z.object({})
})

export const collections = { notes, about }
