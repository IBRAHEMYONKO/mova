"use strict";

(function attachNotifications() {
    const state = { client: null, user: null, open: false };
    const $ = id => document.getElementById(id);

    async function client() {
        if (!window.supabase?.createClient) return null;
        try {
            const response = await fetch("/api/supabase-config", { cache: "no-store" });
            const config = await response.json();
            if (!response.ok || !config.configured) return null;
            return window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true } });
        } catch { return null; }
    }

    function styles() {
        if ($("notifications-style")) return;
        const style = document.createElement("style");
        style.id = "notifications-style";
        style.textContent = `.nova-notifications{position:relative}.nova-notify-button{border:1px solid rgba(255,255,255,.1);background:#111;color:#fff;border-radius:12px;padding:9px 13px;cursor:pointer}.nova-notify-badge{display:inline-flex;min-width:18px;height:18px;align-items:center;justify-content:center;border-radius:99px;background:#b89245;color:#080808;font-size:10px;font-weight:900;margin-right:5px}.nova-notify-panel{position:absolute;top:calc(100% + 10px);right:0;width:min(380px,calc(100vw - 24px));max-height:460px;overflow:auto;background:#0d0d0d;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:10px;z-index:9999;box-shadow:0 20px 60px #000}.nova-notify-item{display:block;width:100%;text-align:right;background:#121212;color:#ddd;border:0;border-bottom:1px solid rgba(255,255,255,.06);padding:12px;cursor:pointer}.nova-notify-item.unread{background:#19150d}.nova-notify-date{display:block;color:#666;font-size:11px;margin-top:5px}.nova-notify-empty{padding:25px;text-align:center;color:#777}.nova-notify-tools{display:flex;justify-content:space-between;gap:8px;padding:4px}.nova-notify-tools button{border:0;background:none;color:#b89245;cursor:pointer}`;
        document.head.appendChild(style);
    }

    function ensureShell() {
        let root = $("notifications");
        if (root) return root;
        root = document.createElement("div"); root.id = "notifications"; root.className = "nova-notifications";
        root.innerHTML = `<button class="nova-notify-button" id="notifications-button" type="button">🔔 <span id="notifications-badge" class="nova-notify-badge" hidden>0</span></button><div id="notifications-panel" class="nova-notify-panel" hidden><div class="nova-notify-tools"><strong>الإشعارات</strong><button id="notifications-read-all" type="button">قراءة الكل</button></div><div id="notifications-list"></div></div>`;
        const nav = document.querySelector("header nav, nav");
        if (nav) nav.appendChild(root); else document.body.appendChild(root);
        $("notifications-button").onclick = () => { state.open = !state.open; $("notifications-panel").hidden = !state.open; };
        $("notifications-read-all").onclick = markAll;
        return root;
    }

    async function load() {
        if (!state.client || !state.user) return;
        const { data } = await state.client.from("notifications").select("id,type,comment_id,item_id,item_type,message,is_read,created_at").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(30);
        const rows = data || [];
        const unread = rows.filter(row => !row.is_read).length;
        const badge = $("notifications-badge");
        badge.hidden = unread === 0; badge.textContent = unread > 99 ? "99+" : String(unread);
        const list = $("notifications-list");
        list.innerHTML = rows.length ? rows.map(row => `<button class="nova-notify-item ${row.is_read ? "" : "unread"}" data-notification="${String(row.id).replace(/[^a-zA-Z0-9-]/g, "")}">${escapeHtml(row.message)}<span class="nova-notify-date">${escapeHtml(new Date(row.created_at).toLocaleString("ar-IQ"))}</span></button>`).join("") : `<div class="nova-notify-empty">لا توجد إشعارات.</div>`;
        list.querySelectorAll("[data-notification]").forEach(button => button.onclick = async () => { await state.client.from("notifications").update({ is_read: true }).eq("id", button.dataset.notification).eq("user_id", state.user.id); await load(); });
    }

    function escapeHtml(value) { return String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }
    async function markAll() { if (!state.client || !state.user) return; await state.client.from("notifications").update({ is_read: true }).eq("user_id", state.user.id).eq("is_read", false); await load(); }

    async function boot() {
        styles(); ensureShell(); state.client = await client(); if (!state.client) return;
        const { data } = await state.client.auth.getUser(); state.user = data?.user || null; if (!state.user) return;
        await load();
        setInterval(load, 20000);
    }
    document.addEventListener("DOMContentLoaded", boot);
})();
