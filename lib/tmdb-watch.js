"use strict";

const {
    mapTmdbSeason
} = require("./episode-model");

const TMDB_BASE = "https://api.themoviedb.org/3";

function buildTmdbUrl(path, apiKey) {
    const url = new URL(`${TMDB_BASE}${path}`);

    if (apiKey) {
        url.searchParams.set("api_key", apiKey);
    }

    url.searchParams.set("language", "ar-SA");
    return url.toString();
}

function tmdbHeaders() {
    const token = process.env.TMDB_ACCESS_TOKEN;

    return token
        ? { Authorization: `Bearer ${token}` }
        : {};
}

async function fetchJson(url, timeout = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            headers: {
                accept: "application/json",
                ...tmdbHeaders()
            },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`TMDB HTTP ${response.status}`);
        }

        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

function getSeasonNumbers(seasons) {
    if (!Array.isArray(seasons)) {
        return [];
    }

    return [...new Set(
        seasons
            .map(season => Number(season?.season_number))
            .filter(number => Number.isFinite(number) && number > 0)
    )].sort((a, b) => a - b);
}

async function mapWithConcurrency(values, worker, limit = 4) {
    const results = new Array(values.length);
    let cursor = 0;

    async function run() {
        while (true) {
            const index = cursor++;

            if (index >= values.length) {
                return;
            }

            try {
                results[index] = await worker(values[index], index);
            } catch {
                results[index] = null;
            }
        }
    }

    const workers = Array.from(
        { length: Math.min(limit, values.length) },
        () => run()
    );

    await Promise.all(workers);
    return results;
}

async function getSeriesEpisodes(tmdbId) {
    const id = Number(tmdbId);

    if (!Number.isFinite(id) || id < 1) {
        throw new Error("TMDB series id is invalid");
    }

    const apiKey = process.env.TMDB_API_KEY;
    const details = await fetchJson(
        buildTmdbUrl(`/tv/${id}`, apiKey)
    );

    const seasonNumbers = getSeasonNumbers(details.seasons);

    const seasons = await mapWithConcurrency(
        seasonNumbers,
        async seasonNumber => {
            const data = await fetchJson(
                buildTmdbUrl(
                    `/tv/${id}/season/${seasonNumber}`,
                    apiKey
                )
            );

            return mapTmdbSeason(data);
        },
        4
    );

    return seasons
        .filter(Boolean)
        .sort((a, b) => a.number - b.number);
}

module.exports = {
    buildTmdbUrl,
    getSeasonNumbers,
    getSeriesEpisodes
};
