"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("watch progress UI bridges episode references and real video playback", () => {
    const file = path.join(__dirname, "..", "watch-progress-ui.js");
    const source = fs.readFileSync(file, "utf8");

    assert.match(source, /__IRAQ_CINEMA_EPISODE__/);
    assert.match(source, /currentTime/);
    assert.match(source, /duration/);
    assert.match(source, /localStorage/);
});

test("watch page injection includes the real progress script", () => {
    const { injectWatchScripts } = require("../lib/watch-page");
    const html = "<body></body>";
    const output = injectWatchScripts(html);

    assert.match(output, /watch-progress-ui\.js/);
    assert.equal((output.match(/watch-progress-ui\.js/g) || []).length, 1);
});
