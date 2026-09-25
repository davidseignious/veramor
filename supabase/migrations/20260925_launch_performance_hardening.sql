-- VERAMOR beta launch performance hardening
-- Keep chat read updates, moderation queues, discovery gating, and notification feeds fast as beta users grow.

create index if not exists messages_unread_match_sender_idx
  on public.messages (match_id, sender_id)
  where read_at is null;

create index if not exists reports_status_priority_created_idx
  on public.reports (status, priority desc, created_at asc);

create index if not exists profiles_discovery_gate_idx
  on public.profiles (profile_status, is_visible, verification_status, updated_at desc);

create index if not exists notifications_unread_user_idx
  on public.notifications (user_id, deliver_at desc)
  where read_at is null;
