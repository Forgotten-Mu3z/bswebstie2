import { formRoute } from '@/server/security/form-flow';
import { readForm, redirect } from '@/server/security/http';
import {
  clearedSessionCookie,
  endSession,
  readSessionToken,
} from '@/server/security/sessions';

export const dynamic = 'force-dynamic';

export const POST = formRoute('/sign-in', async (request) => {
  await readForm(request);
  await endSession(await readSessionToken());
  return redirect('/sign-in?signed_out=1', clearedSessionCookie());
});
