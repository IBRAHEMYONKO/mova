"use strict";

const MY_LIST_SCRIPT = '<script src="my-list-page.js"></script>';

function injectMyListScripts(html) {
    const source = String(html ?? "");
    if (!source) return source;
    if (source.includes(MY_LIST_SCRIPT)) return source;
    return source.replace(/<\/body\s*>/i, `    ${MY_LIST_SCRIPT}\n</body>`);
}

function buildMyListPage() {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#070707">
<title>IRAQ EMPIRE CINEMA | قائمتي</title>
<link rel="stylesheet" href="/style.css">
<style>
.my-list-page{min-height:100vh;padding:120px 5% 60px}.my-list-header{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:30px}.my-list-header h1{font-size:clamp(34px,5vw,60px);margin:8px 0}.my-list-header p{color:#999;max-width:650px}.my-list-back{display:inline-flex;padding:11px 16px;border-radius:12px;background:#111;color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.1)}.my-list-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}.my-list-filter{background:#111;color:#ddd;border:1px solid rgba(255,255,255,.1);padding:9px 14px;border-radius:10px;cursor:pointer}.my-list-filter.active{background:#b89245;color:#080808}.my-list-page-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:18px}.my-list-page-card{background:#101010;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden}.my-list-page-card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:#181818}.my-list-page-body{padding:12px}.my-list-page-title{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.my-list-page-meta{color:#999;font-size:12px;margin-top:5px}.my-list-page-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.my-list-page-actions a,.my-list-page-actions button{border:0;border-radius:9px;padding:9px;text-align:center;text-decoration:none;font-weight:800;cursor:pointer}.my-list-page-watch{background:#b89245;color:#080808}.my-list-page-remove{background:#191919;color:#ddd}.my-list-empty{padding:45px 20px;text-align:center;border:1px dashed rgba(255,255,255,.15);border-radius:18px;color:#999}.my-list-empty strong{display:block;color:#fff;font-size:20px;margin-bottom:8px}@media(max-width:650px){.my-list-header{align-items:start;flex-direction:column}.my-list-page-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
</style>
</head>
<body>
<div class="my-list-page">
<header class="my-list-header">
<div><span class="kicker">IRAQ EMPIRE CINEMA</span><h1>قائمتي</h1><p>كل الأفلام والمسلسلات والأنمي التي حفظتها للمشاهدة لاحقًا.</p></div>
<a class="my-list-back" href="/">العودة للمكتبة</a>
</header>
<div class="my-list-toolbar" id="myListFilters"><button class="my-list-filter active" data-filter="all">الكل</button><button class="my-list-filter" data-filter="movie">أفلام</button><button class="my-list-filter" data-filter="series">مسلسلات</button><button class="my-list-filter" data-filter="anime">أنمي</button></div>
<section id="myListEmpty" class="my-list-empty" hidden><strong>لا توجد أعمال في قائمتك</strong><span>أضف أي عمل إلى المفضلة ليظهر هنا.</span></section>
<section id="myListGrid" class="my-list-page-grid" aria-live="polite"></section>
</div>
</body>
</html>`;
}

module.exports = { MY_LIST_SCRIPT, injectMyListScripts, buildMyListPage };
