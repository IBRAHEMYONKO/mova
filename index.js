"use strict";

/* =========================================================
   IRAQ EMPIRE CINEMA
   FRONTEND ENGINE
========================================================= */

const API_BASE = "/api";


/* =========================================================
   STATE
========================================================= */

const state = {

    all: [],

    movies: [],

    series: [],

    anime: [],

    popular: [],

    movieCategory: "all",

    movieSort: "popular",

    seriesFilter: "all",

    animeFilter: "all",

    searchType: "all",

    searchTimer: null,

    currentItem: null,

    movieLimit: 24

};


/* =========================================================
   DOM
========================================================= */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    Array.from(
        document.querySelectorAll(selector)
    );


/* =========================================================
   ELEMENTS
========================================================= */

const movieGrid =
    $("#movieGrid");

const seriesGrid =
    $("#seriesGrid");

const animeGrid =
    $("#animeGrid");

const popularGrid =
    $("#popularGrid");

const movieCount =
    $("#movieCount");

const seriesCount =
    $("#seriesCount");

const animeCount =
    $("#animeCount");

const statusText =
    $("#statusText");

const toast =
    $("#toast");

const searchOverlay =
    $("#searchOverlay");

const searchInput =
    $("#searchInput");

const searchResults =
    $("#searchResults");

const movieModal =
    $("#movieModal");

const modalTitle =
    $("#modalTitle");

const modalPoster =
    $("#modalPoster");

const modalBackdrop =
    $("#modalBackdrop");

const modalOverview =
    $("#modalOverview");

const modalMeta =
    $("#modalMeta");

const modalGenres =
    $("#modalGenres");

const modalType =
    $("#modalType");

const modalExtra =
    $("#modalExtra");

const modalWatch =
    $("#modalWatch");

const emptyState =
    $("#emptyState");

const seriesEmptyState =
    $("#seriesEmptyState");

const animeEmptyState =
    $("#animeEmptyState");

const loadMore =
    $("#loadMore");


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function formatNumber(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return "—";
    }

    return number
        .toLocaleString("ar-IQ");

}


function formatRating(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {
        return "—";
    }

    return number
        .toFixed(1);

}


function formatDate(value) {

    if (!value) {
        return "غير معروف";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleDateString(
        "ar-IQ",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

}


function getYear(item) {

    if (item.year) {
        return item.year;
    }

    if (item.releaseDate) {
        return String(
            item.releaseDate
        ).slice(0, 4);
    }

    return "—";
}


function getTypeName(type) {

    switch (type) {

        case "movie":
            return "فيلم";

        case "series":
            return "مسلسل";

        case "anime":
            return "أنمي";

        default:
            return "محتوى";

    }

}


function getPoster(item) {

    return (
        item.poster ||
        ""
    );

}


function getGenres(item) {

    if (
        !Array.isArray(
            item.genres
        )
    ) {
        return [];
    }

    return item.genres
        .filter(Boolean)
        .slice(0, 3);

}


function showToast(message) {

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        showToast.timer
    );

    showToast.timer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2800);

}


function setLoading(
    element,
    count = 8
) {

    if (!element) {
        return;
    }

    element.innerHTML =
        Array.from(
            {
                length: count
            }
        )
            .map(() => `
                <div class="loading-card">
                    <div class="loading-poster"></div>

                    <div class="loading-lines">
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `)
            .join("");

}


/* =========================================================
   API
========================================================= */

async function apiFetch(
    endpoint
) {

    const response =
        await fetch(
            `${API_BASE}${endpoint}`,
            {
                method: "GET",
                headers: {
                    Accept:
                        "application/json"
                },
                cache: "no-store"
            }
        );

    if (!response.ok) {

        throw new Error(
            `API ${response.status}`
        );

    }

    const data =
        await response.json();

    return data;

}


/* =========================================================
   LOAD STATUS
========================================================= */

