// Imports the Black Shark Gaming Instagram archive (posts and reels).
//
//   npm run instagram:import -- "<path to the blackshark-instagram folder>"
//
// Reads catalog.json from the archive (already de-duplicated, newest first) and
// writes:
//   public/ig/<shortcode>/   optimised media, served as static files (git-ignored:
//                            about 2 GB with the reels, too big for the repository)
//   data/instagram.json      the post list the gallery renders (committed)
// Re-running only processes what changed. Nothing is fetched from Instagram.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const archive = process.argv[2] && resolve(process.argv[2]);
if (!archive || !existsSync(join(archive, 'catalog.json'))) {
  console.error(
    'Pass the archive folder (the one that contains catalog.json).',
  );
  process.exit(1);
}

const OUT = join('public', 'ig');
const DATA = join('data', 'instagram.json');
// Cloudflare Workers serves static files up to 25 MiB each.
const MAX_FILE = 25 * 1024 * 1024;
const PROFILE = 'https://www.instagram.com/blackshark__gaming/';

// Captions the archive got wrong. Checked by eye against the post's image.
const HIDE_CAPTION = {
  // Its image is a "007 First Light" PS5 ad, but the archive repeated the
  // GAMEON 49" monitor caption of the next post (DYzr7Lyo8Iy).
  DYzsQmNoAAZ: 'caption belongs to another post',
};

const catalog = JSON.parse(readFileSync(join(archive, 'catalog.json'), 'utf8'));
sharp.cache(false);

/** Instagram shortcodes encode the media ID, whose top bits are the post time. */
const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function postedAt(code) {
  let id = 0n;
  for (const char of code.slice(0, 11))
    id = id * 64n + BigInt(ALPHABET.indexOf(char));
  const ms = Number((id >> 23n) + 1314220021721n);
  return new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
}

/** Archive paths are relative to the archive; refuse anything outside it. */
function source(file) {
  if (!file) return null;
  const full = resolve(archive, file);
  if (relative(archive, full).startsWith('..')) return null;
  return existsSync(full) ? full : null;
}

// Instagram's own image descriptions ("Photo by ... May be an image of ...")
// are useful alt text but are not captions.
const DESCRIPTION =
  /^(photo|video|reel)( shared)? by .{1,80}? (on|in|with|tagging) |may be an? (image|video|graphic|illustration|screenshot|meme|cartoon|text|poster)/i;

function text(record) {
  const value = (record.caption_or_alt ?? '').trim();
  if (!value || HIDE_CAPTION[record.shortcode]) return {};
  return DESCRIPTION.test(value) ? { description: value } : { caption: value };
}

const fresh = (from, to) =>
  existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs;

async function image(from, to, options) {
  if (!fresh(from, to)) {
    const pipeline = sharp(readFileSync(from)).rotate();
    const resized = options.square
      ? pipeline.resize(options.square, options.square, { fit: 'cover' })
      : pipeline.resize({ width: options.width, withoutEnlargement: true });
    writeFileSync(
      to,
      await resized.webp({ quality: options.quality }).toBuffer(),
    );
  }
  const { width, height } = await sharp(to).metadata();
  return { width, height };
}

function video(from, to) {
  if (statSync(from).size > MAX_FILE) return false;
  if (!fresh(from, to)) copyFileSync(from, to);
  return true;
}

