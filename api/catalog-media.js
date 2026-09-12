"use strict";

const { getAniListAnimeCatalog, getAniListMangaCatalog } = require("../lib/anilist-media");

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

        // Keep the public homepage on one canonical server-side AniList path.
        // Two requests are enough: one for anime and one for all manga formats,
        // from which manga/manhwa/novels are derived locally.
        const results = await Promise.allSettled([
            getAniListAnimeCatalog(page, Math.min(perPage, 30)),
            getAniListMangaCatalog(page, perPage)
        ]);

        const [animeResult, mangaResult] = results;
        const anime = animeResult.status === "fulfilled" ? uniqueById(animeResult.value) : [];
        const general = mangaResult.status === "fulfilled" ? mangaResult.value : [];

        const manga = uniqueById(general.filter(item => item.type === "manga"));
        const manhwa = uniqueById(general.filter(item => item.type === "manhwa"));
        const novels = uniqueById(general.filter(item => item.type === "novel"));
        const items = uniqueById([...anime, ...manga, ...manhwa, ...novels]);
        const successfulSources = results.filter(result => result.status === "fulfilled").length;

        return res.status(200).json({
            success: true,
            anime,
            manga,
            manhwa,
            novels,
            items,
            meta: {
                page,
                count: items.length,
                animeCount: anime.length,
                mangaCount: manga.length,
                manhwaCount: manhwa.length,
                novelCount: novels.length,
                successfulSources,
                partial: successfulSources > 0 && successfulSources < results.length
            }
        });
    } catch (error) {
        console.error("[MEDIA CATALOG API]", error.message);
        return res.status(500).json({
            success: false,
            anime: [],
            manga: [],
            manhwa: [],
            novels: [],
            items: [],
            error: "تعذر تحميل مكتبة الأنمي والمانغا والمانهوا والروايات حاليًا."
        });
    }
};
