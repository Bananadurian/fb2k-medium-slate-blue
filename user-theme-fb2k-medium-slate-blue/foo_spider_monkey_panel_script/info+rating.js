/**
 * @file info+rating.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-04-29
 * @version 2.0.0
 * @description 歌曲信息+评分面板: 标题/艺人/专辑/年份、星级评分、音质标识、来源图标。
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");

window.DefineScript("Info And Rating", {
  author: "XYSRe",
  version: "2.0.0",
  options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. 全局常量与配置 (Constants & Config)
// ============================================================================

// 常用文本对齐组合 (依赖 lib/data.js 中的 DT_ 基础标志)
// 1. 通用文本: 双居中 + 禁用前缀 + 省略号 + 单行
const TEXT_FLAGS =
  DT_CENTER | DT_VCENTER | DT_NOPREFIX | DT_END_ELLIPSIS | DT_SINGLELINE;
// 2. 专辑信息: 左对齐 + 垂直居中 + 禁用前缀 + 省略号
const ALBUM_FLAGS = DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_END_ELLIPSIS;

const COL = THEME.COL;


// --- 路径与图片资源 (Paths & Images) ---
const STAR_ICONS = {
  StarOff: _loadImage(IMGS_LUCIDE_DIR + "star1.png"),
  StarOn: _loadImage(IMGS_LUCIDE_DIR + "star.png"),
};

// 来源图标缓存 (使用共享库 SourceIconCache)
const sourceIconCache = new SourceIconCache(IMGS_LINKS_DIR);

// --- 布局参数 (Layout Constants) ---
// 注: 此面板使用紧凑布局，MARGIN/LINE_H 有意不同于 THEME.LAYOUT 的默认值
const LINE_H = _scale(14);
const MARGIN = _scale(1);
const ALBUM_YEAR_GAP = _scale(2);
const STAR_SIZE = _scale(16);
// THEME.CFG.SOURCE_ICON_SIZE / AQ_BADGE 来自 THEME.CFG

// ============================================================================
// 2. 状态变量与 TitleFormat (State & TF)
// ============================================================================

// 检查依赖组件
const HAS_PLAYCOUNT = utils.CheckComponent("foo_playcount", true);

// 全局句柄
let metadb = null; // 当前操作的句柄
let activeElement = null; // 当前鼠标激活的UI元素

// 评分数据
let currentRating = 0; // 当前歌曲真实评分
let hoverRating = 0; // 鼠标悬停时的临时评分 (0表示无悬停)

// 布局区域缓存 (减少每一帧计算)
const ratingArea = { x: 0, y: 0, w: 0, h: 0 };
let currentSourceIcon = {
  x: 0,
  y: 0,
  w: THEME.CFG.SOURCE_ICON_SIZE,
  h: THEME.CFG.SOURCE_ICON_SIZE,
  img: null,
  isHover: false,
  tooltip: "",
};

// 音质标识状态
let currentAQBadge = null;
let badgeElement = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  isHover: false,
  tooltip: "",
};

// TitleFormat 定义
const ratingTf = fb.TitleFormat("$if2(%rating%,0)");
const trackTitleTf = fb.TitleFormat("%title%");
const trackArtistTf = fb.TitleFormat("%artist%");
const trackYearTf = fb.TitleFormat("$year(%date%)");
const trackAlbumTf = fb.TitleFormat("%album%");
const albumSourceTf = fb.TitleFormat("$if2($meta(SOURCE),WEB)");

const trackBpmTf = fb.TitleFormat("$if2($meta(BPM) BPM,Unknown BPM)");
const trackGenreTf = fb.TitleFormat("%GENRE%");

// AQ 音质参数提取 TF
const codecTf = fb.TitleFormat("%codec%");
const sampleRateTf = fb.TitleFormat("%samplerate%");
const bitDepthTf = fb.TitleFormat("%__bitspersample%");

// ============================================================================
// 3. 辅助组件 (Tooltip)
// ============================================================================

let tooltip = _initTooltip(THEME.FONT.BODY, _scale(13), 1200);


/**
 * @class StarElement
 * @property {number} value - 星级值 (1-5)
 * @property {number} x,y,w,h - 布局坐标与尺寸
 * @property {boolean} isHover - 鼠标悬停状态，在 on_mouse_move 中切换
 */
class StarElement {
  constructor(value) {
    this.value = value; // 1, 2, 3, 4, 5
    this.x = 0;
    this.y = 0;
    this.w = STAR_SIZE;
    this.h = STAR_SIZE;
    this.isHover = false;
  }

