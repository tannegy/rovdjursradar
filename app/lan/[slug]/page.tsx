import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const MapApp = dynamic(() => import('@/components/MapApp'), { ssr: false });

const COUNTIES: Record<string, { name: string; description: string }> = {
  varmland: { name: 'Värmland', description: 'Rovdjurobservationer i Värmlands län — varg, björn, lodjur, järv och kungsörn.' },
  dalarna: { name: 'Dalarna', description: 'Rovdjurobservationer i Dalarnas län — se aktuella observationer nära dig.' },
  gavleborg: { name: 'Gävleborg', description: 'Rovdjurobservationer i Gävleborgs län.' },
  vasternorrland: { name: 'Västernorrland', description: 'Rovdjurobservationer i Västernorrlands län.' },
  jamtland: { name: 'Jämtland', description: 'Rovdjurobservationer i Jämtlands län.' },
  vasterbotten: { name: 'Västerbotten', description: 'Rovdjurobservationer i Västerbottens län.' },
  norrbotten: { name: 'Norrbotten', description: 'Rovdjurobservationer i Norrbottens län.' },
  orebro: { name: 'Örebro', description: 'Rovdjurobservationer i Örebro län.' },
};

export function generateStaticParams() {
  return Object.keys(COUNTIES).map(slug => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const county = COUNTIES[params.slug];
  if (!county) return { title: 'Län' };
  return {
    title: `Rovdjur i ${county.name}`,
    description: county.description,
    openGraph: {
      title: `Rovdjur i ${county.name} — Rovdjursradar`,
      description: county.description,
      url: `https://rovdjursradar.se/lan/${params.slug}`,
    },
    alternates: { canonical: `https://rovdjursradar.se/lan/${params.slug}` },
  };
}

export default function CountyPage() {
  return <MapApp />;
}
