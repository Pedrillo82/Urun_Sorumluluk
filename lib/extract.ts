import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Yüklenen dosyaları Claude'a gönderilebilir bloklara dönüştürmek için hazırlar.
// - PDF  -> document (base64) bloğu (Claude native okur)
// - JPEG/PNG -> image (base64) bloğu
// - DOCX -> mammoth ile metne çevrilir
// - XLSX/XLS/CSV -> SheetJS ile metne (CSV benzeri) çevrilir
// - Diğer metin türleri -> düz metin

export type PreparedKind = 'pdf' | 'image' | 'text' | 'unsupported';

export interface PreparedFile {
  name: string;
  mime: string;
  kind: PreparedKind;
  base64?: string; // pdf/image için
  mediaType?: string; // image için (image/jpeg, image/png)
  text?: string; // text için çıkarılan içerik
  note?: string; // desteklenmeyen/hata durumları için açıklama
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export async function prepareFile(
  name: string,
  mime: string,
  buffer: Buffer
): Promise<PreparedFile> {
  const ext = extOf(name);

  try {
    // PDF
    if (mime === 'application/pdf' || ext === 'pdf') {
      return { name, mime, kind: 'pdf', base64: buffer.toString('base64') };
    }

    // Görsel
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      let mediaType = mime;
      if (!mediaType.startsWith('image/')) {
        mediaType =
          ext === 'png'
            ? 'image/png'
            : ext === 'webp'
            ? 'image/webp'
            : ext === 'gif'
            ? 'image/gif'
            : 'image/jpeg';
      }
      return { name, mime, kind: 'image', base64: buffer.toString('base64'), mediaType };
    }

    // Word (.docx)
    if (
      ext === 'docx' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return { name, mime, kind: 'text', text: result.value };
    }

    // Excel (.xlsx / .xls) ve CSV
    if (
      ['xlsx', 'xls', 'csv', 'tsv'].includes(ext) ||
      mime.includes('spreadsheet') ||
      mime === 'text/csv'
    ) {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const parts: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        parts.push(`### Sayfa: ${sheetName}\n${csv}`);
      }
      return { name, mime, kind: 'text', text: parts.join('\n\n') };
    }

    // Düz metin türleri
    if (
      mime.startsWith('text/') ||
      ['txt', 'md', 'json', 'xml', 'html'].includes(ext)
    ) {
      return { name, mime, kind: 'text', text: buffer.toString('utf-8') };
    }

    return {
      name,
      mime,
      kind: 'unsupported',
      note: `Desteklenmeyen dosya türü (${mime || ext}). İçerik analize dahil edilemedi.`,
    };
  } catch (err) {
    return {
      name,
      mime,
      kind: 'unsupported',
      note: `Dosya işlenirken hata oluştu: ${(err as Error).message}`,
    };
  }
}
