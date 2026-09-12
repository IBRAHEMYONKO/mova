"use strict";

// Directory only: these are official/legal services. Availability is title-,
// region-, language-, device-, and date-dependent. A directory entry is NEVER
// treated as proof that a specific title is available there.
const OFFICIAL_PROVIDERS = [
    // General video
    { id: "youtube", name: "YouTube", kind: "video", url: "https://www.youtube.com/", regions: "global" },
    { id: "plex", name: "Plex", kind: "video", url: "https://watch.plex.tv/", regions: "supported" },
    { id: "pluto-tv", name: "Pluto TV", kind: "video", url: "https://pluto.tv/", regions: "supported" },
    { id: "tubi", name: "Tubi", kind: "video", url: "https://tubitv.com/", regions: ["US", "CA", "AU", "MX", "UK"] },
    { id: "roku-channel", name: "The Roku Channel", kind: "video", url: "https://www.roku.com/whats-on/the-roku-channel", regions: "supported" },
    { id: "freevee", name: "Amazon Freevee", kind: "video", url: "https://www.amazon.com/gp/video/storefront/", regions: "supported" },
    { id: "rakuten-tv", name: "Rakuten TV", kind: "video", url: "https://www.rakuten.tv/", regions: "supported" },
    { id: "rakuten-viki", name: "Rakuten Viki", kind: "video", url: "https://www.viki.com/", regions: "supported" },
    { id: "xumo-play", name: "Xumo Play", kind: "video", url: "https://www.xumo.com/", regions: "supported" },
    { id: "filmrise", name: "FilmRise", kind: "video", url: "https://filmrise.com/", regions: "supported" },
    { id: "fawesome", name: "Fawesome", kind: "video", url: "https://fawesome.tv/", regions: "supported" },
    { id: "crackle", name: "Crackle", kind: "video", url: "https://www.crackle.com/", regions: "supported" },
    { id: "vudu", name: "Fandango at Home", kind: "video", url: "https://athome.fandango.com/", regions: "US" },
    { id: "kanopy", name: "Kanopy", kind: "video", url: "https://www.kanopy.com/", regions: "library" },
    { id: "hoopla", name: "Hoopla", kind: "video", url: "https://www.hoopladigital.com/", regions: "library" },
    { id: "internet-archive", name: "Internet Archive", kind: "video", url: "https://archive.org/details/movies", regions: "global" },

    // Major subscription / premium services
    { id: "netflix", name: "Netflix", kind: "video", url: "https://www.netflix.com/", regions: "supported" },
    { id: "disney-plus", name: "Disney+", kind: "video", url: "https://www.disneyplus.com/", regions: "supported" },
    { id: "prime-video", name: "Prime Video", kind: "video", url: "https://www.primevideo.com/", regions: "supported" },
    { id: "apple-tv-plus", name: "Apple TV+", kind: "video", url: "https://tv.apple.com/", regions: "supported" },
    { id: "max", name: "Max", kind: "video", url: "https://www.max.com/", regions: "supported" },
    { id: "hulu", name: "Hulu", kind: "video", url: "https://www.hulu.com/", regions: "US" },
    { id: "paramount-plus", name: "Paramount+", kind: "video", url: "https://www.paramountplus.com/", regions: "supported" },
    { id: "peacock", name: "Peacock", kind: "video", url: "https://www.peacocktv.com/", regions: "US" },
    { id: "mubi", name: "MUBI", kind: "video", url: "https://mubi.com/", regions: "supported" },
    { id: "shudder", name: "Shudder", kind: "video", url: "https://www.shudder.com/", regions: "supported" },
    { id: "mgm-plus", name: "MGM+", kind: "video", url: "https://www.mgmplus.com/", regions: "supported" },
    { id: "starz", name: "STARZ", kind: "video", url: "https://www.starz.com/", regions: "supported" },
    { id: "britbox", name: "BritBox", kind: "video", url: "https://www.britbox.com/", regions: "supported" },
    { id: "acorn-tv", name: "Acorn TV", kind: "video", url: "https://acorn.tv/", regions: "supported" },
    { id: "allblk", name: "ALLBLK", kind: "video", url: "https://www.allblk.tv/", regions: "supported" },
    { id: "frndly-tv", name: "Frndly TV", kind: "video", url: "https://try.frndlytv.com/", regions: "US" },
    { id: "curiosity-stream", name: "Curiosity Stream", kind: "video", url: "https://curiositystream.com/", regions: "supported" },
    { id: "dropout", name: "Dropout", kind: "video", url: "https://www.dropout.tv/", regions: "supported" },

    // Anime / Asian streaming
    { id: "crunchyroll", name: "Crunchyroll", kind: "video", url: "https://www.crunchyroll.com/", regions: "supported" },
    { id: "crunchyroll-channel", name: "Crunchyroll Channel", kind: "video", url: "https://www.crunchyroll.com/", regions: "selected" },
    { id: "hidive", name: "HIDIVE", kind: "video", url: "https://www.hidive.com/", regions: "supported" },
    { id: "iqiyi", name: "iQIYI", kind: "video", url: "https://www.iq.com/", regions: "supported" },
    { id: "viki", name: "Viki", kind: "video", url: "https://www.viki.com/", regions: "supported" },
    { id: "viu", name: "Viu", kind: "video", url: "https://www.viu.com/", regions: "supported" },
    { id: "wetv", name: "WeTV", kind: "video", url: "https://wetv.vip/", regions: "supported" },
    { id: "kocowa", name: "KOCOWA+", kind: "video", url: "https://www.kocowa.com/", regions: "supported" },
    { id: "tving", name: "TVING", kind: "video", url: "https://www.tving.com/", regions: "KR" },
    { id: "showmax", name: "Showmax", kind: "video", url: "https://www.showmax.com/", regions: "supported" },

    // Official reading services
    { id: "viz", name: "VIZ", kind: "reader", url: "https://www.viz.com/", regions: "supported" },
    { id: "mangaplus", name: "MANGA Plus", kind: "reader", url: "https://mangaplus.shueisha.co.jp/", regions: "supported" },
    { id: "webtoon", name: "WEBTOON", kind: "reader", url: "https://www.webtoons.com/", regions: "supported" },
    { id: "tapas", name: "Tapas", kind: "reader", url: "https://tapas.io/", regions: "supported" },
    { id: "tappytoon", name: "Tappytoon", kind: "reader", url: "https://www.tappytoon.com/", regions: "supported" },
    { id: "lezhin", name: "Lezhin Comics", kind: "reader", url: "https://www.lezhinus.com/", regions: "supported" },
    { id: "manta", name: "Manta", kind: "reader", url: "https://manta.net/", regions: "supported" },
    { id: "webcomics", name: "WebComics", kind: "reader", url: "https://www.webcomicsapp.com/", regions: "supported" }
];

function getOfficialProviders() {
    return OFFICIAL_PROVIDERS.map(provider => ({ ...provider }));
}

function findOfficialProvider(id) {
    const wanted = String(id || "").trim().toLowerCase();
    return OFFICIAL_PROVIDERS.find(provider => provider.id === wanted) || null;
}

module.exports = { OFFICIAL_PROVIDERS, getOfficialProviders, findOfficialProvider };
