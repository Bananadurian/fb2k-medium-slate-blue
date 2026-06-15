/**
 * @description IconManager — 统一图标资源管理：按类别延迟加载 + 缓存，注册表按需激活
 * @requires lib/utils.js (_loadImage)
 * @requires lib/theme.js (ICONS_* 路径常量)
 *
 * ## 生命周期
 * iconMgr 缓存由 JSplitter 管理生命周期，面板 `on_script_unload` 不手动调用
 * `clear()`/`clearAll()`。旧模式 `_disposeImageDict()` 释放私有字典；新模式避免
 * 跨面板引用失效。调试时可在 Console 执行 `iconMgr.clearAll()` 强制重置。
 */

"use strict";

// ============================================================================
// IconManager
// ============================================================================

class IconManager {
  constructor() {
    this._caches = {
      brands: new Map(),
      flags: new Map(),
      player: new Map(),
      ui: new Map(),
    };
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
    if (category === "brands") {
      if (!IconManager._BRANDS_LOADED) IconManager._loadBrandsRegistry();
      return IconManager.BRANDS;
    }
    if (category === "player") {
      if (!IconManager._PLAYER_LOADED) IconManager._loadPlayerRegistry();
      return IconManager.PLAYER;
    }
    if (category === "ui") {
      if (!IconManager._UI_LOADED) IconManager._loadUIRegistry();
      return IconManager.UI;
    }
    if (category === "flags") {
      if (!IconManager._FLAGS_LOADED) IconManager._loadFlagsRegistry();
      return IconManager.FLAGS;
    }
    return null;
  }

