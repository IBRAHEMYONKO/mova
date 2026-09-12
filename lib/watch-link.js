"use strict";

function buildWatchUrl(itemId) {
    const id = String(itemId ?? "").trim();
    if (!id) return "/";
    return `/watch.html?id=${encodeURIComponent(id)}`;
}

module.exports = { buildWatchUrl };
