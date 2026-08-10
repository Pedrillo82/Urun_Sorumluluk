'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { RiskReport, CoverageKey } from '@/lib/types';
import { dosyaBoyutu } from '@/lib/format';
import ReportView from '@/components/ReportView';

const COVERAGE_OPTIONS: { key: CoverageKey; label: string; desc: string }[] = [
  { key: 'urun_sorumluluk', label: 'Ürün Sorumluluk', desc: 'Ürün kaynaklı üçüncü şahıs zararları' },
  { key: 'urun_geri_cagirma', label: 'Ürün Geri Çağırma', desc: 'Geri çağırma masrafları ve kriz yönetimi' },
];

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Yanıtı güvenli okur: JSON değilse (ör. HTML hata sayfası) okunaklı bir hata döndürür.
async function readJsonSafe(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  const t = await res.text().catch(() => '');
  return {
    error: t
      ? `Sunucu beklenmeyen bir yanıt döndürdü (${res.status}).`
      : `Sunucu hatası (${res.status}).`,
  };
}

export default function HomePage() {
  const [coverage, setCoverage] = useState<CoverageKey | ''>('');
  const [insuredName, setInsuredName] = useState('');
  const [website, setWebsite] = useState('');
  const [freeText, setFreeText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setError(null);
    if (!coverage) {
      setError('Lütfen bir teminat türü seçin.');
      return;
    }
    if (!insuredName.trim()) {
      setError('Sigortalı adı zorunludur.');
      return;
    }

    setLoading(true);
    setReport(null);
    setRecordId(null);

    try {
      const fd = new FormData();
      fd.append('coverage', coverage);
      fd.append('insuredName', insuredName.trim());
      fd.append('website', website.trim());
      fd.append('freeText', freeText.trim());
      for (const f of files) fd.append('files', f);

      const res = await fetch('/api/assess', { method: 'POST', body: fd });
      const data = await readJsonSafe(res);

      if (!res.ok || !data?.id) {
        throw new Error(data?.error || 'Analiz başlatılamadı.');
      }
      const id = data.id as string;
      setRecordId(id);

      // Analiz arka planda çalışıyor; sonucu yoklayarak bekle.
      const started = Date.now();
      const MAX_MS = 5 * 60 * 1000; // 5 dakika
      // eslint-disable-next-line no-constant-condition
      while (true) {
        await sleep(3000);
        const sres = await fetch(`/api/assess/status?id=${id}`);
        const sdata = await readJsonSafe(sres);
        if (sres.ok && sdata) {
          if (sdata.status === 'completed' && sdata.report) {
            setReport(sdata.report as RiskReport);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
          }
          if (sdata.status === 'failed') {
            throw new Error(sdata.error || 'Analiz başarısız oldu.');
          }
        }
        if (Date.now() - started > MAX_MS) {
          throw new Error(
            'Analiz beklenenden uzun sürdü. Birazdan "Kayıtlar" sayfasından sonucu kontrol edebilirsiniz.'
          );
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setCoverage('');
    setInsuredName('');
    setWebsite('');
    setFreeText('');
    setFiles([]);
    setReport(null);
    setRecordId(null);
    setError(null);
  }

  if (report) {
    return (
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Risk Analiz Raporu — {insuredName}</h2>
          <div className="actions">
            {recordId && <Link className="btn btn-secondary" href={`/kayitlar/${recordId}`}>Kalıcı Bağlantı</Link>}
            <button className="btn btn-primary" onClick={reset}>Yeni Değerlendirme</button>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>Kayıt veritabanına kaydedildi.</p>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
        <ReportView report={report} />
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="alert alert-info">
          Risk analizi yapılıyor… Yapay zeka internette araştırma yapıyor ve belgeleri inceliyor. Bu işlem 1-3 dakika sürebilir, lütfen bekleyin.
        </div>
      )}

      <div className="panel">
        <h2>1. Teminat Türü</h2>
        <div className="coverage-grid">
          {COVERAGE_OPTIONS.map((opt) => (
            <div
              key={opt.key}
              className={`coverage-option ${coverage === opt.key ? 'selected' : ''}`}
              onClick={() => !loading && setCoverage(opt.key)}
            >
              <strong>{opt.label}</strong>
              <span>{opt.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>2. Sigortalı Bilgileri</h2>
        <div className="field">
          <label htmlFor="insuredName">Sigortalı Adı *</label>
          <input
            id="insuredName"
            type="text"
            value={insuredName}
            onChange={(e) => setInsuredName(e.target.value)}
            placeholder="Örn. Örnek Gıda San. ve Tic. A.Ş."
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="website">Web Sitesi (opsiyonel)</label>
          <input
            id="website"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://ornek.com.tr"
            disabled={loading}
          />
          <div className="hint">Girilmezse yapay zeka sigortalının web adresini kendisi araştırır.</div>
        </div>
      </div>

      <div className="panel">
        <h2>3. Risk Belgeleri</h2>
        <div
          className={`dropzone ${dragging ? 'drag' : ''}`}
          onClick={() => !loading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!loading) addFiles(e.dataTransfer.files);
          }}
        >
          <div>Belgeleri buraya sürükleyin veya seçmek için tıklayın</div>
          <div className="hint">Soru formu, poliçe, reasürans slibi vb. — PDF, Word, Excel, JPEG</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            style={{ display: 'none' }}
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f, i) => (
              <li key={i}>
                <span>{f.name} <span className="muted">({dosyaBoyutu(f.size)})</span></span>
                {!loading && <button type="button" onClick={() => removeFile(i)}>×</button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h2>4. Ek Bilgiler (Serbest Metin)</h2>
        <div className="field">
          <textarea
            rows={5}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Underwriter olarak eklemek istediğiniz diğer bilgiler, gözlemler veya özel notlar…"
            disabled={loading}
          />
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? 'Analiz Ediliyor…' : 'Risk Analizi Yap'}
        </button>
        {!loading && (
          <button className="btn btn-secondary" onClick={reset}>
            Temizle
          </button>
        )}
      </div>
    </div>
  );
}
