# IRAQ EMPIRE CINEMA Complete System Design

**Goal:** Make the Vercel cinema project a single connected system for movies, series, anime, manga, manhwa, novels, accounts, search, watch/read state, and authorized provider links.

## Architecture

- `index.html` is the homepage shell.
- `/api/home` is the canonical homepage renderer and script injector.
- `index.js` handles local movie/series UI; resilient recovery must not depend on browser-side AniList/Jikan availability.
- `/api/catalog-media` is the canonical server-side AniList catalog for anime, manga, manhwa, and novels.
- `/api/title` is the canonical detail endpoint for every supported media ID.
- `watch.html` is the single detail/watch/read surface.
- Supabase provides browser authentication, profiles, favorites, progress, comments, and notifications.
- Discord OAuth is configured through Supabase Auth, never through a Discord bot token in frontend code.

## Reliability Rules

1. Third-party source failures must not blank the homepage.
2. Browser code must not call AniList/Jikan directly for catalog recovery.
3. Real metadata must remain visible even when no playable source exists.
4. Playable sources and provider-only links must remain separate.
5. No fake episodes, chapters, watch URLs, or availability states.
6. Missing Supabase configuration must be reported as a clean configuration state rather than repeated HTTP 503 noise.
7. Production secrets must never be committed to the repository.

## Account Flow

1. Browser requests `/api/supabase-config`.
2. The endpoint returns only the public Supabase URL and publishable key when configured.
3. Browser creates a Supabase client with persistent sessions and URL-session detection.
4. Browser checks `/api/supabase-status` to determine whether Discord OAuth is enabled.
5. Login uses `signInWithOAuth({ provider: "discord", redirectTo })`.
6. Supabase redirects back to `/account.html` or `/` and restores the session.
7. The profile row is loaded through RLS using the authenticated user's ID.

## Deployment Boundary

Repository correctness can be verified in GitHub Actions. Vercel deployment status and Supabase/Discord provider configuration are external deployment settings and must be verified separately; code must fail gracefully when those settings are missing.
