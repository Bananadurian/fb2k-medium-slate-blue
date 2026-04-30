/**
 * @file cover_panel.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-04-29
 * @version 2.0.0
 * @description 封面显示面板: 圆角渲染、颜色提取渐变背景、同步封面加载 + LRU 缓存。
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/theme.js");

// ==========================================
// 1. 面板配置
// ==========================================

const PANEL_CFG = {
  cornerRadius: _scale(20), // 封面圆角半径
  margin: _scale(40), // 封面周围的全局边距 (Padding)

  // --- 颜色与背景选项 ---
  useCoverColor: true, // true: 提取封面颜色, false: 强制使用 CUI 全局背景色
  useGradient: true, // (仅在 useCoverColor 为 true 时有效) true: 渐变色, false: 单色
  gradientAngle: 90, // 渐变角度 (90=从上到下, 0=从左到右)
};

// ==========================================
// 2. 全局状态 (GLOBAL STATE)
// ==========================================

let themeBgColor = THEME.COL.BG; // CUI 背景色兜底 (ColourType.background)

let imgRounded = null; // 圆角封面图像 (可能指向 coverCache 缓存)
let bgColor1 = themeBgColor; // 背景主色 (封面提取或 themeBgColor 兜底)
let bgColor2 = themeBgColor; // 背景次色 (渐变用，单色时同 bgColor1)
const font = THEME.FONT.TITLE;
let panelW = window.Width,
  panelH = window.Height;
// 封面绘制的预计算布局 (on_size / 切歌时更新，on_paint 直接使用)
const coverRect = { x: 0, y: 0, w: 0, h: 0 };

// 封面缓存：LRU，上限 min(5, THEME.CFG.CACHE_SIZE)
// Key = "%album artist% - %album%"，Value = { imgRounded, bgColor1, bgColor2 }
const coverKeyTf = fb.TitleFormat("%album artist% - %album%");
const coverCache = new LRUCache(Math.min(5, THEME.CFG.CACHE_SIZE));

// ==========================================
// 3. 业务逻辑 (BUSINESS LOGIC)
// ==========================================

// _rgb / _createRoundedImage / _extractImageColors 来自 lib/utils.js

/**
 * 预计算封面在面板中的 Aspect-Fit 绘制矩形 (存入 coverRect)
 * @param {GdiBitmap|null} img - 封面图像, null 时清零
 */
function recalculateLayout(img) {
  if (!img) {
    coverRect.x = coverRect.y = coverRect.w = coverRect.h = 0;
    return;
  }
  const maxW = Math.max(10, panelW - PANEL_CFG.margin);
  const maxH = Math.max(10, panelH - PANEL_CFG.margin);
  const scale = Math.min(maxW / img.Width, maxH / img.Height);
  coverRect.w = Math.floor(img.Width * scale);
  coverRect.h = Math.floor(img.Height * scale);
  coverRect.x = Math.round((panelW - coverRect.w) / 2);
  coverRect.y = Math.round((panelH - coverRect.h) / 2);
}

/**
 * 加载音轨封面数据并刷新面板
 * 缓存命中 → 直接复用 imgRounded + colors
 * 缓存未命中 → GetAlbumArtV2 → 颜色提取 → _createRoundedImage → 写入缓存
 * @param {FbMetadbHandle|null} metadb
 */
function updatePanelData(metadb) {
  if (!metadb) {
    imgRounded = null;
    bgColor1 = themeBgColor;
    bgColor2 = themeBgColor;
    window.Repaint();
    return;
  }

  const key = coverKeyTf.EvalWithMetadb(metadb) || metadb.Path;
  const cached = coverCache.get(key);

  if (cached !== undefined && imgRounded === cached.imgRounded) {
    return; // 同一缓存对象，无需更新
  }

  const rawImg = utils.GetAlbumArtV2(metadb, 0);
  imgRounded = null;

  if (rawImg) {
    if (PANEL_CFG.useCoverColor) {
      const colors = _extractImageColors(
        rawImg,
        PANEL_CFG.useGradient,
        themeBgColor,
      );
      bgColor1 = colors.c1;
      bgColor2 = colors.c2;
    } else {
      bgColor1 = themeBgColor;
      bgColor2 = themeBgColor;
    }

    recalculateLayout(rawImg);
    imgRounded = _createRoundedImage(
      rawImg,
      coverRect.w,
      coverRect.h,
      PANEL_CFG.cornerRadius,
    );
    coverCache.set(key, {
      imgRounded: imgRounded,
      bgColor1: bgColor1,
      bgColor2: bgColor2,
    });

    if (typeof rawImg.Dispose === "function") rawImg.Dispose();
  } else {
    bgColor1 = themeBgColor;
    bgColor2 = themeBgColor;
  }

  window.Repaint();
}

// ==========================================
// 4. 系统回调事件 (SYSTEM CALLBACKS)
// ==========================================

function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;
  panelW = window.Width;
  panelH = window.Height;
  recalculateLayout(imgRounded);
}

function on_paint(gr) {
  gr.FillGradRect(
    0,
    0,
    panelW,
    panelH,
    PANEL_CFG.gradientAngle,
    bgColor1,
    bgColor2,
    1.0,
  );

  if (imgRounded) {
    gr.DrawImage(
      imgRounded,
      coverRect.x,
      coverRect.y,
      coverRect.w,
      coverRect.h,
      0,
      0,
      imgRounded.Width,
      imgRounded.Height,
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
  themeBgColor = THEME.COL.BG;
  bgColor1 = themeBgColor;
  bgColor2 = themeBgColor;
  window.Repaint();
}

function on_font_changed() {
  _refreshThemeFonts();
  window.Repaint();
}

// ==========================================
// 5. 启动初始化 (INITIALIZATION)
// ==========================================

function on_script_unload() {
  if (imgRounded && typeof imgRounded.Dispose === "function")
    imgRounded.Dispose();
  for (let entry of coverCache._map.values()) {
    if (
      entry &&
      entry.imgRounded &&
      typeof entry.imgRounded.Dispose === "function"
    )
      entry.imgRounded.Dispose();
  }
  coverCache.clear();
}

let currentTrack = fb.GetNowPlaying();
if (currentTrack) {
  updatePanelData(currentTrack);
}
