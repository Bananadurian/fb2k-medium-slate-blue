/**
 * @file track_info.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-05-18
 * @version 2.1.0
 * @description 歌曲信息+评分面板: 标题/艺人/专辑/年份、星级评分、音质标识、来源图标。接入 TS 样式别名。
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");

window.DefineScript("Track Info", {
  author: "XYSRe",
  version: "2.0.0",
  options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. 全局常量与配置 (Constants & Config)
// ============================================================================

const COL = THEME.COL;
const TS = THEME.TEXT;


// --- 路径与图片资源 (Paths & Images) ---
const STAR_ICONS = {
  StarOff: _loadImage(IMGS_LUCIDE_DIR + "star1.png"),
  StarOn: _loadImage(IMGS_LUCIDE_DIR + "star.png"),
};

// 来源图标缓存 (使用共享库 SourceIconCache)
const sourceIconCache = new SourceIconCache(IMGS_LINKS_DIR);

// --- 布局参数 (Layout Constants) ---
const PAD_X = _scale(4);

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

// SECTIONS 布局 (居中垂直堆叠，间距由 padding 控制)
// 每个 section 需预置 rect/content 空对象，由 layoutSections() 写入坐标
// 文本通过 CENTER_LINE_FLAGS/LEFT_LINE_FLAGS 在 content 内居中
let spacerH = 0;
let panelW = window.Width;
let panelH = window.Height;
const SECTIONS = [
    {
        name: "spacer",
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        padding: { left: 0, top: 0, right: 0, bottom: 0 },
        visible: true,
        getContentHeight() { return spacerH; },
        draw(gr) {},
    },
    {
        name: "title",
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        padding: { left: PAD_X, top: 0, right: PAD_X, bottom: 0 },
        visible: true,
        getContentHeight() { return _getFontLineHeight(TS.boldCenter.font); },
        draw(gr) {
            gr.GdiDrawText(trackText.title.text, TS.boldCenter.font,
                trackText.title.isHover ? COL.FRAME : COL.FG,
                this.content.x, this.content.y, this.content.w, this.content.h,
                CENTER_LINE_FLAGS);
        },
    },
    {
        name: "artist",
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        padding: { left: PAD_X, top: 0, right: PAD_X, bottom: 0 },
        visible: true,
        getContentHeight() { return _getFontLineHeight(TS.labelCenter.font); },
        draw(gr) {
            gr.GdiDrawText(trackText.artist.text, TS.labelCenter.font,
                trackText.artist.isHover ? COL.FRAME : COL.FG,
                this.content.x, this.content.y, this.content.w, this.content.h,
                CENTER_LINE_FLAGS);
        },
    },
    {
        name: "album",
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        yearGap: _scale(2),
        padding: { left: PAD_X, top: 0, right: PAD_X, bottom: 0 },
        visible: true,
        getContentHeight() { return _getFontLineHeight(TS.labelCenter.font); },
        draw(gr) {
            const hovered = albumGroup.isHover;
            const hc = hovered ? COL.FRAME : COL.FG;
            gr.GdiDrawText(trackText.album.text, TS.labelCenter.font, hc,
                trackText.album.x, trackText.album.y, trackText.album.w, trackText.album.h, LEFT_LINE_FLAGS);
            if (trackText.year.w) {
                gr.GdiDrawText(trackText.year.text, TS.labelCenter.font, hc,
                    trackText.year.x, trackText.year.y, trackText.year.w, trackText.year.h, LEFT_LINE_FLAGS);
            }
        },
    },
    {
        name: "stars",
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        starSize: _scale(16),
        padding: { left: PAD_X, top: _scale(4), right: PAD_X, bottom: _scale(4) },
        getContentHeight() { return this.starSize; },
        get visible() { return !!(HAS_PLAYCOUNT && metadb); },
        draw(gr) {
            if (!window.IsTransparent) {
                gr.FillSolidRect(this.content.x, this.content.y, this.content.w, this.content.h, COL.BG);
            }
            for (let i = 0; i < 5; i++) stars[i].paint(gr);
        },
    },
    {
        name: "badge",
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        isHover: false,
        tooltip: "",
        padding: { left: PAD_X, top: 0, right: PAD_X, bottom: 0 },
        getContentHeight() { return badgeElement.h; },
        get visible() { return !!(currentSourceIcon.img || currentAQBadge); },
        draw(gr) {
            if (currentSourceIcon.img) {
                gr.SetInterpolationMode(7);
                gr.DrawImage(currentSourceIcon.img, currentSourceIcon.x, currentSourceIcon.y,
                    currentSourceIcon.w, currentSourceIcon.h,
                    0, 0, currentSourceIcon.img.Width, currentSourceIcon.img.Height);
            }
            if (currentAQBadge) {
                gr.SetSmoothingMode(4);
                gr.FillRoundRect(badgeElement.x, badgeElement.y, badgeElement.w, badgeElement.h,
                    THEME.CFG.AQ_BADGE.RADIUS, THEME.CFG.AQ_BADGE.RADIUS, currentAQBadge.bgColor);
                gr.SetSmoothingMode(0);
                gr.GdiDrawText(currentAQBadge.label, TS.labelCenter.font, currentAQBadge.color,
                    badgeElement.x, badgeElement.y, badgeElement.w, badgeElement.h, CENTER_LINE_FLAGS);
            }
        },
    },
];
const SEC = {};
SECTIONS.forEach(function(sec) { SEC[sec.name] = sec; });
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
  h: _getFontLineHeight(TS.labelCenter.font)
    + THEME.CFG.AQ_BADGE.PADDING.top
    + THEME.CFG.AQ_BADGE.PADDING.bottom,
  isHover: false,
  tooltip: "",
};
let badgeGroup = { x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: "" };
let albumGroup = { x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: "" };

// --- TitleFormat 实例 ---
// 基础曲目信息
const ratingTf       = fb.TitleFormat("$if2(%rating%,0)");
const trackTitleTf   = fb.TitleFormat("%title%");
const trackArtistTf  = fb.TitleFormat("%artist%");
const trackAlbumTf   = fb.TitleFormat("%album%");
const trackYearTf    = fb.TitleFormat("$year(%date%)");
// 附加元数据
const trackGenreTf   = fb.TitleFormat("%GENRE%");
const trackBpmTf     = fb.TitleFormat("$if2($meta(BPM) BPM,Unknown BPM)");
// 音质参数
const codecTf        = fb.TitleFormat("%codec%");
const sampleRateTf   = fb.TitleFormat("%samplerate%");
const bitDepthTf     = fb.TitleFormat("%__bitspersample%");
// 来源图标
const albumSourceTf  = fb.TitleFormat("$if2($meta(SOURCE),WEB)");

// 透明同步通知 freshness 窗口与兜底延迟 — 通道定义见 lib/data.js NOTIFY.TRANSPARENT_SYNC
let transparentTrackRepaintTimer = null;
let lastTransparentNotifyEpoch = 0;
let lastTransparentNotifyTs = 0;

// ============================================================================
// 3. 辅助组件 (Tooltip)
// ============================================================================

let tooltip = _createDefaultTooltip();


/**
 * @class StarElement
 * @property {number} value - 星级值 (1-5)
 * @property {number} x,y,w,h - 布局坐标与尺寸
 * @property {boolean} isHover - 鼠标悬停状态，在 on_mouse_move 中切换
 */