async function loadStatus() {

    try {

        const data =
            await apiFetch(
                "/status"
            );

        if (
            !data ||
            data.success !== true
        ) {
            throw new Error(
                "Invalid status response"
            );
        }


        if (movieCount) {

            movieCount.textContent =
                formatNumber(
                    data.movies
                );

        }


        if (seriesCount) {

            seriesCount.textContent =
                formatNumber(
                    data.series
                );

        }


        if (animeCount) {

            animeCount.textContent =
                formatNumber(
                    data.anime
                );

        }


        const updateElements =
            document.querySelectorAll(
                '[id="lastUpdate"]'
            );

        updateElements.forEach(
            element => {

                element.textContent =
                    data.lastUpdate
                        ? formatDate(
                            data.lastUpdate
                        )
                        : "—";

            }
        );


        if (statusText) {

            statusText.textContent =
                `المكتبة تحتوي على ${formatNumber(
                    data.total
                )} عنصر`;

        }

    } catch (error) {

        console.error(
            "STATUS ERROR:",
            error
        );

        if (statusText) {

            statusText.textContent =
                "تعذر الاتصال بمكتبة المحتوى";

        }

    }

}


/* =========================================================
   LOAD ALL
========================================================= */

async function loadAll() {

    try {

        const data =
            await apiFetch(
                "/movies?sort=popular"
            );

        if (
            !data ||
            !Array.isArray(
                data.movies
            )
        ) {

            throw new Error(
                "Invalid movies response"
            );

        }

        state.all =
            data.movies;

        state.movies =
            state.all.filter(
                item =>
                    item.type ===
                    "movie"
            );

        state.series =
            state.all.filter(
                item =>
                    item.type ===
                    "series"
            );

        state.anime =
            state.all.filter(
                item =>
                    item.type ===
                    "anime"
            );

        state.popular =
            [...state.all]
                .sort(
                    (a, b) =>
                        (
                            Number(
                                b.popularity
                            ) || 0
                        ) -
                        (
                            Number(
                                a.popularity
                            ) || 0
                        )
                )
                .slice(
                    0,
                    12
                );


        renderPopular();

        renderMovies();

        renderSeries();

        renderAnime();

    } catch (error) {

        console.error(
            "LIBRARY ERROR:",
            error
        );

        showToast(
            "تعذر تحميل مكتبة المحتوى"
        );

        showEmpty(
            movieGrid,
            emptyState,
            "تعذر تحميل الأفلام"
        );

        showEmpty(
            seriesGrid,
            seriesEmptyState,
            "تعذر تحميل المسلسلات"
        );

        showEmpty(
            animeGrid,
            animeEmptyState,
            "تعذر تحميل الأنمي"
        );

    }

}


/* =========================================================
   FILTER MOVIES
========================================================= */

function getFilteredMovies() {

    let items =
        [...state.movies];


    if (
        state.movieCategory !==
        "all"
    ) {

        items =
            items.filter(
                item => {

                    const genres =
                        Array.isArray(
                            item.genres
                        )
                            ? item.genres
                            : [];

                    return genres.some(
                        genre =>
                            String(
                                genre
                            ).toLowerCase()
                            .includes(
                                String(
                                    state.movieCategory
                                ).toLowerCase()
                            )
                    );

                }
            );

    }


    switch (
        state.movieSort
    ) {

        case "rating":

            items.sort(
                (a, b) =>
                    (
                        Number(
                            b.rating
                        ) || 0
                    ) -
                    (
                        Number(
                            a.rating
                        ) || 0
                    )
            );

            break;


        case "new":

            items.sort(
                (a, b) =>
                    String(
                        b.releaseDate || ""
                    ).localeCompare(
                        String(
                            a.releaseDate || ""
                        )
                    )
            );

            break;


        case "popular":

        default:

            items.sort(
                (a, b) =>
                    (
                        Number(
                            b.popularity
                        ) || 0
                    ) -
                    (
                        Number(
                            a.popularity
                        ) || 0
                    )
            );

            break;

    }


    return items;

}


/* =========================================================
   RENDER MOVIES
========================================================= */

