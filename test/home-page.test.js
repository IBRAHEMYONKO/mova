"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { injectNavigationScript } = require("../lib/home-page");

test("injects the watch navigation script once", () => {
    const html = "<html><body><main>OK</main></body></html>";
    const output = injectNavigationScript(html);

    assert.match(output, /<script src="watch-navigation\.js"><\/script>/);
    assert.equal((output.match(/watch-navigation\.js/g) || []).length, 1);
});

test("injects continue watching script once", () => {
    const html = "<html><body><main>OK</main></body></html>";
    const output = injectNavigationScript(html);

    assert.match(output, /<script src="continue-watching\.js"><\/script>/);
    assert.equal((output.match(/continue-watching\.js/g) || []).length, 1);
});
