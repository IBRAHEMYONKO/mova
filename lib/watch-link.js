"use strict";

function buildWatchUrl(id) {
    const value = String(id ?? "").trim();

    if (!value) {
        return "/";
    }

    return `/watch.html?id=${encodeURIComponent(value)}`;
}

module.exports = {
    buildWatchUrl
};
