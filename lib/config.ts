export const SPECIES = {
  wolf: { name: 'Varg', emoji: '🐺', color: '#B83230', nameEn: 'Gray Wolf' },
  lynx: { name: 'Lodjur', emoji: '🐱', color: '#D4760A', nameEn: 'Eurasian Lynx' },
  bear: { name: 'Björn', emoji: '🐻', color: '#7A4B1E', nameEn: 'Brown Bear' },
  eagle: { name: 'Kungsörn', emoji: '🦅', color: '#C9A800', nameEn: 'Golden Eagle' },
  wolverine: { name: 'Järv', emoji: '🦡', color: '#8B2500', nameEn: 'Wolverine' },
} as const;

export const OBS_TYPES = {
  visual: 'Synobs',
  tracks: 'Spår',
  camera: 'Kamera',
  damage: 'Skador',
  dead: 'Döda djur',
  dna: 'DNA',
} as const;

export const SOURCES = {
  official: 'Rovbase',
  club: 'Jaktlag',
  crowd: 'Crowdsourced',
  skandobs: 'Skandobs',
} as const;

export const COUNTIES: Record<string, { name: string; bounds: [number, number, number, number]; center: [number, number] }> = {
  varmland: { name: 'Värmland', bounds: [59.3, 11.5, 60.5, 14.5], center: [59.9, 13.0] },
  dalarna: { name: 'Dalarna', bounds: [60.0, 12.5, 62.0, 16.5], center: [61.0, 14.5] },
  gavleborg: { name: 'Gävleborg', bounds: [60.5, 15.0, 62.0, 17.5], center: [61.2, 16.2] },
  vasternorrland: { name: 'Västernorrland', bounds: [62.0, 16.0, 64.0, 19.5], center: [63.0, 17.7] },
  jamtland: { name: 'Jämtland', bounds: [62.5, 12.0, 65.5, 17.0], center: [63.5, 14.5] },
  vasterbotten: { name: 'Västerbotten', bounds: [63.5, 15.0, 66.5, 21.0], center: [65.0, 18.0] },
  norrbotten: { name: 'Norrbotten', bounds: [65.5, 16.0, 69.5, 24.0], center: [67.5, 20.0] },
  orebro: { name: 'Örebro', bounds: [58.7, 14.5, 59.8, 15.8], center: [59.3, 15.2] },
  vastmanland: { name: 'Västmanland', bounds: [59.3, 15.5, 60.0, 17.0], center: [59.6, 16.2] },
  stockholm: { name: 'Stockholm', bounds: [58.8, 17.5, 60.0, 19.5], center: [59.3, 18.1] },
};

export const TILE_LAYERS = {
  dark: { name: 'Mörkt', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', maxZoom: 18 },
  topo: { name: 'Topografisk', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', maxZoom: 17 },
  terrain: { name: 'Terräng', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19 },
  satellite: { name: 'Satellit', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 18 },
} as const;

export function timeAgo(dateStr: string, lang: string = 'sv'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (lang === 'en') {
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'timme' : 'timmar'} sedan`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'dag' : 'dagar'} sedan`;
}

export function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
