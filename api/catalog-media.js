"use strict";

const { getAniListMangaCatalog } = require("../lib/anilist-media");

module.exports = async function handler(req, res) {
    try {
        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
        res.setHeader("Content-Type", "application/json; charset=utf-8");

        const page = Math.max(1, Number(new URL(req.url, `https://${req.headers.host || "localhost"}`).searchParams.get("page") || 1));
        const items = await getAniListMangaCatalog(page, 24);

        const manga = items.filter(item => item.type === "manga");
        const manhwa = items.filter(item => item.type === "manhwa");

        return res.status(200).json({
            success: true,
            manga,
            manhwa,
            items,
            meta: {
                page,
                count: items.length,
                mangaCount: manga.length,
                manhwaCount: manhwa.length
            }
        });
    } catch (error) {
        console.error("[MEDIA CATALOG API]", error.message);
        return res.status(500).json({
            success: false,
            manga: [],
            manhwa: [],
            items: [],
            error: "تعذر تحميل مكتبة المانغا والمانهوا حاليًا."
        });
    }
};
