"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { injectWatchScripts } = require("../lib/watch-page");

test("community UI is injected once into the watch page", () => {
    const html = "<body><main></main></body>";
    const output = injectWatchScripts(injectWatchScripts(html));
    assert.equal((output.match(/community-ui\.js/g) || []).length, 1);
});

test("community UI contains login, comment, reply, reaction and report flows", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "community-ui.js"), "utf8");
    assert.match(source, /community-form/);
    assert.match(source, /data-action=\\"reply\\"/);
    assert.match(source, /data-action=\\"like\\"/);
    assert.match(source, /data-action=\\"dislike\\"/);
    assert.match(source, /data-action=\\"report\\"/);
    assert.match(source, /from\("comments"\)/);
    assert.match(source, /from\("comment_reactions"\)/);
    assert.match(source, /from\("reports"\)/);
});
