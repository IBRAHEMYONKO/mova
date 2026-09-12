"use strict";

const { getAniListMangaCatalog, getAniListNovelCatalog } = require("../lib/anilist-media");

function uniqueById(items) {
    const seen = new Set();
    return items.filter(item => {
        const id = String(item?.id || "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

module.exports = async function handler(req, res) {
    try {
        res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
        res.setHeader("Content-Type", "application/json; charset=utf-8");

        const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const perPage = Math.min(50, Math.max(24, Number(url.searchParams.get("perPage") || 50)));

        const results = await Promise.allSettled([
            getAniListMangaCatalog(page, perPage),
            getAniListMangaCatalog(page, Math.min(perPage, 30), { country: "KR" }),
            getAniListNovelCatalog(page, Math.min(perPage, 30))
        ]);

        const [generalResult, manhwaResult, novelResult] = results;
        const general = generalResult.status === "fulfilled" ? generalResult.value : [];
        const manhwa = manhwaResult.status === "fulfilled" ? manhwaResult.value : [];
        const novels = novelResult.status === "fulfilled" ? novelResult.value : [];

        const manga = uniqueById(general.filter(item => item.type === "manga"));
        const generalManhwa = general.filter(item => item.type === "manhwa");
        const manhwaOnly = uniqueById([
            ...manhwa.filter(item => item.type === "manhwa"),
            ...generalManhwa
        ]);
        const novelItems = uniqueById(novels.filter(item => item.type === "novel"));
        const items = uniqueById([...manga, ...manhwaOnly, ...novelItems]);
        const successfulSources = results.filter(result => result.status === "fulfilled").length;

        return res.status(200).json({
            success: true,
            manga,
            manhwa: manhwaOnly,
            novels: novelItems,
            items,
            meta: {
                page,
                count: items.length,
                mangaCount: manga.length,
                manhwaCount: manhwaOnly.length,
                novelCount: novelItems.length,
                successfulSources,
                partial: successfulSources > 0 && successfulSources < results.length
            }
        });
    } catch (error) {
        console.error("[MEDIA CATALOG API]", error.message);
        return res.status(500).json({
            success: false,
            manga: [],
            manhwa: [],
            novels: [],
            items: [],
            error: "تعذر تحميل مكتبة المانغا والمانهوا والروايات حاليًا."
        });
    }
};
