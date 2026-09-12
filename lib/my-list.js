"use strict";

const PREFIX = "iraq-empire-cinema:favorite:";

function favoriteKey(itemId) {
    return `${PREFIX}${encodeURIComponent(String(itemId ?? "").trim())}`;
}

function collectFavorites(storage) {
    if (!storage) return [];

    const entries = typeof storage.entries === "function"
        ? storage.entries()
        : null;

    if (!entries) return [];

    const result = [];
    for (const [key, value] of entries) {
        const rawKey = String(key || "");
        if (!rawKey.startsWith(PREFIX) || value !== "1") continue;

        try {
            const itemId = decodeURIComponent(rawKey.slice(PREFIX.length)).trim();
            if (itemId) result.push(itemId);
        } catch {
            // Ignore malformed localStorage keys.
        }
    }

    return [...new Set(result)];
}

function toggleFavorite(storage, key) {
    if (!storage || !key || typeof storage.getItem !== "function" ||
        typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
        return false;
    }

    if (storage.getItem(key) === "1") {
        storage.removeItem(key);
        return false;
    }

    storage.setItem(key, "1");
    return true;
}

module.exports = {
    PREFIX,
    favoriteKey,
    collectFavorites,
    toggleFavorite
};
