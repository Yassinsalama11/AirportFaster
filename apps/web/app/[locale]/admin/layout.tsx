export const metadata = {
  title: {
    default: 'Admin',
    template: '%s | AirportFaster Admin',
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
