"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { getOfficialProviders, findOfficialProvider } = require("../lib/official-providers");

test("official provider directory contains many trusted services", () => {
    const providers = getOfficialProviders();
    assert.ok(providers.length >= 15);
    assert.ok(providers.every(provider => /^https:\/\//.test(provider.url)));
    assert.ok(providers.some(provider => provider.id === "youtube"));
    assert.ok(providers.some(provider => provider.id === "tubi"));
    assert.ok(providers.some(provider => provider.id === "crunchyroll"));
});

test("provider lookup is case insensitive", () => {
    assert.equal(findOfficialProvider("TUBI")?.id, "tubi");
    assert.equal(findOfficialProvider("missing-provider"), null);
});
