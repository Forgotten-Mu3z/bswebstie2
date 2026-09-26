import { notFound } from 'next/navigation';
import { AuthCard } from '@/components/admin/auth-card';
import { ResetPasswordForm } from '@/components/admin/reset-password-form';
import { isAdminSite } from '@/server/security/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
  // The emailed link carries a one-time token; never pass this page on.
  referrer: 'no-referrer',
};

export default function ResetPasswordPage() {
  if (!isAdminSite()) notFound();
  return (
    <AuthCard
      title="Choose a new password"
      intro="Pick a new password for the admin panel. Every device that is signed in will be signed out."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