class StarElement {
  constructor(value, size) {
    this.value = value; // 1, 2, 3, 4, 5
    this.x = 0;
    this.y = 0;
    this.w = size;
    this.h = size;
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
    hoverRating = this.value;
  }

  // 休眠：鼠标移出
  deactivate() {
    this.isHover = false;
  }
}

// 初始化 5 个星星对象
const stars = [];
const starSize = SEC.stars.starSize;
for (let i = 1; i <= 5; i++) {
  stars.push(new StarElement(i, starSize));
}

// ============================================================================
// 4. 核心逻辑 (Logic)
// ============================================================================

// 文本内容状态对象
const trackText = {
  title: {
    text: "",
    w: 0,
    x: 0,
    y: 0,
    h: 0,
    isHover: false,
    tooltip: "",
  },
  artist: {
    text: "",
    w: 0,
    x: 0,
    y: 0,
    h: 0,
    isHover: false,
    tooltip: "",
  },
  album: {
    text: "",
    w: 0,
    x: 0,
    y: 0,
    h: 0,
    isHover: false,
    tooltip: "",
  },
  year: { text: "", w: 0, x: 0, y: 0, h:0, isHover: false, tooltip: "" },
};

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

/**
 * 核心数据更新: 读取元数据 → 更新 trackText/评分/来源/AQ → syncLayout → Repaint
 * 切歌 / 列表切换 / 元数据变化时触发
 */