  /**
   * 获取类别目录路径
   */
  _getCategoryDir(category) {
    if (category === "brands") return ICONS_BRANDS;
    if (category === "player") return ICONS_PLAYER;
    if (category === "ui") return ICONS_UI;
    if (category === "flags") return ICONS_FLAGS;
    return "";
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
IconManager._UI_LOADED = false;
IconManager._FLAGS_LOADED = false;

// ============================================================================
// 注册表（值暂用 default.svg 占位，后续替换为实际图标文件名）
// ============================================================================

IconManager._loadBrandsRegistry = function () {
  IconManager.BRANDS = {
    default: "default.svg",

    // External URLs
    official_website: "official_website.svg",
    official: "official_website.svg", // biography.js v1
    soundcloud: "soundcloud.svg",
    bandcamp: "bandcamp.svg",
    instagram: "instagram.svg",
    x: "x.svg",
    tiktok: "tiktok.svg",
    youtube: "youtube.svg",
    discogs: "discogs.svg",
    allmusic: "allmuisc.svg",
    musicbrainz: "musicbrainz.svg",
    rate_your_music: "rate_your_music.svg",
    rateyourmusic: "rate_your_music.svg", // biography.js v1
    album_of_the_year: "album_of_the_year.svg",
    aoty: "album_of_the_year.svg", // biography.js v1
    pitchfork: "pitchfork.svg",
    metacritic: "metacritic.svg",
    fandom: "fandom.svg",
    wikipedia: "wikipedia.svg",
    last_fm: "last_fm.svg",
    wikidata: "wikidata.svg",
    spotify: "spotify.svg",
    apple_music: "apple_music.svg",
    amazon_music: "amazon_music.svg",
    deezer: "deezer.svg",
    genius: "genius.svg",
    qobuz: "qobuz.svg",
    tidal: "tidal.svg",
    youtube_music: "youtube_music.svg",
    mora: "mora.svg",

    // Source names (uppercase)
    "OFFICIAL DIGITAL": "shopping-bag.svg",
    CD: "disc-2.svg",
    SACD: "sacd.png",
    "SACD (CD LAYER)": "sacd.png",
    "JAPAN FIRST PRESS": "disc.svg",
    WEB: "cloud.svg",
    TIDAL: "tidal.svg",
    QOBUZ: "qobuz.svg",
    HDTRACKS: "HDtracks.svg",
    MORA: "mora.svg",
    "APPLE MUSIC": "apple_music.svg",
    "AMAZON MUSIC": "amazon_music.svg",
    DEEZER: "deezer.svg",
    GENIUS: "genius.svg",
    NETEASE: "NetEase.svg",
    "QQ MUSIC": "qq_music.svg",
    "7DIGITAL": "7digital.svg",
    BANDCAMP: "bandcamp.svg",
    SOUNDCLOUD: "soundcloud.svg",
  };
  IconManager._BRANDS_LOADED = true;
};

IconManager._loadPlayerRegistry = function () {
  IconManager.PLAYER = {
    default: "default.svg",

    // playback_buttons.js
    replay: "rotate-ccw.svg",
    replay_hover: "rotate-ccw_hover.svg",

    stop: "square.svg",
    stop_hover: "square_hover.svg",
    stop_after: "square_after.svg",

    rewind: "rewind.svg",
    rewind_hover: "rewind_hover.svg",

    previous: "step-back.svg",
    previous_hover: "step-back_hover.svg",
    play: "circle-play.svg",
    play_hover: "circle-play_hover.svg",

    pause: "circle-pause.svg",
    pause_hover: "circle-pause_hover.svg",

    next: "step-forward.svg",
    next_hover: "step-forward_hover.svg",

    forward: "fast-forward.svg",
    forward_hover: "fast-forward_hover.svg",

    order_default: "circle-question-mark.svg",
    order_default_hover: "circle-question-mark_hover.svg",
    order_repeat: "repeat.svg",
    order_repeat_hover: "repeat_hover.svg",
    order_track: "repeat-1.svg",
    order_track_hover: "repeat-1_hover.svg",
    order_shuffle: "shuffle.svg",
    order_shuffle_hover: "shuffle_hover.svg",

    random: "dices.svg",
    random_hover: "dices_hover.svg",
  };
  IconManager._PLAYER_LOADED = true;
};

IconManager._loadUIRegistry = function () {
  IconManager.UI = {
    default: "default.svg",

    // Metadata headers (biography_v2.js + album_info.js)
    aliases: "user-round.svg",
    genres: "circle-small.svg",
    country: "default.svg",
    born: "calendar.svg",
    links: "signpost.svg",
    artist: "users-round.svg",
    date: "calendar.svg",
    language: "languages.svg",
    edition: "copyright.svg",

    // control_buttons.js aliases
    recent: "history.svg",
    recent_hover: "history_hover.svg",
    favorite: "flame.svg",
    favorite_hover: "flame_hover.svg",
    queue: "list-start.svg",
    queue_hover: "list-start_hover.svg",
    search: "search.svg",
    search_hover: "search_hover.svg",
    rg_off: "replaygain_off.svg",
    rg_track: "replaygain_track_on.svg",
    rg_album: "replaygain_other_on.svg",
    rg_hover: "replaygain_hover.svg",
    wasapi: "wasapi.svg",
    wasapi_hover: "wasapi_hover.svg",
    wasapi_share: "wasapi_share.svg",
    asio: "speaker.svg",
    asio_hover: "speaker_hover.svg",
    vol: "volume-2.svg",
    vol_hover: "volume-2_hover.svg",
    mute: "volume-x.svg",
    mute_hover: "volume-x_hover.svg",
    menu: "ellipsis-vertical.svg",
    menu_hover: "ellipsis-vertical_hover.svg",

    // track_info.js
    star_off: "star_off.svg",
    star_on: "star_on.svg",

    // Other
    "disc-3": "disc-3.svg",
    "disc-3_activate": "disc-3_activate.svg",
    "disc-3_hover": "disc-3_hover.svg",
    "folder-search": "folder-search.svg",
    "folder-search_hover": "folder-search_hover.svg",
    library: "library.svg",
    "list-music": "list-music.svg",
    plus: "plus.svg",
    plus_hover: "plus_hover.svg",
  };
  IconManager._UI_LOADED = true;
};

IconManager._loadFlagsRegistry = function () {
  IconManager.FLAGS = {
    default: "un.svg",

    CN: "cn.svg",
    TW: "tw.svg",
    HK: "hk.svg",
    JP: "jp.svg",
    US: "us.svg",
    GB: "gb.svg",
    KR: "kr.svg",
    FR: "fr.svg",
    DE: "de.svg",
    IT: "it.svg",
    ES: "es.svg",
    RU: "ru.svg",
    CA: "ca.svg",
    AU: "au.svg",
    BR: "br.svg",
    SE: "se.svg",
    NO: "un.svg",
    DK: "un.svg",
    FI: "un.svg",
    NL: "nl.svg",
    IN: "un.svg",
    PL: "un.svg",
    UA: "un.svg",
    CH: "un.svg",
    AT: "un.svg",
    BE: "un.svg",
    IE: "ie.svg",
    MX: "un.svg",
    AR: "un.svg",
    TH: "th.svg",
    VN: "un.svg",
    ID: "un.svg",
    TR: "un.svg",
    GR: "un.svg",
    PT: "un.svg",
    CZ: "un.svg",
    HU: "un.svg",
    RO: "un.svg",
    SG: "un.svg",
    ZA: "un.svg",
    IL: "un.svg",
    NZ: "un.svg",
    PH: "un.svg",
    MY: "un.svg",
    CL: "cl.svg",
    EU: "eu.svg",

    // Aliases
    UK: "gb.svg",
    CHN: "cn.svg",
    USA: "us.svg",
    JPN: "jp.svg",
  };
  IconManager._FLAGS_LOADED = true;
};

// ============================================================================
// 单例
// ============================================================================

const iconMgr = new IconManager();
