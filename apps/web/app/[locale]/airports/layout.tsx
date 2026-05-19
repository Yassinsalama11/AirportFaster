import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function AirportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-bg pt-16 lg:pt-18">{children}</main>
      <Footer />
    </>
  );
}
