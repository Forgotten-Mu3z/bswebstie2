import archive from '@/data/instagram.json';
import type { InstagramFilter, InstagramPost } from '@/lib/instagram';

// The imported Instagram archive, newest first. Server-only: the full list is
// large, so pages send the browser only the posts they show.

const data = archive as unknown as {
  profile: string;
  handle: string;
  posts: InstagramPost[];
};

export const INSTAGRAM_PROFILE = data.profile;
export const INSTAGRAM_HANDLE = data.handle;
export const INSTAGRAM_PAGE_SIZE = 36;

const matches = (filter: InstagramFilter) => (post: InstagramPost) =>
  filter === 'all' ||
  (filter === 'reels' ? post.type === 'reel' : post.type !== 'reel');

export function instagramCounts() {
  const reels = data.posts.filter(matches('reels')).length;
  return { all: data.posts.length, posts: data.posts.length - reels, reels };
}

/** One page of posts; page is 1-based and clamped by the caller. */
export function listInstagramPosts(filter: InstagramFilter, page: number) {
  const all = data.posts.filter(matches(filter));
  const pages = Math.max(1, Math.ceil(all.length / INSTAGRAM_PAGE_SIZE));
  const start = (page - 1) * INSTAGRAM_PAGE_SIZE;
  return {
    posts: all.slice(start, start + INSTAGRAM_PAGE_SIZE),
    pages,
    total: all.length,
  };
}

export const latestInstagramPosts = (count: number) =>
  data.posts.filter((post) => post.thumb).slice(0, count);

export const newestInstagramDate = () => data.posts[0]?.postedAt ?? null;
