"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

function buildPlayableNavigation(seasons, seasonIndex, episodeIndex, direction) {
    const items = [];
    for (let si = 0; si < seasons.length; si++) {
        for (let ei = 0; ei < (seasons[si].episodes || []).length; ei++) {
            const episode = seasons[si].episodes[ei];
            if (episode?.sources?.some(source => source?.url)) {
                items.push({ seasonIndex: si, episodeIndex: ei, episode });
            }
        }
    }

    const current = items.findIndex(item =>
        item.seasonIndex === seasonIndex && item.episodeIndex === episodeIndex
    );
    if (current < 0) return null;

    const target = items[current + direction];
    return target || null;
}

test("next moves from the last episode of a season to the next season", () => {
    const result = buildPlayableNavigation([
        { number: 1, episodes: [{ number: 1, sources: [{ url: "https://a.test/1" }] }] },
        { number: 2, episodes: [{ number: 1, sources: [{ url: "https://a.test/2" }] }] }
    ], 0, 0, 1);

    assert.equal(result.seasonIndex, 1);
    assert.equal(result.episodeIndex, 0);
});

test("previous moves from the first episode of a season to the previous season", () => {
    const result = buildPlayableNavigation([
        { number: 1, episodes: [{ number: 1, sources: [{ url: "https://a.test/1" }] }] },
        { number: 2, episodes: [{ number: 1, sources: [{ url: "https://a.test/2" }] }] }
    ], 1, 0, -1);

    assert.equal(result.seasonIndex, 0);
    assert.equal(result.episodeIndex, 0);
});

test("navigation skips episodes without a real source", () => {
    const result = buildPlayableNavigation([
        { number: 1, episodes: [
            { number: 1, sources: [{ url: "https://a.test/1" }] },
            { number: 2, sources: [] }
        ] },
        { number: 2, episodes: [{ number: 1, sources: [{ url: "https://a.test/3" }] }] }
    ], 0, 0, 1);

    assert.equal(result.seasonIndex, 1);
    assert.equal(result.episodeIndex, 0);
});