  // 绘制逻辑
  paint(gr) {
    // 逻辑：如果处于悬停模式(hoverRating > 0)，则显示悬停分；否则显示真实分
    const targetRating = hoverRating > 0 ? hoverRating : currentRating;
    const isStarOn = this.value <= targetRating;

    const icon = isStarOn ? STAR_ICONS.StarOn : STAR_ICONS.StarOff;
    if (icon) {
      gr.DrawImage(
        icon,
        this.x,
        this.y,
        this.w,
        this.h,
        0,
        0,
        icon.Width,
        icon.Height,
      );
    }
  }

  // 激活：鼠标移入
  activate() {
    this.isHover = true;
    hoverRating = this.value; // 设置全局悬停分
    // 重绘整个评分条区域，因为第3颗星变亮，第1、2颗也要跟着变
    window.RepaintRect(ratingArea.x, ratingArea.y, ratingArea.w, ratingArea.h);
  }

  // 休眠：鼠标移出
  deactivate() {
    this.isHover = false;
    // 注意：这里不直接重置 hoverRating = 0
    // 因为鼠标可能马上移入隔壁星星，由 on_mouse_move 的逻辑控制是否重置
    // 但如果没有任何星星被激活，hoverRating 应该由外部重置
    window.RepaintRect(ratingArea.x, ratingArea.y, ratingArea.w, ratingArea.h);
  }
}

// 初始化 5 个星星对象
const stars = [];
for (let i = 1; i <= 5; i++) {
  stars.push(new StarElement(i));
}

// ============================================================================
// 4. 核心逻辑 (Logic)
// ============================================================================

// 文本内容状态对象
const contentState = {
  title: {
    text: "",
    w: 0,
    x: 0,
    y: 0,
    h: LINE_H,
    isHover: false,
    tooltip: "",
  },
  artist: {
    text: "",
    w: 0,
    x: 0,
    y: 0,
    h: LINE_H,
    isHover: false,
    tooltip: "",
  },
  album: {
    text: "",
    w: 0,
    x: 0,
    y: 0,
    h: LINE_H,
    isHover: false,
    tooltip: "",
  },
  year: { text: "", w: 0, x: 0, y: 0, h: LINE_H, isHover: false, tooltip: "" },
};


/**
 * 核心数据更新函数：读取元数据并更新UI状态
 */
function updateContent() {
  metadb = fb.IsPlaying ? fb.GetNowPlaying() : fb.GetFocusItem();

  if (metadb) {
    contentState.title.text =
      trackTitleTf.EvalWithMetadb(metadb) || "Unknown Title";
    const trackBpm = trackBpmTf.EvalWithMetadb(metadb) || "0 BPM";
    const trackGenre =
      trackGenreTf.EvalWithMetadb(metadb) || "Unknown Genre";
    contentState.title.tooltip = trackGenre + "\n" + trackBpm;

    contentState.artist.text =
      trackArtistTf.EvalWithMetadb(metadb) || "Unknown Artist";
    contentState.album.text =
      trackAlbumTf.EvalWithMetadb(metadb) || "Unknown Album";
    const y = trackYearTf.EvalWithMetadb(metadb);
    contentState.year.text = y && y !== "?" ? `©${y}` : "";

    // 更新评分
    currentRating = parseInt(ratingTf.EvalWithMetadb(metadb), 10) || 0;
  } else {
    contentState.title.text = "No Track";
    contentState.artist.text = "";
    contentState.album.text = "";
    contentState.year.text = "";
    currentRating = 0;
  }

  // 重置悬停状态
  hoverRating = 0;

  // 音质标识独立处理，不缓存进 albumData, 有些专辑是混合音质
  const newAQBadge = resolveBadgeForTrack(metadb);
  if (currentAQBadge !== newAQBadge) {
    currentAQBadge = newAQBadge;
  }

  if (metadb) {
    updateSourceIcon(metadb);
  }

  if (window.Width > 0) {
    on_size();
    window.Repaint();
  }
}

/**
 * 判断音质分级 (委托给共享库 _resolveBadge)
 * @param {FbMetadbHandle} metadb
 * @returns {AQBadgeStyle|null}
 */
function resolveBadgeForTrack(metadb) {
  if (!metadb) return null;
  return _resolveBadge(
    codecTf.EvalWithMetadb(metadb),
    sampleRateTf.EvalWithMetadb(metadb),
    bitDepthTf.EvalWithMetadb(metadb)
  );
}

