import Anthropic from '@anthropic-ai/sdk';
import { COVERAGES } from './coverages';
import type { CoverageKey, RiskReport, RiskGrade } from './types';
import type { PreparedFile } from './extract';

const DEFAULT_MODEL = 'claude-opus-5';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY ortam değişkeni tanımlı değil. .env.local dosyasını kontrol edin.'
    );
  }
  return new Anthropic({ apiKey });
}

// Claude'un üreteceği yapılandırılmış raporun JSON şeması
const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    yonetici_ozeti: { type: 'string' },
    sigortali_profili: { type: 'string' },
    urun_faaliyet_analizi: { type: 'string' },
    kalite_sertifikalar: { type: 'string' },
    referanslar_itibar: { type: 'string' },
    belge_bulgulari: { type: 'string' },
    risk_faktorleri_olumlu: { type: 'array', items: { type: 'string' } },
    risk_faktorleri_olumsuz: { type: 'array', items: { type: 'string' } },
    risk_skoru: { type: 'integer' },
    risk_derecesi: { type: 'string', enum: ['Düşük', 'Orta', 'Yüksek'] },
    underwriting_onerileri: { type: 'string' },
    ek_bilgi_talepleri: { type: 'array', items: { type: 'string' } },
    kaynaklar: { type: 'array', items: { type: 'string' } },
    rapor_markdown: { type: 'string' },
  },
  required: [
    'yonetici_ozeti',
    'sigortali_profili',
    'urun_faaliyet_analizi',
    'kalite_sertifikalar',
    'referanslar_itibar',
    'belge_bulgulari',
    'risk_faktorleri_olumlu',
    'risk_faktorleri_olumsuz',
    'risk_skoru',
    'risk_derecesi',
    'underwriting_onerileri',
    'ek_bilgi_talepleri',
    'kaynaklar',
    'rapor_markdown',
  ],
} as const;

const SYSTEM_PROMPT = [
  'Sen deneyimli bir sorumluluk sigortası underwriter asistanısın.',
  'Görevin, sigortalı hakkında kapsamlı bir risk değerlendirme raporu hazırlamaktır.',
  'Elindeki kaynaklar: (1) internet araştırması (web_search aracı), (2) yüklenen belgeler (soru formu, poliçe, reasürans slibi vb.), (3) underwriter tarafından girilen serbest metin.',
  '',
  'İnternet araştırmasında şunları araştır: sigortalının resmi web sitesi, faaliyet geçmişi ve kuruluş yılı, ürettiği/sattığı ürünlerin listesi,',
  'sahip olduğu kalite kontrol ve ürün sertifikaları (ISO, CE, FDA, GMP, TSE vb.), referans müşteriler, bilinen hasar/geri çağırma/dava geçmişi, itibar ve haber taraması.',
  '',
  'Tüm kaynaklardan gelen bilgileri BİRLEŞTİREREK objektif bir risk analizi yap. Bulamadığın bilgiler için "bilgi bulunamadı" de; asla uydurma.',
  'risk_skoru 0-100 arasında olsun (0 = en düşük risk, 100 = en yüksek risk). risk_derecesi bununla tutarlı olsun: 0-33 Düşük, 34-66 Orta, 67-100 Yüksek.',
  'rapor_markdown alanına, tüm bölümleri içeren, başlıklandırılmış, okunaklı tam raporu Markdown formatında yaz.',
  'Raporu ÖZLÜ tut: her bölüm birkaç net cümle olsun, rapor_markdown yaklaşık 600-800 kelimeyi aşmasın. Underwriter hızlı karar vermek için okuyor; dolgu cümle kullanma.',
  'Tüm çıktı Türkçe olmalıdır.',
].join('\n');

export interface AssessInput {
  coverage: CoverageKey;
  insuredName: string;
  website?: string;
  freeText?: string;
  files: PreparedFile[];
}

export interface AssessResult {
  report: RiskReport;
  model: string;
}

// Claude'a gönderilecek kullanıcı içerik bloklarını oluşturur
function buildUserContent(input: AssessInput): Anthropic.ContentBlockParam[] {
  const cov = COVERAGES[input.coverage];
  const blocks: Anthropic.ContentBlockParam[] = [];

  const intro = [
    `## Risk Değerlendirme Talebi`,
    ``,
    `**Teminat Türü:** ${cov.label}`,
    `**Sigortalı Adı:** ${input.insuredName}`,
    input.website ? `**Bilinen Web Sitesi:** ${input.website}` : `**Web Sitesi:** Belirtilmedi (lütfen internetten araştır).`,
    ``,
    `**Bu teminata özgü değerlendirme odağı:** ${cov.odak}`,
    ``,
    input.freeText
      ? `### Underwriter Serbest Notları\n${input.freeText}`
      : `### Underwriter Serbest Notları\n(Girilmedi)`,
  ].join('\n');

  blocks.push({ type: 'text', text: intro });

  // Yüklenen belgeler
  const textFiles = input.files.filter((f) => f.kind === 'text' && f.text);
  const pdfFiles = input.files.filter((f) => f.kind === 'pdf' && f.base64);
  const imageFiles = input.files.filter((f) => f.kind === 'image' && f.base64);
  const skipped = input.files.filter((f) => f.kind === 'unsupported');

  if (input.files.length > 0) {
    blocks.push({
      type: 'text',
      text: `### Yüklenen Belgeler (${input.files.length} adet)\nAşağıdaki belgeleri risk analizinde dikkate al.`,
    });
  }

  for (const f of textFiles) {
    blocks.push({
      type: 'text',
      text: `--- BELGE: ${f.name} ---\n${f.text}\n--- BELGE SONU ---`,
    });
  }

  for (const f of pdfFiles) {
    blocks.push({ type: 'text', text: `Belge (PDF): ${f.name}` });
    blocks.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: f.base64 as string,
      },
    });
  }

  for (const f of imageFiles) {
    blocks.push({ type: 'text', text: `Belge (Görsel): ${f.name}` });
    blocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: (f.mediaType || 'image/jpeg') as
          | 'image/jpeg'
          | 'image/png'
          | 'image/gif'
          | 'image/webp',
        data: f.base64 as string,
      },
    });
  }

  if (skipped.length > 0) {
    blocks.push({
      type: 'text',
      text:
        `### İşlenemeyen Belgeler\n` +
        skipped.map((f) => `- ${f.name}: ${f.note ?? 'desteklenmiyor'}`).join('\n'),
    });
  }

  blocks.push({
    type: 'text',
    text: 'Şimdi internet araştırmanı yap, tüm bilgileri birleştir ve risk değerlendirme raporunu istenen JSON şemasına göre üret.',
  });

  return blocks;
}

function tryExtractJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Structured output'un geçerli JSON'u SON text bloğundadır; web araması sırasında
// üretilen ara açıklama metinleri JSON değildir. Bu yüzden blokları sondan başa tarar.
function parseReportFromContent(content: Anthropic.ContentBlock[]): unknown {
  const textBlocks = content.filter(
    (b): b is Anthropic.TextBlock => b.type === 'text' && !!b.text?.trim()
  );
  if (textBlocks.length === 0) {
    throw new Error('Yapay zeka boş yanıt döndürdü.');
  }
  for (let i = textBlocks.length - 1; i >= 0; i--) {
    const parsed = tryExtractJson(textBlocks[i].text);
    if (parsed && typeof parsed === 'object') return parsed;
  }
  const snippet = textBlocks[textBlocks.length - 1].text.slice(0, 200);
  throw new Error(
    `Yapay zeka yanıtı JSON olarak ayrıştırılamadı. Yanıtın başı: "${snippet}..."`
  );
}

function normalizeReport(raw: any): RiskReport {
  const grade: RiskGrade =
    raw.risk_derecesi === 'Düşük' || raw.risk_derecesi === 'Orta' || raw.risk_derecesi === 'Yüksek'
      ? raw.risk_derecesi
      : 'Orta';
  const asArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : [];

  return {
    yonetici_ozeti: String(raw.yonetici_ozeti ?? ''),
    sigortali_profili: String(raw.sigortali_profili ?? ''),
    urun_faaliyet_analizi: String(raw.urun_faaliyet_analizi ?? ''),
    kalite_sertifikalar: String(raw.kalite_sertifikalar ?? ''),
    referanslar_itibar: String(raw.referanslar_itibar ?? ''),
    belge_bulgulari: String(raw.belge_bulgulari ?? ''),
    risk_faktorleri_olumlu: asArray(raw.risk_faktorleri_olumlu),
    risk_faktorleri_olumsuz: asArray(raw.risk_faktorleri_olumsuz),
    risk_skoru: Number.isFinite(raw.risk_skoru) ? Math.round(raw.risk_skoru) : 50,
    risk_derecesi: grade,
    underwriting_onerileri: String(raw.underwriting_onerileri ?? ''),
    ek_bilgi_talepleri: asArray(raw.ek_bilgi_talepleri),
    kaynaklar: asArray(raw.kaynaklar),
    rapor_markdown: String(raw.rapor_markdown ?? ''),
  };
}

export async function runRiskAssessment(input: AssessInput): Promise<AssessResult> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: buildUserContent(input) },
  ];

  // output_config henüz SDK tiplerinde olmayabilir; params'i genişletip cast ediyoruz.
  const baseParams = {
    model,
    // Uzun raporun (rapor_markdown dahil) yarıda kesilmemesi için geniş çıktı sınırı.
    // 16k üzeri çıktı için SDK streaming gerektirir; stream + finalMessage kullanıyoruz.
    max_tokens: 32000,
    system: SYSTEM_PROMPT,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 }],
    output_config: {
      // 'low' efor + sınırlı web araması + özlü rapor talimatı:
      // analiz Vercel'in 300 sn arka plan süre limitine güvenle sığmalı
      effort: 'low',
      format: { type: 'json_schema', schema: REPORT_SCHEMA },
    },
  };

  const callClaude = async (): Promise<Anthropic.Message> =>
    client.messages.stream({ ...baseParams, messages } as any).finalMessage();

  let response = await callClaude();

  // Sunucu taraflı araç döngüsü sınırına ulaşırsa devam ettir
  let guard = 0;
  while (response.stop_reason === 'pause_turn' && guard < 6) {
    guard += 1;
    messages.push({ role: 'assistant', content: response.content });
    response = await callClaude();
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('Yapay zeka bu talebi güvenlik nedeniyle reddetti.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      'Rapor, çıktı uzunluk sınırına takıldı ve tamamlanamadı. Lütfen tekrar deneyin; sorun sürerse daha az belge ile deneyin.'
    );
  }

  const parsed = parseReportFromContent(response.content as Anthropic.ContentBlock[]);
  const report = normalizeReport(parsed);
  return { report, model };
}
