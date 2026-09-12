"use strict";

(() => {
    const escapeHtml = value => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const poster = item => item?.poster || item?.coverImage?.extraLarge || item?.coverImage?.large || "";

    function card(item) {
        const id = encodeURIComponent(item.id);
        const image = poster(item);
        const title = escapeHtml(item.title || item.originalTitle || "بدون عنوان");
        const year = item.year ? escapeHtml(item.year) : "—";
        const chapters = Number(item.chapters || 0);
        const rating = Number(item.rating || 0);

        return `
            <a class="content-card" href="/watch.html?id=${id}" data-id="${escapeHtml(item.id)}">
                <div class="card-poster">
                    ${image ? `<img src="${escapeHtml(image)}" alt="${title}" loading="lazy">` : `<div class="card-placeholder">IE</div>`}
                    <div class="card-overlay"><span>التفاصيل ←</span></div>
                </div>
                <div class="card-info">
                    <h3>${title}</h3>
                    <div class="card-meta"><span>${year}</span><span>${chapters ? `${chapters} فصل` : "بيانات الفصول"}</span>${rating ? `<span>★ ${rating.toFixed(1)}</span>` : ""}</div>
                </div>
            </a>`;
    }

    function section(id, title, kicker, items, description) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const section = document.createElement("section");
        section.className = "section dark-section media-library-section";
        section.id = id;
        section.innerHTML = `
            <div class="section-head">
                <div>
                    <span class="kicker">${kicker}</span>
                    <h2>${title}</h2>
                    <p class="section-description">${description}</p>
                </div>
            </div>
            <div class="movie-grid media-library-grid">
                ${items.length ? items.map(card).join("") : `<div class="empty"><h3>لا توجد بيانات حالياً</h3><p>سيظهر القسم عندما تتوفر بيانات حقيقية من المصدر.</p></div>`}
            </div>`;

        const anime = document.getElementById("anime");
        const popular = document.getElementById("popular");
        (anime || popular)?.after(section);
    }

    async function init() {
        try {
            const response = await fetch("/api/catalog-media?page=1", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            section(
                "manga",
                "مكتبة المانغا",
                "IRAQ EMPIRE MANGA",
                Array.isArray(data.manga) ? data.manga : [],
                "أعمال مانغا حقيقية مع بيانات الفصول والتفاصيل المتوفرة."
            );

            section(
                "manhwa",
                "مكتبة المانهوا",
                "IRAQ EMPIRE MANHWA",
                Array.isArray(data.manhwa) ? data.manhwa : [],
                "أعمال مانهوا حقيقية مع بيانات المصدر والتفاصيل المتاحة."
            );
        } catch (error) {
            console.warn("MEDIA SECTIONS ERROR:", error.message);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
