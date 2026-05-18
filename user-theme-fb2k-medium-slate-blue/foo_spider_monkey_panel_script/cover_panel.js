/**
 * @file cover_panel.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-05-18
 * @version 2.1.0
 * @description 封面显示面板: 圆角渲染、背景控制器（主题色/封面提色/封面背景图）、同步封面加载 + LRU 缓存。
 */

"use strict";

window.DrawMode = 1;

include("lib/utils.js");
include("lib/data.js");
include("lib/theme.js");
include("lib/background.js");

// ==========================================
// 1. 面板配置
// ==========================================

/**
 * @typedef {Object} CoverPanelBackgroundGradientConfig
 * @property {boolean} enabled - 是否启用渐变背景
 * @property {number} angle - 渐变角度，推荐取值区间 [0, 360]
 * @property {number} [span=2] - 渐变跨度（仅在 cover-color 且 enabled=true 时生效，最小值 2）
 */

/**
 * @typedef {Object} CoverPanelBackgroundImageConfig
 * @property {"cover"|"fit"} scaleMode - 背景图铺放方式
 * @property {number} blurRadius - 模糊半径，取值区间 [0, 200]
 * @property {number} cacheSize - 背景图缓存条目数，最小值 1
 */

/**
 * @typedef {Object} CoverPanelBackgroundMaskConfig
 * @property {boolean} enabled - 是否叠加遮罩层
 * @property {number} color - 遮罩 RGB 颜色（忽略 alpha 通道）
 * @property {number} alpha - 遮罩透明度，取值区间 [0, 255]
 */

/**
 * @typedef {Object} CoverPanelBackgroundShapeConfig
 * @property {"rect"|"round-rect"} type - 背景形状类型
 * @property {number} radius - 圆角半径（像素，<=0 等同矩形）
 */

/**
 * @typedef {Object} CoverPanelBackgroundConfig
 * @property {"theme"|"cover-color"|"cover-image"} mode - 背景模式
 * @property {CoverPanelBackgroundGradientConfig} gradient - 渐变配置（theme/cover-color 会参与；theme 下通常因 c1/c2 同色而视觉近似纯色）
 * @property {CoverPanelBackgroundImageConfig} image - 封面背景图配置（仅在 cover-image 模式生效）
 * @property {CoverPanelBackgroundMaskConfig} mask - 遮罩配置（所有 mode 都生效）
 * @property {CoverPanelBackgroundShapeConfig} shape - 背景形状配置
 */

/**
 * @typedef {Object} CoverPanelConfig
 * @property {number} cornerRadius - 圆角半径，推荐 >= 0
 * @property {number} margin - 外边距，推荐 >= 0
 * @property {"cover"|"fit"} coverMode - 前景封面绘制模式
 * @property {CoverPanelBackgroundConfig} background - 背景配置
 */

/** @type {CoverPanelConfig} */
const PANEL_CFG = {
  // 前景封面圆角半径（像素）；推荐 >= 0。
  cornerRadius: THEME.LAYOUT.CORNER_RADIUS,
  // 前景封面可用区域边距（像素）；推荐 >= 0。
  margin: _scale(6),
  // 前景封面绘制模式：
  // - "fit": 完整显示，可能留边
  // - "cover": 填满可用区域，可能裁切
  coverMode: "fit",

  background: {
    // 背景模式: "theme" | "cover-color" | "cover-image" | "custom"
    // - "theme": 仅使用主题背景色
    // - "cover-color": 使用封面提色（无封面回退主题色）
    // - "cover-image": 使用封面图作为背景（无封面回退主题色）
    // - "custom": 使用 custom.color1/color2 填充（无需封面/meta，支持 _argb 半透明）
    mode: "theme",

    // 封面获取优先级：按顺序尝试，首个成功即返回。
    // 0=front 1=back 2=disc 3=icon 4=artist
    albumArtFetchPriority: [4, 0],

    // ===== 渐变（theme / cover-color / custom 生效，cover-image 不参与底图绘制）=====
    gradientEnabled: true,                  // 是否启用渐变
    gradientAngle: 90,                      // 渐变角度 [0, 360]
    gradientSpan: 10,                       // 渐变跨度 (>=2)；2=第1/2色，N=第1/N色

    // ===== 形状（全模式生效）=====
    shapeType: "round-rect",                // "rect" | "round-rect"
    shapeRadius: THEME.LAYOUT.CORNER_RADIUS, // 圆角半径 (px)，<=0 等同矩形

    // ===== 背景图（仅 cover-image 生效）=====
    imageScaleMode: "cover",                // "cover"=铺满区域，可能裁切 | "fit"=完整显示，可能留边
    imageBlurRadius: 100,                   // 模糊半径 [0, 200]
    imageCacheSize: 3,                      // 图片缓存条目数 (>=1)

    // ===== 遮罩（全模式生效，可与 fill alpha 叠加）=====
    maskEnabled: false,
    maskColor: _rgb(0, 0, 0),              // 遮罩 RGB 颜色
    maskAlpha: 255,                         // 遮罩透明度 [0, 255]；0=透明

    // ===== custom 模式专用（仅在 mode="custom" 生效）=====
    // custom: {
    //     color1: _argb(255, 30, 35, 45),  // ARGB 填充色1（必填）
    //     color2: _argb(255, 40, 45, 55),  // ARGB 填充色2（可选，不设=单色无渐变）
    // },
  },
};

