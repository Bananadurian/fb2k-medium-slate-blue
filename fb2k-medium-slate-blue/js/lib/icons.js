/**
 * @description IconManager — 统一图标资源管理：按类别延迟加载 + 缓存，注册表按需激活
 * @requires lib/utils.js (_loadImage)
 * @requires lib/theme.js (ICONS_* 路径常量)
 */

"use strict";

// ============================================================================
// IconManager
// ============================================================================

class IconManager {
    constructor() {
        this._caches = { brands: new Map(), flags: new Map(), player: new Map(), ui: new Map() };
    }

    /**
     * 获取图标，自动缓存 + fallback
     * @param {'brands'|'flags'|'player'|'ui'} category
     * @param {string} name - 注册表键名
     * @param {Object} [opts] - { maxWidth }
     * @returns {GdiBitmap|null}
     */
    get(category, name, opts) {
        opts = opts || {};
        const cache = this._caches[category];
        if (cache && cache.has(name)) return cache.get(name);

        const registry = this._getRegistry(category);
        if (!registry) return null;

        const filename = registry[name];
        if (!filename) {
            return name === "default" ? null : this.get(category, "default", opts);
        }

        const dir = this._getCategoryDir(category);
        const img = _loadImage(dir + filename, opts.maxWidth);
        if (img) {
            if (cache) cache.set(name, img);
            return img;
        }
        return name === "default" ? null : this.get(category, "default", opts);
    }

    /**
     * 获取注册表（懒加载）
     */
    _getRegistry(category) {
        if (category === 'brands')   { if (!IconManager._BRANDS_LOADED) IconManager._loadBrandsRegistry();   return IconManager.BRANDS; }
        if (category === 'player')   { if (!IconManager._PLAYER_LOADED) IconManager._loadPlayerRegistry();   return IconManager.PLAYER; }
        if (category === 'ui')       { if (!IconManager._UI_LOADED)     IconManager._loadUIRegistry();       return IconManager.UI; }
        if (category === 'flags')    { if (!IconManager._FLAGS_LOADED)  IconManager._loadFlagsRegistry();    return IconManager.FLAGS; }
        return null;
    }

    /**
     * 获取类别目录路径
     */
    _getCategoryDir(category) {
        if (category === 'brands') return ICONS_BRANDS;
        if (category === 'player') return ICONS_PLAYER;
        if (category === 'ui')     return ICONS_UI;
        if (category === 'flags')  return ICONS_FLAGS;
        return '';
    }

    /**
     * 使缓存中的某个图标失效
     */
    invalidate(category, name) {
        if (this._caches[category]) this._caches[category].delete(name);
    }

