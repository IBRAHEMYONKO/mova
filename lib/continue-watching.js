"use strict";

const PREFIX = "iraq-empire-cinema:progress:";

function readStorageEntries(storage) {
    if (!storage) return [];

    const entries = [];
    if (typeof storage.entries === "function") {
        for (const entry of storage.entries()) entries.push(entry);
        return entries;
    }

    if (typeof storage.length === "number" && typeof storage.key === "function") {
        for (let index = 0; index < storage.length; index++) {
            const key = storage.key(index);
            if (key) entries.push([key, storage.getItem(key)]);
        }
    }

    return entries;
}

function parseProgressKey(key) {
    const value = String(key || "");
    if (!value.startsWith(PREFIX)) return null;

    const parts = value.slice(PREFIX.length).split(":");
    if (parts.length !== 3) return null;

    const [encodedItemId, encodedSeason, encodedEpisode] = parts;
    try {
        const itemId = decodeURIComponent(encodedItemId).trim();
        const season = decodeURIComponent(encodedSeason).trim();
        const episode = decodeURIComponent(encodedEpisode).trim();
        if (!itemId || !season || !episode) return null;
        return { itemId, season, episode };
    } catch {
        return null;
    }
}

function parseProgress(value) {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!parsed || !Number.isFinite(Number(parsed.position)) || Number(parsed.position) < 0) return null;
        if (!Number.isFinite(Number(parsed.duration)) || Number(parsed.duration) <= 0) return null;

        return {
            position: Number(parsed.position),
            duration: Number(parsed.duration),
            updatedAt: Number(parsed.updatedAt || 0)
        };
    } catch {
        return null;
    }
}

function collectContinueWatching(storage, limit = 12) {
    const result = [];

    for (const [key, value] of readStorageEntries(storage)) {
        const ref = parseProgressKey(key);
        const progress = parseProgress(value);
        if (!ref || !progress) continue;
        result.push({ ...ref, ...progress });
    }

    result.sort((a, b) => b.updatedAt - a.updatedAt);

    const seen = new Set();
    const unique = [];
    for (const item of result) {
        const identity = `${item.itemId}:${item.season}:${item.episode}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        unique.push(item);
        if (unique.length >= Math.max(1, Number(limit) || 12)) break;
    }

    return unique;
}

module.exports = {
    PREFIX,
    parseProgressKey,
    parseProgress,
    collectContinueWatching
};
