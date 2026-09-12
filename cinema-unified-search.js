"use strict";

(() => {
    const input = document.querySelector("#searchInput");
    const results = document.querySelector("#searchResults");
    const types = document.querySelector("#searchTypes");
    if (!input || !results) return;
    if (window.__IRAQ_UNIFIED_SEARCH__) return;
    window.__IRAQ_UNIFIED_SEARCH__ = true;

    const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[c]));
    const label = type => ({ movie:"فيلم", series:"مسلسل", anime:"أنمي", manga:"مانغا", manhwa:"مانهوا", novel:"رواية" }[type] || "محتوى");
    let timer = null;
    let controller = null;

    function render(items) {
        if (!items.length) {
            results.innerHTML = '<div class="search-empty">لا توجد نتائج مطابقة.</div>';
            return;
        }
        results.innerHTML = items.slice(0, 40).map(item => {
            const title = esc(item.title || item.originalTitle || "بدون عنوان");
            const poster = item.poster ? `<img src="${esc(item.poster)}" alt="${title}" loading="lazy">` : '<div class="search-result-poster-fallback">IE</div>';
            return `<a class="search-result" href="/watch.html?id=${encodeURIComponent(item.id)}" data-unified-result="1"><div class="search-result-poster">${poster}</div><div class="search-result-body"><strong>${title}</strong><span>${esc(label(item.type))}${item.year ? ` • ${esc(item.year)}` : ""}${item.rating ? ` • ★ ${Number(item.rating).toFixed(1)}` : ""}</span></div></a>`;
        }).join("");
    }

    async function request(url, options = {}) {
        const response = await fetch(url, { ...options, cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    async function search() {
        const q = input.value.trim();
        if (q.length < 2) {
            results.innerHTML = '<div class="search-empty">اكتب حرفين على الأقل للبحث.</div>';
            return;
        }
        if (controller) controller.abort();
        controller = new AbortController();
        const signal = controller.signal;
        results.innerHTML = '<div class="search-loading">جاري البحث في جميع المكتبات...</div>';
        const selected = types?.querySelector(".search-type.active")?.dataset?.searchType || "all";
        try {
            const mediaType = ["anime", "manga", "manhwa", "novel"].includes(selected) ? selected : "all";
            const [catalogResult, mediaResult] = await Promise.allSettled([
                request(`/api/movies?search=${encodeURIComponent(q)}&type=${selected === "movie" || selected === "series" ? selected : "all"}`, { signal }),
                request(`/api/search-media?q=${encodeURIComponent(q)}&type=${encodeURIComponent(mediaType)}`, { signal })
            ]);
            const catalogItems = catalogResult.status === "fulfilled" && Array.isArray(catalogResult.value?.movies) ? catalogResult.value.movies : [];
            const mediaItems = mediaResult.status === "fulfilled" && Array.isArray(mediaResult.value?.items) ? mediaResult.value.items : [];
            let items = [...catalogItems, ...mediaItems];
            if (["anime", "manga", "manhwa", "novel"].includes(selected)) items = mediaItems.filter(item => item.type === selected);
            if (selected === "movie" || selected === "series") items = catalogItems.filter(item => item.type === selected);
            const seen = new Set();
            items = items.filter(item => {
                const key = String(item.id || `${item.type}:${item.title}`).toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            render(items);
        } catch (error) {
            if (error.name === "AbortError") return;
            results.innerHTML = '<div class="search-empty">تعذر تنفيذ البحث الآن. حاول مرة أخرى.</div>';
        }
    }

    input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(search, 350);
    }, true);

    types?.addEventListener("click", event => {
        const button = event.target.closest(".search-type");
        if (!button) return;
        setTimeout(search, 0);
    }, true);
})();
