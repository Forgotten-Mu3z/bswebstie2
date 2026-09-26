// The store's policy pages, with a version for each. Change `updated` (a
// date, which is also the version) whenever a document's meaning changes.
// Nothing on the site asks visitors to accept a version: there are no
// accounts and no online checkout; orders are agreed on WhatsApp.
//
// TODO_LEGAL_REVIEW: these documents were drafted from what the website
// actually does, not by a lawyer. Have them reviewed for Oman before relying
// on them.

export type LegalDoc = {
  path: string;
  /** Page heading. */
  title: string;
  /** Link text in the footer and lists. */
  label: string;
  summary: string;
  updated: string;
};

export const LEGAL_DOCS = [
  {
    path: '/terms',
    title: 'Terms of use',
    label: 'Terms',
    summary: 'How the website, prices and WhatsApp orders work.',
    updated: '2026-09-26',
  },
  {
    path: '/privacy',
    title: 'Privacy policy',
    label: 'Privacy',
    summary: 'What information we handle, why, and who else receives it.',
    updated: '2026-09-26',
  },
  {
    path: '/refunds',
    title: 'Returns, refunds and warranty',
    label: 'Returns & refunds',
    summary: 'Faulty items, wrong items, returns and how refunds work.',
    updated: '2026-09-26',
  },
  {
    path: '/cookies',
    title: 'Cookies and storage',
    label: 'Cookies',
    summary: 'What the website stores in your browser, and how to clear it.',
    updated: '2026-09-26',
  },
] as const satisfies readonly LegalDoc[];

export type LegalPath = (typeof LEGAL_DOCS)[number]['path'];

export function legalDoc(path: LegalPath): LegalDoc {
  return LEGAL_DOCS.find((doc) => doc.path === path)!;
}

/** "26 September 2026" */
export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}