async function importRecord(record) {
  const code = record.shortcode;
  if (!/^[A-Za-z0-9_-]{5,20}$/.test(code))
    throw new Error(`Bad shortcode ${code}`);
  const dir = join(OUT, code);
  mkdirSync(dir, { recursive: true });
  const url = (name) => `/ig/${code}/${name}`;
  const cover = source(record.cover_file);

  // Slides in order. A carousel video's file name starts with its slide
  // position; the image in that position is its poster, not a separate slide.
  let parts = [];
  if (record.video_file)
    parts = [{ video: record.video_file, poster: record.cover_file }];
  else if (record.slide_files?.length)
    parts = record.slide_files.map((file) => ({ image: file }));
  else parts = [{ image: record.cover_file }];
  for (const file of record.carousel_video_files ?? []) {
    const position = Number(
      file
        .split('/')
        .pop()
        .match(/^(\d+)_/)?.[1],
    );
    const slot = parts[position - 1];
    if (slot?.image) parts[position - 1] = { video: file, poster: slot.image };
    else parts.push({ video: file, poster: record.cover_file });
  }

  const slides = [];
  for (const [index, part] of parts.entries()) {
    const n = index + 1;
    if (part.image) {
      const from = source(part.image);
      if (!from) continue;
      const size = await image(from, join(dir, `${n}.webp`), {
        width: 1080,
        quality: 76,
      });
      slides.push({ type: 'image', src: url(`${n}.webp`), ...size });
    } else {
      const from = source(part.video);
      const poster = source(part.poster) ?? cover;
      const size = poster
        ? await image(poster, join(dir, `${n}.webp`), {
            width: 1080,
            quality: 76,
          })
        : { width: 1080, height: 1920 };
      const playable = from ? video(from, join(dir, `${n}.mp4`)) : false;
      slides.push({
        type: 'video',
        // null: too big to host (or missing); the gallery links to Instagram instead.
        src: playable ? url(`${n}.mp4`) : null,
        poster: poster ? url(`${n}.webp`) : null,
        ...size,
      });
    }
  }

  const thumb = cover ?? source(parts.find((p) => p.image)?.image);
  if (thumb) {
    // Two sizes: phones show tiles about 180px wide, desktops up to 240px.
    await image(thumb, join(dir, 'thumb.webp'), { square: 480, quality: 70 });
    await image(thumb, join(dir, 'thumb-240.webp'), {
      square: 240,
      quality: 70,
    });
  }

  return {
    code,
    type:
      record.type === 'reel'
        ? 'reel'
        : slides.length > 1
          ? 'carousel'
          : 'photo',
    url: record.source_url,
    postedAt: postedAt(code),
    ...text(record),
    thumb: thumb ? url('thumb.webp') : null,
    slides,
  };
}

const posts = [];
const queue = [...catalog.entries()];
let done = 0;
async function worker() {
  for (let next = queue.shift(); next; next = queue.shift()) {
    const [index, record] = next;
    posts[index] = await importRecord(record);
    if (++done % 100 === 0) console.log(`${done} / ${catalog.length}`);
  }
}
mkdirSync(OUT, { recursive: true });
await Promise.all(Array.from({ length: 6 }, worker));

// Remove folders for posts that are no longer in the catalog.
const keep = new Set(posts.map((post) => post.code));
for (const name of readdirSync(OUT))
  if (!keep.has(name))
    rmSync(join(OUT, name), { recursive: true, force: true });

mkdirSync('data', { recursive: true });
const body = {
  profile: PROFILE,
  handle: '@blackshark__gaming',
  posts,
};
writeFileSync(DATA, `${JSON.stringify(body)}\n`);

const slides = posts.flatMap((post) => post.slides);
const offline = posts.filter((post) =>
  post.slides.some((s) => s.type === 'video' && !s.src),
);
console.log(`
Imported ${posts.length} posts (${posts.filter((p) => p.type === 'reel').length} reels, ${posts.filter((p) => p.type === 'carousel').length} carousels).
Slides: ${slides.filter((s) => s.type === 'image').length} images, ${slides.filter((s) => s.type === 'video' && s.src).length} videos.
Captions: ${posts.filter((p) => p.caption).length}; image descriptions used as alt text: ${posts.filter((p) => p.description).length}; hidden: ${Object.keys(HIDE_CAPTION).length}.
Videos too big to host (shown with a link to Instagram): ${offline.map((p) => p.code).join(', ') || 'none'}.`);
