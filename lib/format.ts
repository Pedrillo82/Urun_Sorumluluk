// Türkçe biçimlendirme yardımcıları
// (Eski js/app.js içindeki tarihFormat/paraFormat mantığından uyarlanmıştır.)

export function tarihFormat(tarihStr: string): string {
  const tarih = new Date(tarihStr);
  if (isNaN(tarih.getTime())) return tarihStr;
  return tarih.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function dosyaBoyutu(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

export function riskRengi(derece: string | null): string {
  switch (derece) {
    case 'Düşük':
      return '#16a34a';
    case 'Orta':
      return '#d97706';
    case 'Yüksek':
      return '#dc2626';
    default:
      return '#64748b';
  }
}
