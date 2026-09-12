# IRAQ EMPIRE CINEMA Complete System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing IRAQ EMPIRE CINEMA repository into a coherent multi-media catalog where movies, series, anime, manga, and manhwa have real metadata, visible seasons/episodes/chapters, legitimate provider links, playback/reading state, and no fake availability.

**Architecture:** Keep the current Vercel serverless structure and make `lib/catalog.js` the metadata layer, `api/title.js` the canonical title-detail API, and `watch.html` the unified detail/play/read surface. Separate metadata availability from playable-source availability so real TMDB episodes can be displayed even when no direct authorized episode stream is configured. Add manga/manhwa metadata through AniList's manga media type, while source buttons remain limited to official/authorized provider links.

**Tech Stack:** Node.js 24, Vercel serverless functions, vanilla HTML/CSS/JS, TMDB REST API, AniList GraphQL, existing Supabase browser integration, Node built-in test runner.

**Spec:** Existing approved cinema design in conversation; current repository flow is `index.html → /api/home → watch-navigation.js → /watch.html?id=... → /api/title?id=...`.

## Global Constraints

- No Discord bot token is required by the website.
- Never invent episodes, chapters, seasons, watch URLs, or playback availability.
- Never add piracy/scraping integrations for unlicensed streaming or manga sources.
- Show episode/chapter metadata even when a direct playable source is unavailable; clearly label unavailable playback.
- Use official/authorized provider links when available.
- Preserve existing search, filters, favorites, continue-watching, comments, moderation, and Discord OAuth behavior.
- Keep Arabic UI as the primary user-facing language.
- Use complete-file edits when replacing existing files.

---

## Task 1: Stabilize the catalog and media taxonomy

**Files:**
- Modify: `lib/catalog.js`
- Test: existing catalog tests plus a new catalog media-type test if no suitable test exists

**Interfaces:**
- Consumes: TMDB and AniList metadata APIs.
- Produces: normalized catalog items with `type` values `movie`, `series`, `anime`, `manga`, and `manhwa`, plus stable IDs and media metadata.

- [ ] **Step 1: Write failing tests** for manga/manhwa normalization and stable media type fields.
- [ ] **Step 2: Run the focused catalog tests** and verify the new assertions fail before implementation.
- [ ] **Step 3: Extend AniList GraphQL queries** to request `type: MANGA`, `format`, `countryOfOrigin`, `chapters`, `volumes`, `genres`, `coverImage`, `bannerImage`, `averageScore`, and `status`.
- [ ] **Step 4: Normalize AniList manga entries** into the same catalog shape while deriving `manhwa` from Korean country/source metadata and keeping generic manga as `manga`.
- [ ] **Step 5: Add stable IDs** such as `anilist-manga-<id>` and preserve existing anime IDs unchanged.
- [ ] **Step 6: Add separate catalog collections** (`movies`, `series`, `anime`, `manga`, `manhwa`) without breaking `all`.
- [ ] **Step 7: Run focused catalog tests** and confirm they pass.
- [ ] **Step 8: Commit** with `feat: add manga and manhwa catalog taxonomy`.

## Task 2: Fix episode modeling so metadata is not deleted when sources are absent

**Files:**
- Modify: `lib/episode-model.js`
- Modify: `lib/watch-model.js`
- Modify: `lib/watch-response.js`
- Test: existing watch/episode model tests; add focused tests if missing

**Interfaces:**
- Consumes: TMDB season/episode metadata and stored source records.
- Produces: normalized seasons containing real TMDB episodes, each with zero or more validated sources.

- [ ] **Step 1: Add a failing test** proving a TMDB episode without a source remains in the season metadata while `playable` is false.
- [ ] **Step 2: Run the focused test and verify failure.**
- [ ] **Step 3: Change normalization** so source presence controls playback state, not whether the episode exists.
- [ ] **Step 4: Add explicit fields** such as `playable` and `sourceCount` to episodes/seasons without fabricating URLs.
- [ ] **Step 5: Keep invalid source URLs rejected** by the existing source validator.
- [ ] **Step 6: Run episode/watch tests.**
- [ ] **Step 7: Commit** with `fix: preserve episode metadata without playable sources`.

