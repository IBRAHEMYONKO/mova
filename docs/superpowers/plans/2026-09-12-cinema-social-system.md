# Cinema Social System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a legal/authorized content-source architecture plus Discord-linked accounts and a complete comment/reaction/report moderation system to IRAQ EMPIRE CINEMA.

**Architecture:** Keep Vercel Functions as the backend and use a hosted database/auth provider rather than filesystem persistence. Use Discord OAuth2 through Supabase Auth for identity, with the Discord ID/profile stored alongside application user records. Keep content metadata from TMDB/AniList and add managed watch/read sources, episodes, seasons, and chapters; the UI renders those sections only when real data exists.

**Tech Stack:** Vercel Functions, Node.js 24.x, vanilla HTML/CSS/JS, Supabase Auth + Postgres, Discord OAuth2, existing TMDB/AniList sources.

**Spec:** `docs/superpowers/plans/2026-09-12-cinema-social-system.md` (approved design in chat).

## Global Constraints

- Never expose a Discord bot token to the browser or website frontend.
- Discord account linking uses OAuth2 and stores only the identity/profile fields needed by the application.
- Watch/read sources must be legal, authorized, or user-managed sources; do not add piracy scraping or access bypasses.
- Never render an episode/chapter section unless actual episode/chapter data exists.
- Never render a watch/read action unless a real source exists.
- Existing black/gold/crimson visual identity must remain intact.
- Arabic is the primary user-facing language.
- Existing TMDB/AniList metadata remains usable even when watch/read sources are absent.
- Vercel runtime storage is not used as a persistent database.

---

### Task 1: Database and authentication foundation

**Files:**
- Create: `api/auth/me.js`
- Create: `api/auth/logout.js`
- Create: `api/auth/login.js`
- Create: `lib/supabase.js`
- Create: `lib/auth.js`
- Create: `supabase/schema.sql`
- Modify: `package.json`
- Test: `tests/auth.test.js`

- [ ] Define tables for users, content sources, seasons, episodes, chapters, comments, replies, reactions, reports, and moderation bans.
- [ ] Add indexes for content IDs, parent comments, and Discord/user IDs.
- [ ] Add auth helpers that validate Supabase sessions server-side.
- [ ] Add login/logout/me endpoints.
- [ ] Add failing tests for unauthenticated and authenticated behavior.
- [ ] Run tests and verify expected failures before implementation.
- [ ] Implement the minimum foundation.
- [ ] Run tests again and verify green.

### Task 2: Managed watch/read content model

**Files:**
- Create: `api/content/details.js`
- Create: `api/content/episodes.js`
- Create: `api/content/chapters.js`
- Create: `lib/contentSources.js`
- Modify: `lib/catalog.js`
- Modify: `api/movies.js`
- Test: `tests/content.test.js`

- [ ] Add managed sources for movies, series, anime, manga, manhwa, and novels.
- [ ] Add seasons/episodes and chapters with source URLs.
- [ ] Return empty arrays only when no data exists and make the frontend hide those sections.
- [ ] Preserve TMDB/AniList metadata and deduplication.
- [ ] Test that missing episodes/chapters produce no section and missing sources produce no watch/read action.

### Task 3: Discord-linked profile UI

**Files:**
- Modify: `index.html`
- Modify: `index.js`
- Modify: `style.css`
- Test: `tests/frontend-profile.test.js`

- [ ] Add login/profile control without exposing tokens.
- [ ] Show Discord avatar, display name, and connection state.
- [ ] Add logout flow.
- [ ] Keep the site usable while logged out.

### Task 4: Complete comments and reactions

**Files:**
- Create: `api/comments/list.js`
- Create: `api/comments/create.js`
- Create: `api/comments/update.js`
- Create: `api/comments/delete.js`
- Create: `api/comments/react.js`
- Create: `api/comments/report.js`
- Modify: `index.html`
- Modify: `index.js`
- Modify: `style.css`
- Test: `tests/comments.test.js`

- [ ] Support comments on a content item and optionally on a specific episode/chapter.
- [ ] Support replies.
- [ ] Support like/dislike reactions.
- [ ] Allow users to edit/delete their own comments.
- [ ] Add pagination and sorting.
- [ ] Require authentication for mutations.
- [ ] Test ownership and reaction rules.

### Task 5: Moderation

**Files:**
- Create: `api/moderation/comments.js`
- Create: `api/moderation/reports.js`
- Create: `api/moderation/bans.js`
- Create: `lib/moderation.js`
- Modify: `supabase/schema.sql`
- Test: `tests/moderation.test.js`

- [ ] Add report handling.
- [ ] Add moderator hide/delete actions.
- [ ] Add comment bans.
- [ ] Record moderation actions.
- [ ] Ensure banned users cannot create new comments/replies.

### Task 6: Integrate content detail experience

**Files:**
- Modify: `index.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `api/movies.js`
- Test: `tests/content-ui.test.js`

- [ ] Replace trailer-only behavior with conditional watch/read actions.
- [ ] Render seasons/episodes only when real data exists.
- [ ] Render chapters only when real data exists.
- [ ] Add manga, manhwa, and novel sections.
- [ ] Add episode/chapter-specific comments.
- [ ] Preserve current theme and responsive layout.

### Task 7: Verification and deployment configuration

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Create: `.env.example`

- [ ] Document Supabase project setup and Discord OAuth callback configuration.
- [ ] Document required Vercel environment variables.
- [ ] Run all tests.
- [ ] Verify `/api/status`, catalog loading, auth, comments, and content details.
- [ ] Verify no Discord bot token is present in frontend source.
