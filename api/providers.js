"use strict";

const { getCatalog } = require("../lib/catalog");
const { getWatchProviders } = require("../lib/tmdb-providers");

function findItem(catalog, id) {
    const wanted = String(id || "").trim();
    if (!wanted) return null;

    return catalog.all.find(item =>
        String(item.id) === wanted ||
        String(item.tmdbId || "") === wanted
    ) || null;
}

module.exports = async function handler(req, res) {
    try {
        res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
        res.setHeader("Content-Type", "application/json; charset=utf-8");

        const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
        const id = url.searchParams.get("id");
        const region = (url.searchParams.get("region") || "IQ").toUpperCase();

        if (!id) {
            return res.status(400).json({ success: false, error: "معرّف المحتوى مطلوب." });
        }

        const catalog = await getCatalog(false);
        const item = findItem(catalog, id);

        if (!item || !item.tmdbId) {
            return res.status(404).json({ success: false, error: "المحتوى غير موجود أو لا يملك TMDB ID." });
        }

        const providers = await getWatchProviders(
            item.tmdbId,
            item.type,
            region
        );

        return res.status(200).json({
            success: true,
            region,
            item: {
                id: item.id,
                tmdbId: item.tmdbId,
                title: item.title,
                type: item.type
            },
            providers,
            attribution: "بيانات مزوّدي المشاهدة من TMDB/JustWatch."
        });
    } catch (error) {
        console.error("[PROVIDERS API]", error.message);
        return res.status(500).json({
            success: false,
            error: "تعذر جلب مزوّدي المشاهدة حاليًا."
        });
    }
};
