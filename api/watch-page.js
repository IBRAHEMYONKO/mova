"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { injectWatchScripts } = require("../lib/watch-page");

module.exports = (req, res) => {
    try {
        const file = path.join(process.cwd(), "watch.html");
        const html = fs.readFileSync(file, "utf8");
        const output = injectWatchScripts(html);

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
        return res.status(200).send(output);
    } catch (error) {
        console.error("WATCH PAGE ERROR:", error);
        return res.status(500).send("تعذر تحميل صفحة المشاهدة.");
    }
};
