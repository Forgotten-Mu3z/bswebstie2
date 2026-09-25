'use client';

import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  GalleryHorizontal,
  Play,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  postAlt,
  postDate,
  postKind,
  THUMB_SIZES,
  thumbSrcSet,
  type InstagramPost,
} from '@/lib/instagram';
import { buttonClass } from '@/components/ui/button';
import { Modal } from '@/components/ui/overlay';

const arrow =
  'grid size-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80 disabled:opacity-0';

function Slide({ post, index }: { post: InstagramPost; index: number }) {
  const slide = post.slides[index];
  if (!slide)
    return (
      <p className="p-6 text-center text-sm text-fg-muted">
        This media is only on Instagram.
      </p>
    );
  if (slide.type === 'image')
    return (
      <Image
        src={slide.src}
        alt={
          index === 0 ? postAlt(post) : `${postAlt(post)} (slide ${index + 1})`
        }
        width={slide.width}
        height={slide.height}
        unoptimized
        className="h-full w-full object-contain"
      />
    );
  if (slide.src)
    return (
      // Loads only when this slide is open; nothing plays until pressed.
      // oxlint-disable-next-line jsx-a11y/media-has-caption -- Instagram posts come without captions files
      <video
        key={slide.src}
        src={slide.src}
        poster={slide.poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
      />
    );
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-full w-full"
    >
      {slide.poster ? (
        <Image
          src={slide.poster}
          alt={postAlt(post)}
          width={slide.width}
          height={slide.height}
          unoptimized
          className="h-full w-full object-contain opacity-70"
        />
      ) : null}
      <span className="absolute inset-0 grid place-items-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-black/75 px-4 py-2 text-sm font-semibold text-white">
          <Play aria-hidden="true" className="size-4" /> Watch on Instagram
        </span>
      </span>
    </a>
  );
}

function Lightbox({
  posts,
  index,
  onIndex,
}: {
  posts: InstagramPost[];
  index: number | null;
  onIndex: (index: number | null) => void;
}) {
  const [slide, setSlide] = useState(0);
  const post = index === null ? null : posts[index];
  const count = post?.slides.length ?? 0;
  // Left/right arrows move between slides while the lightbox is open (a
  // focused video keeps its own arrow keys for seeking).
  useEffect(() => {
    if (!post || count < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLVideoElement) return;
      if (event.key === 'ArrowRight')
        setSlide((current) => Math.min(count - 1, current + 1));
      if (event.key === 'ArrowLeft')
        setSlide((current) => Math.max(0, current - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [post, count]);

  const go = (next: number) => {
    setSlide(0);
    onIndex(next);
  };

  return (
    <Modal
      open={Boolean(post)}
      onOpenChange={(open) => {
        if (!open) {
          setSlide(0);
          onIndex(null);
        }
      }}
      title={post ? `${postKind(post)} · ${postDate(post)}` : ''}
      className="max-w-5xl"
      footer={
        post && index !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className={buttonClass('ghost', 'md', 'disabled:opacity-40')}
            >
              <ChevronLeft aria-hidden="true" className="size-4" /> Newer
            </button>
            <button
              type="button"
              disabled={index === posts.length - 1}
              onClick={() => go(index + 1)}
              className={buttonClass('ghost', 'md', 'disabled:opacity-40')}
            >
              Older <ChevronRight aria-hidden="true" className="size-4" />
            </button>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('secondary', 'md', 'ml-auto')}
            >
              <ExternalLink aria-hidden="true" className="size-4" /> View on
              Instagram
            </a>
          </div>
        ) : null
      }
    >
      {post ? (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="relative h-[min(62dvh,620px)] overflow-hidden rounded-md bg-black">
            <Slide post={post} index={slide} />
            {count > 1 ? (
              <>
                <div className="absolute inset-y-0 left-2 flex items-center">
                  <button
                    type="button"
                    aria-label="Previous slide"
                    disabled={slide === 0}
                    onClick={() => setSlide(slide - 1)}
                    className={arrow}
                  >
                    <ChevronLeft aria-hidden="true" className="size-5" />
                  </button>
                </div>
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    type="button"
                    aria-label="Next slide"
                    disabled={slide === count - 1}
                    onClick={() => setSlide(slide + 1)}
                    className={arrow}
                  >
                    <ChevronRight aria-hidden="true" className="size-5" />
                  </button>
                </div>
                <p
                  aria-live="polite"
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs text-white"
                >
                  {slide + 1} / {count}
                </p>
              </>
            ) : null}
          </div>
          <div className="min-w-0">
            {post.caption ? (
              <p
                dir="auto"
                className="whitespace-pre-line break-words text-sm leading-6 text-fg"
              >
                {post.caption}
              </p>
            ) : (
              <p className="text-sm text-fg-muted">
                No caption saved for this post. Open it on Instagram to read it.
              </p>
            )}
            <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-fg-subtle">
              Prices and offers are from the day this was posted. Ask us on
              WhatsApp for today’s price.
            </p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

/** Square grid of posts; opens a lightbox, or Instagram with Ctrl/Cmd-click. */
export function InstagramGallery({
  posts,
  eager = 6,
}: {
  posts: InstagramPost[];
  eager?: number;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4 xl:grid-cols-6">
        {posts.map((post, index) => (
          <li key={post.code}>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-haspopup="dialog"
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                )
                  return;
                event.preventDefault();
                setOpen(index);
              }}
              className="group relative block aspect-square overflow-hidden rounded-md bg-ink-850"
            >
              {post.thumb ? (
                // oxlint-disable-next-line nextjs/no-img-element -- pre-sized thumbnails picked with srcset
                <img
                  src={post.thumb}
                  srcSet={thumbSrcSet(post.thumb)}
                  sizes={THUMB_SIZES}
                  alt={postAlt(post)}
                  width={480}
                  height={480}
                  loading={index < eager ? 'eager' : 'lazy'}
                  fetchPriority={index < 2 ? 'high' : undefined}
                  decoding="async"
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              ) : (
                <span className="grid size-full place-items-center p-3 text-center text-xs text-fg-muted">
                  {postAlt(post)}
                </span>
              )}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 font-mono text-[11px] text-white/90">
                <span>{postDate(post)}</span>
                {post.type === 'reel' ? (
                  <Clapperboard aria-hidden="true" className="size-4" />
                ) : post.type === 'carousel' ? (
                  <GalleryHorizontal aria-hidden="true" className="size-4" />
                ) : null}
              </span>
              <span className="sr-only">
                {postKind(post)}
                {post.type === 'carousel'
                  ? `, ${post.slides.length} slides`
                  : ''}
                . Opens a preview.
              </span>
            </a>
          </li>
        ))}
      </ul>
      <Lightbox posts={posts} index={open} onIndex={setOpen} />
    </>
  );
}