function renderMovies() {

    if (!movieGrid) {
        return;
    }

    const items =
        getFilteredMovies();


    if (!items.length) {

        showEmpty(
            movieGrid,
            emptyState,
            "لم نجد أفلاماً"
        );

        if (loadMore) {
            loadMore.hidden =
                true;
        }

        return;

    }


    emptyState.hidden =
        true;


    const visible =
        items.slice(
            0,
            state.movieLimit
        );


    movieGrid.innerHTML =
        visible
            .map(
                createCard
            )
            .join("");


    if (loadMore) {

        loadMore.hidden =
            visible.length >=
            items.length;

    }

}


/* =========================================================
   RENDER SERIES
========================================================= */

function renderSeries() {

    if (!seriesGrid) {
        return;
    }

    let items =
        [...state.series];


    if (
        state.seriesFilter ===
        "rating"
    ) {

        items.sort(
            (a, b) =>
                (
                    Number(
                        b.rating
                    ) || 0
                ) -
                (
                    Number(
                        a.rating
                    ) || 0
                )
        );

    } else {

        items.sort(
            (a, b) =>
                (
                    Number(
                        b.rating
                    ) || 0
                ) -
                (
                    Number(
                        a.rating
                    ) || 0
                )
        );

    }


    if (!items.length) {

        showEmpty(
            seriesGrid,
            seriesEmptyState,
            "لا توجد مسلسلات حالياً"
        );

        return;

    }


    seriesEmptyState.hidden =
        true;


    seriesGrid.innerHTML =
        items
            .slice(0, 24)
            .map(
                createCard
            )
            .join("");

}


/* =========================================================
   RENDER ANIME
========================================================= */

function renderAnime() {

    if (!animeGrid) {
        return;
    }

    let items =
        [...state.anime];


    if (
        state.animeFilter ===
        "airing"
    ) {

        items =
            items.filter(
                item =>
                    String(
                        item.status || ""
                    )
                        .toLowerCase()
                        .includes(
                            "airing"
                        ) ||
                    String(
                        item.status || ""
                    )
                        .includes(
                            "يعرض"
                        )
            );

    }


    items.sort(
        (a, b) =>
            (
                Number(
                    b.rating
                ) || 0
            ) -
            (
                Number(
                    a.rating
                ) || 0
            )
    );


    if (!items.length) {

        showEmpty(
            animeGrid,
            animeEmptyState,
            "لا يوجد أنمي حالياً"
        );

        return;

    }


    animeEmptyState.hidden =
        true;


    animeGrid.innerHTML =
        items
            .slice(0, 24)
            .map(
                createCard
            )
            .join("");

}


/* =========================================================
   RENDER POPULAR
========================================================= */

function renderPopular() {

    if (!popularGrid) {
        return;
    }

    if (!state.popular.length) {

        setLoading(
            popularGrid,
            6
        );

        return;

    }


    popularGrid.innerHTML =
        state.popular
            .map(
                createCard
            )
            .join("");

}


/* =========================================================
   CREATE CARD
========================================================= */

