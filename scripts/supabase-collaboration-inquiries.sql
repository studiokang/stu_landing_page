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
-- service_role 은 RLS 우회. Vercel에 anon 키만 있을 때는 아래 정책 + grant 필요.

grant usage on schema public to anon;
grant insert on table public.collaboration_inquiries to anon;

drop policy if exists "collaboration_inquiries_insert_anon" on public.collaboration_inquiries;
create policy "collaboration_inquiries_insert_anon"
  on public.collaboration_inquiries
  for insert
  to anon
  with check (true);