/**
 * 更新来源图标 (使用共享库 SourceIconCache)
 */
function updateSourceIcon(metadb) {
  const sourceText = albumSourceTf
    .EvalWithMetadb(metadb)
    .trim()
    .toUpperCase();
  const filename = _resolveSourceIconFilename(sourceText);

  let img = sourceIconCache.get(filename);
  if (!img && filename !== DEFAULT_SOURCE_ICON_FILENAME) {
    img = sourceIconCache.get(DEFAULT_SOURCE_ICON_FILENAME);
  }
  currentSourceIcon.img = img;
  currentSourceIcon.tooltip = sourceText;
}

// ============================================================================
// 5. 主回调函数 (Main Callbacks)
// ============================================================================

// 初始加载
updateContent();

/**
 * 布局计算回调
 * 负责计算所有文本、图标、星星的具体坐标 (x, y, w, h)
 */
function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;

  const maxTextW = window.Width - MARGIN * 8;

  // 1. 测量各元素的尺寸
  const titleMeasureFull = _measureString(
    contentState.title.text,
    THEME.FONT.BOLD,
    maxTextW,
    TEXT_FLAGS,
  );
  contentState.title.w = titleMeasureFull.Width + _scale(1);
  contentState.title.h = Math.min(titleMeasureFull.Height, LINE_H);
  contentState.artist.w =
    _measureString(contentState.artist.text, THEME.FONT.LABEL, maxTextW, TEXT_FLAGS)
      .Width + _scale(1);
  // _scale(1) GDI、GDI+计算偏差 一个像素容差
  contentState.album.w =
    _measureString(contentState.album.text, THEME.FONT.LABEL, maxTextW, TEXT_FLAGS)
      .Width + _scale(1);
  contentState.year.w = contentState.year.text
    ? _measureString(contentState.year.text, THEME.FONT.LABEL, maxTextW, ALBUM_FLAGS)
        .Width
    : 0;

  // 2. 垂直布局计算 (自上而下)
  const totalContentH =
    contentState.title.h + LINE_H * 2 + MARGIN * 4 + STAR_SIZE + THEME.CFG.SOURCE_ICON_SIZE;
  let startY = Math.round((window.Height - totalContentH) / 2);

  // --- Title ---
  contentState.title.y = startY;
  contentState.title.w = Math.min(contentState.title.w, maxTextW);
  contentState.title.x = Math.round((window.Width - contentState.title.w) / 2);
  startY += LINE_H + MARGIN;

  // --- Artist ---
  contentState.artist.y = startY;
  contentState.artist.w = Math.min(contentState.artist.w, maxTextW);
  contentState.artist.x = Math.round((window.Width - contentState.artist.w) / 2);
  startY += LINE_H + MARGIN;

  // --- Album & Year ---
  let albumYearTotalW =
    contentState.album.w +
    (contentState.year.text ? ALBUM_YEAR_GAP + contentState.year.w : 0);
  if (albumYearTotalW > maxTextW) {
    albumYearTotalW = maxTextW;
    contentState.album.w = Math.max(0,
      maxTextW - (contentState.year.text ? ALBUM_YEAR_GAP + contentState.year.w : 0));
  }
  let albumX = Math.round((window.Width - albumYearTotalW) / 2);

  contentState.album.x = albumX;
  contentState.album.y = startY;

  if (contentState.year.text) {
    contentState.year.x = albumX + contentState.album.w + ALBUM_YEAR_GAP;
    contentState.year.y = startY;
  }
  startY += LINE_H + MARGIN;

  // --- Rating Area Layout (星星) ---
  const starsW = STAR_SIZE * 5;
  ratingArea.w = starsW;
  ratingArea.h = STAR_SIZE;
  ratingArea.x = Math.round((window.Width - starsW) / 2);
  ratingArea.y = startY;

  // 分配每颗星星的坐标
  for (let i = 0; i < 5; i++) {
    stars[i].x = ratingArea.x + i * STAR_SIZE;
    stars[i].y = ratingArea.y;
    // stars[i].w/h 已经在构造函数里设置了
  }
  startY += LINE_H + MARGIN * 6;

  // --- 音源图标 和 音质徽章 ---
  let sourceIconAqBadgeTotalW = 0;
  if (currentSourceIcon.img) {
    sourceIconAqBadgeTotalW += currentSourceIcon.w;
  }
  if (currentAQBadge) {
    const badgeTextSize = _measureString(
      currentAQBadge.label,
      THEME.FONT.LABEL,
      maxTextW,
      BADGE_TEXT_ALIGN,
    );
    badgeElement.w = badgeTextSize.Width + THEME.CFG.AQ_BADGE.PADDING_X;
    badgeElement.h = badgeTextSize.Height + THEME.CFG.AQ_BADGE.PADDING_Y;
    sourceIconAqBadgeTotalW += badgeElement.w;
  }
  currentSourceIcon.x = Math.ceil((window.Width - sourceIconAqBadgeTotalW) / 2);
  currentSourceIcon.y = startY + Math.ceil((LINE_H - currentSourceIcon.h) / 2);
  badgeElement.x = currentSourceIcon.x + currentSourceIcon.w + MARGIN * 2;
  badgeElement.y =
    startY + Math.ceil((LINE_H - badgeElement.h) / 2);
}

