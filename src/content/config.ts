import { defineCollection, z } from 'astro:content';

const notes = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        pubDate: z.coerce.date().optional(),
        updatedDate: z.coerce.date().optional(),
        image: z.string().optional(),
        chapter: z.number().optional(),
        section: z.number().optional(),
        docType: z.string().optional(), // 'exercise' or undefined
    }),
});

export const collections = { notes };
