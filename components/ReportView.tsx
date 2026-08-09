'use client';

import { useState } from 'react';
import type { RiskReport } from '@/lib/types';
import RiskBadge from './RiskBadge';

function Section({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div className="report-section">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ListSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: 'pos' | 'neg';
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="report-section">
      <h3>{title}</h3>
      <ul className="tag-list">
        {items.map((it, i) => (
          <li key={i} className={tone}>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReportView({ report }: { report: RiskReport }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div>
      <div className="report-section">
        <h3>Risk Derecesi</h3>
        <RiskBadge grade={report.risk_derecesi} score={report.risk_skoru} />
      </div>

      <Section title="Yönetici Özeti" text={report.yonetici_ozeti} />
      <Section title="Sigortalı Profili (Web Araştırması)" text={report.sigortali_profili} />
      <Section title="Ürün / Faaliyet Analizi" text={report.urun_faaliyet_analizi} />
      <Section title="Kalite Kontrol & Sertifikalar" text={report.kalite_sertifikalar} />
      <Section title="Referanslar / İtibar" text={report.referanslar_itibar} />
      <Section title="Belge & Serbest Metin Bulguları" text={report.belge_bulgulari} />

      <ListSection
        title="Olumlu Risk Faktörleri"
        items={report.risk_faktorleri_olumlu}
        tone="pos"
      />
      <ListSection
        title="Olumsuz Risk Faktörleri"
        items={report.risk_faktorleri_olumsuz}
        tone="neg"
      />

      <Section title="Underwriting Önerileri" text={report.underwriting_onerileri} />
      <ListSection title="Talep Edilecek Ek Bilgiler" items={report.ek_bilgi_talepleri} />

      {report.kaynaklar && report.kaynaklar.length > 0 && (
        <div className="report-section">
          <h3>Kaynaklar</h3>
          <ul className="tag-list">
            {report.kaynaklar.map((k, i) => (
              <li key={i}>
                {/^https?:\/\//.test(k) ? (
                  <a href={k} target="_blank" rel="noreferrer">
                    {k}
                  </a>
                ) : (
                  k
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.rapor_markdown && (
        <div className="report-section">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowRaw((s) => !s)}
          >
            {showRaw ? 'Tam Raporu Gizle' : 'Tam Raporu Göster (Markdown)'}
          </button>
          {showRaw && <pre className="markdown-raw">{report.rapor_markdown}</pre>}
        </div>
      )}
    </div>
  );
}