function createCard(item) {

    const poster =
        getPoster(item);

    const rating =
        formatRating(
            item.rating
        );

    const year =
        getYear(item);

    const type =
        getTypeName(
            item.type
        );

    const genres =
        getGenres(item);


    const genresHtml =
        genres
            .map(
                genre => `
                    <span class="card-genre">
                        ${escapeHtml(
                            genre
                        )}
                    </span>
                `
            )
            .join("");


    return `
        <article
            class="content-card"
            data-id="${escapeHtml(
                item.id
            )}"
        >

            <div class="card-poster">

                ${
                    poster
                        ? `
                            <img
                                src="${escapeHtml(
                                    poster
                                )}"
                                alt="${escapeHtml(
                                    item.title
                                )}"
                                loading="lazy"
                                onerror="this.style.display='none'"
                            >
                        `
                        : `
                            <div
                                style="
                                    width:100%;
                                    height:100%;
                                    display:grid;
                                    place-items:center;
                                    color:#d6a84f;
                                    font-size:35px;
                                "
                            >
                                IE
                            </div>
                        `
                }

                <span class="card-rating">
                    ★ ${escapeHtml(
                        rating
                    )}
                </span>

                <span class="card-type">
                    ${escapeHtml(
                        type
                    )}
                </span>

            </div>


            <div class="card-body">

                <h3 class="card-title">
                    ${escapeHtml(
                        item.title ||
                        "بدون عنوان"
                    )}
                </h3>


                <div class="card-meta">

                    <span>
                        ${escapeHtml(
                            year
                        )}
                    </span>

                    ${
                        item.runtime
                            ? `
                                <span>
                                    ${escapeHtml(
                                        item.runtime
                                    )}
                                </span>
                            `
                            : ""
                    }

                    ${
                        item.episodes
                            ? `
                                <span>
                                    ${escapeHtml(
                                        item.episodes
                                    )}
                                    حلقة
                                </span>
                            `
                            : ""
                    }

                </div>


                ${
                    genresHtml
                        ? `
                            <div class="card-genres">
                                ${genresHtml}
                            </div>
                        `
                        : ""
                }

            </div>

        </article>
    `;

}


/* =========================================================
   EMPTY
========================================================= */

function showEmpty(
    grid,
    empty,
    message
) {

    if (grid) {
        grid.innerHTML = "";
    }

    if (empty) {

        empty.hidden =
            false;

        const title =
            empty.querySelector(
                "h3"
            );

        if (title) {
            title.textContent =
                message;
        }

    }

}


/* =========================================================
   OPEN MODAL
========================================================= */

function openModal(item) {

    if (!movieModal) {
        return;
    }


    state.currentItem =
        item;


    const poster =
        getPoster(item);


    modalTitle.textContent =
        item.title ||
        "بدون عنوان";


    modalType.textContent =
        getTypeName(
            item.type
        );


    const genres =
        getGenres(item);


    modalGenres.textContent =
        genres.join(
            " • "
        );


    modalOverview.textContent =
        item.overview ||
        "لا يوجد وصف متوفر.";


    modalMeta.innerHTML = `
        <span class="meta-item">
            <strong>التقييم</strong>
            ${escapeHtml(
                formatRating(
                    item.rating
                )
            )}
        </span>

        <span class="meta-item">
            <strong>السنة</strong>
            ${escapeHtml(
                getYear(item)
            )}
        </span>

        ${
            item.imdbRating
                ? `
                    <span class="meta-item">
                        <strong>IMDb</strong>
                        ${escapeHtml(
                            formatRating(
                                item.imdbRating
                            )
                        )}
                    </span>
                `
                : ""
        }

        ${
            item.runtime
                ? `
                    <span class="meta-item">
                        <strong>المدة</strong>
                        ${escapeHtml(
                            item.runtime
                        )}
                    </span>
                `
                : ""
        }

        ${
            item.episodes
                ? `
                    <span class="meta-item">
                        <strong>الحلقات</strong>
                        ${escapeHtml(
                            item.episodes
                        )}
                    </span>
                `
                : ""
        }

        ${
            item.status
                ? `
                    <span class="meta-item">
                        <strong>الحالة</strong>
                        ${escapeHtml(
                            item.status
                        )}
                    </span>
                `
                : ""
        }
    `;


    const extras = [];


    if (
        item.director
    ) {

        extras.push(
            `المخرج: ${item.director}`
        );

    }


    if (
        item.network
    ) {

        extras.push(
            `الشبكة: ${item.network}`
        );

    }


    if (
        item.production
    ) {

        if (
            Array.isArray(
                item.production
            )
        ) {

            extras.push(
                `الاستوديو: ${
                    item.production
                        .join("، ")
                }`
            );

        } else {

            extras.push(
                `الإنتاج: ${item.production}`
            );

        }

    }


    if (
        item.country
    ) {

        extras.push(
            `الدولة: ${item.country}`
        );

    }


    modalExtra.innerHTML =
        extras
            .map(
                text =>
                    `<span>${escapeHtml(
                        text
                    )}</span>`
            )
            .join(" • ");


    if (poster) {

        modalPoster.innerHTML = `
            <img
                src="${escapeHtml(
                    poster
                )}"
                alt="${escapeHtml(
                    item.title
                )}"
            >
        `;

    } else {

        modalPoster.innerHTML = `
            <div
                style="
                    width:100%;
                    height:100%;
                    display:grid;
                    place-items:center;
                    color:#d6a84f;
                    font-size:40px;
                "
            >
                IE
            </div>
        `;

    }


    if (
        item.backdrop
    ) {

        modalBackdrop.style.background =
            `
                linear-gradient(
                    90deg,
                    #090909 20%,
                    rgba(9,9,9,0.78),
                    rgba(9,9,9,0.42)
                ),
                url("${item.backdrop}")
                center / cover
                no-repeat
            `;

    } else {

        modalBackdrop.style.background =
            `
                radial-gradient(
                    circle at 70% 30%,
                    rgba(143,16,32,0.35),
                    transparent 40%
                ),
                #090909
            `;

    }


    if (modalWatch) {

        if (
            item.trailer
        ) {

            modalWatch.textContent =
                "عرض المقطع";

            modalWatch.disabled =
                false;

        } else if (
            item.sourceUrl
        ) {

            modalWatch.textContent =
                "المصدر";

            modalWatch.disabled =
                false;

        } else if (
            item.imdbId
        ) {

            modalWatch.textContent =
                "IMDb";

            modalWatch.disabled =
                false;

        } else {

            modalWatch.textContent =
                "لا يوجد رابط";

            modalWatch.disabled =
                true;

        }

    }


    movieModal.hidden =
        false;

    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (!movieModal) {
        return;
    }

    movieModal.hidden =
        true;

    document.body.style.overflow =
        "";

    state.currentItem =
        null;

}


