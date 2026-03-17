import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateTrustScore } from '@/lib/trust-score';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + (process.env.IP_HASH_SALT || 'rovdjursradar-2026'));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
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

// ═══════════════════════════════════════════════
// GET — Identical to your existing route
// ═══════════════════════════════════════════════
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const params = request.nextUrl.searchParams;

  let query = supabase
    .from('sightings')
    .select('*')
    .order('sighted_at', { ascending: false });

  const species = params.get('species');
  if (species) query = query.in('predator_type', species.split(','));

  const obsType = params.get('obs_type');
  if (obsType && obsType !== 'all') query = query.eq('observation_type', obsType);

  const source = params.get('source');
  if (source) query = query.in('source', source.split(','));

  const county = params.get('county');
  if (county && county !== 'all') query = query.eq('county', county);

  const hours = params.get('hours');
  if (hours) {
    const cutoff = new Date(Date.now() - parseInt(hours) * 3600000).toISOString();
    query = query.gte('sighted_at', cutoff);
  }

  const dateFrom = params.get('date_from');
  if (dateFrom) query = query.gte('sighted_at', dateFrom);

  const dateTo = params.get('date_to');
  if (dateTo) query = query.lte('sighted_at', dateTo + 'T23:59:59Z');

  const limit = params.get('limit');
  query = query.limit(limit ? parseInt(limit) : 200);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}

// ═══════════════════════════════════════════════
// POST — Now with Safety Layer 1 (GPS trust scoring)
// ═══════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = await hashIP(ip);

    // Count recent reports from this IP
    const { count: recentCount } = await supabase
      .from('sightings')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    // ─── SAFETY LAYER 1: Calculate trust score server-side ───
    const trustResult = calculateTrustScore({
      device_type: body.device_type || 'unknown',
      gps_accuracy: body.gps_accuracy ?? null,
      user_lat: body.user_lat ?? null,
      user_lng: body.user_lng ?? null,
      report_lat: body.latitude,
      report_lng: body.longitude,
      ip_hash: ipHash,
      recent_reports_count: recentCount || 0,
    });

    // Block if trust engine says no
    if (trustResult.blocked) {
      return NextResponse.json(
        {
          error: trustResult.block_reason || 'Rapporten blockerades.',
          trust_score: trustResult.score,
          trust_factors: trustResult.factors,
        },
        { status: 429 }
      );
    }

    // Validate required fields
    const { predator_type, observation_type, source, latitude, longitude, sighted_at, count, notes } = body;

    if (!predator_type || !latitude || !longitude) {
      return NextResponse.json({ error: 'Art och plats krävs.' }, { status: 400 });
    }

    // Calculate distance for storage
    let dist_km: number | null = null;
    if (body.user_lat != null && body.user_lng != null) {
      dist_km = Math.round(haversineKm(body.user_lat, body.user_lng, latitude, longitude) * 10) / 10;
    }

    // Insert with server-calculated trust score
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
        trust_score: trustResult.score,
        device_type: body.device_type || 'unknown',
        gps_accuracy: body.gps_accuracy ?? null,
        distance_km: dist_km,
        verified: false,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      trust_factors: trustResult.factors,
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: 'Ogiltigt format.' }, { status: 400 });
  }
}