## Task 3: Make `/api/title` a complete canonical detail API

**Files:**
- Modify: `api/title.js`
- Modify: `lib/watch-availability.js`
- Modify: `lib/watch-response.js`
- Test: `api/title` and watch availability tests

**Interfaces:**
- Consumes: catalog item, TMDB episodes, stored sources, TMDB provider data.
- Produces: `{ success, item, watch, providers, meta }` with real metadata and explicit playback availability.

- [ ] **Step 1: Add failing API-shape tests** for series episodes, manga chapters, provider links, and empty-source states.
- [ ] **Step 2: Run the focused API tests and verify failure.**
- [ ] **Step 3: Resolve AniList IDs as well as existing catalog IDs.**
- [ ] **Step 4: For series/anime backed by TMDB, fetch season metadata and retain every real episode returned by TMDB.**
- [ ] **Step 5: Attach stored authorized sources without changing episode metadata when none exist.**
- [ ] **Step 6: For manga/manhwa, return chapter count, volume count, status, and normalized chapter metadata from the catalog item when available.**
- [ ] **Step 7: Return provider attribution and official links separately from direct playable sources.**
- [ ] **Step 8: Make `watch.available` mean that at least one actual playable source exists, not merely that metadata exists.**
- [ ] **Step 9: Run all focused API tests.**
- [ ] **Step 10: Commit** with `feat: complete title detail API`.

## Task 4: Build real manga/manhwa sections on the homepage

**Files:**
- Modify: `index.html`
- Modify: `index.js`
- Modify: `lib/home-page.js` only if injection is required
- Test: frontend/catalog smoke tests where available

**Interfaces:**
- Consumes: catalog collections from the existing homepage data flow.
- Produces: visible Arabic sections for anime, manga, manhwa, movies, and series with consistent cards.

- [ ] **Step 1: Add the homepage sections and stable IDs** without removing existing sections.
- [ ] **Step 2: Update homepage rendering** to populate manga/manhwa cards from real catalog data.
- [ ] **Step 3: Make every card route to `/watch.html?id=<encoded-id>` using the existing navigation model.**
- [ ] **Step 4: Add section empty states instead of fake cards.**
- [ ] **Step 5: Run JavaScript syntax checks and the existing homepage tests.**
- [ ] **Step 6: Commit** with `feat: add manga and manhwa homepage sections`.

## Task 5: Replace the watch page placeholders with a unified media experience

**Files:**
- Modify: `watch.html`
- Modify: `watch-provider-ui.js` if required for provider presentation
- Modify: `watch-progress-ui.js` only where needed for episode/chapter state
- Test: add browser-independent rendering/data tests where practical

**Interfaces:**
- Consumes: canonical `/api/title` response.
- Produces: movie, series/anime, manga, and manhwa-specific UI without empty fake controls.

- [ ] **Step 1: Add explicit media-type sections** for `مشاهدة`, `المواسم والحلقات`, `الفصول`, and `القراءة`.
- [ ] **Step 2: Render every real season and episode from the API, including episodes with no playable source.**
- [ ] **Step 3: For playable episodes, show the play control; for unavailable episodes, show a disabled Arabic availability state plus provider links when applicable.**
- [ ] **Step 4: Add season switching, previous/next episode state, and selected-episode persistence.**
- [ ] **Step 5: Render manga/manhwa chapter lists from normalized chapter metadata.**
- [ ] **Step 6: Add a reader state that only opens when a valid authorized chapter source exists; otherwise show official-provider links.**
- [ ] **Step 7: Keep favorites, continue watching, comments, and notifications wired to the same title ID.**
- [ ] **Step 8: Remove obsolete modal behavior and ensure there is only one primary navigation path.**
- [ ] **Step 9: Run syntax checks and all existing watch-page related tests.**
- [ ] **Step 10: Commit** with `feat: unify watch and reading experience`.