function updateContent() {
  metadb = fb.IsPlaying ? fb.GetNowPlaying() : fb.GetFocusItem();

  if (metadb) {
    trackText.title.text =
      trackTitleTf.EvalWithMetadb(metadb) || "Unknown Title";
    const trackBpm = trackBpmTf.EvalWithMetadb(metadb);
    const trackGenre =
      trackGenreTf.EvalWithMetadb(metadb) || "Unknown Genre";
    trackText.title.tooltip = trackGenre + "\n" + trackBpm;

    trackText.artist.text =
      trackArtistTf.EvalWithMetadb(metadb) || "Unknown Artist";
    trackText.artist.tooltip = trackText.artist.text;
    trackText.album.text =
      trackAlbumTf.EvalWithMetadb(metadb) || "Unknown Album";
    const y = trackYearTf.EvalWithMetadb(metadb);
    trackText.year.text = y && y !== "?" ? `©${y}` : "";

    // 更新评分
    currentRating = parseInt(ratingTf.EvalWithMetadb(metadb), 10) || 0;
  } else {
    trackText.title.text = "No Track";
    trackText.artist.text = "";
    trackText.album.text = "";
    trackText.year.text = "";
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
  } else {
    currentSourceIcon.img = null;
    currentSourceIcon.tooltip = "";
  }

  if (panelW > 0) {
    syncLayout();
    window.Repaint();
  }
}

/**
 * 内容驱动布局同步: 测量文本+徽章尺寸 → 从 SEC.*.content 计算实际元素坐标
 * 不触动 layoutSections (仅 on_size 触发)，切歌时由 updateContent 调用
 */
function syncLayout() {
  // 全宽 section: 直接取 content 作为 hit-test 区域
  trackText.title.x = SEC.title.content.x;
  trackText.title.y = SEC.title.content.y;  
  trackText.title.w = SEC.title.content.w;
  trackText.title.h = SEC.title.content.h;

  // artist 实际文本宽度，居中 (紧凑 hit-test)
  const artistTextW = _measureText(trackText.artist.text, TS.labelCenter, SEC.artist.content.w).Width;
  trackText.artist.w = artistTextW;
  trackText.artist.h = SEC.artist.content.h;
  trackText.artist.x = SEC.artist.content.x + Math.round((SEC.artist.content.w - artistTextW) / 2);
  trackText.artist.y = SEC.artist.content.y;

  // 专辑信息: 专辑名称 @年份 (过长截断)
  trackText.year.w = trackText.year.text ? _measureText(trackText.year.text, TS.labelCenter, panelW).Width : 0;
  // + _scale(1) 是因为文本有计算误差，这里放大了一点尺寸
  const albumW = _measureText(trackText.album.text, TS.labelCenter, panelW).Width + _scale(1);  
  let albumTotalW = albumW + SEC.album.yearGap + trackText.year.w;
  trackText.album.w = albumTotalW > SEC.album.content.w ? SEC.album.content.w - SEC.album.yearGap - trackText.year.w : albumW;
  albumTotalW = trackText.album.w + SEC.album.yearGap + trackText.year.w;

  // 同步 hit-test 坐标
  trackText.album.x = SEC.album.content.x + Math.round((SEC.album.content.w - albumTotalW) / 2);
  trackText.year.x = trackText.album.x + trackText.album.w + SEC.album.yearGap;
  trackText.year.y = SEC.album.content.y;
  trackText.album.y = SEC.album.content.y;
  
  trackText.year.h = SEC.album.content.h;
  trackText.album.h = SEC.album.content.h;

  // album+year 合并 hit-test 区域
  albumGroup.x = trackText.album.x;
  albumGroup.y = trackText.album.y;
  albumGroup.h = trackText.album.h;
  albumGroup.w = (trackText.year.x + trackText.year.w) - trackText.album.x;
  albumGroup.tooltip = [trackText.album.text, trackText.year.text].filter(Boolean).join(" · ");

  // stars 坐标
  const ss = SEC.stars;
  const starsW = ss.starSize * 5;
  const sx = ss.content.x + Math.round((ss.content.w - starsW) / 2);
  for (let i = 0; i < 5; i++) {
    stars[i].x = sx + i * ss.starSize;
    stars[i].y = ss.content.y;
  }

  if (currentAQBadge) {
    const p = THEME.CFG.AQ_BADGE.PADDING;
    const m = _measureText(currentAQBadge.label, TS.labelCenter, panelW);
    badgeElement.w = m.Width + p.left + p.right;
  } else {
    badgeElement.w = 0;
  }

  // source icon + badge 坐标
  const bs = SEC.badge;
  const iconW = currentSourceIcon.img ? currentSourceIcon.w : 0;
  const bdgW = currentAQBadge ? badgeElement.w : 0;
  const gap = (iconW && bdgW) ? _scale(2) : 0;
  const totalW = iconW + gap + bdgW;
  const bx = bs.content.x + Math.round((bs.content.w - totalW) / 2);
  currentSourceIcon.x = bx;
  currentSourceIcon.y = bs.content.y + Math.round((bs.content.h - currentSourceIcon.h) / 2);
  badgeElement.x = bx + iconW + gap;
  badgeElement.y = bs.content.y + Math.round((bs.content.h - badgeElement.h) / 2);

  // 合并 source icon + AQ badge 包围盒 (稳定引用，避免累积偏移)
  const gLeft = currentSourceIcon.img ? currentSourceIcon.x : (currentAQBadge ? badgeElement.x : bs.content.x);
  const gRight = currentAQBadge ? badgeElement.x + badgeElement.w : (currentSourceIcon.img ? currentSourceIcon.x + currentSourceIcon.w : bs.content.x);
  badgeGroup.x = gLeft;
  badgeGroup.y = bs.content.y;
  badgeGroup.w = Math.max(1, gRight - gLeft);
  badgeGroup.h = bs.content.h;
}

