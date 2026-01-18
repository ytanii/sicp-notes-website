import { getCollection, type CollectionEntry } from 'astro:content'

/**
 * Get all posts, filtering out posts whose filenames start with _
 */
export async function getFilteredPosts() {
  const posts = await getCollection('notes')
  return posts.filter((post: CollectionEntry<'notes'>) => !post.id.startsWith('_'))
}

/**
 * Get all posts sorted by publication date, filtering out posts whose filenames start with _
 */
export async function getSortedFilteredPosts() {
  const posts = await getFilteredPosts()
  return posts.sort(
    (a: CollectionEntry<'notes'>, b: CollectionEntry<'notes'>) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  )
}
