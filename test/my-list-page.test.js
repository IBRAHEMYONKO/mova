"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { injectMyListScripts, buildMyListPage } = require("../lib/my-list-page");

test("my list page injects its browser script once", () => {
    const html = "<body><main></main></body>";
    const output = injectMyListScripts(injectMyListScripts(html));
    assert.equal((output.match(/my-list-page\.js/g) || []).length, 1);
});

test("my list page has dedicated navigation and empty state", () => {
    const html = buildMyListPage();
    assert.match(html, /قائمتي/);
    assert.match(html, /myListGrid/);
    assert.match(html, /لا توجد أعمال/);
});
