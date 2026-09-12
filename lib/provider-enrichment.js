"use strict";

const { findOfficialProvider } = require("./official-providers");

function normalizeName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[+®™]/g, "")
        .replace(/[^a-z0-9؀-ۿ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const NAME_ALIASES = new Map([
    ["amazon prime video", "prime-video"],
    ["prime video", "prime-video"],
    ["disney plus", "disney-plus"],
    ["apple tv", "apple-tv-plus"],
    ["apple tv plus", "apple-tv-plus"],
    ["paramount plus", "paramount-plus"],
    ["the roku channel", "roku-channel"],
    ["fandango at home", "vudu"],
    ["amazon freevee", "freevee"],
    ["crunchyroll channel", "crunchyroll-channel"],
    ["kocowa", "kocowa"],
    ["lezhin comics", "lezhin"]
]);

function resolveProvider(value) {
    const normalized = normalizeName(value);
    if (!normalized) return null;

    const alias = NAME_ALIASES.get(normalized);
    if (alias) return findOfficialProvider(alias);

    for (const provider of require("./official-providers").OFFICIAL_PROVIDERS) {
        if (normalizeName(provider.name) === normalized) return provider;
    }

    return null;
}

function enrichProviders(providers) {
    if (!Array.isArray(providers)) return [];

    return providers.map(provider => {
        const official = resolveProvider(provider?.name);

        return {
            ...provider,
            providerId: official?.id || null,
            officialUrl: official?.url || "",
            serviceKind: official?.kind || provider?.type || "video"
        };
    });
}

module.exports = { enrichProviders, resolveProvider };
