"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { injectMyListScripts } = require("../lib/my-list-page");

module.exports = (req, res) => {
    try {
        const file = path.join(process.cwd(), "my-list.html");
        const html = injectMyListScripts(fs.readFileSync(file, "utf8"));
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        return res.end(html);
    } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.end("تعذر تحميل قائمة المستخدم");
    }
};
