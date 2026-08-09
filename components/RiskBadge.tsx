import { riskRengi } from '@/lib/format';

export default function RiskBadge({
  grade,
  score,
}: {
  grade: string | null;
  score: number | null;
}) {
  const color = riskRengi(grade);
  return (
    <div>
      <span className="risk-badge" style={{ background: color }}>
        {grade ?? 'Bilinmiyor'}
        {typeof score === 'number' ? ` — ${score}/100` : ''}
      </span>
      {typeof score === 'number' && (
        <div className="score-bar">
          <div style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: color }} />
        </div>
      )}
    </div>
  );
}