/**
 * 绘制回调
 */
function on_paint(gr) {
  gr.FillSolidRect(0, 0, window.Width, window.Height, COL.BG);
  gr.SetTextRenderingHint(5); // ClearType

  // --- 绘制文本 ---
  gr.GdiDrawText(
    contentState.title.text,
    THEME.FONT.BOLD,
    contentState.title.isHover ? COL.FRAME : COL.SEL_FG,
    contentState.title.x,
    contentState.title.y,
    contentState.title.w,
    contentState.title.h,
    TEXT_FLAGS,
  );

  gr.GdiDrawText(
    contentState.artist.text,
    THEME.FONT.LABEL,
    contentState.artist.isHover ? COL.FRAME : COL.FG,
    contentState.artist.x,
    contentState.artist.y,
    contentState.artist.w,
    contentState.artist.h,
    TEXT_FLAGS,
  );

  gr.GdiDrawText(
    contentState.album.text,
    THEME.FONT.LABEL,
    contentState.album.isHover ? COL.FRAME : COL.FG,
    contentState.album.x,
    contentState.album.y,
    contentState.album.w,
    contentState.album.h,
    ALBUM_FLAGS,
  );

  if (contentState.year.text) {
    gr.GdiDrawText(
      contentState.year.text,
      THEME.FONT.LABEL,
      COL.FG,
      contentState.year.x,
      contentState.year.y,
      contentState.year.w,
      contentState.year.h,
      ALBUM_FLAGS,
    );
  }

  // --- 绘制星星 ---
  if (HAS_PLAYCOUNT && metadb) {
    gr.FillSolidRect(
      ratingArea.x,
      ratingArea.y,
      ratingArea.w,
      ratingArea.h,
      COL.BG,
    );
    for (let i = 0; i < 5; i++) {
      stars[i].paint(gr);
    }
  }

  // --- 绘制来源图标 ---
  if (currentSourceIcon.img) {
    gr.SetInterpolationMode(7); // HighQualityBicubic
    gr.DrawImage(
      currentSourceIcon.img,
      currentSourceIcon.x,
      currentSourceIcon.y,
      currentSourceIcon.w,
      currentSourceIcon.h,
      0,
      0,
      currentSourceIcon.img.Width,
      currentSourceIcon.img.Height,
    );
  }

  // --- 绘制AQ音质徽章 ---
  if (currentAQBadge) {
    gr.SetSmoothingMode(4); // AntiAlias

    // 背景 & 边框
    gr.FillRoundRect(
      badgeElement.x,
      badgeElement.y,
      badgeElement.w,
      badgeElement.h,
      THEME.CFG.AQ_BADGE.RADIUS,
      THEME.CFG.AQ_BADGE.RADIUS,
      currentAQBadge.bgColor,
    );

    gr.SetSmoothingMode(0); // Default for text
    // 文字
    gr.GdiDrawText(
      currentAQBadge.label,
      THEME.FONT.LABEL,
      currentAQBadge.color,
      badgeElement.x,
      badgeElement.y,
      badgeElement.w,
      badgeElement.h,
      BADGE_TEXT_ALIGN,
    );
  }
}

/**
 * 元素碰撞检测辅助函数
 */

/**
 * [核心] 状态机：处理鼠标移动事件
 * 负责检测悬停元素、切换光标、触发 Tooltip、重绘高亮区域
 */
