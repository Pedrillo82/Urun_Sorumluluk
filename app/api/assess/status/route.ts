import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Arka planda yürüyen bir analizin durumunu ve (bittiyse) raporunu döndürür.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id parametresi gerekli.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: 'Sunucu yapılandırması eksik.' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('assessments')
    .select('status, report, error')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 });
  }

  return NextResponse.json({
    status: data.status,
    report: data.report ?? null,
    error: data.error ?? null,
  });
}
