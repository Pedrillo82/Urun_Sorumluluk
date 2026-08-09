import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import { COVERAGES } from '@/lib/coverages';
import { tarihFormat, riskRengi } from '@/lib/format';
import type { AssessmentRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function fetchRecords(): Promise<{ records: AssessmentRecord[]; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('assessments')
      .select(
        'id, created_at, coverage_type, insured_name, website, status, risk_score, risk_grade'
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return { records: [], error: error.message };
    return { records: (data as AssessmentRecord[]) || [], error: null };
  } catch (e) {
    return { records: [], error: (e as Error).message };
  }
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Tamamlandı',
  processing: 'İşleniyor',
  failed: 'Başarısız',
};

export default async function KayitlarPage() {
  const { records, error } = await fetchRecords();

  return (
    <div className="panel">
      <h2>Kayıtlı Değerlendirmeler</h2>

      {error && <div className="alert alert-error">Kayıtlar yüklenemedi: {error}</div>}

      {!error && records.length === 0 && (
        <p className="muted">Henüz kayıt yok. <Link href="/">İlk değerlendirmeyi oluşturun.</Link></p>
      )}

      {records.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="records">
            <thead>
              <tr>
                <th>Sigortalı</th>
                <th>Teminat</th>
                <th>Tarih</th>
                <th>Risk</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/kayitlar/${r.id}`}>{r.insured_name}</Link>
                  </td>
                  <td>{COVERAGES[r.coverage_type]?.label ?? r.coverage_type}</td>
                  <td className="muted">{tarihFormat(r.created_at)}</td>
                  <td>
                    {r.risk_grade ? (
                      <span style={{ color: riskRengi(r.risk_grade), fontWeight: 600 }}>
                        {r.risk_grade}
                        {typeof r.risk_score === 'number' ? ` (${r.risk_score})` : ''}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill status-${r.status}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
