"use strict";

(function () {
    const state = { client: null, user: null };
    const $ = id => document.getElementById(id);

    async function client() {
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

    function renderStats(favorites, comments, notifications) {
        const stats = $("account-stats");
        if (!stats) return;
        stats.innerHTML = `
            <div><strong>${favorites}</strong><span>مفضلة</span></div>
            <div><strong>${comments}</strong><span>تعليق</span></div>
            <div><strong>${notifications}</strong><span>إشعار غير مقروء</span></div>`;
    }

    function renderNotifications(rows) {
        const box = $("account-notifications");
        if (!box) return;
        if (!rows.length) {
            box.innerHTML = `<div class="account-empty">لا توجد إشعارات جديدة.</div>`;
            return;
        }
        box.innerHTML = rows.slice(0, 10).map(row => `
            <article class="account-notification ${row.is_read ? "read" : "unread"}" data-id="${String(row.id).replace(/[&<>\"']/g, "")}" data-item="${encodeURIComponent(row.item_id || "")}">
                <strong>${escapeHtml(row.message)}</strong>
                <small>${new Date(row.created_at).toLocaleString("ar-IQ")}</small>
            </article>`).join("");
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" })[c]);
    }

    async function load(user) {
        state.user = user;
        if (!state.client || !user) return;
        const [favorites, comments, notifications] = await Promise.all([
            state.client.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            state.client.from("comments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            state.client.from("notifications").select("id,actor_id,type,comment_id,item_id,item_type,message,is_read,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30)
        ]);
        const rows = notifications.data || [];
        renderStats(favorites.count || 0, comments.count || 0, rows.filter(row => !row.is_read).length);
        renderNotifications(rows);
    }

    async function markAllRead() {
        if (!state.client || !state.user) return;
        await state.client.from("notifications").update({ is_read: true }).eq("user_id", state.user.id).eq("is_read", false);
        await load(state.user);
    }

    async function boot() {
        state.client = await client();
        if (!state.client) return;
        const { data } = await state.client.auth.getUser();
        if (data?.user) await load(data.user);
        state.client.auth.onAuthStateChange((_event, session) => {
            if (session?.user) load(session.user);
        });
        $("notifications-read-all")?.addEventListener("click", markAllRead);
    }

    document.addEventListener("DOMContentLoaded", boot);
})();
