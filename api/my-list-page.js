"use strict";

const { buildMyListPage } = require("../lib/my-list-page");

module.exports = (req, res) => {
    try {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        return res.end(buildMyListPage());
    } catch {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.end("تعذر تحميل قائمة المستخدم");
    }
};