## Task 6: Improve official provider and source handling

**Files:**
- Modify: `lib/tmdb-providers.js`
- Modify: `lib/official-providers.js`
- Modify: `lib/provider-enrichment.js`
- Modify: `watch-provider-ui.js`
- Test: provider directory, enrichment, and API tests

**Interfaces:**
- Consumes: TMDB regional provider data and known official service metadata.
- Produces: region-aware provider cards with valid official destination URLs.

- [ ] **Step 1: Add failing tests** for provider URL validity, deduplication, region labels, and missing-link handling.
- [ ] **Step 2: Normalize provider records** into one shape: `{ id, name, logo, type, link, officialUrl, region, official }`.
- [ ] **Step 3: Prefer TMDB's region-specific link when present and otherwise use a verified official service URL.**
- [ ] **Step 4: Prevent provider cards from being mistaken for direct video playback.**
- [ ] **Step 5: Run provider tests.**
- [ ] **Step 6: Commit** with `fix: harden official provider links`.

## Task 7: Make playback and reading state reliable

**Files:**
- Modify: `watch-progress-ui.js`
- Modify: `lib/watch-progress.js`
- Modify: `continue-watching.js`
- Modify: `favorite-sync.js` only if title ID normalization requires it
- Test: progress/favorite tests

**Interfaces:**
- Consumes: canonical title IDs plus season/episode/chapter IDs.
- Produces: resumable watch/read state and correct Continue Watching entries.

- [ ] **Step 1: Add failing tests** for stable keys across episode changes and title types.
- [ ] **Step 2: Normalize progress keys** as `titleId + mediaType + unitId`.
- [ ] **Step 3: Save selected season/episode/chapter and playback position only for real units.**
- [ ] **Step 4: Make Continue Watching point back to the correct title and selected unit.**
- [ ] **Step 5: Run progress tests.**
- [ ] **Step 6: Commit** with `fix: stabilize watch and reading progress`.

## Task 8: End-to-end API and deployment verification

**Files:**
- Modify: tests only if a regression is discovered
- Inspect: `vercel.json`, `package.json`, `.env.example`

**Interfaces:**
- Consumes: all completed catalog/watch/provider modules.
- Produces: a verified deployment-ready repository.

- [ ] **Step 1: Run `node --test`.**
- [ ] **Step 2: Run syntax checks for every changed `.js` file with `node --check`.**
- [ ] **Step 3: Exercise `/api/home`, `/api/title`, `/api/providers`, and `/api/status` with representative IDs where environment credentials permit.**
- [ ] **Step 4: Verify missing credentials fail gracefully rather than returning fake catalog/watch data.**
- [ ] **Step 5: Verify the Vercel rewrite routes still map `/`, `/watch.html`, and `/my-list.html` correctly.**
- [ ] **Step 6: Inspect the final Git diff and confirm no Discord token or private credential was introduced.**
- [ ] **Step 7: Commit** with `chore: verify complete cinema system`.

## Acceptance Criteria

- Homepage visibly contains working movie, series, anime, manga, and manhwa sections when real catalog data exists.
- Clicking any real title reaches one canonical `/watch.html?id=...` page.
- Series/anime pages show real TMDB seasons and episodes instead of hiding all episodes because sources are absent.
- Episodes without playable sources are clearly marked unavailable and do not get fake play URLs.
- Movies only expose a play action when a real playable source exists; otherwise they expose legitimate provider destinations.
- Manga/manhwa pages expose real chapter metadata and only open a reader for a valid authorized source.
- Favorites, comments, moderation, and continue-watching continue to use stable title IDs.
- `node --test` passes after all changes, and every changed JS file passes `node --check`.
- No piracy source integration, fabricated source URL, or Discord dependency is added.