/* =========================================================
   SEARCH
========================================================= */

async function performSearch(
    query
) {

    const text =
        String(
            query || ""
        ).trim();


    if (!text) {

        searchResults.innerHTML =
            "";

        return;

    }


    searchResults.innerHTML = `
        <div class="search-empty">
            جاري البحث...
        </div>
    `;


    try {

        let items;


        if (
            state.searchType ===
            "all"
        ) {

            const data =
                await apiFetch(
                    `/movies?search=${encodeURIComponent(
                        text
                    )}&sort=popular`
                );

            items =
                Array.isArray(
                    data.movies
                )
                    ? data.movies
                    : [];

        } else {

            const data =
                await apiFetch(
                    `/movies?search=${encodeURIComponent(
                        text
                    )}&type=${encodeURIComponent(
                        state.searchType
                    )}&sort=popular`
                );

            items =
                Array.isArray(
                    data.movies
                )
                    ? data.movies
                    : [];

        }


        renderSearchResults(
            items.slice(
                0,
                20
            )
        );

    } catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

        searchResults.innerHTML = `
            <div class="search-empty">
                تعذر تنفيذ البحث حالياً.
            </div>
        `;

    }

}


function renderSearchResults(
    items
) {

    if (
        !items.length
    ) {

        searchResults.innerHTML = `
            <div class="search-empty">
                لم نجد نتائج مطابقة.
            </div>
        `;

        return;

    }


    searchResults.innerHTML =
        items
            .map(
                item => {

                    const poster =
                        getPoster(item);

                    return `
                        <div
                            class="search-result"
                            data-id="${escapeHtml(
                                item.id
                            )}"
                        >

                            ${
                                poster
                                    ? `
                                        <img
                                            src="${escapeHtml(
                                                poster
                                            )}"
                                            alt="${escapeHtml(
                                                item.title
                                            )}"
                                        >
                                    `
                                    : `
                                        <div
                                            style="
                                                width:48px;
                                                height:65px;
                                                display:grid;
                                                place-items:center;
                                                border-radius:7px;
                                                background:#151515;
                                                color:#d6a84f;
                                            "
                                        >
                                            IE
                                        </div>
                                    `
                            }


                            <div class="search-result-info">

                                <div class="search-result-title">
                                    ${escapeHtml(
                                        item.title
                                    )}
                                </div>

                                <div class="search-result-meta">

                                    ${escapeHtml(
                                        getTypeName(
                                            item.type
                                        )
                                    )}

                                    •

                                    ${escapeHtml(
                                        getYear(
                                            item
                                        )
                                    )}

                                    •

                                    ★ ${escapeHtml(
                                        formatRating(
                                            item.rating
                                        )
                                    )}

                                </div>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   FIND ITEM
========================================================= */

function findItemById(
    id
) {

    return state.all.find(
        item =>
            String(
                item.id
            ) ===
            String(id)
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    $$(".nav-link").forEach(
        link => {

            link.addEventListener(
                "click",
                () => {

                    $$(".nav-link")
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );

                    link.classList.add(
                        "active"
                    );

                }
            );

        }
    );


    const sections =
        [
            "#home",
            "#movies",
            "#series",
            "#anime",
            "#popular",
            "#categories"
        ]
            .map(
                selector =>
                    document.querySelector(
                        selector
                    )
            )
            .filter(Boolean);


    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }

                        const id =
                            entry.target.id;

                        $$(".nav-link")
                            .forEach(
                                link => {

                                    link.classList.toggle(
                                        "active",
                                        link.getAttribute(
                                            "href"
                                        ) ===
                                        `#${id}`
                                    );

                                }
                            );

                    }
                );

            },
            {
                threshold: 0.35
            }
        );


    sections.forEach(
        section =>
            observer.observe(
                section
            )
    );

}


