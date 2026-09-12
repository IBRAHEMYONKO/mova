"use strict";

(function () {
    const state = {
        client: null,
        profile: null
    };

    const $ = id => document.getElementById(id);

    function setStatus(message, type = "info") {
        const element = $("account-status");
        if (!element) return;
        element.textContent = message;
        element.dataset.type = type;
    }

    function setVisible(id, visible) {
        const element = $(id);
        if (element) element.hidden = !visible;
    }

    function profileName(user) {
        const metadata = user?.user_metadata || {};
        return metadata.full_name || metadata.name || metadata.user_name || user?.email || "عضو الإمبراطورية";
    }

    function profileAvatar(user) {
        const metadata = user?.user_metadata || {};
        return metadata.avatar_url || metadata.picture || "";
    }

    function renderUser(user) {
        const name = profileName(user);
        const avatar = profileAvatar(user);

        $("account-name").textContent = name;
        $("account-email").textContent = user?.email || "حساب Discord";

        const image = $("account-avatar");
        if (avatar) {
            image.src = avatar;
            image.hidden = false;
        } else {
            image.removeAttribute("src");
            image.hidden = true;
        }

        setVisible("login-panel", false);
        setVisible("profile-panel", true);
    }

    function renderLoggedOut() {
        setVisible("login-panel", true);
        setVisible("profile-panel", false);
    }

    async function loadProfile(user) {
        if (!state.client || !user) return;

        const { data, error } = await state.client
            .from("profiles")
            .select("display_name,avatar_url,is_moderator,is_banned")
            .eq("id", user.id)
            .maybeSingle();

        if (error) {
            console.warn("PROFILE LOAD:", error.message);
            return;
        }

        state.profile = data || null;
        if (data?.display_name) $("account-name").textContent = data.display_name;
        if (data?.avatar_url) {
            const image = $("account-avatar");
            image.src = data.avatar_url;
            image.hidden = false;
        }

        if (data?.is_banned) {
            setStatus("هذا الحساب موقوف عن المشاركة في المجتمع.", "error");
        }
    }

    async function signIn() {
        if (!state.client) return;

        setStatus("جاري فتح تسجيل الدخول عبر Discord...", "info");
        const { error } = await state.client.auth.signInWithOAuth({
            provider: "discord",
            options: {
                redirectTo: window.location.origin + "/account.html"
            }
        });

        if (error) {
            console.error("DISCORD LOGIN:", error);
            setStatus("تعذر بدء تسجيل الدخول. تأكد من إعداد Discord داخل Supabase.", "error");
        }
    }

    async function signOut() {
        if (!state.client) return;
        setStatus("جاري تسجيل الخروج...", "info");
        const { error } = await state.client.auth.signOut();
        if (error) {
            setStatus("تعذر تسجيل الخروج.", "error");
            return;
        }
        state.profile = null;
        renderLoggedOut();
        setStatus("تم تسجيل الخروج.", "success");
    }

    async function boot() {
        try {
            const response = await fetch("/api/supabase-config", { cache: "no-store" });
            const config = await response.json();

            if (!response.ok || !config.configured) {
                renderLoggedOut();
                setStatus("تسجيل Discord غير مفعّل على الموقع حاليًا.", "info");
                return;
            }

            if (!window.supabase?.createClient) {
                throw new Error("Supabase library is unavailable");
            }

            state.client = window.supabase.createClient(config.url, config.publishableKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });

            const { data, error } = await state.client.auth.getUser();
            if (error && !/Auth session missing/i.test(error.message || "")) {
                throw error;
            }

            if (data?.user) {
                renderUser(data.user);
                await loadProfile(data.user);
                setStatus("تم تسجيل الدخول بنجاح.", "success");
            } else {
                renderLoggedOut();
                setStatus("سجّل الدخول لربط حسابك بالموقع.", "info");
            }

            state.client.auth.onAuthStateChange(async (_event, session) => {
                if (session?.user) {
                    renderUser(session.user);
                    await loadProfile(session.user);
                } else {
                    renderLoggedOut();
                }
            });
        } catch (error) {
            console.error("ACCOUNT BOOT:", error);
            renderLoggedOut();
            setStatus("تعذر تشغيل نظام الحساب حاليًا.", "error");
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        $("discord-login")?.addEventListener("click", signIn);
        $("discord-logout")?.addEventListener("click", signOut);
        boot();
    });
})();
