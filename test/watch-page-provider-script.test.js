"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { injectWatchScripts } = require("../lib/watch-page");

test("watch page injects provider availability script", () => {
    const output = injectWatchScripts("<body>watch</body>");
    assert.match(output, /<script src="\/watch-provider-ui\.js"><\/script>/);
});

test("watch page does not inject provider script twice", () => {
    const html = '<body><script src="/watch-provider-ui.js"></script></body>';
    const output = injectWatchScripts(html);
    assert.equal((output.match(/watch-provider-ui\.js/g) || []).length, 1);
});
