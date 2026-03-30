-- Supabase → SQL Editor 에서 실행 (테이블 생성)
-- 협업 문의: /api/submit-collaboration → REST insert

create table if not exists public.collaboration_inquiries (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  contact_name text not null,
  email text not null,
  phone text,
  collaboration_types text[] not null default '{}',
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists collaboration_inquiries_created_at_idx
  on public.collaboration_inquiries (created_at desc);

comment on table public.collaboration_inquiries is 'Contact page — 협업 문의 (Vercel API + service_role)';

alter table public.collaboration_inquiries enable row level security;
-- service_role 은 RLS 우회. anon 은 정책 없으면 접근 불가.
