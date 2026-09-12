# Discord Account + Index Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended) to implement this plan task-by-task.

**Goal:** Connect the existing Supabase Discord OAuth account system directly to the cinema homepage while preserving the existing account page, cloud library sync, community features, and future Discord Activity compatibility.

**Architecture:** Keep Discord OAuth handled by Supabase Auth. The homepage receives the public Supabase client configuration from `/api/supabase-config`, creates a browser client, and renders a compact account control in the existing topbar. The account page remains the full profile/community surface; both pages use the same persisted Supabase session. No Discord bot token or OAuth client secret is exposed to frontend code.

**Tech Stack:** Node.js 24, Vercel serverless functions, vanilla HTML/CSS/JS, Supabase Auth, Discord OAuth provider, Node built-in test runner.

**Spec:** Approved design: Discord login on the normal website, one shared account/session, cloud favorites/progress/community data, and later Discord Activity identity without a second login.

## Global Constraints

- Discord OAuth is configured through Supabase Auth; the Discord client secret never enters repository frontend code.
- `/api/supabase-config` exposes only the Supabase URL and publishable key.
- The homepage must work normally when Supabase is not configured; it must show a safe login state instead of breaking catalog rendering.
- Preserve the existing `/account.html` account page and its community statistics/notifications.
- Keep Arabic as the primary UI language.
- Do not require a Discord bot token anywhere on the website.
- All changed JavaScript must pass `node --check` and focused tests.

---

## Task 1: Lock the homepage authentication contract with tests

**Files:**
- Create: `test/index-account.test.js`
- Modify: `test/home-page.test.js`

- [ ] Add failing assertions that the homepage injection includes `index-account.js` exactly once.
- [ ] Add source-level assertions that the index account module uses `/api/supabase-config`, `signInWithOAuth({ provider: "discord" })`, and does not contain a bot token field.
- [ ] Add assertions for logged-in and logged-out rendering selectors.
- [ ] Run the focused tests and verify they fail against the current repository before implementation.

## Task 2: Add the homepage Discord account controller

**Files:**
- Create: `index-account.js`

- [ ] Create a browser-only module that safely boots after DOMContentLoaded.
- [ ] Load `/api/supabase-config` with `cache: no-store`.
- [ ] If Supabase is unavailable or unconfigured, leave the cinema usable and render a neutral login control.
- [ ] Create the Supabase client with persisted session and automatic token refresh.
- [ ] Start Discord OAuth with `redirectTo: window.location.origin + "/"`.
- [ ] On an authenticated session, render Discord display name/avatar and link to `/account.html`.
- [ ] On logout, clear the session and restore the login control.
- [ ] Escape user-controlled display text before inserting it into the DOM.
- [ ] Keep all OAuth state inside Supabase Auth; do not implement a custom token/session protocol in frontend JavaScript.

## Task 3: Inject the account controller into the actual homepage

**Files:**
- Modify: `lib/home-page.js`
- Test: `test/home-page.test.js`

- [ ] Add the Supabase CDN script before `index-account.js`.
- [ ] Add `index-account.js` to the existing homepage script injection list.
- [ ] Preserve all existing navigation, continue-watching, list, notification, cloud-sync, and media-section injections.
- [ ] Ensure duplicate injection is prevented.
- [ ] Run the homepage tests and syntax check.

## Task 4: Fix the existing CI regression discovered before this feature

**Files:**
- Modify: `lib/tmdb-providers.js`
- Modify: `test/tmdb-provider-links.test.js` only if the test contract needs correction

- [ ] Keep the real TMDB provider link field intact.
- [ ] Make the implementation match the existing test contract without weakening provider behavior.
- [ ] Run the focused provider test.

## Task 5: Verify the complete project wiring

**Files:**
- Inspect: `index.html`, `index.js`, `lib/home-page.js`, `account.html`, `account.js`, `account-community.js`, `cloud-library-sync.js`, `api/supabase-config.js`, `supabase/schema.sql`, `vercel.json`, `.env.example`
- Modify only if a real wiring defect is found.

- [ ] Verify homepage → `/api/home` → injected scripts → catalog cards → `/watch.html?id=...`.
- [ ] Verify account login uses the same Supabase session as account.html.
- [ ] Verify favorites/progress cloud sync reads the authenticated Supabase user.
- [ ] Verify profiles, notifications, favorites, progress, and community RLS remain user-scoped.
- [ ] Verify account.html remains directly reachable without a rewrite collision.
- [ ] Verify no Discord bot token is required by any browser module.
- [ ] Verify Vercel rewrites remain valid.

## Task 6: Full verification

- [ ] Run all focused authentication/home/provider tests.
- [ ] Run every existing CI test listed in `.github/workflows/verify.yml`.
- [ ] Run `node --check` on every changed JavaScript file.
- [ ] Inspect the final GitHub Actions result; do not claim success while a check is failing.
- [ ] Verify the final diff contains no secrets.
- [ ] Confirm the remaining external requirement is Supabase Dashboard configuration: Discord provider enabled and the production/preview redirect URLs allowed.

## Acceptance Criteria

- The homepage visibly exposes Discord login without requiring the user to open account.html first.
- Clicking the homepage login starts Supabase Discord OAuth.
- Returning from OAuth to `/` keeps the authenticated session and renders the user's account control.
- The account control links to `/account.html`, where the existing profile/community surface continues to work.
- Logging out from account.html or the homepage removes the authenticated state from both pages.
- Cloud favorites and watch progress continue using the same Supabase user ID.
- The homepage still renders when Supabase is not configured.
- No Discord bot token or client secret is present in frontend code.
- All automated checks pass before completion is claimed.
