"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeMedia } = require("../lib/anilist-media");

test("normalizes AniList streaming episodes as official provider links", () => {
    const item = normalizeMedia({
        id: 101,
        idMal: 202,
        type: "ANIME",
        format: "TV",
        title: { userPreferred: "Test Anime", english: "Test Anime", native: "テスト" },
        description: "A test anime",
        startDate: { year: 2025, month: 1, day: 2 },
        averageScore: 80,
        popularity: 10,
        episodes: 12,
        duration: 24,
        genres: ["Action"],
        coverImage: { large: "https://example.com/poster.jpg" },
        bannerImage: "https://example.com/banner.jpg",
        siteUrl: "https://anilist.co/anime/101",
        externalLinks: [],
        streamingEpisodes: [
            { title: "Episode 1", thumbnail: "https://example.com/e1.jpg", url: "https://official.example/e1", site: "Official" }
        ]
    });

    assert.equal(item.id, "anilist-anime-101");
    assert.equal(item.type, "anime");
    assert.equal(item.seasons.length, 1);
    assert.equal(item.seasons[0].episodes.length, 1);
    assert.equal(item.seasons[0].episodes[0].sources[0].kind, "provider");
    assert.equal(item.seasons[0].episodes[0].sources[0].official, true);
});

test("normalizes Korean manga as manhwa and preserves chapter total separately", () => {
    const item = normalizeMedia({
        id: 303,
        idMal: 404,
        type: "MANGA",
        format: "WEBTOON",
        countryOfOrigin: "KR",
        title: { userPreferred: "Test Manhwa", english: "Test Manhwa", native: "테스트" },
        description: "A test manhwa",
        startDate: { year: 2024 },
        averageScore: 90,
        popularity: 20,
        chapters: 150,
        volumes: 10,
        genres: ["Fantasy"],
        coverImage: { large: "https://example.com/manhwa.jpg" },
        bannerImage: "",
        siteUrl: "https://anilist.co/manga/303",
        externalLinks: [],
        streamingEpisodes: []
    });

    assert.equal(item.id, "anilist-manga-303");
    assert.equal(item.type, "manhwa");
    assert.deepEqual(item.chapters, []);
    assert.equal(item.chapterTotal, 150);
    assert.equal(item.volumes, 10);
});
