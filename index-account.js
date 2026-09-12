"use strict";

(function attachIndexAccount() {
    const state = { client: null, user: null, ready: false };
    const TOPBAR_ID = "topbar";
    const CONTROL_ID = "discord-index-account";
    const LOGIN_ID = "discord-index-login";

    function escapeText(value) { return String(value ?? "").trim(); }

    function displayName(user) {
        const metadata = user?.user_metadata || {};
        return escapeText(metadata.full_name || metadata.name || metadata.user_name || metadata.preferred_username || "عضو الإمبراطورية");
    }

    function avatarUrl(user) {
        const metadata = user?.user_metadata || {};
        const value = metadata.avatar_url || metadata.picture || "";
        return /^https?:\/\//i.test(String(value)) ? String(value) : "";
    }

    function removeExistingControl() {
        document.getElementById(CONTROL_ID)?.remove();
        document.getElementById(LOGIN_ID)?.remove();
    }

    function createLoginButton() {
        const button = document.createElement("button");
        button.id = LOGIN_ID;
        button.type = "button";
        button.className = "discord-index-login";
        button.textContent = "تسجيل Discord";
        button.setAttribute("aria-label", "تسجيل الدخول عبر Discord");
        button.addEventListener("click", signIn);
        return button;
    }

    function createAccountControl(user) {
        const wrapper = document.createElement("div");
        wrapper.id = CONTROL_ID;
        wrapper.className = "discord-index-account";

        const link = document.createElement("a");
        link.href = "/account.html";
        link.className = "discord-index-profile";
        link.setAttribute("aria-label", "فتح الحساب");

        const avatar = avatarUrl(user);
        if (avatar) {
            const image = document.createElement("img");
            image.src = avatar;
            image.alt = "";
            image.className = "discord-index-avatar";
            image.referrerPolicy = "no-referrer";
            link.appendChild(image);
        } else {
            const fallback = document.createElement("span");
            fallback.className = "discord-index-avatar discord-index-avatar-fallback";
            fallback.textContent = "D";
            link.appendChild(fallback);
        }

        const name = document.createElement("span");
        name.className = "discord-index-name";
        name.textContent = displayName(user);
        link.appendChild(name);

        const logout = document.createElement("button");
        logout.type = "button";
        logout.className = "discord-index-logout";
        logout.textContent = "خروج";
        logout.addEventListener("click", signOut);

        wrapper.append(link, logout);
        return wrapper;
    }

    function mount(user) {
        const topbar = document.getElementById(TOPBAR_ID);
        if (!topbar) return false;
        removeExistingControl();
        topbar.appendChild(user ? createAccountControl(user) : createLoginButton());
        return true;
    }

    function addStyles() {
        if (document.getElementById("discord-index-account-style")) return;
        const style = document.createElement("style");
        style.id = "discord-index-account-style";
        style.textContent = `
            .discord-index-login,.discord-index-account{flex:0 0 auto;font-family:inherit}
            .discord-index-login{border:1px solid rgba(212,166,67,.45);border-radius:12px;padding:9px 13px;background:rgba(212,166,67,.09);color:#e4bd62;cursor:pointer;font-weight:700;white-space:nowrap}
            .discord-index-login:hover{background:rgba(212,166,67,.16)}
            .discord-index-account{display:flex;align-items:center;gap:7px;margin-inline-start:4px}
            .discord-index-profile{display:inline-flex;align-items:center;gap:8px;min-width:0;max-width:190px;padding:4px 8px;border:1px solid rgba(212,166,67,.28);border-radius:12px;color:inherit;text-decoration:none;background:rgba(255,255,255,.025)}
            .discord-index-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:50%;object-fit:cover;border:1px solid rgba(212,166,67,.55)}
            .discord-index-avatar-fallback{display:grid;place-items:center;color:#e4bd62;background:#151014;font-weight:800}
            .discord-index-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#eee}
            .discord-index-logout{border:0;background:transparent;color:#a89da1;cursor:pointer;font-size:11px;padding:6px}
            .discord-index-logout:hover{color:#fff}
            @media(max-width:900px){.discord-index-name{display:none}.discord-index-profile{padding:4px}}
            @media(max-width:620px){.discord-index-login{padding:8px 9px;font-size:11px}.discord-index-logout{display:none}}
        `;
        document.head.appendChild(style);
    }

    function ensureRecoveryScript() {
        if (document.querySelector('script[data-home-recovery="true"]')) return;
        const script = document.createElement("script");
        script.src = "/home-recovery.js";
        script.async = true;
        script.dataset.homeRecovery = "true";
        document.body.appendChild(script);
    }

    async function loadConfig() {
        const response = await fetch("/api/supabase-config", { cache: "no-store" });
        const config = await response.json();
        if (!response.ok || !config.configured) return null;
        if (!window.supabase?.createClient) throw new Error("Supabase library is unavailable");
        return window.supabase.createClient(config.url, config.publishableKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
    }

    async function signIn() {
        if (!state.client) {
            mount(null);
            return;
        }
        const { error } = await state.client.auth.signInWithOAuth({
            provider: "discord",
            options: { redirectTo: `${window.location.origin}/` }
        });
        if (error) {
            console.error("DISCORD LOGIN:", error);
            mount(null);
        }
    }

    async function signOut(event) {
        event?.preventDefault();
        if (!state.client) return;
        const { error } = await state.client.auth.signOut();
        if (error) {
            console.error("DISCORD LOGOUT:", error);
            return;
        }
        state.user = null;
        mount(null);
    }

    async function boot() {
        if (state.ready) return;
        state.ready = true;
        addStyles();
        mount(null);
        ensureRecoveryScript();

        try {
            state.client = await loadConfig();
            if (!state.client) return;

            const { data, error } = await state.client.auth.getUser();
            if (error && !/Auth session missing/i.test(error.message || "")) throw error;
            state.user = data?.user || null;
            mount(state.user);

            state.client.auth.onAuthStateChange((_event, session) => {
                state.user = session?.user || null;
                mount(state.user);
            });
        } catch (error) {
            console.error("INDEX ACCOUNT BOOT:", error);
            state.client = null;
            state.user = null;
            mount(null);
        }
    }

    document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
