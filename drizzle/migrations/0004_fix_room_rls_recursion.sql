-- Fix "infinite recursion detected in policy for relation room_participants".
-- The old "Members see co-participants" SELECT policy queried room_participants
-- inside its own policy, and study_rooms / room_messages policies chained into
-- it, so every study-room read failed with HTTP 500. All membership checks now
-- go through a SECURITY DEFINER helper that bypasses RLS on room_participants.

create or replace function public.is_room_member(_room_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_participants
    where room_id = _room_id
      and user_id = _user_id
  )
$$;

revoke all on function public.is_room_member(uuid, uuid) from public, anon;
grant execute on function public.is_room_member(uuid, uuid) to authenticated;
grant execute on function public.is_room_member(uuid, uuid) to service_role;

drop policy if exists "Members see co-participants" on public.room_participants;
create policy "Members see co-participants"
on public.room_participants
for select
to authenticated
using (public.is_room_member(room_id, auth.uid()));

drop policy if exists "Room members read messages" on public.room_messages;
create policy "Room members read messages"
on public.room_messages
for select
to authenticated
using (public.is_room_member(room_id, auth.uid()));

drop policy if exists "rooms select public or member" on public.study_rooms;
create policy "rooms select public or member"
on public.study_rooms
for select
to authenticated
using (
  is_public = true
  or host_user_id = auth.uid()
  or public.is_room_member(id, auth.uid())
);
