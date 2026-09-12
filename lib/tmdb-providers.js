"use strict";

const TMDB_BASE = "https://api.themoviedb.org/3";

function getCredentials() {
    return {
        apiKey: process.env.TMDB_API_KEY || "",
        token: process.env.TMDB_ACCESS_TOKEN || ""
    };
}

function buildUrl(path, apiKey) {
    const url = new URL(`${TMDB_BASE}${path}`);
    if (apiKey) url.searchParams.set("api_key", apiKey);
    return url.toString();
}

async function fetchJson(url) {
    const { token } = getCredentials();
    const response = await fetch(url, {
        headers: {
            accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    if (!response.ok) {
        throw new Error(`TMDB providers HTTP ${response.status}`);
    }

    return response.json();
}

function mapProvider(provider, type) {
    if (!provider || typeof provider !== "object") return null;

    return {
        id: Number(provider.provider_id) || 0,
        name: String(provider.provider_name || "").trim(),
        logo: provider.logo_path
            ? `https://image.tmdb.org/t/p/w92${provider.logo_path}`
            : "",
        link: String(provider.link || "").trim(),
        type,
        displayPriority: Number(provider.display_priority) || 999,
        official: true
    };
}

function uniqueProviders(values) {
    const seen = new Set();
    return values.filter(provider => {
        if (!provider || !provider.id || seen.has(provider.id)) return false;
        seen.add(provider.id);
        return true;
    }).sort((a, b) => a.displayPriority - b.displayPriority);
}

async function getWatchProviders(tmdbId, type = "movie", region = "IQ") {
    const id = Number(tmdbId);
    if (!Number.isFinite(id) || id < 1) return [];

    const normalizedType = type === "series" || type === "tv" ? "tv" : "movie";
    const { apiKey } = getCredentials();
    const data = await fetchJson(
        buildUrl(`/${normalizedType}/${id}/watch/providers`, apiKey)
    );

    const country = data?.results?.[region] || data?.results?.US || null;
    if (!country) return [];

    return uniqueProviders([
        ...(country.flatrate || []).map(item => mapProvider(item, "اشتراك")),
        ...(country.free || []).map(item => mapProvider(item, "مجاني")),
        ...(country.ads || []).map(item => mapProvider(item, "إعلانات")),
        ...(country.rent || []).map(item => mapProvider(item, "إيجار")),
        ...(country.buy || []).map(item => mapProvider(item, "شراء"))
    ]);
}

module.exports = {
    getWatchProviders
};
