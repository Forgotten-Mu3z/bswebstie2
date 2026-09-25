import { getD1 } from '@/server/db';
import type { PendingSignIn } from './sessions';
import { generateTotpSecret, openSecret, sealSecret } from './totp';

/**
 * The unconfirmed authenticator secret for a pending sign-in. Created once and
 * reused on reload, so a code that was already scanned keeps working.
 */
export async function getSetupSecret(pending: PendingSignIn) {
  if (pending.totpPendingSecret)
    return openSecret(pending.totpPendingSecret, pending.userId);
  const d1 = getD1();
  await d1
    .prepare(
      'UPDATE users SET totp_pending_secret = ? WHERE id = ? AND totp_secret IS NULL AND totp_pending_secret IS NULL',
    )
    .bind(
      await sealSecret(generateTotpSecret(), pending.userId),
      pending.userId,
    )
    .run();
  // If two tabs raced, both show whichever secret was stored first.
  const row = await d1
    .prepare('SELECT totp_pending_secret FROM users WHERE id = ?')
    .bind(pending.userId)
    .first<{ totp_pending_secret: string | null }>();
  if (!row?.totp_pending_secret)
    throw new Error('Could not store the setup key');
  return openSecret(row.totp_pending_secret, pending.userId);
}
