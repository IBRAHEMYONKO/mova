"use strict";

(function () {
    const state = { client: null, token: "", reports: [] };
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

    async function bootClient() {
        const response = await fetch("/api/supabase-config", { cache: "no-store" });
        const config = await response.json();
        if (!response.ok || !config.configured || !window.supabase?.createClient) throw new Error("الحساب غير مفعّل");
        state.client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true } });
        const session = (await state.client.auth.getSession()).data?.session;
        if (!session?.access_token) throw new Error("يجب تسجيل الدخول");
        state.token = session.access_token;
    }

    async function load() {
        const response = await fetch("/api/moderation-reports", { headers: { Authorization: `Bearer ${state.token}` }, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر تحميل البلاغات");
        state.reports = payload.reports || [];
        render();
    }

    function render() {
        const list = $("reports");
        if (!state.reports.length) { list.innerHTML = `<div class="empty">لا توجد بلاغات.</div>`; return; }
        list.innerHTML = state.reports.map(report => `<article class="report"><div><strong>بلاغ #${esc(report.id.slice(0, 8))}</strong><span class="status">${esc(report.status)}</span></div><p>${esc(report.reason)}</p><small>التعليق: ${esc(report.comment_id || "غير معروف")} • ${esc(new Date(report.created_at).toLocaleString("ar-IQ"))}</small><div class="actions"><button data-action="resolve" data-id="${esc(report.id)}">حل البلاغ</button><button data-action="reject" data-id="${esc(report.id)}">رفض</button></div></article>`).join("");
        list.querySelectorAll("button[data-action]").forEach(button => button.onclick = () => act(button.dataset.action, button.dataset.id));
    }

    async function act(kind, reportId) {
        const report = state.reports.find(item => item.id === reportId);
        if (!report) return;
        const action = kind === "resolve" ? "resolve_report" : "reject_report";
        const response = await fetch("/api/moderation", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` }, body: JSON.stringify({ action, reportId, commentId: report.comment_id }) });
        const payload = await response.json();
        if (!response.ok || !payload.success) return alert(payload.error || "تعذر تنفيذ الإجراء");
        await load();
    }

    document.addEventListener("DOMContentLoaded", async () => {
        try { await bootClient(); await load(); } catch (error) { $("status").textContent = error.message || "تعذر فتح لوحة الإدارة"; }
    });
})();
