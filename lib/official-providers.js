"use strict";

// Directory only: these are official/legal services. Availability is title- and
// region-dependent, so they are never treated as a confirmed source by themselves.
const OFFICIAL_PROVIDERS = [
    { id: "youtube", name: "YouTube", kind: "video", url: "https://www.youtube.com/", regions: "global" },
    { id: "tubi", name: "Tubi", kind: "video", url: "https://tubitv.com/", regions: ["US", "CA", "AU", "MX", "UK"] },
    { id: "pluto-tv", name: "Pluto TV", kind: "video", url: "https://pluto.tv/", regions: "supported" },
    { id: "plex", name: "Plex", kind: "video", url: "https://watch.plex.tv/", regions: "supported" },
    { id: "roku-channel", name: "The Roku Channel", kind: "video", url: "https://www.roku.com/whats-on/the-roku-channel", regions: "supported" },
    { id: "freevee", name: "Amazon Freevee", kind: "video", url: "https://www.amazon.com/gp/video/storefront/", regions: "supported" },
    { id: "crunchyroll", name: "Crunchyroll", kind: "video", url: "https://www.crunchyroll.com/", regions: "supported" },
    { id: "crunchyroll-channel", name: "Crunchyroll Channel", kind: "video", url: "https://www.crunchyroll.com/", regions: "selected" },
    { id: "rakuten-tv", name: "Rakuten TV", kind: "video", url: "https://www.rakuten.tv/", regions: "supported" },
    { id: "rakuten-viki", name: "Rakuten Viki", kind: "video", url: "https://www.viki.com/", regions: "supported" },
    { id: "kanopy", name: "Kanopy", kind: "video", url: "https://www.kanopy.com/", regions: "library" },
    { id: "hoopla", name: "Hoopla", kind: "video", url: "https://www.hoopladigital.com/", regions: "library" },
    { id: "filmrise", name: "FilmRise", kind: "video", url: "https://filmrise.com/", regions: "supported" },
    { id: "fawesome", name: "Fawesome", kind: "video", url: "https://fawesome.tv/", regions: "supported" },
    { id: "xumo-play", name: "Xumo Play", kind: "video", url: "https://www.xumo.com/", regions: "supported" },
    { id: "internet-archive", name: "Internet Archive", kind: "video", url: "https://archive.org/details/movies", regions: "global" },
    { id: "viz", name: "VIZ", kind: "reader", url: "https://www.viz.com/", regions: "supported" },
    { id: "mangaplus", name: "MANGA Plus", kind: "reader", url: "https://mangaplus.shueisha.co.jp/", regions: "supported" }
];

function getOfficialProviders() {
    return OFFICIAL_PROVIDERS.map(provider => ({ ...provider }));
}

function findOfficialProvider(id) {
    const wanted = String(id || "").trim().toLowerCase();
    return OFFICIAL_PROVIDERS.find(provider => provider.id === wanted) || null;
}

module.exports = { OFFICIAL_PROVIDERS, getOfficialProviders, findOfficialProvider };
