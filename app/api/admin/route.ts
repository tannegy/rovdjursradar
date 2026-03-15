import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const { action, secret, sighting_id } = await request.json();

    if (!secret) {
      return NextResponse.json({ error: 'Secret required' }, { status: 401 });
    }

    // Verify admin
    const { data: isAdmin } = await supabase.rpc('verify_admin', { admin_secret: secret });
    if (!isAdmin) {
      return NextResponse.json({ error: 'Invalid admin secret' }, { status: 403 });
    }

    if (action === 'list') {
      // Admin can see ALL sightings including flagged ones
      const { data, error } = await supabase
        .from('sightings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ sightings: data });
    }

    if (action === 'delete' && sighting_id) {
      const { data } = await supabase.rpc('admin_delete_sighting', {
        sighting_id,
        admin_secret: secret,
      });
      return NextResponse.json({ success: data });
    }

    if (action === 'hide' && sighting_id) {
      const { data } = await supabase.rpc('admin_hide_sighting', {
        sighting_id,
        admin_secret: secret,
      });
      return NextResponse.json({ success: data });
    }

    if (action === 'verify' && sighting_id) {
      const { data } = await supabase.rpc('admin_verify_sighting', {
        sighting_id,
        admin_secret: secret,
      });
      return NextResponse.json({ success: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