// ============================================================================
// 5. 主回调函数 (Main Callbacks)
// ============================================================================

/**
 * SMP resize 回调: spacer → layoutSections → syncLayout
 * 仅尺寸变化时触发，切歌走 updateContent → syncLayout 捷径
 */
function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;
  panelW = window.Width;
  panelH = window.Height;

  // Phase 1: 计算内容总高度 → spacer → 布局
  const contentH = SECTIONS.reduce(function(s, sec) {
    if (!sec.visible) return s;
    return s + sec.getContentHeight() + sec.padding.top + sec.padding.bottom;
  }, 0);
  spacerH = Math.max(0, Math.round((panelH - contentH) / 2));

  layoutSections(SECTIONS, panelW, panelH);
  // 初始加载
  syncLayout();
}

/**
 * SMP paint 回调: 背景填充 → section 循环绘制
 */
function on_paint(gr) {
  if (!window.IsTransparent) {
    gr.FillSolidRect(0, 0, panelW, panelH, COL.BG);
  }
  gr.SetTextRenderingHint(5);
  for (const sec of SECTIONS) {
    if (sec.visible) sec.draw(gr);
  }
}

/**
 * [状态机] 鼠标移动: hit-test → 状态切换 → tooltip/cursor → 局部重绘
 * 命中优先级: stars > artist > albumGroup > badgeGroup
 */
