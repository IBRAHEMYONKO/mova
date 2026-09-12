-- IRAQ EMPIRE CINEMA
-- Supabase database foundation: profiles, favorites, progress, comments and moderation.
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text,
    display_name text,
    avatar_url text,
    bio text,
    is_moderator boolean not null default false,
    is_banned boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    item_id text not null,
    item_type text not null check (item_type in ('movie','series','anime','manga','manhwa','novel')),
    created_at timestamptz not null default now(),
    unique (user_id, item_id)
);

create table if not exists public.watch_progress (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    item_id text not null,
    item_type text not null,
    season_number integer,
    episode_number integer,
    chapter_number integer,
    position_seconds numeric not null default 0 check (position_seconds >= 0),
    duration_seconds numeric not null default 0 check (duration_seconds >= 0),
    completed boolean not null default false,
    updated_at timestamptz not null default now()
);

create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    item_id text not null,
    item_type text not null,
    episode_number integer,
    season_number integer,
    chapter_number integer,
    parent_id uuid references public.comments(id) on delete cascade,
    body text not null check (char_length(trim(body)) between 1 and 2000),
    is_hidden boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.comment_reactions (
    id uuid primary key default gen_random_uuid(),
    comment_id uuid not null references public.comments(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    reaction smallint not null check (reaction in (-1, 1)),
    created_at timestamptz not null default now(),
    unique (comment_id, user_id)
);

create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.profiles(id) on delete cascade,
    comment_id uuid references public.comments(id) on delete cascade,
    reason text not null,
    status text not null default 'open' check (status in ('open','reviewed','resolved','rejected')),
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);

create table if not exists public.moderation_actions (
    id uuid primary key default gen_random_uuid(),
    moderator_id uuid not null references public.profiles(id) on delete cascade,
    target_user_id uuid references public.profiles(id) on delete cascade,
    comment_id uuid references public.comments(id) on delete cascade,
    action text not null,
    reason text,
    created_at timestamptz not null default now()
);

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

create index if not exists favorites_user_idx on public.favorites(user_id);
create index if not exists progress_user_updated_idx on public.watch_progress(user_id, updated_at desc);
create index if not exists comments_item_idx on public.comments(item_id, created_at desc);
create index if not exists comments_parent_idx on public.comments(parent_id);
create index if not exists reactions_comment_idx on public.comment_reactions(comment_id);
create index if not exists reports_status_idx on public.reports(status, created_at desc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

-- PostgreSQL UNIQUE treats NULLs as distinct. These indexes make the watch-progress
-- dimensions truly unique for a user/item, including movie-level and chapter-level rows.
drop index if exists public.watch_progress_unique_dimensions;
create unique index watch_progress_unique_dimensions
on public.watch_progress (
    user_id,
    item_id,
    coalesce(season_number, 0),
    coalesce(episode_number, 0),
    coalesce(chapter_number, 0)
);

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.watch_progress enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.notifications enable row level security;

-- Profiles
create policy "profiles readable" on public.profiles
for select using (true);

create policy "users insert own profile" on public.profiles
for insert with check (auth.uid() = id);

create policy "users update own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is not null then
        new.is_moderator := old.is_moderator;
        new.is_banned := old.is_banned;
    end if;
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists protect_profile_security_fields_trigger on public.profiles;
create trigger protect_profile_security_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

-- Favorites
create policy "users read own favorites" on public.favorites
for select using (auth.uid() = user_id);
create policy "users create own favorites" on public.favorites
for insert with check (auth.uid() = user_id);
create policy "users delete own favorites" on public.favorites
for delete using (auth.uid() = user_id);

-- Progress
create policy "users read own progress" on public.watch_progress
for select using (auth.uid() = user_id);
create policy "users create own progress" on public.watch_progress
for insert with check (auth.uid() = user_id);
create policy "users update own progress" on public.watch_progress
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own progress" on public.watch_progress
for delete using (auth.uid() = user_id);

-- Comments
create policy "comments readable" on public.comments
for select using (is_hidden = false or auth.uid() = user_id);
create policy "users create comments" on public.comments
for insert with check (auth.uid() = user_id);
create policy "users update own comments" on public.comments
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own comments" on public.comments
for delete using (auth.uid() = user_id);

-- Reactions
create policy "reactions readable" on public.comment_reactions
for select using (true);
create policy "users create own reactions" on public.comment_reactions
for insert with check (auth.uid() = user_id);
create policy "users update own reactions" on public.comment_reactions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own reactions" on public.comment_reactions
for delete using (auth.uid() = user_id);

-- Reports
create policy "users create reports" on public.reports
for insert with check (auth.uid() = reporter_id);
create policy "users read own reports" on public.reports
for select using (auth.uid() = reporter_id);

-- Moderation actions are server-only.

-- Notifications: each user can read and mark only their own notifications.
create policy "users read own notifications" on public.notifications
for select using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reply notifications.
create or replace function public.notify_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    parent_user uuid;
    item_label text;
begin
    if new.parent_id is null then return new; end if;
    select user_id into parent_user from public.comments where id = new.parent_id;
    if parent_user is null or parent_user = new.user_id then return new; end if;
    item_label := coalesce(new.item_id, 'عمل');
    insert into public.notifications(user_id, actor_id, type, comment_id, item_id, item_type, message)
    values (parent_user, new.user_id, 'reply', new.id, new.item_id, new.item_type, 'لديك رد جديد على تعليقك في ' || item_label);
    return new;
end;
$$;

drop trigger if exists comment_reply_notification_trigger on public.comments;
create trigger comment_reply_notification_trigger
after insert on public.comments
for each row execute function public.notify_comment_reply();

-- Reaction notifications.
create or replace function public.notify_comment_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    owner_id uuid;
    reaction_name text;
    target_comment uuid;
    actor uuid;
begin
    target_comment := coalesce(new.comment_id, old.comment_id);
    actor := coalesce(new.user_id, old.user_id);
    select user_id into owner_id from public.comments where id = target_comment;
    if owner_id is null or owner_id = actor then return coalesce(new, old); end if;
    reaction_name := case when coalesce(new.reaction, old.reaction) = 1 then 'إعجاب' else 'عدم إعجاب' end;
    insert into public.notifications(user_id, actor_id, type, comment_id, message)
    values (owner_id, actor, case when coalesce(new.reaction, old.reaction) = 1 then 'like' else 'dislike' end, target_comment, 'حصل تعليقك على ' || reaction_name);
    return coalesce(new, old);
end;
$$;

drop trigger if exists comment_reaction_notification_trigger on public.comment_reactions;
create trigger comment_reaction_notification_trigger
after insert or update on public.comment_reactions
for each row execute function public.notify_comment_reaction();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, display_name, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
        new.raw_user_meta_data ->> 'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
