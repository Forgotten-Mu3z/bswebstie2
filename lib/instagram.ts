// Instagram archive types and display helpers, shared by the server pages
// and the gallery. The data comes from scripts/import-instagram.mjs.

export type InstagramSlide =
  | { type: 'image'; src: string; width: number; height: number }
  | {
      type: 'video';
      /** null when the file is too big to host; link to Instagram instead. */
      src: string | null;
      poster: string | null;
      width: number;
      height: number;
    };

export type InstagramPost = {
  code: string;
  type: 'photo' | 'carousel' | 'reel';
  url: string;
  postedAt: string;
  /** Text from the archive; not re-checked against Instagram word for word. */
  caption?: string;
  /** Instagram's own image description, used only as alt text. */
  description?: string;
  thumb: string | null;
  slides: InstagramSlide[];
};

export const INSTAGRAM_FILTERS = {
  all: 'All',
  posts: 'Posts',
  reels: 'Reels',
} as const;
export type InstagramFilter = keyof typeof INSTAGRAM_FILTERS;

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Muscat',
});

export const postDate = (post: Pick<InstagramPost, 'postedAt'>) =>
  dateFormat.format(new Date(post.postedAt));

export const postKind = (post: Pick<InstagramPost, 'type'>) =>
  post.type === 'reel'
    ? 'Reel'
    : post.type === 'carousel'
      ? 'Carousel'
      : 'Photo';

/** srcset for a grid tile: 240px and 480px squares from the importer. */
export const thumbSrcSet = (thumb: string) =>
  `${thumb.replace(/thumb\.webp$/, 'thumb-240.webp')} 240w, ${thumb} 480w`;

export const THUMB_SIZES =
  '(min-width: 1280px) 200px, (min-width: 1024px) 24vw, (min-width: 640px) 32vw, 48vw';

/** First line of a caption without emoji or hashtags, for alt text and titles. */
export function captionHeadline(caption: string | undefined, max = 110) {
  const line =
    (caption ?? '')
      .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
      .replace(/#[\p{L}\p{N}_]+/gu, '')
      .split('\n')
      .map((part) =>
        part
          .replace(/[━─_=*•|]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .find((part) => part.length > 2) ?? '';
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

export function postAlt(post: InstagramPost) {
  if (post.description) return captionHeadline(post.description, 240);
  const headline = captionHeadline(post.caption);
  const base = `Instagram ${postKind(post).toLowerCase()} from ${postDate(post)}`;
  return headline ? `${base}: ${headline}` : `${base} by Black Shark Gaming`;
}
