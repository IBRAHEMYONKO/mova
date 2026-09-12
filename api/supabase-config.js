"use strict";

module.exports = (req, res) => {
    const url = String(process.env.SUPABASE_URL || "").trim();
    const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    // Missing Supabase environment variables are a configuration state, not
    // an unavailable API route. Returning 200 lets the frontend stop cleanly
    // without filling the browser console with repeated 503 errors.
    if (!url || !publishableKey) {
        return res.status(200).json({
            success: true,
            configured: false,
            reason: "Supabase is not configured on this deployment."
        });
    }

    return res.status(200).json({
        success: true,
        configured: true,
        url,
        publishableKey
    });
};
