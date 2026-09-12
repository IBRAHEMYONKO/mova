"use strict";

module.exports = (req, res) => {
    const url = String(process.env.SUPABASE_URL || "").trim();
    const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    if (!url || !publishableKey) {
        return res.status(503).json({
            success: false,
            configured: false
        });
    }

    return res.status(200).json({
        success: true,
        configured: true,
        url,
        publishableKey
    });
};