/* =========================================================
   MOVIE FILTER EVENTS
========================================================= */

function setupMovieFilters() {

    $$("#movieFilters .filter")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$("#movieFilters .filter")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );


                        state.movieCategory =
                            button.dataset.category ||
                            "all";


                        state.movieLimit =
                            24;


                        renderMovies();

                    }
                );

            }
        );


    const select =
        $("#movieSortSelect");


    if (select) {

        select.addEventListener(
            "change",
            () => {

                state.movieSort =
                    select.value;

                state.movieLimit =
                    24;

                renderMovies();

            }
        );

    }


    if (loadMore) {

        loadMore.addEventListener(
            "click",
            () => {

                state.movieLimit +=
                    24;

                renderMovies();

            }
        );

    }

}


/* =========================================================
   SERIES FILTERS
========================================================= */

function setupSeriesFilters() {

    $$("#seriesFilters .content-tab")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$("#seriesFilters .content-tab")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );


                        state.seriesFilter =
                            button.dataset.seriesFilter ||
                            "all";


                        renderSeries();

                    }
                );

            }
        );

}


/* =========================================================
   ANIME FILTERS
========================================================= */

function setupAnimeFilters() {

    $$("#animeFilters .content-tab")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$("#animeFilters .content-tab")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );


                        state.animeFilter =
                            button.dataset.animeFilter ||
                            "all";


                        renderAnime();

                    }
                );

            }
        );

}


/* =========================================================
   CATEGORY CARDS
========================================================= */

function setupCategories() {

    $$(".category-card")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const category =
                            button.dataset.category;

                        if (!category) {
                            return;
                        }


                        state.movieCategory =
                            category;


                        state.movieLimit =
                            24;


                        $$("#movieFilters .filter")
                            .forEach(
                                filter => {

                                    filter.classList.toggle(
                                        "active",
                                        filter.dataset.category ===
                                        category
                                    );

                                }
                            );


                        location.hash =
                            "movies";


                        setTimeout(
                            () => {

                                renderMovies();

                            },
                            100
                        );

                    }
                );

            }
        );

}


/* =========================================================
   CARD EVENTS
========================================================= */

