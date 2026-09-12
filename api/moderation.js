"use strict";

const { normalizeModerationAction } = require("../lib/moderation");

function send(res, status, body) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.end(JSON.stringify(body));
}

function bearer(req) {
    const header = String(req?.headers?.authorization || "");
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : "";
}

function supabaseConfig() {
    return {
        url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
        key: String(process.env.SUPABASE_SECRET_KEY || "").trim()
    };
}

async function supabaseRequest(path, options = {}) {
    const { url, key } = supabaseConfig();
    if (!url || !key) throw new Error("Supabase secret configuration is missing");
    const response = await fetch(`${url}${path}`, {
        ...options,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) {
        const error = new Error(`Supabase HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return data;
}

async function getCurrentUser(accessToken) {
    const { url, key } = supabaseConfig();
    if (!url || !key) throw new Error("Supabase secret configuration is missing");
    const response = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: key, Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) return null;
    return response.json();
}

module.exports = async (req, res) => {
    if (String(req.method || "GET").toUpperCase() !== "POST") {
        res.setHeader("Allow", "POST");
        return send(res, 405, { success: false, error: "Method not allowed" });
    }

    try {
        const token = bearer(req);
        if (!token) return send(res, 401, { success: false, error: "Authentication required" });

        const actor = await getCurrentUser(token);
        if (!actor?.id) return send(res, 401, { success: false, error: "Invalid session" });

        const profiles = await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(actor.id)}&select=id,is_moderator,is_banned`);
        const moderator = Array.isArray(profiles) ? profiles[0] : null;
        if (!moderator?.is_moderator || moderator.is_banned) {
            return send(res, 403, { success: false, error: "Moderator access required" });
        }

        let body = req.body;
        if (typeof body === "string") {
            try { body = JSON.parse(body); } catch { body = {}; }
        }
        const action = normalizeModerationAction(body || {});

        if (action.action === "hide_comment" || action.action === "show_comment") {
            if (!action.commentId) return send(res, 400, { success: false, error: "commentId is required" });
            await supabaseRequest(`/rest/v1/comments?id=eq.${encodeURIComponent(action.commentId)}`, {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify({ is_hidden: action.action === "hide_comment" })
            });
        } else if (action.action === "delete_comment") {
            if (!action.commentId) return send(res, 400, { success: false, error: "commentId is required" });
            await supabaseRequest(`/rest/v1/comments?id=eq.${encodeURIComponent(action.commentId)}`, {
                method: "DELETE",
                headers: { Prefer: "return=minimal" }
            });
        } else if (action.action === "ban_user" || action.action === "unban_user") {
            if (!action.targetUserId) return send(res, 400, { success: false, error: "targetUserId is required" });
            if (action.targetUserId === actor.id) return send(res, 400, { success: false, error: "You cannot change your own moderator ban" });
            await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(action.targetUserId)}`, {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify({ is_banned: action.action === "ban_user" })
            });
        } else if (action.action === "resolve_report" || action.action === "reject_report") {
            if (!action.reportId) return send(res, 400, { success: false, error: "reportId is required" });
            await supabaseRequest(`/rest/v1/reports?id=eq.${encodeURIComponent(action.reportId)}`, {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify({
                    status: action.action === "resolve_report" ? "resolved" : "rejected",
                    resolved_at: new Date().toISOString()
                })
            });
        }

        await supabaseRequest("/rest/v1/moderation_actions", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
                moderator_id: actor.id,
                target_user_id: action.targetUserId,
                comment_id: action.commentId,
                action: action.action,
                reason: action.reason || null
            })
        });

        return send(res, 200, { success: true, action: action.action });
    } catch (error) {
        console.error("MODERATION API:", error);
        return send(res, Number(error.status) >= 400 ? Number(error.status) : 500, {
            success: false,
            error: error.message || "Moderation failed"
        });
    }
};
