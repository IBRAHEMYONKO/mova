"use strict";

const {
    getCatalog,
    searchCatalog,
    sortItems
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

        const url =
            new URL(
                req.url,
                `https://${req.headers.host || "localhost"}`
            );

        const search =
            (url.searchParams.get("search") || "")
                .trim();

        const type =
            (url.searchParams.get("type") || "all")
                .trim()
                .toLowerCase();

        const genre =
            (url.searchParams.get("genre") || "")
                .trim();

        const category =
            (url.searchParams.get("category") || "")
                .trim();

        const sort =
            (url.searchParams.get("sort") || "popular")
                .trim()
                .toLowerCase();

        const force =
            url.searchParams.get("refresh") === "1";

        const catalog =
            await getCatalog(force);

        let items;

        /*
        ===============================
        SEARCH
        ===============================
        */

        if (search) {
            items =
                searchCatalog(
                    catalog,
                    search,
                    type,
                    sort
                );
        } else {
            items =
                [...catalog.all];

            /*
            ===============================
            TYPE
            ===============================
            */

            if (
                type &&
                type !== "all"
            ) {
                items =
                    items.filter(
                        item =>
                            item.type === type
                    );
            }

            /*
            ===============================
            GENRE
            ===============================
            */

            if (genre) {
                const wanted =
                    genre.toLowerCase();

                items =
                    items.filter(item =>
                        (item.genres || [])
                            .some(
                                value =>
                                    String(value)
                                        .toLowerCase()
                                        .includes(wanted)
                            )
                    );
            }

            /*
            ===============================
            CATEGORY
            ===============================
            */

            if (category) {
                const wanted =
                    category.toLowerCase();

                items =
                    items.filter(item =>
                        String(
                            item.category || ""
                        )
                            .toLowerCase()
                            .includes(wanted)
                    );
            }

            /*
            ===============================
            SORT
            ===============================
            */

            items =
                sortItems(
                    items,
                    sort
                );
        }

        /*
        ===============================
        RESPONSE
        ===============================
        */

        return res.status(200).json({
            success: true,

            movies: items,

            total:
                items.length,

            counts: {
                movies:
                    catalog.movies.length,

                series:
                    catalog.series.length,

                anime:
                    catalog.anime.length,

                all:
                    catalog.all.length
            },

            lastUpdate:
                catalog.lastUpdate
        });

    } catch (error) {
        console.error(
            "[CINEMA API]",
            error.message
        );

        return res.status(500).json({
            success: false,

            movies: [],

            total: 0,

            error:
                "تعذر الاتصال بمصادر مكتبة المحتوى.",

            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });
    }
};
