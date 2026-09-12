"use strict";

const {
    getCatalog
} = require("../lib/catalog");

module.exports = async function handler(req, res) {
    try {
        res.setHeader(
            "Cache-Control",
            "s-maxage=300, stale-while-revalidate=600"
        );

        res.setHeader(
            "Content-Type",
            "application/json; charset=utf-8"
        );

        const catalog =
            await getCatalog();

        return res.status(200).json({
            success: true,

            movies:
                catalog.movies.length,

            series:
                catalog.series.length,

            anime:
                catalog.anime.length,

            total:
                catalog.total,

            lastUpdate:
                catalog.lastUpdate
        });

    } catch (error) {
        console.error(
            "[CINEMA STATUS]",
            error.message
        );

        return res.status(500).json({
            success: false,

            movies: 0,
            series: 0,
            anime: 0,
            total: 0,

            lastUpdate: null,

            error:
                "تعذر قراءة حالة مكتبة المحتوى."
        });
    }
};
