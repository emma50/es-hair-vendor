import { AdminSidebar } from './AdminSidebar';

/**
 * Visual shell for the admin dashboard — sidebar + content gutter.
 *
 * All `/admin/*` routes now require an authenticated ADMIN session
 * (enforced by `src/app/admin/layout.tsx`), so this shell no longer
 * needs the "is this an auth route?" escape hatch it used to. The
 * legacy `/admin/login`, `/admin/forgot-password`, and
 * `/admin/reset-password` paths are served by `redirect()` stubs that
 * unmount before any child layout renders.
 */
export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </div>
    </div>
  );
}
