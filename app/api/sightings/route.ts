import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create client exactly like the old working route did
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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

function calculateTrustScore(body: any): number {
  let score = 1.0;
  const dt = body.device_type || 'unknown';
  if (dt === 'desktop') score -= 0.3;
  else if (dt !== 'mobile') score -= 0.2;

  const acc = body.gps_accuracy;
  if (acc == null) score -= 0.3;
  else if (acc > 5000) score -= 0.25;
  else if (acc > 500) score -= 0.15;
  else if (acc > 50) score -= 0.05;

  if (body.user_lat != null && body.user_lng != null && body.latitude != null) {
    const dist = haversineKm(body.user_lat, body.user_lng, body.latitude, body.longitude);
    if (dist > 100) score -= 0.4;
    else if (dist > 20) score -= 0.25;
    else if (dist > 5) score -= 0.1;
    else if (dist > 1) score -= 0.05;
  } else { score -= 0.15; }

  return Math.max(0.1, Math.min(1.0, Math.round(score * 100) / 100));
}

// ═══ GET ═══
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
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

// ═══ POST ═══
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = await hashIP(ip);

    // Rate limit check using the same RPC the old working route used
    const { data: allowed } = await supabase.rpc('check_rate_limit', { client_ip: ipHash });
    if (allowed === false) {
      return NextResponse.json({ error: 'Du har skickat för många rapporter. Vänta en timme.' }, { status: 429 });
    }

    const { predator_type, observation_type, source, latitude, longitude, sighted_at, count, notes } = body;
    if (!predator_type || !latitude || !longitude) {
      return NextResponse.json({ error: 'Art och plats krävs.' }, { status: 400 });
    }

    // Step 1: Insert with ONLY the original columns that are proven to work
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
        verified: false,
      }])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Step 2: Update with trust data (separate query, won't break if columns don't exist yet)
    const trustScore = calculateTrustScore(body);
    let dist_km: number | null = null;
    if (body.user_lat != null && body.user_lng != null) {
      dist_km = Math.round(haversineKm(body.user_lat, body.user_lng, latitude, longitude) * 10) / 10;
    }

    await supabase
      .from('sightings')
      .update({
        trust_score: trustScore,
        device_type: body.device_type || 'unknown',
        gps_accuracy: body.gps_accuracy ?? null,
        distance_km: dist_km,
      })
      .eq('id', data.id);

    return NextResponse.json({ ...data, trust_score: trustScore }, { status: 201 });
  } catch (err: any) {
    console.error('API error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Ogiltigt format.' }, { status: 400 });
  }
}
