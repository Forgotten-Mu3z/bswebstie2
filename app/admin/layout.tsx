import { AdminShell } from '@/components/admin/admin-shell';
import { requireAdminPage } from '@/server/security/admin';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: { default: 'Admin', template: '%s · BLACKSHARK Admin' },
  robots: { index: false, follow: false },
};

// Each admin page also checks access itself; this only draws the frame.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdminPage();
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
