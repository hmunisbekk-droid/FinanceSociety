-- Statistics for the admin panel (FR-38), computed in one call.
create or replace function public.admin_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'registered', (select count(*) from public.profiles),
    'active_week', (
      select count(distinct user_id) from (
        select user_id from public.topic_views    where viewed_at      > now() - interval '7 days'
        union select user_id from public.quiz_attempts  where submitted_at   > now() - interval '7 days'
        union select user_id from public.topic_progress where last_opened_at > now() - interval '7 days'
      ) u where user_id is not null
    ),
    'published_topics', (select count(*) from public.topics where status = 'published'),
    'topics_with_quiz', (
      select count(*) from public.topics t
      join public.quizzes q on q.topic_id = t.id
      where t.status = 'published' and q.status = 'published'
    ),
    'event_registrations', (select count(*) from public.event_registrations where cancelled_at is null),
    'most_viewed', (
      select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (
        select t.id, t.title, s.name as subject, count(v.id) as views
        from public.topic_views v
        join public.topics t on t.id = v.topic_id
        join public.subjects s on s.id = t.subject_id
        where v.viewed_at > now() - interval '30 days'
        group by t.id, t.title, s.name
        order by views desc
        limit 10
      ) x
    ),
    'quiz_averages', (
      select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (
        select t.id, t.title, s.name as subject, round(avg(a.percent)) as avg_percent, count(a.id) as attempts
        from public.quiz_attempts a
        join public.quizzes q on q.id = a.quiz_id
        join public.topics t on t.id = q.topic_id
        join public.subjects s on s.id = t.subject_id
        group by t.id, t.title, s.name
        order by attempts desc
        limit 20
      ) x
    )
  ) into result;

  return result;
end $$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
