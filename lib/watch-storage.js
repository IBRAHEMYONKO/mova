"use strict";

const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(process.cwd(), "data", "watch-sources.json");

function readStore() {
    try {
        const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
        return parsed && typeof parsed === "object" ? parsed : { items: {} };
    } catch {
        return { items: {} };
    }
}

function loadStoredWatchItem(id) {
    const store = readStore();
    const items = store.items && typeof store.items === "object" ? store.items : {};
    const item = items[String(id)] || {};

    return {
        sources: Array.isArray(item.sources) ? item.sources : [],
        seasons: item.seasons && typeof item.seasons === "object" ? item.seasons : {},
        chapters: Array.isArray(item.chapters) ? item.chapters : []
    };
}

module.exports = {
    FILE,
    readStore,
    loadStoredWatchItem
};
