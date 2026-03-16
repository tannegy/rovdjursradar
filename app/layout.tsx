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
        {/* Google Analytics - loaded conditionally by CookieConsent component */}
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
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}

function CookieConsent() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  var GA_ID = 'G-RFS7FW5VKZ';
  
  function loadGA() {
    if (document.getElementById('ga-script')) return;
    var s = document.createElement('script');
    s.id = 'ga-script';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function removeGA() {
    var s = document.getElementById('ga-script');
    if (s) s.remove();
    window.dataLayer = [];
    document.cookie.split(';').forEach(function(c) {
      if (c.trim().startsWith('_ga')) {
        document.cookie = c.split('=')[0].trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + location.hostname;
        document.cookie = c.split('=')[0].trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      }
    });
  }

  var consent = localStorage.getItem('rr_cookie_consent');
  if (consent === 'accepted') { loadGA(); return; }
  if (consent === 'declined') return;

  // Show banner
  var lang = localStorage.getItem('rr_lang') || 'sv';
  var bar = document.createElement('div');
  bar.id = 'cookie-banner';
  bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:10000;background:rgba(22,22,22,.97);border-top:1px solid rgba(255,255,255,.1);padding:14px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;backdrop-filter:blur(12px);font-family:Inter,system-ui,sans-serif';
  
  var text = lang === 'en'
    ? 'We use cookies for anonymous visitor statistics (Google Analytics). No personal data is shared.'
    : 'Vi anv\\u00e4nder cookies f\\u00f6r anonym bes\\u00f6ksstatistik (Google Analytics). Ingen persondata delas.';
  var acceptText = lang === 'en' ? 'Accept' : 'Acceptera';
  var declineText = lang === 'en' ? 'Decline' : 'Neka';
  var policyText = lang === 'en' ? 'Privacy Policy' : 'Integritetspolicy';

  bar.innerHTML = '<p style="flex:1;margin:0;font-size:.75rem;color:#999;line-height:1.5;min-width:200px">' + text + ' <a href="/integritetspolicy" style="color:#D4A843;text-decoration:none">' + policyText + '</a></p>'
    + '<div style="display:flex;gap:8px;flex-shrink:0">'
    + '<button id="cc-decline" style="padding:7px 16px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#999;font-size:.72rem;font-weight:600;cursor:pointer;font-family:inherit">' + declineText + '</button>'
    + '<button id="cc-accept" style="padding:7px 16px;border-radius:6px;border:0;background:#2D5016;color:#fff;font-size:.72rem;font-weight:600;cursor:pointer;font-family:inherit">' + acceptText + '</button>'
    + '</div>';

  document.body.appendChild(bar);

  document.getElementById('cc-accept').onclick = function() {
    localStorage.setItem('rr_cookie_consent', 'accepted');
    bar.remove();
    loadGA();
  };
  document.getElementById('cc-decline').onclick = function() {
    localStorage.setItem('rr_cookie_consent', 'declined');
    bar.remove();
    removeGA();
  };
})();
        `,
      }}
    />
  );
}
