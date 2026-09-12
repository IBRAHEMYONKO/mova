"use strict";

function getWatchNavigation(id) {
    const value = String(id ?? "").trim();
    if (!value) return null;

    return {
        id: value,
        href: `/watch.html?id=${encodeURIComponent(value)}`
    };
}

module.exports = { getWatchNavigation };
