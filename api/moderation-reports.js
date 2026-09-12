"use strict";

function send(res, status, body) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
}

function bearer(req) {
    const value = String(req?.headers?.authorization || "");
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : "";
}

function config() {
    return {
        url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
        key: String(process.env.SUPABASE_SECRET_KEY || "").trim()
    };
}

async function request(path, options = {}) {
    const { url, key } = config();
    if (!url || !key) throw new Error("Supabase secret configuration is missing");
    const response = await fetch(`${url}${path}`, {
        ...options,
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) {
        const error = new Error(`Supabase HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return data;
}

async function user(accessToken) {
    const { url, key } = config();
    if (!url || !key) throw new Error("Supabase secret configuration is missing");
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return null;
    return response.json();
}

module.exports = async (req, res) => {
    if (String(req.method || "GET").toUpperCase() !== "GET") return send(res, 405, { success: false, error: "Method not allowed" });
    try {
        const token = bearer(req);
        if (!token) return send(res, 401, { success: false, error: "Authentication required" });
        const actor = await user(token);
        if (!actor?.id) return send(res, 401, { success: false, error: "Invalid session" });
        const profiles = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(actor.id)}&select=is_moderator,is_banned`);
        const profile = Array.isArray(profiles) ? profiles[0] : null;
        if (!profile?.is_moderator || profile.is_banned) return send(res, 403, { success: false, error: "Moderator access required" });
        const reports = await request("/rest/v1/reports?select=id,reporter_id,comment_id,reason,status,created_at,resolved_at&order=created_at.desc&limit=100");
        return send(res, 200, { success: true, reports: reports || [] });
    } catch (error) {
        return send(res, Number(error.status) >= 400 ? Number(error.status) : 500, { success: false, error: error.message || "Failed to load reports" });
    }
};
