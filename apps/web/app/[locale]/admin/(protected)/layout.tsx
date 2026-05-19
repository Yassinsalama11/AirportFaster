import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { getSessionUser } from '@/lib/session';

export const metadata = {
  title: {
    default: 'Admin Dashboard',
    template: '%s | AirportFaster Admin',
  },
};

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/admin/login');
  }

  const userForShell = {
    name: user.name ?? user.email,
    email: user.email,
    role: user.roles[0] ?? 'staff',
  };

  return <AdminShell user={userForShell}>{children}</AdminShell>;
}
