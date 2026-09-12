"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { injectNavigationScript } = require("../lib/home-page");

module.exports = (req, res) => {
    try {
        const file = path.join(process.cwd(), "index.html");
        const html = fs.readFileSync(file, "utf8");
        let output = injectNavigationScript(html);

        const sourceGuard = '<script src="client-source-guard.js"></script>';
        if (!output.includes(sourceGuard)) {
            const indexScript = '<script src="index.js"></script>';
            output = output.includes(indexScript)
                ? output.replace(indexScript, `${sourceGuard}\n    ${indexScript}`)
                : `${output}\n${sourceGuard}\n`;
        }

        const script = '<script src="cinema-unified-search.js"></script>';
        if (!output.includes(script)) {
            const marker = /<\/body\s*>/i;
            output = marker.test(output)
                ? output.replace(marker, `    ${script}\n\n</body>`)
                : `${output}\n${script}\n`;
        }

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
        return res.status(200).send(output);
    } catch (error) {
        console.error("HOME_PAGE_ERROR", error);
        return res.status(500).send("تعذر تحميل الصفحة الرئيسية.");
    }
};
