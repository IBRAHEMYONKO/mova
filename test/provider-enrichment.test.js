"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { enrichProviders } = require("../lib/provider-enrichment");

test("enriches TMDB providers with official directory metadata when matched", () => {
    const result = enrichProviders([
        { id: 201, name: "Crunchyroll", type: "اشتراك", official: true },
        { id: 202, name: "Unknown Service", type: "مجاني", official: true }
    ]);

    assert.equal(result[0].providerId, "crunchyroll");
    assert.equal(result[0].officialUrl, "https://www.crunchyroll.com/");
    assert.equal(result[1].providerId, null);
    assert.equal(result[1].officialUrl, "");
});

test("never turns a directory entry into title availability", () => {
    const result = enrichProviders([
        { id: 999, name: "Netflix", type: "اشتراك", official: true }
    ]);

    assert.equal(result[0].available, undefined);
    assert.equal(result[0].confirmed, undefined);
});
