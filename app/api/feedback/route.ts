import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Feedback krävs.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from('feedback')
      .insert([{
        name: name?.slice(0, 200) || null,
        email: email?.slice(0, 200) || null,
        message: message.slice(0, 5000),
      }]);

    if (error) {
      console.error('Feedback insert error:', JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    console.error('Feedback API error:', err?.message || err);
    return NextResponse.json({ error: 'Ogiltigt format.' }, { status: 400 });
  }
}
