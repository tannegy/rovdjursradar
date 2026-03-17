import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function hashIP(ip: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + (process.env.IP_HASH_SALT || 'rovdjursradar-2026'));
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  } catch {
    return ip.replace(/\./g, '').slice(0, 16);
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateTrustScore(input: {
  device_type: string; gps_accuracy: number | null;
  user_lat: number | null; user_lng: number | null;
  report_lat: number; report_lng: number;
  recent_reports_count: number;
}): { score: number; blocked: boolean; block_reason: string | null } {
  let score = 1.0;
  let blocked = false;
  let block_reason: string | null = null;

  if (input.device_type === 'desktop') score -= 0.3;
  else if (input.device_type !== 'mobile') score -= 0.2;

  if (input.gps_accuracy === null) score -= 0.3;
  else if (input.gps_accuracy > 5000) score -= 0.25;
  else if (input.gps_accuracy > 500) score -= 0.15;
  else if (input.gps_accuracy > 50) score -= 0.05;

  if (input.user_lat != null && input.user_lng != null) {
    const dist = haversineKm(input.user_lat, input.user_lng, input.report_lat, input.report_lng);
    if (dist > 100) score -= 0.4;
    else if (dist > 20) score -= 0.25;
    else if (dist > 5) score -= 0.1;
    else if (dist > 1) score -= 0.05;
  } else { score -= 0.15; }

  if (input.recent_reports_count >= 5) { blocked = true; block_reason = 'För många rapporter. Vänta en timme.'; }
  else if (input.recent_reports_count >= 3) score -= 0.15;
  else if (input.recent_reports_count >= 1) score -= 0.05;

  if (input.report_lat < 55.3 || input.report_lat > 69.1 || input.report_lng < 10.9 || input.report_lng > 24.2) {
    blocked = true; block_reason = 'Platsen ligger utanför Sverige.';
  }

  return { score: Math.max(0.1, Math.min(1.0, Math.round(score * 100) / 100)), blocked, block_reason };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const flagId = params.get('flag');
  if (flagId) {
    await supabase.from('sightings').update({ flag_count: 1, trust_score: 0.5 }).eq('id', flagId);
    return NextResponse.json({ success: true });
  }

  let query = supabase.from('sightings').select('*').order('sighted_at', { ascending: false });

  const species = params.get('species');
  if (species) query = query.in('predator_type', species.split(','));
  const obsType = params.get('obs_type');
  if (obsType && obsType !== 'all') query = query.eq('observation_type', obsType);
  const source = params.get('source');
  if (source) query = query.in('source', source.split(','));
  const county = params.get('county');
  if (county && county !== 'all') query = query.eq('county', county);
  const hours = params.get('hours');
  if (hours) query = query.gte('sighted_at', new Date(Date.now() - parseInt(hours) * 3600000).toISOString());
  const dateFrom = params.get('date_from');
  if (dateFrom) query = query.gte('sighted_at', dateFrom);
  const dateTo = params.get('date_to');
  if (dateTo) query = query.lte('sighted_at', dateTo + 'T23:59:59Z');
  query = query.limit(parseInt(params.get('limit') || '200'));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = await hashIP(ip);

    // Count recent reports using the shared supabase client
    const { count: recentCount } = await supabase
      .from('sightings')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    const trust = calculateTrustScore({
      device_type: body.device_type || 'unknown',
      gps_accuracy: body.gps_accuracy ?? null,
      user_lat: body.user_lat ?? null,
      user_lng: body.user_lng ?? null,
      report_lat: body.latitude,
      report_lng: body.longitude,
      recent_reports_count: recentCount || 0,
    });

    if (trust.blocked) {
      return NextResponse.json({ error: trust.block_reason }, { status: 429 });
    }

    const { predator_type, observation_type, source, latitude, longitude, sighted_at, count, notes } = body;
    if (!predator_type || !latitude || !longitude) {
      return NextResponse.json({ error: 'Art och plats krävs.' }, { status: 400 });
    }

    let dist_km: number | null = null;
    if (body.user_lat != null && body.user_lng != null) {
      dist_km = Math.round(haversineKm(body.user_lat, body.user_lng, latitude, longitude) * 10) / 10;
    }

    const { data, error } = await supabase
      .from('sightings')
      .insert([{
        predator_type,
        observation_type: observation_type || 'visual',
        source: source || 'crowd',
        latitude: Math.round(latitude * 100) / 100,
        longitude: Math.round(longitude * 100) / 100,
        sighted_at: sighted_at || new Date().toISOString(),
        count: Math.min(Math.max(count || 1, 1), 50),
        notes: notes?.slice(0, 500) || null,
        ip_hash: ipHash,
        trust_score: trust.score,
        device_type: body.device_type || 'unknown',
        gps_accuracy: body.gps_accuracy ?? null,
        distance_km: dist_km,
        verified: false,
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('API route error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Ogiltigt format.' }, { status: 400 });
  }
}
