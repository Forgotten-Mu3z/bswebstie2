// Small fetch wrapper for the admin API: same-origin JSON, and errors come
// back as { error, field } so the form can point at the right field.

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string; status: number };

export async function adminFetch<T>(
  url: string,
  init: { method: string; json?: unknown; body?: FormData },
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: init.method,
      credentials: 'same-origin',
      headers:
        init.json === undefined
          ? undefined
          : { 'content-type': 'application/json' },
      body: init.json === undefined ? init.body : JSON.stringify(init.json),
    });
    if (response.status === 204) return { ok: true, data: undefined as T };
    const data = (await response.json().catch(() => ({}))) as T & {
      error?: string;
      field?: string;
    };
    if (response.ok) return { ok: true, data };
    if (response.status === 401) {
      // Session ended (expired, signed out elsewhere or password changed).
      window.location.assign(
        `/sign-in?return_to=${encodeURIComponent(window.location.pathname)}`,
      );
    }
    return {
      ok: false,
      status: response.status,
      error:
        response.status === 429
          ? 'Too many requests. Wait a minute and try again.'
          : (data.error ?? 'Something went wrong. Please try again.'),
      field: data.field,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: 'Could not reach the server. Check your connection.',
    };
  }
}
