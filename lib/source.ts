// Listings imported from the store's own Instagram posts keep a link to the
// post. Instagram shortcodes encode the media ID, whose top bits are the
// posting time, so the date needs no extra data.

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Muscat',
});

/** "13 Sept 2026" for an Instagram post URL, or null for anything else. */
export function instagramPostDate(url: string | null) {
  const code = url?.match(
    /^https:\/\/www\.instagram\.com\/[\w.]+\/(?:p|reel)\/([\w-]{11})/,
  )?.[1];
  if (!code) return null;
  let id = BigInt(0);
  for (const char of code)
    id = id * BigInt(64) + BigInt(ALPHABET.indexOf(char));
  const ms = (id >> BigInt(23)) + BigInt('1314220021721');
  return dateFormat.format(new Date(Number(ms)));
}
