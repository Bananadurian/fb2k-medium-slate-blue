/**
 * @file cover_panel.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-05-04
 * @version 2.2.0
 * @description 封面显示面板: 圆角渲染、背景控制器（主题色/封面提色/封面背景图）、同步封面加载 + LRU 缓存。
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/theme.js");
include("lib/background.js");

// ==========================================
// 1. 面板配置
// ==========================================

const PANEL_CFG = {
  cornerRadius: _scale(20), // 封面圆角半径
  margin: _scale(40), // 封面周围的全局边距 (Padding)
  coverMode: "fit", // cover=裁剪填充, fit=完整显示

  background: {
    mode: "cover-image", // theme | cover-color | cover-image
    gradient: {
      enabled: true, // true: 渐变; false: 单色
      angle: 90, // 90=从上到下, 0=从左到右
    },
    image: {
      scaleMode: "cover", // cover=裁剪填充, fit=完整显示
      blurRadius:50, // 0=不模糊
      cacheSize: 3,
    },
    mask: {
      enabled: false,
      color: _rgb(255, 255, 255),
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

// 封面绘制的预计算布局 (on_size / 切歌时更新，on_paint 直接使用)
const coverRect = { x: 0, y: 0, w: 0, h: 0 };

// 封面缓存：LRU，上限 min(5, THEME.CFG.CACHE_SIZE)
// Key = "%album artist% - %album%"，Value = { imgRounded, bgColors, rawImg }
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

const background = createPanelBackgroundController({
  mode: PANEL_CFG.background.mode,
  gradient: PANEL_CFG.background.gradient,
  image: PANEL_CFG.background.image,
  mask: PANEL_CFG.background.mask,
  cacheSize: Math.min(5, THEME.CFG.CACHE_SIZE),
  keyTf: coverKeyTf,
});
background.setThemeColor(THEME.COL.BG);
background.resetToThemeColor();

// ==========================================
// 3. 业务逻辑 (Business Logic)
// ==========================================

// _createRoundedImage / _extractImageColors 来自 lib/utils.js

/** @returns {boolean} */
function isCoverImageMode() {
  return PANEL_CFG.background.mode === "cover-image";
}

/**
 * 预计算封面绘制矩形 (存入 coverRect): cover=填满可用区, fit=完整显示
 * @param {GdiBitmap|null} img - 封面图像, null 时清零
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
 * 从当前缓存重建 cover-image 背景位图（尺寸变化时使用）
 * @returns {void}
 */
function rebuildBackgroundForCurrentTrack() {
  if (!isCoverImageMode()) return;
  if (!currentTrackKey || !currentMetadb) {
    background.updateBackgroundImage(null, null, panelW, panelH);
    return;
  }

  const cached = coverCache.get(currentTrackKey);
  if (cached && cached.rawImg) {
    background.updateBackgroundImage(currentMetadb, cached.rawImg, panelW, panelH);
  } else {
    background.updateBackgroundImage(null, null, panelW, panelH);
  }
}

/**
 * 加载音轨封面数据并刷新面板
 * 缓存命中 → 复用 imgRounded，并按模式恢复背景
 * 缓存未命中 → GetAlbumArtV2 → 背景预处理 + _createRoundedImage → 写入缓存
 * @param {FbMetadbHandle|null} metadb
 */
function updatePanelData(metadb) {
  if (!metadb) {
    currentMetadb = null;
    currentTrackKey = "";
    currentImgRounded = null;
    recalculateLayout(null);
    background.updateBackgroundImage(null, null, panelW, panelH);
    background.resetToThemeColor();
    window.Repaint();
    return;
  }

  currentMetadb = metadb;

  const key = coverKeyTf.EvalWithMetadb(metadb) || metadb.Path;
  currentTrackKey = key;
  const cached = coverCache.get(key);

  if (cached !== undefined) {
    currentImgRounded = cached.imgRounded || null;

    if (isCoverImageMode()) {
      if (cached.rawImg) {
        background.updateBackgroundImage(metadb, cached.rawImg, panelW, panelH);
      } else {
        background.updateBackgroundImage(null, null, panelW, panelH);
      }
    } else if (cached.bgColors) {
      background.applyColors(cached.bgColors);
    } else {
      background.updateFromMetadb(metadb, cached.rawImg || null);
    }

    recalculateLayout(currentImgRounded);
    window.Repaint();
    return;
  }

  const rawImg = utils.GetAlbumArtV2(metadb, 0);

  if (rawImg) {
    if (isCoverImageMode()) {
      background.updateBackgroundImage(metadb, rawImg, panelW, panelH);
    } else {
      background.updateFromMetadb(metadb, rawImg);
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
      bgColors: background.getColors(),
      rawImg: isCoverImageMode() ? rawImg : null,
    });

    if (!isCoverImageMode() && typeof rawImg.Dispose === "function") {
      rawImg.Dispose();
    }
  } else {
    currentImgRounded = null;
    recalculateLayout(null);
    background.updateBackgroundImage(null, null, panelW, panelH);
    background.resetToThemeColor();
  }

  window.Repaint();
}

function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;
  panelW = window.Width;
  panelH = window.Height;
  recalculateLayout(currentImgRounded);
  rebuildBackgroundForCurrentTrack();
}

function on_paint(gr) {
  background.paint(gr, 0, 0, panelW, panelH);

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

function on_playback_new_track(metadb) {
  updatePanelData(metadb);
}

function on_playback_stop(reason) {
  if (reason !== 2) {
    updatePanelData(null);
  }
}

function on_playlist_items_selection_change() {
  let selection = fb.GetSelection();
  if (selection) {
    updatePanelData(selection);
  } else if (fb.IsPlaying) {
    updatePanelData(fb.GetNowPlaying());
  }
}

function on_colours_changed() {
  _refreshThemeColors();
  background.setThemeColor(THEME.COL.BG);
  background.resetToThemeColor();
  window.Repaint();
}

function on_font_changed() {
  _refreshThemeFonts();
  window.Repaint();
}

// ==========================================
// 5. 启动初始化 (Initialization)
// ==========================================

function on_script_unload() {
  coverCache.clear();
  background.clearCache();
  currentImgRounded = null;
  currentMetadb = null;
  currentTrackKey = "";
}

let currentTrack = fb.GetNowPlaying();
if (currentTrack) {
  updatePanelData(currentTrack);
}
