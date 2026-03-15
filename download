import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://rovdjursradar.se'),
  title: {
    default: 'Rovdjursradar — Kolla innan du går ut',
    template: '%s | Rovdjursradar',
  },
  description: 'Sveriges rovdjursradar. Se var varg, björn, lodjur, järv och kungsörn har observerats nära dig. Crowdsourcade och officiella observationer på en karta.',
  keywords: ['rovdjur', 'varg', 'björn', 'lodjur', 'järv', 'kungsörn', 'rovdjurskarta', 'rovdjursradar', 'predator', 'Sverige', 'säkerhet', 'friluftsliv'],
  authors: [{ name: 'Rovdjursradar' }],
  creator: 'Rovdjursradar',
  publisher: 'Rovdjursradar',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'sv_SE',
    url: 'https://rovdjursradar.se',
    siteName: 'Rovdjursradar',
    title: 'Rovdjursradar — Kolla innan du går ut',
    description: 'Sveriges rovdjursradar. Se rovdjursobservationer nära dig innan du går ut i skogen.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Rovdjursradar — Sveriges rovdjurskarta',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rovdjursradar — Kolla innan du går ut',
    description: 'Sveriges rovdjursradar. Se rovdjursobservationer nära dig.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://rovdjursradar.se',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1B3A0C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Rovdjursradar',
              url: 'https://rovdjursradar.se',
              description: 'Realtidskarta över rovdjursobservationer i Sverige',
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Web',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK' },
              author: { '@type': 'Organization', name: 'Rovdjursradar' },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
