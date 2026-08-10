import { NextRequest, NextResponse, after } from 'next/server';
import { getSupabaseAdmin, getStorageBucket } from '@/lib/supabase';
import { prepareFile, type PreparedFile } from '@/lib/extract';
import { runRiskAssessment } from '@/lib/anthropic';
import { isCoverageKey } from '@/lib/coverages';
import type { StoredFile, CoverageKey } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // saniye — arka plan analizi bu süre içinde tamamlanır

const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel istek gövdesi ~4.5MB; dosya başına 4MB sınırı

export async function POST(req: NextRequest) {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: 'Sunucu yapılandırması eksik: Supabase bağlantısı kurulamadı.' },
      { status: 500 }
    );
  }

  try {
    const form = await req.formData();
    const coverage = String(form.get('coverage') || '');
    const insuredName = String(form.get('insuredName') || '').trim();
    const website = String(form.get('website') || '').trim();
    const freeText = String(form.get('freeText') || '').trim();

    if (!isCoverageKey(coverage)) {
      return NextResponse.json({ error: 'Geçersiz teminat türü seçildi.' }, { status: 400 });
    }
    if (!insuredName) {
      return NextResponse.json({ error: 'Sigortalı adı zorunludur.' }, { status: 400 });
    }

    const rawFiles = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    for (const f of rawFiles) {
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `"${f.name}" dosyası çok büyük (en fazla 4 MB). Lütfen daha küçük bir dosya yükleyin.` },
          { status: 400 }
        );
      }
    }

    // 1) İşleme kaydını oluştur
    const bucket = getStorageBucket();
    const { data: inserted, error: insertErr } = await supabase
      .from('assessments')
      .insert({
        coverage_type: coverage,
        insured_name: insuredName,
        website: website || null,
        free_text: freeText || null,
        files: [],
        status: 'processing',
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      throw new Error(`Veritabanı kaydı oluşturulamadı: ${insertErr?.message ?? 'bilinmeyen hata'}`);
    }
    const assessmentId = inserted.id as string;

    // 2) Dosyaları depola + analiz için hazırla (bu adım hızlıdır, senkron yapılır)
    const storedFiles: StoredFile[] = [];
    const prepared: PreparedFile[] = [];

    for (const file of rawFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^\w.\-() ]+/g, '_');
      const path = `${assessmentId}/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadErr) {
        prepared.push({
          name: file.name,
          mime: file.type,
          kind: 'unsupported',
          note: `Depolamaya yüklenemedi: ${uploadErr.message}`,
        });
        continue;
      }

      storedFiles.push({
        name: file.name,
        path,
        type: file.type || 'application/octet-stream',
        size: file.size,
      });

      prepared.push(await prepareFile(file.name, file.type, buffer));
    }

    // Dosya meta bilgisini hemen kaydet
    if (storedFiles.length > 0) {
      await supabase.from('assessments').update({ files: storedFiles }).eq('id', assessmentId);
    }

    // 3) Yapay zeka analizini ARKA PLANDA çalıştır — istek hemen döner.
    scheduleAnalysis(assessmentId, coverage, insuredName, website, freeText, prepared);

    // İstemciye hemen kayıt ID'sini döndür; istemci sonucu yoklayarak bekleyecek.
    return NextResponse.json({ id: assessmentId, status: 'processing' });
  } catch (err) {
    const message = (err as Error).message || 'Beklenmeyen bir hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Analizi yanıt gönderildikten sonra arka planda yürütür (Vercel `after`).
function scheduleAnalysis(
  assessmentId: string,
  coverage: CoverageKey,
  insuredName: string,
  website: string,
  freeText: string,
  prepared: PreparedFile[]
) {
  after(async () => {
    const supabase = getSupabaseAdmin();
    try {
      const { report, model } = await runRiskAssessment({
        coverage,
        insuredName,
        website: website || undefined,
        freeText: freeText || undefined,
        files: prepared,
      });

      await supabase
        .from('assessments')
        .update({
          report,
          report_markdown: report.rapor_markdown,
          risk_score: report.risk_skoru,
          risk_grade: report.risk_derecesi,
          status: 'completed',
          model,
        })
        .eq('id', assessmentId);
    } catch (err) {
      await supabase
        .from('assessments')
        .update({ status: 'failed', error: (err as Error).message })
        .eq('id', assessmentId);
    }
  });
}
