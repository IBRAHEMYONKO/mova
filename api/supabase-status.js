"use strict";

module.exports = async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
    const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();

    if (!url || !publishableKey) {
        return res.status(200).json({
            success: true,
            configured: false,
            discord: false,
            message: "إعدادات Supabase غير موجودة في Vercel."
        });
    }

    try {
        const response = await fetch(`${url}/auth/v1/settings`, {
            headers: {
                apikey: publishableKey,
                Authorization: `Bearer ${publishableKey}`
            },
            signal: AbortSignal.timeout(7000)
        });

        if (!response.ok) {
            return res.status(200).json({
                success: false,
                configured: true,
                discord: false,
                message: "تعذر التحقق من إعدادات Supabase Auth."
            });
        }

        const settings = await response.json();
        const external = settings?.external || {};
        const discord = external.discord === true;

        return res.status(200).json({
            success: true,
            configured: true,
            discord,
            auth: true,
            message: discord
                ? "Discord OAuth مفعّل في Supabase."
                : "Discord OAuth غير مفعّل في Supabase."
        });
    } catch (error) {
        return res.status(200).json({
            success: false,
            configured: true,
            discord: false,
            message: "تعذر الوصول إلى Supabase Auth.",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};