// ==========================================
// 2. 全局状态 (Global State)
// ==========================================

let panelW = window.Width,
  panelH = window.Height;
let currentImgRounded = null;
let currentMetadb = null;
let currentTrackKey = "";

const coverRect = { x: 0, y: 0, w: 0, h: 0 };

const coverCache = new LRUCache(Math.min(5, THEME.CFG.CACHE_SIZE), (entry) => {
  if (entry && entry.imgRounded && typeof entry.imgRounded.Dispose === "function") {
    entry.imgRounded.Dispose();
  }
  if (
    entry &&
    entry.rawImg &&
    entry.rawImg !== entry.imgRounded &&
    typeof entry.rawImg.Dispose === "function"
  ) {
    entry.rawImg.Dispose();
  }
});

// 透明同步通知 freshness 窗口与兜底延迟 — 通道定义见 lib/data.js NOTIFY.TRANSPARENT_SYNC
let transparentTrackRepaintTimer = null;
let lastTransparentNotifyEpoch = 0;
let lastTransparentNotifyTs = 0;

const bgLayer = createPanelBackgroundLayer({
  background: {
    mode: PANEL_CFG.background.mode,
    gradient: {
      enabled: PANEL_CFG.background.gradientEnabled,
      angle: PANEL_CFG.background.gradientAngle,
      span: PANEL_CFG.background.gradientSpan,
    },
    image: {
      scaleMode: PANEL_CFG.background.imageScaleMode,
      blurRadius: PANEL_CFG.background.imageBlurRadius,
      cacheSize: PANEL_CFG.background.imageCacheSize,
    },
    shape: {
      type: PANEL_CFG.background.shapeType,
      radius: PANEL_CFG.background.shapeRadius,
    },
    mask: {
      enabled: PANEL_CFG.background.maskEnabled,
      color: PANEL_CFG.background.maskColor,
      alpha: PANEL_CFG.background.maskAlpha,
    },
    custom: PANEL_CFG.background.custom,
    cacheSize: Math.min(5, THEME.CFG.CACHE_SIZE),
    keyTf: THEME.TF.COVER_KEY,
  },
  getPreferredMetadb: function () {
    return currentMetadb;
  },
  getTargetRect: function () {
    return { x: 0, y: 0, w: panelW, h: panelH };
  },
  getAlbumArt: function (metadb) {
    if (!metadb) return null;
    const key = THEME.TF.COVER_KEY.EvalWithMetadb(metadb) || metadb.Path;
    const cached = coverCache.get(key);
    if (cached) {
      if (cached.rawImg) return cached.rawImg;
      if (cached.artMissing) return null;
    }
    return fetchAlbumArt(metadb);
  },
});
bgLayer.setThemeColor(THEME.COL.BG);
bgLayer.sync();

// ==========================================
// 3. 业务逻辑 (Business Logic)
// ==========================================

/** @returns {boolean} */
function isCoverImageMode() {
  return PANEL_CFG.background.mode === "cover-image";
}

/**
 * 按优先级获取封面，首个成功即返回。
 * @param {FbMetadbHandle} metadb
 * @returns {GdiBitmap|null}
 */
