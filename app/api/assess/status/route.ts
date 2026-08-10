import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Arka plan analizi Vercel'de en fazla 300 sn çalışabilir. Bu süreyi payla aşan
// "processing" kayıtlar, arka plan işinin sessizce öldüğü anlamına gelir.
const STALE_MS = 6 * 60 * 1000; // 6 dakika

const STALE_MESSAGE =
  'Analiz zaman aşımına uğradı (sunucu süre sınırı). Lütfen tekrar deneyin; sorun sürerse daha az belge ile deneyin.';

// Arka planda yürüyen bir analizin durumunu ve (bittiyse) raporunu döndürür.
// Asılı kalmış (stale) işlemleri otomatik olarak 'failed' işaretler.
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
    .select('status, report, error, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 });
  }

  let status: string = data.status;
  let errMsg: string | null = data.error ?? null;

  if (status === 'processing') {
    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > STALE_MS) {
      status = 'failed';
      errMsg = STALE_MESSAGE;
      await supabase
        .from('assessments')
        .update({ status: 'failed', error: STALE_MESSAGE })
        .eq('id', id)
        .eq('status', 'processing'); // yarış durumunda tamamlanmış kaydı ezme
    }
  }

  return NextResponse.json({
    status,
    report: data.report ?? null,
    error: errMsg,
  });
}
