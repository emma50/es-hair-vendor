import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { ProfileForm } from './ProfileForm';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata: Metadata = {
  title: 'Profile',
};

export default async function ProfilePage() {
  const current = await requireUser();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-gold mb-2 overline">Profile</p>
        <h1 className="font-display text-ivory text-3xl font-semibold">
          Account settings
        </h1>
        <p className="text-silver mt-2 text-sm">
          Manage your personal details and password.
        </p>
      </header>

      <section className="border-slate/60 bg-charcoal/60 rounded-2xl border p-6 sm:p-8">
        <h2 className="font-display text-ivory mb-1 text-lg font-semibold">
          Personal details
        </h2>
        <p className="text-muted mb-6 text-xs">
          Changing your email sends a confirmation link to the new address
          before it takes effect.
        </p>
        <ProfileForm
          initialName={current.appUser.name ?? ''}
          initialEmail={current.email}
        />
      </section>

      <section className="border-slate/60 bg-charcoal/60 rounded-2xl border p-6 sm:p-8">
        <h2 className="font-display text-ivory mb-1 text-lg font-semibold">
          Password
        </h2>
        <p className="text-muted mb-6 text-xs">
          Your current password is required to set a new one.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
