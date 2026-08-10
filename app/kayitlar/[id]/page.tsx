import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { COVERAGES } from '@/lib/coverages';
import { tarihFormat, dosyaBoyutu } from '@/lib/format';
import ReportView from '@/components/ReportView';
import type { AssessmentRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

// 6 dakikayı aşan 'processing' kayıtlar: arka plan işi sunucu süre sınırında
// öldürülmüş demektir — açıldıklarında otomatik 'failed' işaretlenir.
const STALE_MS = 6 * 60 * 1000;
const STALE_MESSAGE =
  'Analiz zaman aşımına uğradı (sunucu süre sınırı). Lütfen tekrar deneyin; sorun sürerse daha az belge ile deneyin.';

async function fetchRecord(id: string): Promise<AssessmentRecord | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    const record = data as AssessmentRecord;

    if (
      record.status === 'processing' &&
      Date.now() - new Date(record.created_at).getTime() > STALE_MS
    ) {
      await supabase
        .from('assessments')
        .update({ status: 'failed', error: STALE_MESSAGE })
        .eq('id', id)
        .eq('status', 'processing');
      record.status = 'failed';
      record.error = STALE_MESSAGE;
    }

    return record;
  } catch {
    return null;
  }
}

export default async function KayitDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await fetchRecord(id);

  if (!record) notFound();

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>{record.insured_name}</h2>
        <Link className="btn btn-secondary" href="/kayitlar">← Kayıtlar</Link>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        {COVERAGES[record.coverage_type]?.label ?? record.coverage_type} · {tarihFormat(record.created_at)}
        {record.model ? ` · ${record.model}` : ''}
      </p>

      {record.website && (
        <p style={{ marginTop: 0 }}>
          Web: <a href={record.website} target="_blank" rel="noreferrer">{record.website}</a>
        </p>
      )}

      {record.files && record.files.length > 0 && (
        <div className="report-section">
          <h3>Yüklenen Belgeler</h3>
          <ul className="tag-list">
            {record.files.map((f, i) => (
              <li key={i}>
                {f.name} <span className="muted">({dosyaBoyutu(f.size)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.free_text && (
        <div className="report-section">
          <h3>Underwriter Serbest Notları</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.free_text}</p>
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

      {record.status === 'failed' && (
        <div className="alert alert-error">
          Bu değerlendirme başarısız oldu: {record.error ?? 'bilinmeyen hata'}
        </div>
      )}
      {record.status === 'processing' && (
        <div className="alert alert-info">Bu değerlendirme hâlâ işleniyor.</div>
      )}

      {record.report ? (
        <ReportView report={record.report} />
      ) : (
        record.status === 'completed' && <p className="muted">Rapor bulunamadı.</p>
      )}
    </div>
  );
}
