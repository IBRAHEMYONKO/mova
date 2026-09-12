"use strict";

(function () {
    const PREFIX = "iraq-empire-cinema:";
    const state = { client: null, user: null };

    const qs = id => document.getElementById(id);

    function favoriteKey(itemId) {
        return `${PREFIX}favorite:${encodeURIComponent(String(itemId || ""))}`;
    }

    async function createClient() {
        try {
            if (!window.supabase?.createClient) return null;
            const response = await fetch("/api/supabase-config", { cache: "no-store" });
            if (!response.ok) return null;
            const config = await response.json();
            if (!config.configured) return null;
            return window.supabase.createClient(config.url, config.publishableKey, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
            });
        } catch {
            return null;
        }
    }

    async function boot() {
        const itemId = new URLSearchParams(location.search).get("id");
        if (!itemId) return;

        state.client = await createClient();
        if (!state.client) return;

        const { data } = await state.client.auth.getUser();
        state.user = data?.user || null;
        if (!state.user) return;

        await syncFavoriteFromCloud(itemId);
        bindFavoriteSync(itemId);
    }

    async function syncFavoriteFromCloud(itemId) {
        const { data, error } = await state.client
            .from("favorites")
            .select("id")
            .eq("user_id", state.user.id)
            .eq("item_id", String(itemId))
            .maybeSingle();

        if (error) return;
        const key = favoriteKey(itemId);
        if (data) localStorage.setItem(key, "1");
        else localStorage.removeItem(key);

        const button = qs("favorite");
        if (button) {
            const active = localStorage.getItem(key) === "1";
            button.classList.toggle("active", active);
            button.textContent = active ? "♥ في المفضلة" : "♡ المفضلة";
        }
    }

    function bindFavoriteSync(itemId) {
        const button = qs("favorite");
        if (!button) return;

        button.addEventListener("click", async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
            const isFavorite = localStorage.getItem(favoriteKey(itemId)) === "1";

            if (isFavorite) {
                await state.client
                    .from("favorites")
                    .upsert({ user_id: state.user.id, item_id: String(itemId), item_type: detectItemType() }, { onConflict: "user_id,item_id" });
            } else {
                await state.client
                    .from("favorites")
                    .delete()
                    .eq("user_id", state.user.id)
                    .eq("item_id", String(itemId));
            }
        }, false);
    }

    function detectItemType() {
        const type = document.getElementById("type")?.textContent || "";
        if (type.includes("فيلم")) return "movie";
        if (type.includes("أنمي")) return "anime";
        return "series";
    }

    document.addEventListener("DOMContentLoaded", boot);
})();