function on_mouse_move(x, y) {
  let target = null;

  // 1. 检测 5 颗星星 (作为 5 个独立按钮处理)
  // 这里的关键是，星星是紧密排列的，状态机能完美处理从 星1 移到 星2 的逻辑
  if (HAS_PLAYCOUNT && metadb) {
    for (let i = 0; i < 5; i++) {
      if (_hitTest(x, y, stars[i])) {
        target = stars[i];
        break;
      }
    }
  }

  // 2. 检测文本与图标
  if (!target) {
    if (_hitTest(x, y, contentState.title)) {
      target = contentState.title;
    } else if (_hitTest(x, y, contentState.artist)) {
      target = contentState.artist;
    } else if (_hitTest(x, y, contentState.album)) {
      target = contentState.album;
    } else if (_hitTest(x, y, currentSourceIcon)) {
      target = currentSourceIcon;
    } else if (_hitTest(x, y, badgeElement) && currentAQBadge) {
      badgeElement.tooltip = currentAQBadge.desc;
      target = badgeElement;
    }
  }

  // 3. 状态切换逻辑
  if (activeElement === target) return;

  // A. 旧元素复位 (Deactivate)
  if (activeElement) {
    if (activeElement instanceof StarElement) {
      activeElement.deactivate();
      // 如果移出了整个评分条区域，重置悬停分
      if (!target || !(target instanceof StarElement)) {
        hoverRating = 0;
        window.RepaintRect(
          ratingArea.x,
          ratingArea.y,
          ratingArea.w,
          ratingArea.h,
        );
      }
    } else {
      activeElement.isHover = false;
      window.RepaintRect(
        activeElement.x,
        activeElement.y,
        activeElement.w,
        activeElement.h,
      );
    }
  }

  // B. 新元素激活 (Activate)
  if (target) {
    if (target instanceof StarElement) {
      target.activate(); // 这会更新 hoverRating
    } else {
      target.isHover = true;
      window.RepaintRect(target.x, target.y, target.w, target.h);
    }

    tooltip(target.tooltip || "");
    _setCursor(CURSOR_HAND); // Hand cursor
  } else {
    tooltip("");
    _setCursor(CURSOR_ARROW); // Arrow cursor
  }

  activeElement = target;
}

function on_mouse_leave() {
  if (activeElement) {
    if (activeElement instanceof StarElement) {
      activeElement.deactivate();
      hoverRating = 0;
      window.RepaintRect(
        ratingArea.x,
        ratingArea.y,
        ratingArea.w,
        ratingArea.h,
      );
    } else {
      activeElement.isHover = false;
      if (activeElement === contentState.artist) {
        // 艺人行可能比较宽，重绘整行更安全
        window.RepaintRect(
          0,
          activeElement.y,
          window.Width,
          activeElement.h,
        );
      } else {
        window.RepaintRect(
          activeElement.x,
          activeElement.y,
          activeElement.w,
          activeElement.h,
        );
      }
    }
    activeElement = null;
  }
  tooltip("");
  _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_up(x, y) {
  if (!activeElement) return;
  const target = activeElement;

  // 1. 星星点击：设置评分
  if (target instanceof StarElement) {
    if (!metadb) return;
    // 逻辑：如果点击的分数等于当前分数，则取消评分 (<not set>)
    const newRating =
      target.value === currentRating ? "<not set>" : target.value;
    fb.RunContextCommandWithMetadb(
      "Playback Statistics/Rating/" + newRating,
      metadb,
      8,
    );
    return;
  }

  // 2. 文本点击：弹出面板
  if (target === contentState.artist) {
    fb.RunMainMenuCommand("View/Popup panels/Show/SMP-艺人资料");
  } else if (target === contentState.album) {
    fb.RunMainMenuCommand("View/Popup panels/Show/SMP-专辑介绍");
  }
}

function on_mouse_lbtn_dblclk(x, y) {
  // 只有点空白处才触发定位正在播放
  if (!activeElement) {
    fb.RunMainMenuCommand("View/Show now playing in playlist");
  }
}

// 播放与列表事件回调
function on_playback_new_track() {
  updateContent();
}
function on_playback_stop(reason) {
  if (reason !== 2) updateContent();
}
function on_item_focus_change() {
  if (!fb.IsPlaying) updateContent();
}
function on_playlist_switch() {
  if (!fb.IsPlaying) updateContent();
}
function on_metadb_changed() {
  updateContent();
}

function on_colours_changed() {
  _refreshThemeColors();
  window.Repaint();
}

function on_font_changed() {
  _refreshThemeFonts();
  window.Repaint();
}

/**
 * 脚本卸载回调
 * 必须在此处释放所有 GDI 资源，防止内存泄漏
 */
function on_script_unload() {
  _measureDispose();
  _disposeImageDict(STAR_ICONS);
  sourceIconCache.clear();
}
