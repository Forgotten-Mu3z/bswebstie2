import { getD1 } from '@/server/db';

// Counts failed attempts per key in a 15-minute window. Reaching a key's
// limit locks it for the rest of the window. Stored in D1, so it holds across
// all Workers and restarts.
//   email:<address>  wrong passwords for one account       (limit 5)
//   totp:<user id>   wrong 2FA codes for one account        (limit 5)
//   ip:<address>     any failure from one network address   (limit 20)

const WINDOW_SECONDS = 15 * 60;
export const LIMITS = { email: 5, totp: 5, ip: 20 } as const;

export type LockKey = { key: string; limit: number };

export const emailKey = (email: string): LockKey => ({
  key: `email:${email}`,
  limit: LIMITS.email,
});
export const totpKey = (userId: string): LockKey => ({
  key: `totp:${userId}`,
  limit: LIMITS.totp,
});
export const ipKey = (ip: string): LockKey => ({
  key: `ip:${ip}`,
  limit: LIMITS.ip,
});

// Retention: these rows hold IP addresses, so rows older than a day are
// removed on every check and every new failure (see the Privacy policy).
function purgeOld(time: number) {
  return getD1()
    .prepare(
      'DELETE FROM login_failures WHERE window_start < ? AND (locked_until IS NULL OR locked_until < ?)',
    )
    .bind(time - 24 * 60 * 60, time);
}

export async function isLocked(keys: LockKey[]) {
  const names = keys.map(({ key }) => key);
  const time = Math.floor(Date.now() / 1000);
  const [, lookup] = await getD1().batch<{ locked_until: number | null }>([
    purgeOld(time),
    getD1()
      .prepare(
        `SELECT locked_until FROM login_failures WHERE key IN (${names.map(() => '?').join(', ')})`,
      )
      .bind(...names),
  ]);
  return lookup.results.some(
    (row) => row.locked_until && row.locked_until > time,
  );
}

export async function recordFailure(keys: LockKey[]) {
  const d1 = getD1();
  const time = Math.floor(Date.now() / 1000);
  await d1.batch([
    purgeOld(time),
    ...keys.map(({ key, limit }) =>
      d1
        .prepare(
          `INSERT INTO login_failures (key, failures, window_start, locked_until)
          VALUES (?1, 1, ?2, CASE WHEN ?4 <= 1 THEN ?2 + ?3 ELSE NULL END)
          ON CONFLICT(key) DO UPDATE SET
            failures = CASE WHEN window_start <= ?2 - ?3 THEN 1 ELSE failures + 1 END,
            window_start = CASE WHEN window_start <= ?2 - ?3 THEN ?2 ELSE window_start END,
            locked_until = CASE
              WHEN window_start > ?2 - ?3 AND failures + 1 >= ?4 THEN ?2 + ?3
              ELSE locked_until END`,
        )
        .bind(key, time, WINDOW_SECONDS, limit),
    ),
  ]);
}

export async function clearFailures(keys: LockKey[]) {
  if (!keys.length) return;
  await getD1()
    .prepare(
      `DELETE FROM login_failures WHERE key IN (${keys.map(() => '?').join(', ')})`,
    )
    .bind(...keys.map(({ key }) => key))
    .run();
}
