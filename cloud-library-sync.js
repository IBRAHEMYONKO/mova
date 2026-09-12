"use strict";

(function attachCloudLibrarySync() {
    const PREFIX = "iraq-empire-cinema:";
    const FAVORITE_PREFIX = `${PREFIX}favorite:`;
    const PROGRESS_PREFIX = `${PREFIX}progress:`;
    const state = { client: null, user: null, running: false };

    function favoriteKey(id) {
        return `${FAVORITE_PREFIX}${encodeURIComponent(String(id || "").trim())}`;
    }

    function parseFavoriteKey(key) {
        if (!String(key || "").startsWith(FAVORITE_PREFIX)) return null;
        try {
            const id = decodeURIComponent(String(key).slice(FAVORITE_PREFIX.length)).trim();
            return id || null;
        } catch { return null; }
    }

    function parseProgressKey(key) {
        if (!String(key || "").startsWith(PROGRESS_PREFIX)) return null;
        const parts = String(key).slice(PROGRESS_PREFIX.length).split(":");
        if (parts.length !== 3) return null;
        try {
            const [itemId, season, episode] = parts.map(decodeURIComponent).map(value => value.trim());
            if (!itemId || !season || !episode) return null;
            return { itemId, season, episode };
        } catch { return null; }
    }

    function readLocalFavorites() {
        const ids = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || localStorage.getItem(key) !== "1") continue;
            const id = parseFavoriteKey(key);
            if (id && !ids.includes(id)) ids.push(id);
        }
        return ids;
    }

    function readLocalProgress() {
        const rows = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const ref = parseProgressKey(key);
            if (!ref) continue;
            try {
                const value = JSON.parse(localStorage.getItem(key) || "null");
                const position = Number(value?.position);
                const duration = Number(value?.duration);
                if (!Number.isFinite(position) || position < 0 || !Number.isFinite(duration) || duration <= 0) continue;
                rows.push({ ...ref, position, duration, updatedAt: Number(value?.updatedAt || 0) });
            } catch {}
        }
        return rows;
    }

    async function createClient() {
        try {
            if (!window.supabase?.createClient) return null;
            const response = await fetch("/api/supabase-config", { cache: "no-store" });
            const config = await response.json();
            if (!response.ok || !config.configured) return null;
            return window.supabase.createClient(config.url, config.publishableKey, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
            });
        } catch { return null; }
    }

    function detectType(id) {
        const card = document.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
        const value = card?.dataset?.type || "";
        if (["movie", "series", "anime", "manga", "manhwa", "novel"].includes(value)) return value;
        return "series";
    }

    async function syncFavorites() {
        const { data, error } = await state.client.from("favorites").select("item_id,item_type").eq("user_id", state.user.id);
        if (error) return;

        const cloud = new Map((data || []).map(row => [String(row.item_id), row]));
        for (const id of readLocalFavorites()) {
            if (cloud.has(id)) continue;
            const { error: insertError } = await state.client.from("favorites").insert({
                user_id: state.user.id,
                item_id: id,
                item_type: detectType(id)
            });
            if (!insertError) cloud.set(id, { item_id: id });
        }

        for (const id of cloud.keys()) localStorage.setItem(favoriteKey(id), "1");
        window.dispatchEvent(new CustomEvent("iraq-cinema-favorites-changed"));
    }

    async function syncProgress() {
        const local = readLocalProgress();
        for (const row of local) {
            const query = state.client.from("watch_progress").select("id,position_seconds,duration_seconds,updated_at").eq("user_id", state.user.id).eq("item_id", row.itemId).eq("season_number", Number(row.season)).eq("episode_number", Number(row.episode)).is("chapter_number", null).maybeSingle();
            const { data: existing, error } = await query;
            if (error) continue;

            const localUpdated = Number(row.updatedAt || 0);
            const cloudUpdated = existing?.updated_at ? Date.parse(existing.updated_at) : 0;
            if (existing && cloudUpdated > localUpdated) {
                const position = Number(existing.position_seconds);
                const duration = Number(existing.duration_seconds);
                if (duration > 0) localStorage.setItem(`${PROGRESS_PREFIX}${encodeURIComponent(row.itemId)}:${encodeURIComponent(row.season)}:${encodeURIComponent(row.episode)}`, JSON.stringify({ position, duration, updatedAt: cloudUpdated }));
                continue;
            }

            const payload = {
                user_id: state.user.id,
                item_id: row.itemId,
                item_type: detectType(row.itemId),
                season_number: Number(row.season),
                episode_number: Number(row.episode),
                position_seconds: row.position,
                duration_seconds: row.duration,
                completed: row.position >= row.duration - 5,
                updated_at: localUpdated > 0 ? new Date(localUpdated).toISOString() : new Date().toISOString()
            };

            if (existing?.id) await state.client.from("watch_progress").update(payload).eq("id", existing.id).eq("user_id", state.user.id);
            else await state.client.from("watch_progress").insert(payload);
        }
    }

    async function run() {
        if (state.running) return;
        state.running = true;
        try {
            if (!state.client) state.client = await createClient();
            if (!state.client) return;
            const { data } = await state.client.auth.getUser();
            state.user = data?.user || null;
            if (!state.user) return;
            await syncFavorites();
            await syncProgress();
        } finally {
            state.running = false;
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        run();
        setInterval(run, 15000);
    });
})();