function fetchAlbumArt(metadb) {
  const priority = PANEL_CFG.background.albumArtFetchPriority;
  for (let i = 0; i < priority.length; i++) {
    const img = utils.GetAlbumArtV2(metadb, priority[i]);
    if (img) return img;
  }
  return null;
}

/**
 * @param {GdiBitmap|null} img
 */
function recalculateLayout(img) {
  if (!img) {
    coverRect.x = coverRect.y = coverRect.w = coverRect.h = 0;
    return;
  }
  const maxW = Math.max(10, panelW - PANEL_CFG.margin);
  const maxH = Math.max(10, panelH - PANEL_CFG.margin);

  if (PANEL_CFG.coverMode === "cover") {
    coverRect.w = maxW;
    coverRect.h = maxH;
    coverRect.x = Math.round((panelW - coverRect.w) / 2);
    coverRect.y = Math.round((panelH - coverRect.h) / 2);
    return;
  }

  const scale = Math.min(maxW / img.Width, maxH / img.Height);
  coverRect.w = Math.floor(img.Width * scale);
  coverRect.h = Math.floor(img.Height * scale);
  coverRect.x = Math.round((panelW - coverRect.w) / 2);
  coverRect.y = Math.round((panelH - coverRect.h) / 2);
}

/**
 * @param {FbMetadbHandle|null} metadb
 */
function updatePanelData(metadb) {
  if (!metadb) {
    currentMetadb = null;
    currentTrackKey = "";
    currentImgRounded = null;
    recalculateLayout(null);
    bgLayer.sync();
    window.Repaint();
    return;
  }

  const key = THEME.TF.COVER_KEY.EvalWithMetadb(metadb) || metadb.Path;
  // 同轨且已有圆角图时直接返回，避免重复同步与重绘。
  if (key === currentTrackKey && currentMetadb && currentImgRounded) {
    return;
  }

  const sameTrack = key === currentTrackKey && currentMetadb;
  const sameTrackCached = coverCache.get(key);
  // 同轨且已知无封面时直接返回，避免重复触发无效同步与重绘。
  if (sameTrack && sameTrackCached && sameTrackCached.artMissing) {
    return;
  }

  currentMetadb = metadb;
  currentTrackKey = key;
  const cached = coverCache.get(key);

  if (cached !== undefined) {
    currentImgRounded = cached.imgRounded || null;

    if (isCoverImageMode()) {
      if (cached.rawImg) {
        bgLayer.sync(metadb, cached.rawImg);
      } else {
        bgLayer.sync();
      }
    } else if (cached.bgColors) {
      bgLayer.getController().applyColors(cached.bgColors);
    } else {
      bgLayer.sync();
    }

    recalculateLayout(currentImgRounded);
    window.Repaint();
    return;
  }

  const rawImg = fetchAlbumArt(metadb);

  if (rawImg) {
    if (!isCoverImageMode()) {
      bgLayer.getController().updateFromMetadb(metadb, rawImg);
    }

    recalculateLayout(rawImg);
    currentImgRounded = _createRoundedImage(
      rawImg,
      coverRect.w,
      coverRect.h,
      PANEL_CFG.cornerRadius,
      PANEL_CFG.coverMode,
    );

    coverCache.set(key, {
      imgRounded: currentImgRounded || null,
      bgColors: bgLayer.getController().getColors(),
      rawImg: isCoverImageMode() ? rawImg : null,
      artMissing: false,
    });

    if (isCoverImageMode()) {
      bgLayer.sync(metadb, rawImg);
    }

    if (!isCoverImageMode() && typeof rawImg.Dispose === "function") {
      rawImg.Dispose();
    }
  } else {
    currentImgRounded = null;
    recalculateLayout(null);
    coverCache.set(key, {
      imgRounded: null,
      bgColors: bgLayer.getController().getColors(),
      rawImg: null,
      artMissing: true,
    });
    bgLayer.sync();
  }

  window.Repaint();
}

function clearTransparentTrackRepaintTimers() {
  if (transparentTrackRepaintTimer) {
    window.ClearTimeout(transparentTrackRepaintTimer);
    transparentTrackRepaintTimer = null;
  }
}

