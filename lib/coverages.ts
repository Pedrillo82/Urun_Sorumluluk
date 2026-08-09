import type { CoverageKey } from './types';

export interface CoverageDef {
  key: CoverageKey;
  label: string;
  // Bu teminata özgü risk analizi vurgusu — prompt'a eklenir
  odak: string;
}

export const COVERAGES: Record<CoverageKey, CoverageDef> = {
  urun_sorumluluk: {
    key: 'urun_sorumluluk',
    label: 'Ürün Sorumluluk',
    odak: [
      'Ürün Sorumluluk (Product Liability) teminatı değerlendiriliyor.',
      'Odak noktaları: üretilen ürünlerin niteliği ve tehlike potansiyeli, hedef pazarlar (özellikle ABD/AB gibi yüksek riskli hukuki ortamlar), ihracat oranı,',
      'kalite kontrol ve sertifikasyon (ISO 9001, CE, FDA, GMP vb.), geçmiş hasar/geri çağırma geçmişi, ürün kaynaklı bedeni/maddi zarar riski,',
      'tedarik zinciri ve fason üretim yapısı, ürün uyarı/etiketleme yeterliliği.',
    ].join(' '),
  },
  urun_geri_cagirma: {
    key: 'urun_geri_cagirma',
    label: 'Ürün Geri Çağırma',
    odak: [
      'Ürün Geri Çağırma (Product Recall) teminatı değerlendiriliyor.',
      'Odak noktaları: geri çağırma planı ve kriz yönetimi kapasitesi, izlenebilirlik/parti takip sistemleri, dağıtım ağının genişliği,',
      'ürünün bozulabilirlik/kontaminasyon riski (özellikle gıda, ilaç, kozmetik), geçmiş geri çağırma vakaları, düzenleyici otorite denetimleri,',
      'geri çağırma maliyeti tahmini (imha, taşıma, yeniden üretim, itibar), tedarikçi kaynaklı kusur riski.',
    ].join(' '),
  },
};

export function isCoverageKey(value: string): value is CoverageKey {
  return value === 'urun_sorumluluk' || value === 'urun_geri_cagirma';
}
