import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sorumluluk Risk Değerlendirme',
  description:
    'Sorumluluk Underwriter’ı için yapay zeka destekli risk değerlendirme aracı',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <header className="site-header">
          <div className="inner">
            <div>
              <h1>Sorumluluk Risk Değerlendirme</h1>
              <p>Yapay zeka destekli underwriting analizi</p>
            </div>
            <nav className="nav">
              <Link href="/">Yeni Değerlendirme</Link>
              <Link href="/kayitlar">Kayıtlar</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
