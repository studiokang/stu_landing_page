-- 이미 collaboration_inquiries 테이블만 만들어 둔 경우, RLS 42501 해결용으로만 실행
-- Supabase → SQL Editor → Run

grant usage on schema public to anon;
grant insert on table public.collaboration_inquiries to anon;

drop policy if exists "collaboration_inquiries_insert_anon" on public.collaboration_inquiries;
create policy "collaboration_inquiries_insert_anon"
  on public.collaboration_inquiries
  for insert
  to anon
  with check (true);
