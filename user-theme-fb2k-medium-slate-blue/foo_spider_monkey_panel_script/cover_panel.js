/**
 * @file cover_panel.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-05-06
 * @version 2.3.0
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
 * @typedef {Object} CoverPanelBackgroundConfig
 * @property {"theme"|"cover-color"|"cover-image"} mode - 背景模式
 * @property {CoverPanelBackgroundGradientConfig} gradient - 渐变配置（theme/cover-color 会参与；theme 下通常因 c1/c2 同色而视觉近似纯色）
 * @property {CoverPanelBackgroundImageConfig} image - 封面背景图配置（仅在 cover-image 模式生效）
 * @property {CoverPanelBackgroundMaskConfig} mask - 遮罩配置（所有 mode 都生效）
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
  cornerRadius: _scale(20),
  // 前景封面可用区域边距（像素）；推荐 >= 0。
  margin: _scale(40),
  // 前景封面绘制模式：
  // - "fit": 完整显示，可能留边
  // - "cover": 填满可用区域，可能裁切
  coverMode: "fit",

  background: {
    // 背景模式：
    // - "theme": 仅使用主题背景色
    // - "cover-color": 使用封面提色（无封面回退主题色）
    // - "cover-image": 使用封面图作为背景（无封面回退主题色）
    mode: "cover-color",
    gradient: {
      // 渐变仅在 theme / cover-color 参与底色绘制时生效；cover-image 下不参与底图绘制。
      enabled: true,
      // 渐变角度，推荐 [0, 360]。
      angle: 90,
      // 渐变跨度：2=第1色与第2色，5=第1色与第5色（不足则回退最后可用色）。
      span: 10,
    },
    image: {
      // 仅在 mode="cover-image" 生效：
      // - "cover": 铺满区域，可能裁切
      // - "fit": 完整显示，可能留边
      scaleMode: "cover",
      // 仅在 mode="cover-image" 生效，范围 [0, 200]，越大越模糊。
      blurRadius: 100,
      // 仅在 mode="cover-image" 生效，最小 1；越大占用越多内存但重建更少。
      cacheSize: 3,
    },
    mask: {
      // 遮罩在所有 mode 都生效。
      enabled: false,
      // 遮罩 RGB 颜色（alpha 由下方 alpha 控制）。
      color: _rgb(255, 255, 255),
      // 遮罩透明度，范围 [0, 255]；0=透明，255=不透明。
      alpha: 20,
    },
  },
};

// ==========================================
// 2. 全局状态 (Global State)
// ==========================================

const font = THEME.FONT.TITLE;
let panelW = window.Width,
  panelH = window.Height;
let currentImgRounded = null;
let currentMetadb = null;
let currentTrackKey = "";

const coverRect = { x: 0, y: 0, w: 0, h: 0 };

const coverKeyTf = fb.TitleFormat("%album artist% - %album%");
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

const backgroundAuto = createPanelBackgroundAutoController({
  background: {
    mode: PANEL_CFG.background.mode,
    gradient: PANEL_CFG.background.gradient,
    image: PANEL_CFG.background.image,
    mask: PANEL_CFG.background.mask,
    cacheSize: Math.min(5, THEME.CFG.CACHE_SIZE),
    keyTf: coverKeyTf,
  },
  getPreferredMetadb: function () {
    return currentMetadb;
  },
  getTargetSize: function () {
    return { w: panelW, h: panelH };
  },
  getAlbumArt: function (metadb) {
    if (!metadb) return null;
    const key = coverKeyTf.EvalWithMetadb(metadb) || metadb.Path;
    const cached = coverCache.get(key);
    if (cached) {
      if (cached.rawImg) return cached.rawImg;
      if (cached.artMissing) return null;
    }
    return utils.GetAlbumArtV2(metadb, 0);
  },
});
backgroundAuto.setThemeColor(THEME.COL.BG);
backgroundAuto.sync();

// ==========================================
// 3. 业务逻辑 (Business Logic)
// ==========================================

/** @returns {boolean} */
function isCoverImageMode() {
  return PANEL_CFG.background.mode === "cover-image";
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
    backgroundAuto.sync();
    window.Repaint();
    return;
  }

  const key = coverKeyTf.EvalWithMetadb(metadb) || metadb.Path;
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
        backgroundAuto.sync(metadb, cached.rawImg);
      } else {
        backgroundAuto.sync();
      }
    } else if (cached.bgColors) {
      backgroundAuto.getController().applyColors(cached.bgColors);
    } else {
      backgroundAuto.sync();
    }

    recalculateLayout(currentImgRounded);
    window.Repaint();
    return;
  }

  const rawImg = utils.GetAlbumArtV2(metadb, 0);

  if (rawImg) {
    if (!isCoverImageMode()) {
      backgroundAuto.getController().updateFromMetadb(metadb, rawImg);
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
      bgColors: backgroundAuto.getController().getColors(),
      rawImg: isCoverImageMode() ? rawImg : null,
      artMissing: false,
    });

    if (isCoverImageMode()) {
      backgroundAuto.sync(metadb, rawImg);
    }

    if (!isCoverImageMode() && typeof rawImg.Dispose === "function") {
      rawImg.Dispose();
    }
  } else {
    currentImgRounded = null;
    recalculateLayout(null);
    coverCache.set(key, {
      imgRounded: null,
      bgColors: backgroundAuto.getController().getColors(),
      rawImg: null,
      artMissing: true,
    });
    backgroundAuto.sync();
  }

  window.Repaint();
}

/** @returns {void} */
function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;
  panelW = window.Width;
  panelH = window.Height;
  recalculateLayout(currentImgRounded);
  backgroundAuto.onResize();
}

/** @param {GdiGraphics} gr @returns {void} */
function on_paint(gr) {
  backgroundAuto.paint(gr, 0, 0, panelW, panelH);

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
    if (font) {
      gr.GdiDrawText(
        text,
        font,
        THEME.COL.FG,
        0,
        0,
        panelW,
        panelH,
        DT_CENTER | DT_VCENTER | DT_SINGLELINE,
      );
    }
  }
}

/** @param {FbMetadbHandle} metadb @returns {void} */
function on_playback_new_track(metadb) {
  updatePanelData(metadb);
}

/**
 * @param {number} reason
 * @returns {void}
 */
function on_playback_stop(reason) {
  if (reason !== 2) {
    updatePanelData(null);
  }
}

/** @returns {void} */
function on_playlist_items_selection_change() {
  let selection = fb.GetSelection();
  if (selection) {
    updatePanelData(selection);
  } else if (fb.IsPlaying) {
    updatePanelData(fb.GetNowPlaying());
  }
}

/** @returns {void} */
function on_colours_changed() {
  _refreshThemeColors();
  backgroundAuto.setThemeColor(THEME.COL.BG);
  backgroundAuto.getController().resetToThemeColor();
  window.Repaint();
}

/** @returns {void} */
function on_font_changed() {
  _refreshThemeFonts();
  window.Repaint();
}

// ==========================================
// 5. 启动初始化 (Initialization)
// ==========================================

/** @returns {void} */
function on_script_unload() {
  coverCache.clear();
  backgroundAuto.clearCache();
  currentImgRounded = null;
  currentMetadb = null;
  currentTrackKey = "";
}

let currentTrack = fb.GetNowPlaying();
if (currentTrack) {
  updatePanelData(currentTrack);
}
