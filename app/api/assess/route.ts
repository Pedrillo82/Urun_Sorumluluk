import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getStorageBucket } from '@/lib/supabase';
import { prepareFile, type PreparedFile } from '@/lib/extract';
import { runRiskAssessment } from '@/lib/anthropic';
import { isCoverageKey } from '@/lib/coverages';
import type { StoredFile } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // saniye — AI + web araştırması uzun sürebilir

const MAX_FILE_BYTES = 25 * 1024 * 1024; // dosya başına 25 MB

export async function POST(req: NextRequest) {
  let assessmentId: string | null = null;
  const supabase = (() => {
    try {
      return getSupabaseAdmin();
    } catch (e) {
      return null;
    }
  })();

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırması eksik: Supabase bağlantısı kurulamadı.' },
        { status: 500 }
      );
    }

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
          { error: `"${f.name}" dosyası çok büyük (en fazla 25 MB).` },
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
    assessmentId = inserted.id as string;

    // 2) Dosyaları depola + analiz için hazırla
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
        // Depolama hatası analizi engellememeli; not düş
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

    // 3) Yapay zeka ile risk analizi
    const { report, model } = await runRiskAssessment({
      coverage,
      insuredName,
      website: website || undefined,
      freeText: freeText || undefined,
      files: prepared,
    });

    // 4) Kaydı tamamla
    const { error: updateErr } = await supabase
      .from('assessments')
      .update({
        files: storedFiles,
        report,
        report_markdown: report.rapor_markdown,
        risk_score: report.risk_skoru,
        risk_grade: report.risk_derecesi,
        status: 'completed',
        model,
      })
      .eq('id', assessmentId);

    if (updateErr) {
      throw new Error(`Sonuç kaydedilemedi: ${updateErr.message}`);
    }

    return NextResponse.json({ id: assessmentId, report });
  } catch (err) {
    const message = (err as Error).message || 'Beklenmeyen bir hata oluştu.';
    // Kaydı başarısız olarak işaretle
    if (assessmentId && supabase) {
      await supabase
        .from('assessments')
        .update({ status: 'failed', error: message })
        .eq('id', assessmentId);
    }
    return NextResponse.json({ error: message, id: assessmentId }, { status: 500 });
  }
}
