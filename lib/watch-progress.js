"use strict";

const PREFIX = "iraq-empire-cinema:";

function safeStorage(storage) {
    return storage &&
        typeof storage.getItem === "function" &&
        typeof storage.setItem === "function" &&
        typeof storage.removeItem === "function"
        ? storage
        : null;
}

function cleanPart(value) {
    return encodeURIComponent(String(value ?? "").trim());
}

function progressKey(itemId, seasonNumber, episodeNumber) {
    return `${PREFIX}progress:${cleanPart(itemId)}:${cleanPart(seasonNumber)}:${cleanPart(episodeNumber)}`;
}

function favoriteKey(itemId) {
    return `${PREFIX}favorite:${cleanPart(itemId)}`;
}

function saveProgress(storage, key, progress) {
    const target = safeStorage(storage);
    if (!target || !key || !progress) return false;

    const position = Number(progress.position);
    const duration = Number(progress.duration);
    const updatedAt = Number(progress.updatedAt || Date.now());

    if (!Number.isFinite(position) || position < 0 ||
        !Number.isFinite(duration) || duration <= 0) {
        return false;
    }

    target.setItem(key, JSON.stringify({ position, duration, updatedAt }));
    return true;
}

function readProgress(storage, key) {
    const target = safeStorage(storage);
    if (!target || !key) return null;

    try {
        const parsed = JSON.parse(target.getItem(key) || "null");
        if (!parsed) return null;
        if (!Number.isFinite(Number(parsed.position)) || Number(parsed.position) < 0) return null;
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

function clearProgress(storage, key) {
    const target = safeStorage(storage);
    if (!target || !key) return false;
    target.removeItem(key);
    return true;
}

function isFavorite(storage, key) {
    const target = safeStorage(storage);
    return Boolean(target && key && target.getItem(key) === "1");
}

function toggleFavorite(storage, key) {
    const target = safeStorage(storage);
    if (!target || !key) return false;

    if (target.getItem(key) === "1") {
        target.removeItem(key);
        return false;
    }

    target.setItem(key, "1");
    return true;
}

module.exports = {
    progressKey,
    saveProgress,
    readProgress,
    clearProgress,
    favoriteKey,
    isFavorite,
    toggleFavorite
};
