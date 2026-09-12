"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { getOfficialProviders, findOfficialProvider } = require("../lib/official-providers");

test("official provider directory contains many distinct services", () => {
    const providers = getOfficialProviders();
    assert.ok(providers.length >= 30);
    assert.equal(new Set(providers.map(provider => provider.id)).size, providers.length);
});

test("provider directory can resolve a known official service", () => {
    const provider = findOfficialProvider("crunchyroll");
    assert.equal(provider?.name, "Crunchyroll");
    assert.equal(provider?.official, undefined);
});

test("provider directory never claims availability for a title", () => {
    const provider = findOfficialProvider("netflix");
    assert.ok(provider);
    assert.equal(provider.available, undefined);
    assert.equal(provider.confirmed, undefined);
});
