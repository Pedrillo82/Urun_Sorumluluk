-- Sorumluluk Risk Değerlendirme — Veritabanı Şeması
-- Supabase projenizde: SQL Editor > New query > bu dosyayı yapıştırıp çalıştırın.

create extension if not exists "pgcrypto";

create table if not exists public.assessments (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  coverage_type   text not null,           -- 'urun_sorumluluk' | 'urun_geri_cagirma'
  insured_name    text not null,
  website         text,
  free_text       text,
  files           jsonb not null default '[]'::jsonb,  -- [{name, path, type, size}]
  report          jsonb,                   -- yapılandırılmış rapor
  report_markdown text,
  risk_score      integer,                 -- 0-100
  risk_grade      text,                    -- 'Düşük' | 'Orta' | 'Yüksek'
  status          text not null default 'processing', -- processing | completed | failed
  model           text,
  error           text
);

create index if not exists assessments_created_at_idx
  on public.assessments (created_at desc);

-- Uygulama yalnızca sunucu tarafında service_role anahtarıyla eriştiği için
-- RLS'i etkin bırakıp hiçbir public policy tanımlamıyoruz (service_role RLS'i atlar).
-- Böylece tablo tarayıcıdan doğrudan (anon anahtarla) okunamaz.
alter table public.assessments enable row level security;

-- ------------------------------------------------------------------
-- STORAGE BUCKET
-- Aşağıdaki bucket'ı Supabase panelinden de oluşturabilirsiniz:
--   Storage > New bucket > ad: "risk-belgeleri", Public: KAPALI
-- Veya bu SQL ile:
insert into storage.buckets (id, name, public)
values ('risk-belgeleri', 'risk-belgeleri', false)
on conflict (id) do nothing;
-- Not: Dosyalara yalnızca sunucu (service_role) eriştiği için ek storage policy
-- gerekmez. İleride kullanıcı girişi eklenince buraya policy tanımlanabilir.