function on_mouse_move(x, y) {
  let target = null;

  // 1. 检测 5 颗星星
  if (HAS_PLAYCOUNT && metadb) {
    for (let i = 0; i < 5; i++) {
      if (_hitTest(x, y, stars[i])) {
        target = stars[i];
        break;
      }
    }
  }

  // 2. 检测 artist
  if (!target) {
    if (_hitTest(x, y, trackText.artist)) {
      target = trackText.artist;
    }
  }
  // 3. 检测 album (album+year 合并区域)
  if (!target) {
    if (_hitTest(x, y, albumGroup)) {
      target = albumGroup;
    }
  }
  // 4. 检测 badge (source icon + AQ)
  if (!target) {
    if (_hitTest(x, y, badgeGroup) && SEC.badge.visible) {
      target = badgeGroup;
    }
  }

  // 状态切换逻辑
  if (activeElement === target) return;

  // A. 旧元素复位 (Deactivate)
  if (activeElement) {
    if (activeElement instanceof StarElement) {
      activeElement.deactivate();
      if (!target || !(target instanceof StarElement)) {
        hoverRating = 0;
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
      target.activate();
    } else {
      target.isHover = true;
      window.RepaintRect(target.x, target.y, target.w, target.h);
    }

    if (target === badgeGroup) {
      const parts = [currentSourceIcon.tooltip];
      if (currentAQBadge && currentAQBadge.desc) parts.push(currentAQBadge.desc);
      tooltip(parts.join(" · "));
    } else {
      tooltip(target.tooltip || "");
    }
    _setCursor(CURSOR_HAND); // Hand cursor
  } else {
    tooltip("");
    _setCursor(CURSOR_ARROW); // Arrow cursor
  }

  // 星级区域统一重绘 (避免 deactivate/activate 各自触发重复 RepaintRect)
  if ((activeElement instanceof StarElement) || (target instanceof StarElement)) {
    window.RepaintRect(SEC.stars.content.x, SEC.stars.content.y, SEC.stars.content.w, SEC.stars.content.h);
  }

  activeElement = target;
}

/**
 * [状态机] 鼠标离开: 复位 hover 态 → 清除 tooltip → 还原光标
 */
function on_mouse_leave() {
  if (activeElement) {
    if (activeElement instanceof StarElement) {
      activeElement.deactivate();
      hoverRating = 0;
      window.RepaintRect(
        SEC.stars.content.x,
        SEC.stars.content.y,
        SEC.stars.content.w,
        SEC.stars.content.h,
      );
    } else {
      activeElement.isHover = false;
      window.RepaintRect(
        activeElement.x,
        activeElement.y,
        activeElement.w,
        activeElement.h,
      );
    }
    activeElement = null;
  }
  tooltip("");
  _setCursor(CURSOR_ARROW);
}

/**
 * 左键点击: 星星设置评分 / 艺人→切 Biography / 专辑→切 Album
 */
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

  // 2. 文本点击：通知 tab_container_detail 切 tab
  if (target === trackText.artist) {
    fb.RunMainMenuCommand("View/Show now playing in playlist");
    window.NotifyOthers(NOTIFY.SWITCH_DETAIL_TAB.name, {
      v: NOTIFY.SWITCH_DETAIL_TAB.version,
      source: NOTIFY.SOURCE.TRACK_INFO,
      tab: "Biography",
    });
    return;
  }
  if (target === albumGroup) {
    fb.RunMainMenuCommand("View/Show now playing in playlist");
    window.NotifyOthers(NOTIFY.SWITCH_DETAIL_TAB.name, {
      v: NOTIFY.SWITCH_DETAIL_TAB.version,
      source: NOTIFY.SOURCE.TRACK_INFO,
      tab: "Album",
    });
    return;
  }
}

/**
 * 双击空白处 → 定位正在播放
 */
function on_mouse_lbtn_dblclk(x, y) {
  if (!activeElement) {
    fb.RunMainMenuCommand("View/Show now playing in playlist");
  }
}

// 播放与列表事件回调
function on_playback_new_track() {
  updateContent();
  scheduleTransparentTrackRepaintFallback();
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
function on_playlist_items_selection_change() {
  if (!fb.IsPlaying) updateContent();
}
function on_metadb_changed() {
  updateContent();
}

function clearTransparentTrackRepaintTimers() {
  if (transparentTrackRepaintTimer) {
    window.ClearTimeout(transparentTrackRepaintTimer);
    transparentTrackRepaintTimer = null;
  }
}

/**
 * 透明模式 fallback: 切歌后短窗内未收到 notify 则兜底重绘
 */
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

function on_colours_changed() {
  _refreshThemeColors();
  window.Repaint();
}


function on_font_changed() {
  _refreshThemeFonts();
  badgeElement.h = _getFontLineHeight(TS.labelCenter.font)
    + THEME.CFG.AQ_BADGE.PADDING.top
    + THEME.CFG.AQ_BADGE.PADDING.bottom;
  window.Repaint();
}

/**
 * SMP 卸载回调: 清除 timer → 释放 GDI 资源 (measure/image dict/cache)
 */
function on_script_unload() {
  clearTransparentTrackRepaintTimers();
  _measureDispose();
  _disposeImageDict(STAR_ICONS);
  sourceIconCache.clear();
}

updateContent();