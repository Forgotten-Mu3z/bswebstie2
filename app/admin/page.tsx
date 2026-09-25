import { ArrowRight } from 'lucide-react';
import { Eyebrow } from '@/components/ui/bits';
import { buttonClass } from '@/components/ui/button';
import { getOverview } from '@/server/catalog/admin';
import { requireAdminPage } from '@/server/security/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Overview' };

const ACTIONS: Record<string, string> = {
  'product.create': 'added',
  'product.update': 'edited',
  'product.delete': 'deleted',
  'photo.upload': 'uploaded a photo',
  'photo.delete': 'removed a photo',
  'account.sign_in': 'signed in',
  'account.two_factor_enabled': 'turned on two-factor sign-in',
  'account.password_changed': 'changed their password',
};

const when = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Muscat',
});

export default async function AdminOverview() {
  await requireAdminPage('/admin');
  const { counts, lowStock, activity } = await getOverview();
  const stats = [
    { label: 'Products', value: counts.total, href: '/admin/products' },
    {
      label: 'Published',
      value: counts.published,
      href: '/admin/products?status=PUBLISHED',
    },
    {
      label: 'Drafts',
      value: counts.drafts,
      href: '/admin/products?status=DRAFT',
    },
    {
      label: 'Hidden',
      value: counts.hidden,
      href: '/admin/products?status=HIDDEN',
    },
    {
      label: 'Low stock',
      value: counts.low_stock,
      href: '/admin/products?stock=low',
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Admin</Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Overview
          </h1>
        </div>
        <a href="/admin/products" className={buttonClass('primary')}>
          Manage products <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>

      <ul className="ruled mt-8 grid grid-cols-2 overflow-hidden rounded-lg border border-line sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <li key={stat.label}>
            <a
              href={stat.href}
              className="block h-full bg-ink-900 p-5 hover:bg-ink-850"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
                {stat.label}
              </p>
              <p className="mt-2 font-mono text-3xl font-semibold tabular">
                {stat.value}
              </p>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="low-title"
          className="rounded-lg border border-line bg-ink-900"
        >
          <h2
            id="low-title"
            className="border-b border-line px-5 py-4 font-semibold"
          >
            Low stock
          </h2>
          {lowStock.length ? (
            <ul className="divide-y divide-line">
              {lowStock.map((item) => (
                <li key={item.id}>
                  <a
                    href={`/admin/products?q=${encodeURIComponent(item.sku)}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-ink-850"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {item.name}
                      </span>
                      <span className="font-mono text-xs text-fg-subtle">
                        {item.sku}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-mono text-sm ${item.stock < 1 ? 'text-danger' : 'text-warn'}`}
                    >
                      {item.stock < 1 ? 'Out of stock' : `${item.stock} left`}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-fg-muted">
              Every product is above its low-stock level.
            </p>
          )}
        </section>

        <section
          aria-labelledby="activity-title"
          className="rounded-lg border border-line bg-ink-900"
        >
          <h2
            id="activity-title"
            className="border-b border-line px-5 py-4 font-semibold"
          >
            Recent activity
          </h2>
          {activity.length ? (
            <ul className="divide-y divide-line">
              {activity.map((entry, index) => (
                <li
                  key={`${entry.created_at}-${index}`}
                  className="px-5 py-3 text-sm"
                >
                  <p>
                    <span className="font-medium">
                      {entry.actor ?? entry.actor_email ?? 'Removed user'}
                    </span>{' '}
                    <span className="text-fg-muted">
                      {ACTIONS[entry.action] ?? entry.action}
                    </span>
                    {entry.product ? (
                      <>
                        {' '}
                        <span className="font-medium">{entry.product}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-fg-subtle">
                    <time
                      dateTime={new Date(entry.created_at * 1000).toISOString()}
                    >
                      {when.format(entry.created_at * 1000)}
                    </time>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-fg-muted">No activity yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
