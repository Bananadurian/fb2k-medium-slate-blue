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

    // 键名规范化：统一转小写 + 空格转下划线
    const normalizedName = name.toLowerCase().replace(/\s+/g, "_");

    const cache = this._caches[category];
    if (cache && cache.has(normalizedName)) return cache.get(normalizedName);

    const registry = this._getRegistry(category);
    if (!registry) return null;

    const filename = registry[normalizedName];
    if (!filename) {
      return normalizedName === "default"
        ? null
        : this.get(category, "default", opts);
    }

    const dir = this._getCategoryDir(category);
    const img = _loadImage(dir + filename, opts.maxWidth);
    if (img) {
      if (cache) cache.set(normalizedName, img);
      return img;
    }
    return normalizedName === "default"
      ? null
      : this.get(category, "default", opts);
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
    default: "default.png",

    // External URLs (小写 + 下划线，规范化后唯一键名)
    official_website: "official_website.png",
    soundcloud: "soundcloud.png",
    bandcamp: "bandcamp.png",
    instagram: "instagram.png",
    x: "x.png",
    tiktok: "tiktok.png",
    youtube: "youtube.png",
    discogs: "discogs.png",
    allmusic: "allmuisc.png",
    musicbrainz: "musicbrainz.png",
    rate_your_music: "rate_your_music.png",
    album_of_the_year: "album_of_the_year.png",
    pitchfork: "pitchfork.png",
    metacritic: "metacritic.png",
    fandom: "fandom.png",
    wikipedia: "wikipedia.png",
    last_fm: "last_fm.png",
    wikidata: "wikidata.png",
    spotify: "spotify.png",
    apple_music: "apple_music.png",
    amazon_music: "amazon_music.png",
    deezer: "deezer.png",
    genius: "genius.png",
    qobuz: "qobuz.png",
    tidal: "tidal.png",
    youtube_music: "youtube_music.png",
    mora: "mora.png",

    // Source names (物理介质 + 平台来源，已统一小写 + 下划线)
    official_digital: "shopping-bag.png",
    cd: "disc-2.png",
    sacd: "sacd.png",
    sacd_cd_layer: "sacd.png",
    japan_first_press: "disc.png",
    web: "cloud.png",
    hdtracks: "HDtracks.png",
    netease: "NetEase.png",
    qq_music: "qq_music.png",
    "7digital": "7digital.png",
  };
  IconManager._BRANDS_LOADED = true;
};

IconManager._loadPlayerRegistry = function () {
  IconManager.PLAYER = {
    default: "default.png",

    // playback_buttons.js
    replay: "rotate-ccw.png",
    replay_hover: "rotate-ccw_hover.png",

    stop: "square.png",
    stop_hover: "square_hover.png",
    stop_after: "square_after.png",

    rewind: "rewind.png",
    rewind_hover: "rewind_hover.png",

    previous: "step-back.png",
    previous_hover: "step-back_hover.png",
    play: "circle-play.png",
    play_hover: "circle-play_hover.png",

    pause: "circle-pause.png",
    pause_hover: "circle-pause_hover.png",

    next: "step-forward.png",
    next_hover: "step-forward_hover.png",

    forward: "fast-forward.png",
    forward_hover: "fast-forward_hover.png",

    order_default: "circle-question-mark.png",
    order_default_hover: "circle-question-mark_hover.png",
    order_repeat: "repeat.png",
    order_repeat_hover: "repeat_hover.png",
    order_track: "repeat-1.png",
    order_track_hover: "repeat-1_hover.png",
    order_shuffle: "shuffle.png",
    order_shuffle_hover: "shuffle_hover.png",

    random: "dices.png",
    random_hover: "dices_hover.png",
  };
  IconManager._PLAYER_LOADED = true;
};

IconManager._loadUIRegistry = function () {
  IconManager.UI = {
    default: "default.png",

    // Metadata headers (biography_v2.js + album_info.js)
    aliases: "user-round.png",
    genres: "circle-small.png",
    country: "default.png",
    born: "calendar.png",
    links: "signpost.png",
    artist: "users-round.png",
    date: "calendar.png",
    language: "languages.png",
    edition: "copyright.png",

    // control_buttons.js aliases
    recent: "history.png",
    recent_hover: "history_hover.png",
    favorite: "flame.png",
    favorite_hover: "flame_hover.png",
    queue: "list-start.png",
    queue_hover: "list-start_hover.png",
    search: "search.png",
    search_hover: "search_hover.png",
    rg_off: "replaygain_off.png",
    rg_track: "replaygain_track_on.png",
    rg_album: "replaygain_other_on.png",
    rg_hover: "replaygain_hover.png",
    wasapi: "wasapi.png",
    wasapi_hover: "wasapi_hover.png",
    wasapi_share: "wasapi_share.png",
    asio: "speaker.png",
    asio_hover: "speaker_hover.png",
    vol: "volume-2.png",
    vol_hover: "volume-2_hover.png",
    mute: "volume-x.png",
    mute_hover: "volume-x_hover.png",
    menu: "ellipsis-vertical.png",
    menu_hover: "ellipsis-vertical_hover.png",

    // track_info.js
    star_off: "star_off.png",
    star_on: "star_on.png",

    // Other
    "disc-3": "disc-3.png",
    "disc-3_activate": "disc-3_activate.png",
    "disc-3_hover": "disc-3_hover.png",
    "folder-search": "folder-search.png",
    "folder-search_hover": "folder-search_hover.png",
    library: "library.png",
    "list-music": "list-music.png",
    plus: "plus.png",
    plus_hover: "plus_hover.png",
  };
  IconManager._UI_LOADED = true;
};

IconManager._loadFlagsRegistry = function () {
  IconManager.FLAGS = {
    default: "un.png",

    // ISO 3166-1 alpha-2 国家代码（小写，文件名对应）
    cn: "cn.png",
    tw: "tw.png",
    hk: "hk.png",
    jp: "jp.png",
    us: "us.png",
    gb: "gb.png",
    kr: "kr.png",
    fr: "fr.png",
    de: "de.png",
    it: "it.png",
    es: "es.png",
    ru: "ru.png",
    ca: "ca.png",
    au: "au.png",
    br: "br.png",
    se: "se.png",
    no: "un.png",
    dk: "un.png",
    fi: "un.png",
    nl: "nl.png",
    in: "un.png",
    pl: "un.png",
    ua: "un.png",
    ch: "un.png",
    at: "un.png",
    be: "un.png",
    ie: "ie.png",
    mx: "un.png",
    ar: "un.png",
    th: "th.png",
    vn: "un.png",
    id: "un.png",
    tr: "un.png",
    gr: "un.png",
    pt: "un.png",
    cz: "un.png",
    hu: "un.png",
    ro: "un.png",
    sg: "un.png",
    za: "un.png",
    il: "un.png",
    nz: "un.png",
    ph: "un.png",
    my: "un.png",
    cl: "cl.png",
    eu: "eu.png",

    // Aliases (小写别名)
    uk: "gb.png",
    chn: "cn.png",
    usa: "us.png",
    jpn: "jp.png",
  };
  IconManager._FLAGS_LOADED = true;
};

// ============================================================================
// 单例
// ============================================================================

const iconMgr = new IconManager();
