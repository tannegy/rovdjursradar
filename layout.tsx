import { MetadataRoute } from 'next';

const counties = ['varmland', 'dalarna', 'gavleborg', 'vasternorrland', 'jamtland', 'vasterbotten', 'norrbotten', 'orebro'];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://rovdjursradar.se';
  const now = new Date().toISOString();

  return [
    { url: base, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/om`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/integritetspolicy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    ...counties.map(c => ({
      url: `${base}/lan/${c}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}
