// Ortak tip tanımları

export type CoverageKey = 'urun_sorumluluk' | 'urun_geri_cagirma';

export type AssessmentStatus = 'processing' | 'completed' | 'failed';

export type RiskGrade = 'Düşük' | 'Orta' | 'Yüksek';

// Yüklenen bir dosyanın veritabanında saklanan meta bilgisi
export interface StoredFile {
  name: string;
  path: string; // Supabase Storage içindeki yol
  type: string; // MIME türü
  size: number; // byte
}

// Yapay zekanın ürettiği yapılandırılmış risk raporu
export interface RiskReport {
  yonetici_ozeti: string;
  sigortali_profili: string;
  urun_faaliyet_analizi: string;
  kalite_sertifikalar: string;
  referanslar_itibar: string;
  belge_bulgulari: string;
  risk_faktorleri_olumlu: string[];
  risk_faktorleri_olumsuz: string[];
  risk_skoru: number; // 0-100
  risk_derecesi: RiskGrade;
  underwriting_onerileri: string;
  ek_bilgi_talepleri: string[];
  kaynaklar: string[];
  rapor_markdown: string;
}

// Veritabanındaki bir değerlendirme kaydı
export interface AssessmentRecord {
  id: string;
  created_at: string;
  coverage_type: CoverageKey;
  insured_name: string;
  website: string | null;
  free_text: string | null;
  files: StoredFile[];
  report: RiskReport | null;
  report_markdown: string | null;
  risk_score: number | null;
  risk_grade: RiskGrade | null;
  status: AssessmentStatus;
  model: string | null;
  error: string | null;
}
