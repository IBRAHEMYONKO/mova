"use strict";

(function attachCommunity() {
    const PREFIX = "iraq-empire-cinema:";
    const state = {
        client: null,
        user: null,
        item: null,
        context: { season: null, episode: null, chapter: null },
        comments: [],
        profiles: new Map(),
        reactions: new Map()
    };

    const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
    })[char]);

    function getItemId() {
        return String(new URLSearchParams(location.search).get("id") || "").trim();
    }

    function getItemType() {
        const text = document.getElementById("type")?.textContent || "";
        if (text.includes("أنمي")) return "anime";
        if (text.includes("فيلم")) return "movie";
        return "series";
    }

    function context() {
        const ref = window.__IRAQ_CINEMA_EPISODE__ || {};
        const season = Number(ref.season);
        const episode = Number(ref.index);
        return {
            season: Number.isInteger(season) && season > 0 ? season : null,
            episode: Number.isInteger(episode) && episode > 0 ? episode : null,
            chapter: null
        };
    }

    async function createClient() {
        if (!window.supabase?.createClient) return null;
        try {
            const response = await fetch("/api/supabase-config", { cache: "no-store" });
            const config = await response.json();
            if (!response.ok || !config.configured) return null;
            return window.supabase.createClient(config.url, config.publishableKey, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
            });
        } catch {
            return null;
        }
    }

    function ensureShell() {
        if (document.getElementById("community")) return document.getElementById("community");
        const player = document.getElementById("player") || document.querySelector("main");
        if (!player?.parentElement) return null;
        const section = document.createElement("section");
        section.id = "community";
        section.className = "community-box";
        section.innerHTML = `
            <div class="community-head">
                <div><span class="community-kicker">IRAQ EMPIRE COMMUNITY</span><h2>المجتمع</h2><p id="community-context">تعليقات المشاهدين</p></div>
                <button id="community-refresh" type="button">تحديث</button>
            </div>
            <div id="community-login" class="community-note">سجّل الدخول عبر Discord حتى تستطيع التعليق والتفاعل.</div>
            <form id="community-form" class="community-form" hidden>
                <textarea id="community-input" maxlength="2000" placeholder="اكتب تعليقك..."></textarea>
                <div class="community-form-row"><span>حتى 2000 حرف</span><button type="submit">نشر التعليق</button></div>
            </form>
            <div id="community-list" class="community-list"></div>
        `;
        player.parentElement.appendChild(section);
        return section;
    }

    function injectStyles() {
        if (document.getElementById("community-styles")) return;
        const style = document.createElement("style");
        style.id = "community-styles";
        style.textContent = `
        .community-box{margin:28px 0;padding:22px;border:1px solid rgba(255,255,255,.09);border-radius:20px;background:rgba(10,10,10,.92);color:#eee}.community-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.community-kicker{font-size:10px;letter-spacing:2px;color:#b89245;font-weight:900}.community-head h2{margin:5px 0;font-size:28px}.community-head p{margin:0;color:#888}.community-head button,.community-form button,.community-action{border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#171717;color:#ddd;padding:8px 12px;cursor:pointer}.community-form{margin:18px 0}.community-form textarea{width:100%;min-height:105px;resize:vertical;box-sizing:border-box;background:#0b0b0b;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px;outline:none}.community-form textarea:focus{border-color:#b89245}.community-form-row{display:flex;align-items:center;justify-content:space-between;margin-top:8px;color:#777;font-size:12px}.community-form button{background:#b89245;color:#080808;font-weight:900}.community-list{display:grid;gap:12px}.community-note{padding:14px;border-radius:12px;background:#111;color:#999;margin-top:16px}.community-comment{padding:15px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:#0d0d0d}.community-comment.mine{border-color:rgba(184,146,69,.35)}.community-comment-head{display:flex;align-items:center;gap:10px}.community-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#191919}.community-user{font-weight:900}.community-date{font-size:11px;color:#666;margin-right:auto}.community-body{white-space:pre-wrap;line-height:1.8;margin:11px 0}.community-actions{display:flex;gap:7px;flex-wrap:wrap}.community-action.active{background:#b89245;color:#080808}.community-replies{margin:10px 18px 0 0;padding-right:12px;border-right:1px solid rgba(255,255,255,.1);display:grid;gap:9px}.community-empty{padding:25px;text-align:center;color:#777}.community-error{color:#d98c8c}.community-edit{width:100%;min-height:90px;box-sizing:border-box;background:#080808;color:#fff;border:1px solid #333;border-radius:10px;padding:10px}.community-edit-row{display:flex;gap:7px;margin-top:7px}@media(max-width:650px){.community-box{padding:15px}.community-head{flex-direction:column}.community-date{margin-right:0}}
        `;
        document.head.appendChild(style);
    }

    function profileName(userId) {
        return state.profiles.get(userId)?.display_name || "عضو الإمبراطورية";
    }

    function profileAvatar(userId) {
        return state.profiles.get(userId)?.avatar_url || "";
    }

    function reactionFor(commentId) {
        return state.reactions.get(commentId) || 0;
    }

    function childrenOf(parentId) {
        return state.comments.filter(comment => String(comment.parent_id || "") === String(parentId || ""));
    }

    function renderComment(comment) {
        const mine = state.user && String(comment.user_id) === String(state.user.id);
        const reaction = reactionFor(comment.id);
        const avatar = profileAvatar(comment.user_id);
        const replyCount = childrenOf(comment.id).length;
        const children = childrenOf(comment.id).map(renderComment).join("");
        return `<article class="community-comment${mine ? " mine" : ""}" data-comment-id="${esc(comment.id)}">
            <div class="community-comment-head">
                ${avatar ? `<img class="community-avatar" src="${esc(avatar)}" alt="">` : `<span class="community-avatar"></span>`}
                <span class="community-user">${esc(profileName(comment.user_id))}</span>
                <span class="community-date">${esc(new Date(comment.created_at).toLocaleString("ar-IQ"))}</span>
            </div>
            <div class="community-body" data-body>${esc(comment.body)}</div>
            <div class="community-actions">
                <button class="community-action ${reaction === 1 ? "active" : ""}" data-action="like">👍 ${reaction === 1 ? "أعجبني" : "إعجاب"}</button>
                <button class="community-action ${reaction === -1 ? "active" : ""}" data-action="dislike">👎 ${reaction === -1 ? "محدد" : "عدم إعجاب"}</button>
                ${state.user ? `<button class="community-action" data-action="reply">رد</button>` : ""}
                ${mine ? `<button class="community-action" data-action="edit">تعديل</button><button class="community-action" data-action="delete">حذف</button>` : ""}
                ${state.user && !mine ? `<button class="community-action" data-action="report">تبليغ</button>` : ""}
                ${replyCount ? `<span class="community-date">${replyCount} رد</span>` : ""}
            </div>
            ${children ? `<div class="community-replies">${children}</div>` : ""}
        </article>`;
    }

    function render() {
        const list = document.getElementById("community-list");
        if (!list) return;
        const roots = state.comments.filter(comment => !comment.parent_id);
        list.innerHTML = roots.length ? roots.map(renderComment).join("") : `<div class="community-empty">لا توجد تعليقات بعد. كن أول من يكتب تعليقًا.</div>`;
        bindActions();
    }

    async function loadProfiles() {
        const ids = [...new Set(state.comments.map(comment => comment.user_id).filter(Boolean))];
        if (!ids.length) return;
        const { data } = await state.client.from("profiles").select("id,display_name,avatar_url").in("id", ids);
        (data || []).forEach(profile => state.profiles.set(profile.id, profile));
    }

    async function loadReactions() {
        if (!state.user || !state.comments.length) return;
        const ids = state.comments.map(comment => comment.id);
        const { data } = await state.client.from("comment_reactions").select("comment_id,reaction").eq("user_id", state.user.id).in("comment_id", ids);
        state.reactions = new Map((data || []).map(row => [row.comment_id, Number(row.reaction)]));
    }

    async function load() {
        const list = document.getElementById("community-list");
        if (!list || !state.client || !state.item) return;
        list.innerHTML = `<div class="community-empty">جاري تحميل التعليقات...</div>`;
        let query = state.client.from("comments").select("id,user_id,item_id,item_type,season_number,episode_number,chapter_number,parent_id,body,is_hidden,created_at,updated_at").eq("item_id", state.item.id).order("created_at", { ascending: false });
        if (state.context.season && state.context.episode) {
            query = query.eq("season_number", state.context.season).eq("episode_number", state.context.episode);
        } else {
            query = query.is("season_number", null).is("episode_number", null).is("chapter_number", null);
        }
        const { data, error } = await query;
        if (error) {
            list.innerHTML = `<div class="community-empty community-error">تعذر تحميل التعليقات حاليًا.</div>`;
            return;
        }
        state.comments = (data || []).filter(comment => !comment.is_hidden || String(comment.user_id) === String(state.user?.id || ""));
        await Promise.all([loadProfiles(), loadReactions()]);
        render();
        const label = document.getElementById("community-context");
        if (label) label.textContent = state.context.season && state.context.episode ? `تعليقات الموسم ${state.context.season} • الحلقة ${state.context.episode}` : "تعليقات المشاهدين على هذا العمل";
    }

    async function react(comment, value) {
        if (!state.user) return;
        const current = reactionFor(comment.id);
        if (current === value) {
            await state.client.from("comment_reactions").delete().eq("comment_id", comment.id).eq("user_id", state.user.id);
        } else {
            await state.client.from("comment_reactions").upsert({ comment_id: comment.id, user_id: state.user.id, reaction: value }, { onConflict: "comment_id,user_id" });
        }
        await load();
    }

    async function edit(comment) {
        const body = document.querySelector(`[data-comment-id="${CSS.escape(comment.id)}"] [data-body]`);
        if (!body) return;
        body.innerHTML = `<textarea class="community-edit">${esc(comment.body)}</textarea><div class="community-edit-row"><button class="community-action" data-save-edit>حفظ</button><button class="community-action" data-cancel-edit>إلغاء</button></div>`;
        body.querySelector("[data-save-edit]").onclick = async () => {
            const value = body.querySelector("textarea")?.value || "";
            if (!value.trim()) return;
            const { error } = await state.client.from("comments").update({ body: value.trim(), updated_at: new Date().toISOString() }).eq("id", comment.id).eq("user_id", state.user.id);
            if (!error) await load();
        };
        body.querySelector("[data-cancel-edit]").onclick = render;
    }

    async function reply(comment) {
        const text = window.prompt("اكتب ردك:");
        if (!text?.trim()) return;
        const payload = { user_id: state.user.id, item_id: state.item.id, item_type: state.item.type, season_number: state.context.season, episode_number: state.context.episode, chapter_number: null, parent_id: comment.id, body: text.trim() };
        const { error } = await state.client.from("comments").insert(payload);
        if (!error) await load();
    }

    async function report(comment) {
        const reason = window.prompt("سبب التبليغ:");
        if (!reason?.trim()) return;
        const { error } = await state.client.from("reports").insert({ comment_id: comment.id, reporter_id: state.user.id, reason: reason.trim() });
        if (!error) window.alert("تم إرسال البلاغ للمراجعة.");
    }

    async function bindActions() {
        document.querySelectorAll("#community [data-comment-id]").forEach(article => {
            const id = article.dataset.commentId;
            const comment = state.comments.find(item => String(item.id) === String(id));
            if (!comment) return;
            article.querySelector('[data-action="like"]')?.addEventListener("click", () => react(comment, 1));
            article.querySelector('[data-action="dislike"]')?.addEventListener("click", () => react(comment, -1));
            article.querySelector('[data-action="reply"]')?.addEventListener("click", () => reply(comment));
            article.querySelector('[data-action="edit"]')?.addEventListener("click", () => edit(comment));
            article.querySelector('[data-action="delete"]')?.addEventListener("click", async () => {
                if (!window.confirm("حذف هذا التعليق؟")) return;
                const { error } = await state.client.from("comments").delete().eq("id", comment.id).eq("user_id", state.user.id);
                if (!error) await load();
            });
            article.querySelector('[data-action="report"]')?.addEventListener("click", () => report(comment));
        });
    }

    async function submit(event) {
        event.preventDefault();
        if (!state.user || !state.item) return;
        const input = document.getElementById("community-input");
        const body = input?.value.trim() || "";
        if (!body) return;
        const payload = {
            user_id: state.user.id,
            item_id: state.item.id,
            item_type: state.item.type,
            season_number: state.context.season,
            episode_number: state.context.episode,
            chapter_number: state.context.chapter,
            parent_id: null,
            body
        };
        const { error } = await state.client.from("comments").insert(payload);
        if (error) {
            window.alert("تعذر نشر التعليق. تأكد من تسجيل الدخول وحالة الحساب.");
            return;
        }
        input.value = "";
        await load();
    }

    async function boot() {
        const id = getItemId();
        if (!id) return;
        const shell = ensureShell();
        if (!shell) return;
        injectStyles();
        state.item = { id, type: getItemType() };
        state.context = context();
        state.client = await createClient();
        if (!state.client) return;
        const { data } = await state.client.auth.getUser();
        state.user = data?.user || null;
        document.getElementById("community-login").hidden = Boolean(state.user);
        document.getElementById("community-form").hidden = !state.user;
        document.getElementById("community-form")?.addEventListener("submit", submit);
        document.getElementById("community-refresh")?.addEventListener("click", load);
        await load();

        let lastContext = JSON.stringify(state.context);
        const observer = new MutationObserver(async () => {
            const next = context();
            const serialized = JSON.stringify(next);
            if (serialized === lastContext) return;
            lastContext = serialized;
            state.context = next;
            await load();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener("DOMContentLoaded", boot);
})();
