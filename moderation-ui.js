"use strict";

(function () {
    const state = { client: null, user: null };
    const $ = id => document.getElementById(id);

    async function bootClient() {
        const response = await fetch("/api/supabase-config", { cache: "no-store" });
        const config = await response.json();
        if (!response.ok || !config.configured || !window.supabase?.createClient) return null;
        return window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    }

    function status(message) { $("mod-status").textContent = message; }

    async function api(action, data) {
        const { data: sessionData } = await state.client.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error("انتهت جلسة الدخول");
        const response = await fetch("/api/moderation", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...data }) });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر تنفيذ الإجراء");
        return payload;
    }

    function render(reports) {
        const grid = $("mod-grid");
        if (!reports.length) { grid.innerHTML = `<div class="mod-note">لا توجد بلاغات مفتوحة حاليًا.</div>`; return; }
        grid.innerHTML = reports.map(report => `
            <article class="mod-card" data-report="${esc(report.id)}">
                <strong>بلاغ #${esc(report.id.slice(0, 8))}</strong>
                <p>${esc(report.reason)}</p>
                <div class="mod-muted">التعليق: ${esc(report.comment_id || "غير محدد")} • ${esc(new Date(report.created_at).toLocaleString("ar-IQ"))}</div>
                <div class="mod-actions">
                    ${report.comment_id ? `<button data-action="hide" data-comment="${esc(report.comment_id)}">إخفاء التعليق</button><button class="danger" data-action="delete" data-comment="${esc(report.comment_id)}">حذف التعليق</button>` : ""}
                    <button data-action="resolve" data-report="${esc(report.id)}">حل البلاغ</button><button class="danger" data-action="reject" data-report="${esc(report.id)}">رفض البلاغ</button>
                </div>
            </article>`).join("");
        grid.querySelectorAll("button").forEach(button => button.addEventListener("click", handle));
    }

    function esc(value) { return String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[c]); }

    async function load() {
        const { data, error } = await state.client.from("reports").select("id,comment_id,reason,status,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        render(data || []);
    }

    async function handle(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;
        try {
            status("جاري تنفيذ الإجراء...");
            if (action === "hide") await api("hide_comment", { commentId: button.dataset.comment });
            if (action === "delete") await api("delete_comment", { commentId: button.dataset.comment });
            if (action === "resolve") await api("resolve_report", { reportId: button.dataset.report });
            if (action === "reject") await api("reject_report", { reportId: button.dataset.report });
            status("تم تنفيذ الإجراء.");
            await load();
        } catch (error) { status(error.message || "تعذر تنفيذ الإجراء"); }
    }

    async function start() {
        try {
            state.client = await bootClient();
            if (!state.client) return status("نظام الحساب غير مفعّل.");
            const { data } = await state.client.auth.getUser();
            state.user = data?.user;
            if (!state.user) return status("يجب تسجيل الدخول أولًا.");
            const { data: profile } = await state.client.from("profiles").select("is_moderator,is_banned").eq("id", state.user.id).maybeSingle();
            if (!profile?.is_moderator || profile.is_banned) return status("ليس لديك صلاحية إدارة المجتمع.");
            status("تم التحقق. جاري تحميل البلاغات...");
            await load();
            status("تم تحميل البلاغات المفتوحة.");
        } catch (error) { status(error.message || "تعذر تشغيل لوحة الإدارة."); }
    }

    document.addEventListener("DOMContentLoaded", start);
})();
