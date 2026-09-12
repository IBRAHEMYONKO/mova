"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "my-list.js"), "utf8");

test("my list UI reads favorites and opens the real watch page", () => {
    assert.match(source, /iraq-empire-cinema:favorite:/);
    assert.match(source, /\/api\/title\?id=/);
    assert.match(source, /watch\.html\?id=/);
    assert.match(source, /إزالة/);
});

test("homepage injects my list script", () => {
    const { injectNavigationScript } = require("../lib/home-page");
    const output = injectNavigationScript("<body></body>");
    assert.equal((output.match(/my-list\.js/g) || []).length, 1);
});
