"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeMedia } = require("../lib/anilist-media");

test("AniList generic manga receives a stable manga id and taxonomy", () => {
    const item = normalizeMedia({
        id: 501,
        idMal: 601,
        type: "MANGA",
        format: "MANGA",
        countryOfOrigin: "JP",
        title: { userPreferred: "Test Manga", english: "Test Manga", native: "テスト" },
        description: "A test manga",
        startDate: { year: 2023 },
        averageScore: 78,
        popularity: 12,
        chapters: 42,
        volumes: 5,
        genres: ["Drama"],
        coverImage: { large: "https://example.com/manga.jpg" },
        bannerImage: "",
        siteUrl: "https://anilist.co/manga/501",
        externalLinks: [],
        streamingEpisodes: []
    });

    assert.equal(item.id, "anilist-manga-501");
    assert.equal(item.type, "manga");
    assert.equal(item.chapterTotal, 42);
    assert.equal(item.volumes, 5);
});

test("AniList Korean webtoon receives the manhwa taxonomy", () => {
    const item = normalizeMedia({
        id: 502,
        type: "MANGA",
        format: "WEBTOON",
        countryOfOrigin: "KR",
        title: { userPreferred: "Test Webtoon" },
        chapters: 80,
        volumes: 8,
        coverImage: { large: "https://example.com/webtoon.jpg" },
        externalLinks: [],
        streamingEpisodes: []
    });

    assert.equal(item.id, "anilist-manhwa-502");
    assert.equal(item.type, "manhwa");
    assert.equal(item.chapterTotal, 80);
});

test("AniList novel receives a stable novel taxonomy", () => {
    const item = normalizeMedia({
        id: 503,
        type: "MANGA",
        format: "NOVEL",
        countryOfOrigin: "JP",
        title: { userPreferred: "Test Novel" },
        chapters: 30,
        volumes: 4,
        coverImage: { large: "https://example.com/novel.jpg" },
        externalLinks: [],
        streamingEpisodes: []
    });

    assert.equal(item.id, "anilist-novel-503");
    assert.equal(item.type, "novel");
    assert.equal(item.chapterTotal, 30);
    assert.equal(item.volumes, 4);
});
