-- Run this migration on an existing IRAQ EMPIRE CINEMA Supabase project.
-- It adds notifications and automatic community notifications without replacing existing data.

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    actor_id uuid references public.profiles(id) on delete set null,
    type text not null check (type in ('reply','like','dislike','report','moderation')),
    comment_id uuid references public.comments(id) on delete cascade,
    item_id text,
    item_type text,
    message text not null check (char_length(trim(message)) between 1 and 500),
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
for select using (auth.uid() = user_id);

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.notify_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    parent_user uuid;
begin
    if new.parent_id is null then return new; end if;
    select user_id into parent_user from public.comments where id = new.parent_id;
    if parent_user is null or parent_user = new.user_id then return new; end if;
    insert into public.notifications(user_id, actor_id, type, comment_id, item_id, item_type, message)
    values (parent_user, new.user_id, 'reply', new.id, new.item_id, new.item_type, 'لديك رد جديد على تعليقك');
    return new;
end;
$$;

drop trigger if exists comment_reply_notification_trigger on public.comments;
create trigger comment_reply_notification_trigger
after insert on public.comments
for each row execute function public.notify_comment_reply();

create or replace function public.notify_comment_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    owner_id uuid;
    target_comment uuid;
    actor uuid;
    reaction_type text;
    reaction_name text;
begin
    target_comment := new.comment_id;
    actor := new.user_id;
    select user_id into owner_id from public.comments where id = target_comment;
    if owner_id is null or owner_id = actor then return new; end if;
    reaction_type := case when new.reaction = 1 then 'like' else 'dislike' end;
    reaction_name := case when new.reaction = 1 then 'إعجاب' else 'عدم إعجاب' end;
    insert into public.notifications(user_id, actor_id, type, comment_id, message)
    values (owner_id, actor, reaction_type, target_comment, 'حصل تعليقك على ' || reaction_name);
    return new;
end;
$$;

drop trigger if exists comment_reaction_notification_trigger on public.comment_reactions;
create trigger comment_reaction_notification_trigger
after insert or update on public.comment_reactions
for each row execute function public.notify_comment_reaction();
