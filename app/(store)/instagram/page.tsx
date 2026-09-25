import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import { INSTAGRAM_FILTERS, type InstagramFilter } from '@/lib/instagram';
import {
  breadcrumbLd,
  fitDescription,
  fitTitle,
  pageMetadata,
} from '@/lib/seo';
import { Eyebrow } from '@/components/ui/bits';
import { buttonClass } from '@/components/ui/button';
import { JsonLd } from '@/components/ui/json-ld';
import { InstagramGallery } from '@/components/instagram/instagram-gallery';
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_PROFILE,
  instagramCounts,
  listInstagramPosts,
} from '@/server/instagram';
import { getSiteUrl } from '@/server/site-url';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParams(params: Record<string, string | string[] | undefined>) {
  const type = params.type;
  const filter: InstagramFilter =
    type === 'posts' || type === 'reels' ? type : 'all';
  const page = Number(typeof params.page === 'string' ? params.page : 1);
  return { filter, page: Number.isInteger(page) && page >= 1 ? page : 1 };
}

function href(filter: InstagramFilter, page: number) {
  const query = new URLSearchParams();
  if (filter !== 'all') query.set('type', filter);
  if (page > 1) query.set('page', String(page));
  const text = query.toString();
  return text ? `/instagram?${text}` : '/instagram';
}

export async function generateMetadata({ searchParams }: Props) {
  const { filter, page } = readParams(await searchParams);
  const label =
    filter === 'reels'
      ? 'Reels'
      : filter === 'posts'
        ? 'Posts'
        : 'Posts & Reels';
  const counts = instagramCounts();
  const { pages } = listInstagramPosts(filter, page);
  return pageMetadata({
    title: fitTitle(
      page > 1 ? `Instagram ${label}, Page ${page}` : `Instagram ${label}`,
      [
        (c) => `${c} from Black Shark Gaming | BLACKSHARK`,
        (c) => `${c} from Black Shark Gaming Oman`,
        (c) => `${c} | BLACKSHARK Oman`,
      ],
    ),
    description: fitDescription([
      `${page > 1 ? `Page ${page} of ${pages}: ` : ''}${
        filter === 'reels'
          ? `${counts.reels} Instagram reels`
          : filter === 'posts'
            ? `${counts.posts} Instagram photo and carousel posts`
            : `All ${counts.all} Instagram posts and reels`
      } from Black Shark Gaming (${INSTAGRAM_HANDLE}) in Oman: PC builds, parts, games and offers, newest first.`,
      'Open any post here or on Instagram.',
    ]),
    path: href(filter, page),
  });
}

export default async function InstagramPage({ searchParams }: Props) {
  const { filter, page } = readParams(await searchParams);
  const { posts, pages, total } = listInstagramPosts(filter, page);
  if (page > pages) notFound();
  const counts = instagramCounts();
  const siteUrl = await getSiteUrl();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd
        data={[
          breadcrumbLd(siteUrl, [{ name: 'Instagram', path: '/instagram' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Instagram posts and reels from Black Shark Gaming',
            url: `${siteUrl}${href(filter, page)}`,
            isPartOf: { '@id': `${siteUrl}/#website` },
            about: { '@id': `${siteUrl}/#organization` },
          },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div className="max-w-2xl">
          <Eyebrow>From Instagram · {INSTAGRAM_HANDLE}</Eyebrow>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Posts &amp; reels
          </h1>
          <p className="mt-4 leading-7 text-fg-muted">
            Every post and reel from our Instagram, newest first. Prices and
            offers are from the day each one was posted, so ask us on WhatsApp
            for today’s price.
          </p>
        </div>
        <a
          href={INSTAGRAM_PROFILE}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass('secondary')}
        >
          <ExternalLink aria-hidden="true" className="size-4" /> Follow on
          Instagram
        </a>
      </div>

      <nav
        aria-label="Show"
        className="mt-6 flex flex-wrap items-center justify-between gap-3"
      >
        <ul className="flex gap-2">
          {(Object.keys(INSTAGRAM_FILTERS) as InstagramFilter[]).map((key) => (
            <li key={key}>
              <a
                href={href(key, 1)}
                aria-current={filter === key ? 'page' : undefined}
                className={clsx(
                  'inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm',
                  filter === key
                    ? 'border-accent bg-accent/10 text-fg'
                    : 'border-line-strong text-fg-muted hover:border-fg-subtle hover:text-fg',
                )}
              >
                {INSTAGRAM_FILTERS[key]}
                <span className="font-mono text-xs text-fg-subtle">
                  {counts[key]}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="font-mono text-sm text-fg-subtle tabular">
          Page {page} of {pages} · {total} items
        </p>
      </nav>

      <h2 className="sr-only">
        {INSTAGRAM_FILTERS[filter]}, page {page}
      </h2>
      <div className="mt-5">
        <InstagramGallery posts={posts} />
      </div>

      {pages > 1 ? (
        <nav
          aria-label="Pages"
          className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6"
        >
          {page > 1 ? (
            <a
              href={href(filter, page - 1)}
              rel="prev"
              className={buttonClass('secondary')}
            >
              <ChevronLeft aria-hidden="true" className="size-4" /> Newer
            </a>
          ) : (
            <span />
          )}
          <p className="font-mono text-sm text-fg-subtle tabular">
            {page} / {pages}
          </p>
          {page < pages ? (
            <a
              href={href(filter, page + 1)}
              rel="next"
              className={buttonClass('secondary')}
            >
              Older <ChevronRight aria-hidden="true" className="size-4" />
            </a>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
