/**
 * Rovdjursradar — Trust Score Engine (Server-side)
 * 
 * This runs in the API route, NOT on the client.
 * The client sends device info + GPS data, the server calculates the score.
 * Never trust a client-submitted trust score.
 */

export interface TrustInput {
  device_type: 'mobile' | 'desktop' | 'unknown';
  gps_accuracy: number | null;
  user_lat: number | null;
  user_lng: number | null;
  report_lat: number;
  report_lng: number;
  ip_hash: string;
  recent_reports_count: number;
}

export interface TrustResult {
  score: number;
  factors: TrustFactor[];
  blocked: boolean;
  block_reason: string | null;
}

export interface TrustFactor {
  name: string;
  impact: number;
  detail: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInSweden(lat: number, lng: number): boolean {
  return lat >= 55.3 && lat <= 69.1 && lng >= 10.9 && lng <= 24.2;
}

export function calculateTrustScore(input: TrustInput): TrustResult {
  let score = 1.0;
  const factors: TrustFactor[] = [];
  let blocked = false;
  let block_reason: string | null = null;

  // Factor 1: Device type
  if (input.device_type === 'mobile') {
    factors.push({ name: 'device', impact: 0, detail: 'Mobil enhet' });
  } else if (input.device_type === 'desktop') {
    score -= 0.3;
    factors.push({ name: 'device', impact: -0.3, detail: 'Desktop — ungefärlig plats' });
  } else {
    score -= 0.2;
    factors.push({ name: 'device', impact: -0.2, detail: 'Okänd enhetstyp' });
  }

  // Factor 2: GPS accuracy
  if (input.gps_accuracy !== null) {
    if (input.gps_accuracy < 50) {
      factors.push({ name: 'gps_accuracy', impact: 0, detail: `±${Math.round(input.gps_accuracy)}m` });
    } else if (input.gps_accuracy < 500) {
      score -= 0.05;
      factors.push({ name: 'gps_accuracy', impact: -0.05, detail: `±${Math.round(input.gps_accuracy)}m` });
    } else if (input.gps_accuracy < 5000) {
      score -= 0.15;
      factors.push({ name: 'gps_accuracy', impact: -0.15, detail: `±${Math.round(input.gps_accuracy)}m` });
    } else {
      score -= 0.25;
      factors.push({ name: 'gps_accuracy', impact: -0.25, detail: `±${Math.round(input.gps_accuracy)}m` });
    }
  } else {
    score -= 0.3;
    factors.push({ name: 'gps_accuracy', impact: -0.3, detail: 'Ingen GPS-data' });
  }

  // Factor 3: Distance user → report
  if (input.user_lat !== null && input.user_lng !== null) {
    const dist = haversineKm(input.user_lat, input.user_lng, input.report_lat, input.report_lng);
    if (dist < 1) {
      factors.push({ name: 'distance', impact: 0, detail: `${Math.round(dist * 1000)}m` });
    } else if (dist < 5) {
      score -= 0.05;
      factors.push({ name: 'distance', impact: -0.05, detail: `${dist.toFixed(1)}km` });
    } else if (dist < 20) {
      score -= 0.1;
      factors.push({ name: 'distance', impact: -0.1, detail: `${dist.toFixed(0)}km` });
    } else if (dist < 100) {
      score -= 0.25;
      factors.push({ name: 'distance', impact: -0.25, detail: `${dist.toFixed(0)}km` });
    } else {
      score -= 0.4;
      factors.push({ name: 'distance', impact: -0.4, detail: `${dist.toFixed(0)}km` });
    }
  } else {
    score -= 0.15;
    factors.push({ name: 'distance', impact: -0.15, detail: 'Ej verifierbart' });
  }

  // Factor 4: Rate limit
  if (input.recent_reports_count === 0) {
    factors.push({ name: 'rate', impact: 0, detail: 'Första rapporten' });
  } else if (input.recent_reports_count < 3) {
    score -= 0.05;
    factors.push({ name: 'rate', impact: -0.05, detail: `${input.recent_reports_count}/h` });
  } else if (input.recent_reports_count < 5) {
    score -= 0.15;
    factors.push({ name: 'rate', impact: -0.15, detail: `${input.recent_reports_count}/h — nära gräns` });
  } else {
    blocked = true;
    block_reason = 'För många rapporter. Vänta en timme.';
    factors.push({ name: 'rate', impact: -1, detail: 'Blockerad' });
  }

  // Factor 5: Sweden geofence
  if (!isInSweden(input.report_lat, input.report_lng)) {
    blocked = true;
    block_reason = 'Platsen ligger utanför Sverige.';
    factors.push({ name: 'geo', impact: -1, detail: 'Utanför Sverige' });
  }

  score = Math.max(0.1, Math.min(1.0, Math.round(score * 100) / 100));
  return { score, factors, blocked, block_reason };
}
