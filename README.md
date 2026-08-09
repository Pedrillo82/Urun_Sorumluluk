# Sorumluluk Risk Değerlendirme Aracı

Sorumluluk branşı underwriter'ları için **web tabanlı**, yapay zeka destekli risk değerlendirme aracı.

Underwriter bir teminat seçer, sigortalı adını girer, risk belgelerini (soru formu, poliçe, reasürans slibi vb.) yükler ve ek notlar ekler. **"Risk Analizi Yap"** butonuna basınca Claude (Anthropic):

- Sigortalının web sitesini, geçmişini, ürünlerini, kalite/sertifikalarını ve referanslarını **internetten araştırır**,
- Yüklenen belgeleri (PDF/Word/Excel/JPEG) ve serbest metni **birleştirir**,
- Yapılandırılmış bir **risk analiz raporu** (risk skoru + derecesi ile) üretir.

Tüm kayıtlar (girdiler, dosyalar, rapor) **Supabase** üzerinde saklanır ve `Kayıtlar` sayfasından tekrar açılabilir.

> İlk (temel) sürümde teminatlar: **Ürün Sorumluluk** ve **Ürün Geri Çağırma**. Giriş (login) yok.

## Teknoloji

- **Next.js (App Router, TypeScript)** — frontend + sunucu API'leri
- **Anthropic Claude API** — risk analizi + `web_search` aracıyla internet araştırması
- **Supabase** — PostgreSQL veritabanı + dosya depolama (Storage)
- Belge işleme: PDF/JPEG native Claude'a gönderilir; Word `mammoth`, Excel `xlsx` ile metne çevrilir

## Kurulum

### 1. Bağımlılıklar
```bash
npm install
```

### 2. Supabase
1. https://supabase.com üzerinden ücretsiz bir proje oluşturun.
2. **SQL Editor**'de `supabase/migration.sql` dosyasını çalıştırın (tabloyu ve `risk-belgeleri` bucket'ını oluşturur).
3. **Project Settings → API** bölümünden `Project URL` ve `service_role` anahtarını not edin.

### 3. Ortam değişkenleri
`.env.example` dosyasını `.env.local` olarak kopyalayıp doldurun:
```bash
cp .env.example .env.local
```
```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5            # opsiyonel
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=risk-belgeleri
```
> `service_role` anahtarı gizlidir; yalnızca sunucuda kullanılır, tarayıcıya sızmaz.

### 4. Çalıştırma
```bash
npm run dev
```
`http://localhost:3000` adresini açın.

## Yayınlama (Vercel)

1. Bu repoyu Vercel'e bağlayın (Import Project).
2. Yukarıdaki 4 (opsiyonel 5) ortam değişkenini Vercel'e ekleyin.
3. Deploy edin. `main` benzeri dala her push'ta otomatik yayınlanır.

> AI + web araştırması birkaç dakika sürebildiğinden `/api/assess` için `maxDuration = 300s` ayarlıdır. Vercel planınızın fonksiyon süresi limitine dikkat edin.

## Proje Yapısı

```
app/
  page.tsx                # Yeni değerlendirme formu (client)
  kayitlar/page.tsx       # Kayıt listesi
  kayitlar/[id]/page.tsx  # Kayıt detayı / rapor
  api/assess/route.ts     # Ana analiz endpoint'i
components/
  ReportView.tsx, RiskBadge.tsx
lib/
  anthropic.ts   # Claude çağrısı + web_search + rapor şeması
  extract.ts     # docx/xlsx metin çıkarımı, pdf/görsel hazırlığı
  supabase.ts    # sunucu tarafı Supabase istemcisi
  coverages.ts   # teminat tanımları
  format.ts      # TR tarih/boyut biçimlendirme
  types.ts       # ortak tipler
supabase/migration.sql
```

## Sonraki Aşamalar (kapsam dışı)

Kullanıcı girişi/çok kullanıcı, diğer teminatlar (TPL, PI, D&O, Siber, İşveren, Kefalet), rapor PDF/Word dışa aktarımı, prim/fiyatlama entegrasyonu, kurumsal (Sompo) marka teması, rapor düzenleme.
