"use strict";

const { buildMyListPage } = require("../lib/my-list-page");

module.exports = (req, res) => {
    try {
        let html = buildMyListPage();
        html = html.replace(/<\/body\s*>/i, '    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n    <script src="/cloud-library-sync.js"></script>\n</body>');
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        return res.end(html);
    } catch {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.end("تعذر تحميل قائمة المستخدم");
    }
};
