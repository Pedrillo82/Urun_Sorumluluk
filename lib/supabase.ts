import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Yalnızca sunucu tarafında kullanılan Supabase istemcisi.
// service_role anahtarı RLS'i atlar; bu dosya asla client bileşenlerine import edilmemelidir.

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri tanımlı değil. .env.local dosyasını kontrol edin.'
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function getStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || 'risk-belgeleri';
}
