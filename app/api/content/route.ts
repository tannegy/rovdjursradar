import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('page_content').select('key, value');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const content: Record<string, string> = {};
  data?.forEach((row: { key: string; value: string }) => {
    content[row.key] = row.value;
  });

  return NextResponse.json(content, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}
