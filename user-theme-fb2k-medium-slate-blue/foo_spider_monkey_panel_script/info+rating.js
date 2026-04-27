/**
 * @file info+rating.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-04-27
 * @version 1.5.0
 * @description 重构版：引入共享库 lib/utils.js, lib/data.js, lib/interaction.js。
 * 消除重复代码，统一工具函数、音质标识系统和来源图标缓存。
 */

"use strict";

// 共享库
include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");

// 注册脚本信息
window.DefineScript("Info And Rating", {
  author: "XYSRe",
  version: "1.5.0",
  options: { grab_focus: false },
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

// --- 颜色 (来自 lib/theme.js) ---
const COL = THEME.COL;

// --- 字体 (来自 lib/theme.js) ---
const FONTS = {
  Title: gdi.Font(THEME.FONT.GLOBAL, _scale(12), 1),
  Body: gdi.Font(THEME.FONT.GLOBAL, _scale(10), 0),
  BadgeLabel: gdi.Font(THEME.FONT.GLOBAL, _scale(8), 0),
  BadgeInfo: gdi.Font(THEME.FONT.GLOBAL, _scale(9), 0),
};

// --- 路径与图片资源 (Paths & Images) ---
const STAR_ICONS = {
  StarOff: _load_image(IMGS_LUCIDE_DIR + "star1.png"),
  StarOn: _load_image(IMGS_LUCIDE_DIR + "star.png"),
};

// 来源图标缓存 (使用共享库 SourceIconCache)
const g_sourceIconCache = new SourceIconCache(IMGS_LINKS_DIR);

// --- 布局参数 (Layout Constants) ---
// MAX_BUFFER_H 由 _measure_string 内部处理 (lib/utils.js)
const LINE_H = _scale(14);
const MARGIN = _scale(1);
const ALBUM_YEAR_GAP = _scale(2);
const STAR_SIZE = _scale(16);
const SOURCE_ICON_SIZE = _scale(10); // 来源图标尺寸
// DEFAULT_SOURCE_ICON_FILENAME 来自 lib/data.js

// 音质标识布局配置
const AQ_BADGE_LAYOUT = {
  paddingX: _scale(4),
  paddingY: _scale(4),
  radius: _scale(4),
  borderW: _scale(1),
};

// ============================================================================
// 2. 状态变量与 TitleFormat (State & TF)
// ============================================================================

// 检查依赖组件
const HAS_PLAYCOUNT = utils.CheckComponent("foo_playcount", true);

// 全局句柄
let g_metadb = null; // 当前操作的句柄
let g_activeElement = null; // 当前鼠标激活的UI元素

// 评分数据
let g_currentRating = 0; // 当前歌曲真实评分
let g_hoverRating = 0; // 鼠标悬停时的临时评分 (0表示无悬停)

// 布局区域缓存 (减少每一帧计算)
const ratingArea = { x: 0, y: 0, w: 0, h: 0 };
let currentSourceIcon = {
  x: 0,
  y: 0,
  w: SOURCE_ICON_SIZE,
  h: SOURCE_ICON_SIZE,
  img: null,
  is_hover: false,
  tooltip: "",
};

// 音质标识状态
let currentAQBadge = null;
let currentAQBadgeRect = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  is_hover: false,
  tooltip: "",
};

// TitleFormat 定义
const tf_rating = fb.TitleFormat("$if2(%rating%,0)");
const tf_track_title = fb.TitleFormat("%title%");
const tf_track_artist = fb.TitleFormat("%artist%");
const tf_track_year = fb.TitleFormat("$year(%date%)");
const tf_track_album = fb.TitleFormat("%album%");
const tf_album_source = fb.TitleFormat("$if2($meta(SOURCE),WEB)");

const tf_track_bpm = fb.TitleFormat("$if2($meta(BPM) BPM,Unknown BPM)");
const tf_track_genre = fb.TitleFormat("%GENRE%");

// AQ 音质参数提取 TF
const tf_codec = fb.TitleFormat("%codec%");
const tf_samplerate = fb.TitleFormat("%samplerate%");
const tf_bitdepth = fb.TitleFormat("%__bitspersample%");

// ============================================================================
// 3. 辅助组件 (Tooltip)
// ============================================================================

let _tt = _init_tooltip(THEME.FONT.GLOBAL, _scale(13), 1200);


// --- 独立星星组件类 (StarElement) ---
class StarElement {
  constructor(value) {
    this.value = value; // 1, 2, 3, 4, 5
    this.x = 0;
    this.y = 0;
    this.w = STAR_SIZE;
    this.h = STAR_SIZE;
    this.is_hover = false;
    // Tooltip 动态生成
  }

  get tooltip() {
    // return `评分: ${this.value} 星`;
    // 取消tooltip
    return "";
  }

  // 绘制逻辑
  paint(gr) {
    // 逻辑：如果处于悬停模式(g_hoverRating > 0)，则显示悬停分；否则显示真实分
    const targetRating = g_hoverRating > 0 ? g_hoverRating : g_currentRating;
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
    this.is_hover = true;
    g_hoverRating = this.value; // 设置全局悬停分
    // 重绘整个评分条区域，因为第3颗星变亮，第1、2颗也要跟着变
    window.RepaintRect(ratingArea.x, ratingArea.y, ratingArea.w, ratingArea.h);
  }

  // 休眠：鼠标移出
  deactivate() {
    this.is_hover = false;
    // 注意：这里不直接重置 g_hoverRating = 0
    // 因为鼠标可能马上移入隔壁星星，由 on_mouse_move 的逻辑控制是否重置
    // 但如果没有任何星星被激活，g_hoverRating 应该由外部重置
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
const CONTENTS = {
  title: {
    text: "",
    w: 0,
    x: 0,
    y: 0,
    h: LINE_H,
    is_hover: false,
    tooltip: "",
  },
  artist: {
    text: "",
    w: 0,
    x: 0,
    y: 0,
    h: LINE_H,
    is_hover: false,
    tooltip: "",
  },
  album: {
    text: "",
    w: 0,
    x: 0,
    y: 0,
    h: LINE_H,
    is_hover: false,
    tooltip: "",
  },
  year: { text: "", w: 0, x: 0, y: 0, h: LINE_H, is_hover: false, tooltip: "" },
};

// _measure_string 来自 lib/utils.js

/**
 * 核心数据更新函数：读取元数据并更新UI状态
 */
function update_contents() {
  g_metadb = fb.IsPlaying ? fb.GetNowPlaying() : fb.GetFocusItem();

  if (g_metadb) {
    CONTENTS.title.text =
      tf_track_title.EvalWithMetadb(g_metadb) || "Unknown Title";
    const track_bpm = tf_track_bpm.EvalWithMetadb(g_metadb) || "0 BPM";
    const track_genre =
      tf_track_genre.EvalWithMetadb(g_metadb) || "Umknown Genre";
    CONTENTS.title.tooltip = track_genre + "\n" + track_bpm;

    CONTENTS.artist.text =
      tf_track_artist.EvalWithMetadb(g_metadb) || "Unknown Artist";
    CONTENTS.album.text =
      tf_track_album.EvalWithMetadb(g_metadb) || "Unknown Album";
    const y = tf_track_year.EvalWithMetadb(g_metadb);
    CONTENTS.year.text = y && y !== "?" ? `©${y}` : "";

    // 更新评分
    g_currentRating = parseInt(tf_rating.EvalWithMetadb(g_metadb)) || 0;
  } else {
    CONTENTS.title.text = "No Track";
    CONTENTS.artist.text = "";
    CONTENTS.album.text = "";
    CONTENTS.year.text = "";
    g_currentRating = 0;
  }

  // 重置悬停状态
  g_hoverRating = 0;

  // 音质标识独立处理，不缓存进 albumData, 有些专辑是混合音质
  const newAQBadge = get_aq_badge_state(g_metadb);
  if (currentAQBadge !== newAQBadge) {
    currentAQBadge = newAQBadge;
  }

  if (g_metadb) {
    update_source_icon(g_metadb);
  }

  if (window.Width > 0) {
    on_size();
    window.Repaint();
  }
}

/**
 * 判断音质分级 (委托给共享库 _get_aq_badge_state)
 * @param {FbMetadbHandle} metadb
 * @returns {AQBadgeStyle|null}
 */
function get_aq_badge_state(metadb) {
  if (!metadb) return null;
  const codec = tf_codec.EvalWithMetadb(metadb).toUpperCase();
  const sr = parseInt(tf_samplerate.EvalWithMetadb(metadb));
  let bits = parseInt(tf_bitdepth.EvalWithMetadb(metadb));
  return _get_aq_badge_state(codec, sr, bits);
}

/**
 * 更新来源图标 (使用共享库 SourceIconCache)
 */
function update_source_icon(metadb) {
  const sourceText = tf_album_source
    .EvalWithMetadb(metadb)
    .trim()
    .toUpperCase();
  let filename = SOURCE_ICON_MAP[sourceText];
  if (!filename) filename = DEFAULT_SOURCE_ICON_FILENAME;

  let img = g_sourceIconCache.get(filename);
  if (!img && filename !== DEFAULT_SOURCE_ICON_FILENAME) {
    img = g_sourceIconCache.get(DEFAULT_SOURCE_ICON_FILENAME);
  }
  currentSourceIcon.img = img;
  currentSourceIcon.tooltip = sourceText;
}

// ============================================================================
// 6. 主回调函数 (Main Callbacks)
// ============================================================================

// 初始加载
update_contents();

/**
 * 布局计算回调
 * 负责计算所有文本、图标、星星的具体坐标 (x, y, w, h)
 */
function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;

  const max_text_w = window.Width - MARGIN * 8;

  // 1. 测量各元素的尺寸
  const titleMeasureFull = _measure_string(
    CONTENTS.title.text,
    FONTS.Title,
    max_text_w,
    TEXT_FLAGS,
  );
  CONTENTS.title.w = titleMeasureFull.Width + _scale(1);
  CONTENTS.title.h = Math.min(titleMeasureFull.Height, LINE_H);
  CONTENTS.artist.w =
    _measure_string(CONTENTS.artist.text, FONTS.Body, max_text_w, TEXT_FLAGS)
      .Width + _scale(1);
  // _scale(1) GDI、GDI+计算偏差 一个像素容差
  CONTENTS.album.w =
    _measure_string(CONTENTS.album.text, FONTS.Body, max_text_w, TEXT_FLAGS)
      .Width + _scale(1);
  CONTENTS.year.w = CONTENTS.year.text
    ? _measure_string(CONTENTS.year.text, FONTS.Body, max_text_w, TEXT_FLAGS)
        .Width
    : 0;

  // 2. 垂直布局计算 (自上而下)
  const totalContentH =
    CONTENTS.title.h + LINE_H * 2 + MARGIN * 4 + STAR_SIZE + SOURCE_ICON_SIZE;
  let startY = Math.round((window.Height - totalContentH) / 2);

  // --- Title ---
  CONTENTS.title.y = startY;
  CONTENTS.title.w = Math.min(CONTENTS.title.w, max_text_w);
  CONTENTS.title.x = Math.round((window.Width - CONTENTS.title.w) / 2);
  startY += LINE_H + MARGIN;

  // --- Artist ---
  CONTENTS.artist.y = startY;
  CONTENTS.artist.w = Math.min(CONTENTS.artist.w, max_text_w);
  CONTENTS.artist.x = Math.round((window.Width - CONTENTS.artist.w) / 2);
  startY += LINE_H + MARGIN;

  // --- Album & Year ---
  let albumYearTotalW =
    CONTENTS.album.w +
    (CONTENTS.year.text ? ALBUM_YEAR_GAP + CONTENTS.year.w : 0);
  if (albumYearTotalW > max_text_w) {
    albumYearTotalW = max_text_w;
    CONTENTS.album.w =
      max_text_w - (CONTENTS.year.text ? ALBUM_YEAR_GAP + CONTENTS.year.w : 0);
  }
  let albumX = Math.round((window.Width - albumYearTotalW) / 2);

  CONTENTS.album.x = albumX;
  CONTENTS.album.y = startY;

  if (CONTENTS.year.text) {
    CONTENTS.year.x = albumX + CONTENTS.album.w + ALBUM_YEAR_GAP;
    CONTENTS.year.y = startY;
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
  let sourchIconAQBadgeTotalW = 0;
  if (currentSourceIcon.img) {
    sourchIconAQBadgeTotalW += currentSourceIcon.w;
  }
  if (currentAQBadge) {
    const badgeTextSize = _measure_string(
      currentAQBadge.label,
      FONTS.BadgeLabel,
      max_text_w,
      BADGE_TEXT_ALIGN,
    );
    currentAQBadgeRect.w = badgeTextSize.Width + AQ_BADGE_LAYOUT.paddingX;
    currentAQBadgeRect.h = badgeTextSize.Height + AQ_BADGE_LAYOUT.paddingY;
    sourchIconAQBadgeTotalW += currentAQBadgeRect.w;
  }
  currentSourceIcon.x = Math.ceil((window.Width - sourchIconAQBadgeTotalW) / 2);
  currentSourceIcon.y = startY + Math.ceil((LINE_H - currentSourceIcon.h) / 2);
  currentAQBadgeRect.x = currentSourceIcon.x + currentSourceIcon.w + MARGIN * 2;
  currentAQBadgeRect.y =
    startY + Math.ceil((LINE_H - currentAQBadgeRect.h) / 2);
}

/**
 * 绘制回调
 */
function on_paint(gr) {
  gr.FillSolidRect(0, 0, window.Width, window.Height, COL.ITEMDETAIL_BG);
  gr.SetTextRenderingHint(5); // ClearType

  // --- 绘制文本 ---
  gr.GdiDrawText(
    CONTENTS.title.text,
    FONTS.Title,
    CONTENTS.title.is_hover ? COL.ACTIVE_ITEM : COL.SELECTED_TEXT,
    CONTENTS.title.x,
    CONTENTS.title.y,
    CONTENTS.title.w,
    CONTENTS.title.h,
    TEXT_FLAGS,
  );

  gr.GdiDrawText(
    CONTENTS.artist.text,
    FONTS.Body,
    CONTENTS.artist.is_hover ? COL.ACTIVE_ITEM : COL.ITEM_TEXT,
    CONTENTS.artist.x,
    CONTENTS.artist.y,
    CONTENTS.artist.w,
    CONTENTS.artist.h,
    TEXT_FLAGS,
  );

  gr.GdiDrawText(
    CONTENTS.album.text,
    FONTS.Body,
    CONTENTS.album.is_hover ? COL.ACTIVE_ITEM : COL.ITEM_TEXT,
    CONTENTS.album.x,
    CONTENTS.album.y,
    CONTENTS.album.w,
    CONTENTS.album.h,
    ALBUM_FLAGS,
  );

  if (CONTENTS.year.text) {
    gr.GdiDrawText(
      CONTENTS.year.text,
      FONTS.Body,
      COL.ITEM_TEXT,
      CONTENTS.year.x,
      CONTENTS.year.y,
      CONTENTS.year.w,
      CONTENTS.year.h,
      ALBUM_FLAGS,
    );
  }

  // --- 绘制星星 ---
  // 先清理背景防止残影
  gr.FillSolidRect(
    ratingArea.x,
    ratingArea.y,
    ratingArea.w,
    ratingArea.h,
    COL.ITEMDETAIL_BG,
  );

  if (HAS_PLAYCOUNT && g_metadb) {
    // 让每颗星星自己画自己
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
      currentAQBadgeRect.x,
      currentAQBadgeRect.y,
      currentAQBadgeRect.w,
      currentAQBadgeRect.h,
      AQ_BADGE_LAYOUT.radius,
      AQ_BADGE_LAYOUT.radius,
      currentAQBadge.bgColor,
    );

    gr.SetSmoothingMode(0); // Default for text
    // 文字
    gr.GdiDrawText(
      currentAQBadge.label,
      FONTS.BadgeLabel,
      currentAQBadge.color,
      currentAQBadgeRect.x,
      currentAQBadgeRect.y,
      currentAQBadgeRect.w,
      currentAQBadgeRect.h,
      BADGE_TEXT_ALIGN,
    );
  }
}

/**
 * 元素碰撞检测辅助函数
 */
// _element_trace 来自 lib/utils.js

/**
 * [核心] 状态机：处理鼠标移动事件
 * 负责检测悬停元素、切换光标、触发 Tooltip、重绘高亮区域
 */
function on_mouse_move(x, y) {
  let target = null;

  // 1. 检测 5 颗星星 (作为 5 个独立按钮处理)
  // 这里的关键是，星星是紧密排列的，状态机能完美处理从 星1 移到 星2 的逻辑
  if (HAS_PLAYCOUNT && g_metadb) {
    for (let i = 0; i < 5; i++) {
      if (_element_trace(x, y, stars[i])) {
        target = stars[i];
        break;
      }
    }
  }

  // 2. 检测文本与图标
  if (!target) {
    if (_element_trace(x, y, CONTENTS.title)) {
      target = CONTENTS.title;
    } else if (_element_trace(x, y, CONTENTS.artist)) {
      target = CONTENTS.artist;
    } else if (_element_trace(x, y, CONTENTS.album)) {
      target = CONTENTS.album;
    } else if (_element_trace(x, y, currentSourceIcon)) {
      target = currentSourceIcon;
    } else if (_element_trace(x, y, currentAQBadgeRect) && currentAQBadge) {
      currentAQBadgeRect.tooltip = currentAQBadge.desc;
      target = currentAQBadgeRect;
    }
  }

  // 3. 状态切换逻辑
  if (g_activeElement === target) return;

  // A. 旧元素复位 (Deactivate)
  if (g_activeElement) {
    if (g_activeElement instanceof StarElement) {
      g_activeElement.deactivate();
      // 如果移出了整个评分条区域，重置悬停分
      if (!target || !(target instanceof StarElement)) {
        g_hoverRating = 0;
        window.RepaintRect(
          ratingArea.x,
          ratingArea.y,
          ratingArea.w,
          ratingArea.h,
        );
      }
    } else {
      g_activeElement.is_hover = false;
      window.RepaintRect(
        g_activeElement.x,
        g_activeElement.y,
        g_activeElement.w,
        g_activeElement.h,
      );
    }
  }

  // B. 新元素激活 (Activate)
  if (target) {
    if (target instanceof StarElement) {
      target.activate(); // 这会更新 g_hoverRating
    } else {
      target.is_hover = true;
      window.RepaintRect(target.x, target.y, target.w, target.h);
    }

    _tt(target.tooltip || "");
    _setCursor(32649); // Hand cursor
  } else {
    _tt("");
    _setCursor(32512); // Arrow cursor
  }

  g_activeElement = target;
}

function on_mouse_leave() {
  if (g_activeElement) {
    if (g_activeElement instanceof StarElement) {
      g_activeElement.deactivate();
      g_hoverRating = 0;
      window.RepaintRect(
        ratingArea.x,
        ratingArea.y,
        ratingArea.w,
        ratingArea.h,
      );
    } else {
      g_activeElement.is_hover = false;
      if (g_activeElement === CONTENTS.artist) {
        // 艺人行可能比较宽，重绘整行更安全
        window.RepaintRect(
          0,
          g_activeElement.y,
          window.Width,
          g_activeElement.h,
        );
      } else {
        window.RepaintRect(
          g_activeElement.x,
          g_activeElement.y,
          g_activeElement.w,
          g_activeElement.h,
        );
      }
    }
    g_activeElement = null;
  }
  _tt("");
  _setCursor(32512);
}

function on_mouse_lbtn_up(x, y) {
  if (!g_activeElement) return;
  const target = g_activeElement;

  // 1. 星星点击：设置评分
  if (target instanceof StarElement) {
    if (!g_metadb) return;
    // 逻辑：如果点击的分数等于当前分数，则取消评分 (<not set>)
    const newRating =
      target.value === g_currentRating ? "<not set>" : target.value;
    fb.RunContextCommandWithMetadb(
      "Playback Statistics/Rating/" + newRating,
      g_metadb,
      8,
    );
    return;
  }

  // 2. 文本点击：弹出面板
  if (target === CONTENTS.artist) {
    fb.RunMainMenuCommand("View/Popup panels/Show/SMP-艺人资料");
  } else if (target === CONTENTS.album) {
    fb.RunMainMenuCommand("View/Popup panels/Show/SMP-专辑介绍");
  }
}

function on_mouse_lbtn_dblclk(x, y) {
  // 只有点空地才触发定位正在播放
  if (!g_activeElement) {
    fb.RunMainMenuCommand("View/Show now playing in playlist");
  }
}

// 播放与列表事件回调
function on_playback_new_track() {
  update_contents();
}
function on_playback_stop(reason) {
  // console.log("==========  on_playback_stop: " + reason);
  if (reason !== 2) update_contents();
}
function on_item_focus_change() {
  if (!fb.IsPlaying) update_contents();
}
function on_playlist_switch() {
  if (!fb.IsPlaying) update_contents();
}
function on_metadb_changed() {
  update_contents();
}

/**
 * 脚本卸载回调
 * 必须在此处释放所有 GDI 资源，防止内存泄漏
 */
function on_script_unload() {
  _measure_dispose();
  _dispose_image_dict(STAR_ICONS);
  g_sourceIconCache.clear();
}