    /**
     * 清空某个类别缓存
     */
    clear(category) {
        const cache = this._caches[category];
        if (!cache) return;
        cache.forEach(function (img) {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
        cache.clear();
    }

    /**
     * 清空所有缓存
     */
    clearAll() {
        for (const key in this._caches) this.clear(key);
    }
}

// ============================================================================
// 懒加载控制
// ============================================================================

IconManager._BRANDS_LOADED = false;
IconManager._PLAYER_LOADED = false;
IconManager._UI_LOADED     = false;
IconManager._FLAGS_LOADED  = false;

// ============================================================================
// 注册表（值暂用 default.svg 占位，后续替换为实际图标文件名）
// ============================================================================

IconManager._loadBrandsRegistry = function () {
    IconManager.BRANDS = {
        "default": "default.svg",

        // Metadata headers (biography_v2.js + album_info.js)
        "Aliases":  "default.svg",
        "Genres":   "default.svg",
        "Country":  "default.svg",
        "Born":     "default.svg",
        "Links":    "default.svg",
        "Artist":   "default.svg",
        "Date":     "default.svg",
        "Language": "default.svg",
        "Edition":  "default.svg",

        // External URLs
        "official_website":   "default.svg",
        "official":           "default.svg",   // biography.js v1
        "soundcloud":         "default.svg",
        "bandcamp":           "default.svg",
        "instagram":          "default.svg",
        "x":                  "default.svg",
        "tiktok":             "default.svg",
        "youtube":            "default.svg",
        "discogs":            "default.svg",
        "allmusic":           "default.svg",
        "musicbrainz":        "default.svg",
        "rate_your_music":    "default.svg",
        "rateyourmusic":      "default.svg",   // biography.js v1
        "album_of_the_year":  "default.svg",
        "aoty":               "default.svg",   // biography.js v1
        "pitchfork":          "default.svg",
        "metacritic":         "default.svg",
        "fandom":             "default.svg",
        "wikipedia":          "default.svg",
        "last_fm":            "default.svg",
        "wikidata":           "default.svg",
        "spotify":            "default.svg",
        "apple_music":        "default.svg",
        "amazon_music":       "default.svg",
        "deezer":             "default.svg",
        "genius":             "default.svg",
        "qobuz":              "default.svg",
        "tidal":              "default.svg",
        "youtube_music":      "default.svg",
        "mora":               "default.svg",

        // Source names (uppercase)
        "OFFICIAL DIGITAL":    "default.svg",
        "CD":                  "default.svg",
        "SACD":                "default.svg",
        "SACD (CD LAYER)":     "default.svg",
        "JAPAN FIRST PRESS":   "default.svg",
        "WEB":                 "default.svg",
        "TIDAL":               "default.svg",
        "QOBUZ":               "default.svg",
        "HDTRACKS":            "default.svg",
        "MORA":                "default.svg",
        "APPLE MUSIC":         "default.svg",
        "AMAZON MUSIC":        "default.svg",
        "DEEZER":              "default.svg",
        "GENIUS":              "default.svg",
        "NETEASE":             "default.svg",
        "QQ MUSIC":            "default.svg",
        "7DIGITAL":            "default.svg",
        "BANDCAMP":            "default.svg",
        "SOUNDCLOUD":          "default.svg",
    };
    IconManager._BRANDS_LOADED = true;
};

IconManager._loadPlayerRegistry = function () {
    IconManager.PLAYER = {
        "default": "default.svg",

        "circle-pause":              "default.svg",
        "circle-pause_hover":        "default.svg",
        "circle-play":               "default.svg",
        "circle-play_hover":         "default.svg",
        "circle-question-mark":      "default.svg",
        "circle-question-mark_hover":"default.svg",
        "dices":                     "default.svg",
        "dices_hover":               "default.svg",
        "fast-forward":              "default.svg",
        "fast-forward_hover":        "default.svg",
        "repeat":                    "default.svg",
        "repeat_hover":              "default.svg",
        "repeat-1":                  "default.svg",
        "repeat-1_hover":            "default.svg",
        "rewind":                    "default.svg",
        "rewind_hover":              "default.svg",
        "rotate-ccw":                "default.svg",
        "rotate-ccw_hover":          "default.svg",
        "shuffle":                   "default.svg",
        "shuffle_hover":             "default.svg",
        "square":                    "default.svg",
        "square_hover":              "default.svg",
        "square_after":              "default.svg",
        "step-back":                 "default.svg",
        "step-back_hover":           "default.svg",
        "step-forward":              "default.svg",
        "step-forward_hover":        "default.svg",

        // playback_buttons.js aliases (old key → new filename mapping TBD)
        "stop":              "default.svg",
        "stop_hover":        "default.svg",
        "stop_after":        "default.svg",
        "pause":             "default.svg",
        "pause_hover":       "default.svg",
        "play":              "default.svg",
        "play_hover":        "default.svg",
        "previous":          "default.svg",
        "previous_hover":    "default.svg",
        "next":              "default.svg",
        "next_hover":        "default.svg",
        "order_default":     "default.svg",
        "order_default_hover":"default.svg",
        "order_repeat":      "default.svg",
        "order_repeat_hover":"default.svg",
        "order_track":       "default.svg",
        "order_track_hover": "default.svg",
        "order_shuffle":     "default.svg",
        "order_shuffle_hover":"default.svg",
        "replay":            "default.svg",
        "replay_hover":      "default.svg",
        "forward":           "default.svg",
        "forward_hover":     "default.svg",
    };
    IconManager._PLAYER_LOADED = true;
};

IconManager._loadUIRegistry = function () {
    IconManager.UI = {
        "default": "default.svg",

        "calendar":                  "default.svg",
        "circle-small":              "default.svg",
        "copyright":                 "default.svg",
        "disc-3":                    "default.svg",
        "disc-3_activate":           "default.svg",
        "disc-3_hover":              "default.svg",
        "ellipsis-vertical":         "default.svg",
        "menu":                      "default.svg",   // alias
        "menu_hover":               "default.svg",   // alias
        "ellipsis-vertical_hover":   "default.svg",
        "flame":                     "default.svg",
        "flame_hover":               "default.svg",
        "folder-search":             "default.svg",
        "folder-search_hover":       "default.svg",
        "history":                   "default.svg",
        "history_hover":             "default.svg",
        "languages":                 "default.svg",
        "library":                   "default.svg",
        "list-music":                "default.svg",
        "list-start":                "default.svg",
        "list-start_hover":          "default.svg",
        "plus":                      "default.svg",
        "plus_hover":                "default.svg",
        "replaygain_hover":          "default.svg",
        "replaygain_off":            "default.svg",
        "replaygain_other_on":       "default.svg",
        "replaygain_track_on":       "default.svg",
        "search":                    "default.svg",
        "search_hover":              "default.svg",
        "signpost":                  "default.svg",
        "speaker":                   "default.svg",
        "speaker_hover":             "default.svg",
        "star_off":                  "default.svg",
        "star_on":                   "default.svg",
        "user-round":                "default.svg",
        "users-round":               "default.svg",
        "volume-2":                  "default.svg",
        "volume-2_hover":            "default.svg",
        "volume-x":                  "default.svg",
        "volume-x_hover":            "default.svg",
        "wasapi":                    "default.svg",
        "wasapi_hover":              "default.svg",
        "wasapi_share":              "default.svg",

        // control_buttons.js aliases
        "recent":                    "default.svg",
        "recent_hover":              "default.svg",
        "favorite":                  "default.svg",
        "favorite_hover":            "default.svg",
        "rg_off":                    "default.svg",
        "rg_track":                  "default.svg",
        "rg_album":                  "default.svg",
        "rg_hover":                  "default.svg",
        "vol":                       "default.svg",
        "vol_hover":                 "default.svg",
        "mute":                      "default.svg",
        "mute_hover":                "default.svg",
        "queue":                     "default.svg",
        "queue_hover":               "default.svg",
    };
    IconManager._UI_LOADED = true;
};

IconManager._loadFlagsRegistry = function () {
    IconManager.FLAGS = {
        "default": "default.svg",

        "CN": "default.svg",  "TW": "default.svg",  "HK": "default.svg",
        "JP": "default.svg",  "US": "default.svg",  "GB": "default.svg",
        "KR": "default.svg",  "FR": "default.svg",  "DE": "default.svg",
        "IT": "default.svg",  "ES": "default.svg",  "RU": "default.svg",
        "CA": "default.svg",  "AU": "default.svg",  "BR": "default.svg",
        "SE": "default.svg",  "NO": "default.svg",  "DK": "default.svg",
        "FI": "default.svg",  "NL": "default.svg",  "IN": "default.svg",
        "PL": "default.svg",  "UA": "default.svg",  "CH": "default.svg",
        "AT": "default.svg",  "BE": "default.svg",  "IE": "default.svg",
        "MX": "default.svg",  "AR": "default.svg",  "TH": "default.svg",
        "VN": "default.svg",  "ID": "default.svg",  "TR": "default.svg",
        "GR": "default.svg",  "PT": "default.svg",  "CZ": "default.svg",
        "HU": "default.svg",  "RO": "default.svg",  "SG": "default.svg",
        "ZA": "default.svg",  "IL": "default.svg",  "NZ": "default.svg",
        "PH": "default.svg",  "MY": "default.svg",

        // Aliases
        "UK":  "default.svg",
        "CHN": "default.svg",
        "USA": "default.svg",
        "JPN": "default.svg",
    };
    IconManager._FLAGS_LOADED = true;
};

// ============================================================================
// 单例
// ============================================================================

const iconMgr = new IconManager();