function setupCardEvents() {

    document.addEventListener(
        "click",
        event => {

            const card =
                event.target.closest(
                    ".content-card"
                );


            if (!card) {
                return;
            }


            const item =
                findItemById(
                    card.dataset.id
                );


            if (item) {
                openModal(
                    item
                );
            }

        }
    );


    document.addEventListener(
        "click",
        event => {

            const result =
                event.target.closest(
                    ".search-result"
                );


            if (!result) {
                return;
            }


            const item =
                findItemById(
                    result.dataset.id
                );


            if (item) {

                closeSearch();

                openModal(
                    item
                );

            }

        }
    );

}


/* =========================================================
   SEARCH EVENTS
========================================================= */

function openSearch() {

    if (!searchOverlay) {
        return;
    }

    searchOverlay.hidden =
        false;

    document.body.style.overflow =
        "hidden";

    setTimeout(
        () => {

            if (searchInput) {
                searchInput.focus();
            }

        },
        100
    );

}


function closeSearch() {

    if (!searchOverlay) {
        return;
    }

    searchOverlay.hidden =
        true;

    document.body.style.overflow =
        "";

}


function setupSearch() {

    const openButton =
        $("#openSearch");

    const heroButton =
        $("#heroSearch");

    const closeButton =
        $("#closeSearch");


    if (openButton) {

        openButton.addEventListener(
            "click",
            openSearch
        );

    }


    if (heroButton) {

        heroButton.addEventListener(
            "click",
            openSearch
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeSearch
        );

    }


    if (searchOverlay) {

        searchOverlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    searchOverlay
                ) {

                    closeSearch();

                }

            }
        );

    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                clearTimeout(
                    state.searchTimer
                );

                state.searchTimer =
                    setTimeout(
                        () =>
                            performSearch(
                                searchInput.value
                            ),
                        350
                    );

            }
        );

    }


    $$(".search-type")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$(".search-type")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );


                        state.searchType =
                            button.dataset.searchType ||
                            "all";


                        if (
                            searchInput &&
                            searchInput.value.trim()
                        ) {

                            performSearch(
                                searchInput.value
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   MODAL EVENTS
========================================================= */

function setupModal() {

    const closeButton =
        $("#closeModal");

    const closeAlt =
        $("#modalCloseAlt");


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (closeAlt) {

        closeAlt.addEventListener(
            "click",
            closeModal
        );

    }


    if (movieModal) {

        movieModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    movieModal
                ) {

                    closeModal();

                }

            }
        );

    }


    if (modalWatch) {

        modalWatch.addEventListener(
            "click",
            () => {

                const item =
                    state.currentItem;

                if (!item) {
                    return;
                }


                let url =
                    null;


                if (
                    item.trailer
                ) {

                    url =
                        item.trailer;

                } else if (
                    item.sourceUrl
                ) {

                    url =
                        item.sourceUrl;

                } else if (
                    item.imdbId
                ) {

                    url =
                        `https://www.imdb.com/title/${encodeURIComponent(
                            item.imdbId
                        )}/`;

                }


                if (url) {

                    window.open(
                        url,
                        "_blank",
                        "noopener,noreferrer"
                    );

                } else {

                    showToast(
                        "لا يوجد رابط متاح لهذا العمل"
                    );

                }

            }
        );

    }

}


/* =========================================================
   ESC KEY
========================================================= */

function setupKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            if (
                searchOverlay &&
                !searchOverlay.hidden
            ) {

                closeSearch();

            }


            if (
                movieModal &&
                !movieModal.hidden
            ) {

                closeModal();

            }

        }
    );

}


/* =========================================================
   INIT
========================================================= */

async function init() {

    setLoading(
        popularGrid,
        6
    );

    setLoading(
        movieGrid,
        8
    );

    setLoading(
        seriesGrid,
        6
    );

    setLoading(
        animeGrid,
        6
    );


    setupNavigation();

    setupMovieFilters();

    setupSeriesFilters();

    setupAnimeFilters();

    setupCategories();

    setupCardEvents();

    setupSearch();

    setupModal();

    setupKeyboard();


    await Promise.all([
        loadStatus(),
        loadAll()
    ]);


    console.log(
        "IRAQ EMPIRE CINEMA → READY"
    );

}


document.addEventListener(
    "DOMContentLoaded",
    init
);
