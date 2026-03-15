import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function hashIP(ip: string): string {
  return createHash('sha256').update(ip + 'rovdjursradar-salt-2026').digest('hex').slice(0, 16);
}

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = hashIP(ip);

    // Rate limit check
    const { data: allowed } = await supabase.rpc('check_rate_limit', { client_ip: ipHash });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Du har skickat för många rapporter. Vänta en timme.' },
        { status: 429 }
      );
    }

    // Validate required fields
    const { predator_type, observation_type, source, latitude, longitude, sighted_at, count, notes } = body;

    if (!predator_type || !latitude || !longitude) {
      return NextResponse.json({ error: 'Art och plats krävs.' }, { status: 400 });
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
        verified: false,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Ogiltigt format.' }, { status: 400 });
  }
}