function scheduleTransparentTrackRepaintFallback() {
  if (!window.IsTransparent || !window.IsVisible) return;

  clearTransparentTrackRepaintTimers();
  transparentTrackRepaintTimer = window.SetTimeout(function () {
    transparentTrackRepaintTimer = null;
    if (!window.IsVisible) return;
    if (Date.now() - lastTransparentNotifyTs <= THEME.LAYOUT.TRANSPARENT_SYNC_NOTIFY_FRESH_MS) return;
    window.Repaint();
  }, THEME.LAYOUT.TRANSPARENT_REPAINT_FALLBACK_DELAY_MS);
}
function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;
  panelW = window.Width;
  panelH = window.Height;
  recalculateLayout(currentImgRounded);
  bgLayer.onResize();
}

function on_paint(gr) {
  if (!window.IsTransparent) {
    bgLayer.paint(gr);
  }
  if (currentImgRounded) {
    gr.DrawImage(
      currentImgRounded,
      coverRect.x,
      coverRect.y,
      coverRect.w,
      coverRect.h,
      0,
      0,
      currentImgRounded.Width,
      currentImgRounded.Height,
    );
  } else {
    const text = fb.IsPlaying ? "No Cover Found" : "Stopped";
    const es = THEME.TEXT.empty;
    if (es.font) {
      gr.GdiDrawText(
        text,
        es.font,
        es.color,
        0,
        0,
        panelW,
        panelH,
        es.flags,
      );
    }
  }
}

/** @param {FbMetadbHandle} metadb @returns {void} */
function on_playback_new_track(metadb) {
  updatePanelData(metadb);
  scheduleTransparentTrackRepaintFallback();
}

/**
 * @param {number} reason
 * @returns {void}
 */
function on_playback_stop(reason) {
  if (reason !== 2) {
    const target = resolveMetadbByMode(METADB_RESOLVE_MODE.SELECTION_FIRST);
    if (target) {
      updatePanelData(target);
    }    
  }
}

/** @returns {void} */
function on_playlist_items_selection_change() {
  if (fb.IsPlaying) return;
  const target = resolveMetadbByMode(METADB_RESOLVE_MODE.SELECTION_FIRST);
  if (target) {
    updatePanelData(target);
  }
}

/** @returns {void} */
function on_colours_changed() {
  _refreshThemeColors();
  bgLayer.setThemeColor(THEME.COL.BG);
  bgLayer.setMaskColor(THEME.COL.MASK);
  bgLayer.getController().resetToThemeColor();
  window.Repaint();
}

/** @returns {void} */
function on_font_changed() {
  _refreshThemeFonts();
  window.Repaint();
}

/**
 * 透明同步通知：bg_panel_container_control 重绘后触发本面板跟随重绘。
 * 通道与发送方标识见 lib/data.js NOTIFY。
 * @param {string} name
 * @param {*} info
 * @returns {void}
 */
function on_notify_data(name, info) {
  if (!window.IsTransparent) return;
  if (name !== NOTIFY.TRANSPARENT_SYNC.name) return;
  if (!info || typeof info !== "object") return;

  const version = typeof info.v === "number" ? info.v : 0;
  if (version !== NOTIFY.TRANSPARENT_SYNC.version) return;

  const source = typeof info.source === "string" ? info.source : "";
  if (source !== NOTIFY.SOURCE.BG_PANEL_CONTAINER_CONTROL) return;

  const notifyEpoch = typeof info.epoch === "number" ? info.epoch : 0;
  if (notifyEpoch <= lastTransparentNotifyEpoch) return;

  lastTransparentNotifyEpoch = notifyEpoch;
  lastTransparentNotifyTs = Date.now();
  clearTransparentTrackRepaintTimers();
  if (window.IsVisible) window.Repaint();
}

// ==========================================
// 5. 启动初始化 (Initialization)
// ==========================================

/** @returns {void} */
function on_script_unload() {
  clearTransparentTrackRepaintTimers();
  coverCache.clear();
  bgLayer.clearCache();
  currentImgRounded = null;
  currentMetadb = null;
  currentTrackKey = "";
}

const currentTrack = resolveMetadbByMode(METADB_RESOLVE_MODE.PLAYING_ONLY);
if (currentTrack) {
  updatePanelData(currentTrack);
}
