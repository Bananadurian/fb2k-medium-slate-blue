/**
 * @file info+rating.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-04-14
 * @version 1.4.4
 * @description 终极重构版：
 * 1. 代码结构化整理，分离配置、工具、逻辑与视图。
 * 2. 将星星拆分为独立对象，纳入全局状态机管理，彻底解决交互闪烁。
 * 3. 增强了音质标识与来源图标的逻辑封装。
 */

"use strict";

// 注册脚本信息
window.DefineScript("Info And Rating", {
  author: "XYSRe",
  version: "1.4.3",
  options: { grab_focus: false },
});

// ============================================================================
// 1. 全局常量与配置 (Constants & Config)
// ============================================================================

const DPI = window.DPI;

/**
 * 屏幕适配缩放函数
 * @param {number} size - 原始像素值
 * @returns {number} - 适配 DPI 后的像素值
 */
function _scale(size) {
  return Math.round((size * DPI) / 72);
}

/**
 * 生成颜色整数值
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} - 0xAARRGGBB 格式整数
 */
function _RGB(r, g, b) {
  return 0xff000000 | (r << 16) | (g << 8) | b;
}

// --- GDI 文本绘制标志位说明 (Flags) ---
// 详见: http://msdn.microsoft.com/en-us/library/dd162498(VS.85).aspx
const DT_LEFT = 0x00000000; // 左对齐
const DT_CENTER = 0x00000001; // 水平居中
const DT_RIGHT = 0x00000002; // 右对齐
const DT_VCENTER = 0x00000004; // 垂直居中 (仅限单行)
const DT_BOTTOM = 0x00000008; // 底部对齐
const DT_WORDBREAK = 0x00000010; // 自动换行
const DT_NOPREFIX = 0x00000800; // 禁用 '&' 转义
const DT_EDITCONTROL = 0x00002000; // 编辑控件样式 (显示部分最后一行)
const DT_END_ELLIPSIS = 0x00008000; // 超出显示省略号
const DT_SINGLELINE = 0x00000020; // 单行模式

// 常用文本对齐组合
// 1. 通用文本: 双居中 + 禁用前缀 + 省略号 + 单行
const TEXT_FLAGS =
  DT_CENTER | DT_VCENTER | DT_NOPREFIX | DT_END_ELLIPSIS | DT_SINGLELINE;
// 2. 专辑信息: 左对齐 + 垂直居中 + 禁用前缀 + 省略号 (多行支持取决于是否加了 SINGLELINE，此处未加)
const ALBUM_FLAGS = DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_END_ELLIPSIS;
// 3. 音质标识: 双居中 + 单行
const BADGE_TEXT_ALIGN = DT_CENTER | DT_VCENTER | DT_SINGLELINE;

// --- 颜色配置 (Colors) ---
const COLORS = {
  bg: window.GetColourCUI(3, "{4E20CEED-42F6-4743-8EB3-610454457E19}"), // CUI Item Details 背景色
  Title: window.GetColourCUI(1), // CUI 全局 选中文案 颜色
  Accent: window.GetColourCUI(6), // CUI 全局 Active item 颜色
  Body: window.GetColourCUI(0), // CUI 全局 Item 颜色
  Dim: _RGB(114, 117, 126),

  // --- 音质标识标准色 (Audio Quality Badge COLORS) ---
  // 对应不同采样率/位深的视觉分级
  // ===== 基础音质 =====
  silver: _RGB(178, 180, 188), // AQ-CD   冷灰
  teal: _RGB(155, 160, 200), // AQ-CD+  紫调冷灰蓝

  // ===== Studio / Pro =====
  green: _RGB(120, 190, 182), // AQ-ST   冷静青绿（Studio Cyan）

  // ===== Hi-Res（传统黄 × 现代 UI）=====
  amber: _RGB(195, 173, 100), // AQ-HR   驯化琥珀黄
  gold: _RGB(214, 194, 127), // AQ-HR+  亮阶琥珀

  // ===== 极限音质 =====
  titanium: _RGB(230, 232, 240), // AQ-UHR  冷白
  purple: _RGB(127, 90, 240), // AQ-DSD  主题紫

  // ===== Fallback =====
  fallback: _RGB(115, 115, 115), // LOSSY   稍亮的中灰，保证可读性

  // ===== Dolby =====
  dolby_lossy: _RGB(100, 165, 215), // DD / DD+ 柔和科技蓝
  dolby_hd: _RGB(130, 195, 255), // TrueHD / Atmos 高亮但不刺眼
};

/**
 * 计算公式来自tidal音质标识 low、high、max 图标，让AI通过已知前景色和背景色计算转换公式
 * https://tidal.com/sound-quality
 * 计算背景色 (颜色2)
 * 公式：亮度 * 0.2，如果是纯白则转换为冷灰
 * @param {number} color - 原始颜色整数 (例如 COLORS.silver)
 * @returns {number} - 计算后的背景色整数
 */
function getDimColor(color) {
  // 1. 通过位运算提取 R, G, B 分量
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  // 2. 特殊处理：纯白色 (#FFFFFF) -> 冷灰色 (#393940)
  // 对应 RGB(255, 255, 255) -> RGB(57, 57, 64)
  if (r === 255 && g === 255 && b === 255) {
    return 0xff000000 | (57 << 16) | (57 << 8) | 64;
  }

  // 3. 通用公式：乘以 0.2 并取整
  const r2 = Math.round(r * 0.2);
  const g2 = Math.round(g * 0.2);
  const b2 = Math.round(b * 0.2);

  // 4. 重新组合为整数返回 (保持 Alpha 为 0xff)
  return 0xff000000 | (r2 << 16) | (g2 << 8) | b2;
}

// --- 字体配置 (Fonts) ---
const CUI_GLOBAL_FONT = window.GetFontCUI(0).Name; // CUI Item字体名字
const FONTS = {
  Title: gdi.Font(CUI_GLOBAL_FONT, _scale(12), 1), // Bold
  Body: gdi.Font(CUI_GLOBAL_FONT, _scale(10), 0),
  BadgeLabel: gdi.Font(CUI_GLOBAL_FONT, _scale(8), 0), // Bold for Badge
  BadgeInfo: gdi.Font(CUI_GLOBAL_FONT, _scale(9), 0),
};

// --- 路径与图片资源 (Paths & Images) ---
function load_image(path) {
  return utils.IsFile(path) ? gdi.Image(path) : null;
}

const LINK_ICONS_DIR = fb.ProfilePath + "\\user-theme-fb2k-medium-slate-blue\\imgs\\Links\\";
const STAR_ICONS_DIR = fb.ProfilePath + "\\user-theme-fb2k-medium-slate-blue\\imgs\\Lucide\\";
const STAR_ICONS = {
  StarOff: load_image(STAR_ICONS_DIR + "star1.png"),
  StarOn: load_image(STAR_ICONS_DIR + "star.png"),
};

// --- 布局参数 (Layout Constants) ---
const MAX_BUFFER_H = _scale(2000); // 文本缓冲最大高度 (防显存溢出)
const LINE_H = _scale(14);
const MARGIN = _scale(1);
const ALBUM_YEAR_GAP = _scale(2);
const STAR_SIZE = _scale(16);
const SOURCE_ICON_SIZE = _scale(10); // 来源图标尺寸
const DEFAULT_SOURCE_ICON_FILENAME = "cloud.png"; // 默认来源图标

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

// AQ 音质参数提取 TF
const tf_codec = fb.TitleFormat("%codec%");
const tf_samplerate = fb.TitleFormat("%samplerate%");
const tf_bitdepth = fb.TitleFormat("%__bitspersample%");

// 测量专用GDI对象
let _measureImg = null;
let _measureGr = null;

// ============================================================================
// 3. 辅助组件类 (Classes)
// ============================================================================

// --- Tooltip 管理 ---
let tooltip = window.CreateTooltip(CUI_GLOBAL_FONT, _scale(13));
tooltip.SetMaxWidth(1200);

function _tt(value) {
  if (tooltip.Text !== value) {
    tooltip.Text = value;
    tooltip.Activate();
  }
}

// --- 光标管理 ---
let lastCursorId = 32512;
function _setCursor(id) {
  if (lastCursorId === id) return;
  lastCursorId = id;
  window.SetCursor(id);
}

// --- 音质标识样式类 ---
class AQBadgeStyle {
  constructor(label, color, desc) {
    this.label = label;
    this.color = color; // 前景色 (文字/边框)
    this.bgColor = getDimColor(color); // 自动计算背景色
    this.desc = desc;
  }
}

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
// 4. 音质与图标配置数据 (Badges & Icons Data)
// ============================================================================

// 音质标识定义表
const AQ_BADGES = {
  CD: new AQBadgeStyle("AQ-CD", COLORS.silver, "16bit / 44.1kHz"),
  CD_PLUS: new AQBadgeStyle("AQ-CD+", COLORS.teal, "24bit / 44.1kHz"),
  ST: new AQBadgeStyle("AQ-ST", COLORS.green, "24bit / 48kHz"),
  HR: new AQBadgeStyle("AQ-HR", COLORS.amber, "24bit / 88.2k-96k"),
  HR_PLUS: new AQBadgeStyle("AQ-HR+", COLORS.gold, "24bit / 176k-192k"),
  UHR: new AQBadgeStyle("AQ-UHR", COLORS.titanium, "≥352.8kHz (DXD)"),
  DSD: new AQBadgeStyle("AQ-DSD", COLORS.purple, "Native DSD"),
  LOSSY: new AQBadgeStyle("LOSSY", COLORS.fallback, "Compressed"),
  UNKNOWN: new AQBadgeStyle("UNKNOWN", COLORS.fallback, "Unknown"),
  // 杜比系列
  DD: new AQBadgeStyle("AQ-DD", COLORS.dolby_lossy, "Dolby Digital (AC3)"),
  DD_PLUS: new AQBadgeStyle("AQ-DD+", COLORS.dolby_lossy, "Dolby Digital Plus"),
  TRUEHD: new AQBadgeStyle(
    "AQ-THD",
    COLORS.dolby_hd,
    "Dolby TrueHD (Lossless)",
  ),
  ATMOS: new AQBadgeStyle("AQ-ATMOS", COLORS.dolby_hd, "Dolby Atmos"), // 可选
};

// 来源图标映射表
const SOURCE_ICON_MAP = {
  CD: "disc-2.png",
  SACD: "sacd.png",
  "SACD (CD LAYER)": "sacd.png",
  "JAPAN FIRST PRESS": "disc-3.png",
  WEB: "cloud.png",
  TIDAL: "Tidal.png",
  QOBUZ: "Qobuz.png",
  HDTRACKS: "HDtracks.png",
  MORA: "mora.png",
  "APPLE MUSIC": "AppleMusic.png",
  "AMAZON MUSIC": "AmazonMusic.png",
  DEEZER: "Deezer.png",
  GENIUS: "Genius.png",
  NETEASE: "NetEase.png",
  "QQ MUSIC": "QQMusic.png",
  "7DIGITAL": "7digital.png",
  BANDCAMP: "Bandcamp.png",
  SOUNDCLOUD: "SoundCloud.png",
};

// 来源图标缓存
const SOURCE_IMG_CACHE = {};

// ============================================================================
// 5. 核心逻辑 (Logic)
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

/**
 * 测量字符串宽高
 */
function measure_string(text, font, maxWidth, text_style_flag) {
  if (!_measureImg) {
    _measureImg = gdi.CreateImage(1, 1);
    _measureGr = _measureImg.GetGraphics();
  }
  const result = _measureGr.MeasureString(
    text,
    font,
    0,
    0,
    maxWidth,
    MAX_BUFFER_H,
    text_style_flag,
  );

  return {
    Width: Math.ceil(result.Width),
    Height: Math.ceil(result.Height),
  };
}

/**
 * 核心数据更新函数：读取元数据并更新UI状态
 */
function update_contents() {
  g_metadb = fb.IsPlaying ? fb.GetNowPlaying() : fb.GetFocusItem();

  if (g_metadb) {
    CONTENTS.title.text =
      tf_track_title.EvalWithMetadb(g_metadb) || "Unknown Title";
    CONTENTS.artist.text =
      tf_track_artist.EvalWithMetadb(g_metadb) || "Unknown Artist";
    CONTENTS.album.text =
      tf_track_album.EvalWithMetadb(g_metadb) || "Unknown Album";
    const y = tf_track_year.EvalWithMetadb(g_metadb);
    CONTENTS.year.text = y && y !== "?" ? `(${y})` : "";

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
 * 判断音质分级
 * 优先级: DSD > 杜比 > 高采样率/位深 > CD > 有损
 */
function get_aq_badge_state(metadb) {
  if (!metadb) return null;

  const codec = tf_codec.EvalWithMetadb(metadb).toUpperCase();
  const sr = parseInt(tf_samplerate.EvalWithMetadb(metadb));
  let bits = parseInt(tf_bitdepth.EvalWithMetadb(metadb));

  if (isNaN(bits)) bits = 0;

  if (codec.indexOf("DSD") !== -1 || codec.indexOf("DST") !== -1)
    return AQ_BADGES.DSD;

  // ================= [新增] 杜比格式判定 =================

  // TrueHD (无损)
  if (codec === "TRUEHD") {
    // 如果能检测到 Atmos 元数据可返回 ATMOS，否则返回 THD
    // if (profile.indexOf("ATMOS") !== -1) return AQ_BADGES.ATMOS;
    return AQ_BADGES.TRUEHD;
  }

  // E-AC3 (Dolby Digital Plus)
  if (codec === "E-AC3") {
    return AQ_BADGES.DD_PLUS;
  }

  // AC3 (Dolby Digital) - 注: 有些插件显示 "ATSC A/52"
  if (codec === "AC3" || codec === "ATSC A/52") {
    return AQ_BADGES.DD;
  }
  // ======================================================

  if (["MP3", "AAC", "VORBIS", "OPUS", "MUSEPACK"].includes(codec))
    return AQ_BADGES.LOSSY;

  if (sr >= 352800) return AQ_BADGES.UHR;
  if (sr >= 176400) return AQ_BADGES.HR_PLUS;
  if (sr >= 88200) return AQ_BADGES.HR;
  if (sr === 48000 && bits >= 24) return AQ_BADGES.ST;
  if (sr === 44100 && bits >= 24) return AQ_BADGES.CD_PLUS;
  if (bits === 16 && sr >= 44100 && sr <= 48000) return AQ_BADGES.CD;

  return AQ_BADGES.CD;
}

/**
 * 更新来源图标
 */
function update_source_icon(metadb) {
  const sourceText = tf_album_source
    .EvalWithMetadb(metadb)
    .trim()
    .toUpperCase();
  let filename = SOURCE_ICON_MAP[sourceText];
  if (!filename) filename = DEFAULT_SOURCE_ICON_FILENAME;

  let img = get_source_image_from_cache(filename);
  if (!img && filename !== DEFAULT_SOURCE_ICON_FILENAME) {
    img = get_source_image_from_cache(DEFAULT_SOURCE_ICON_FILENAME);
  }
  currentSourceIcon.img = img;
  currentSourceIcon.tooltip = sourceText;
}

/**
 * 获取或缓存来源图标
 */
function get_source_image_from_cache(filename) {
  if (SOURCE_IMG_CACHE[filename]) {
    return SOURCE_IMG_CACHE[filename];
  }

  const path = LINK_ICONS_DIR + filename;
  if (utils.IsFile(path)) {
    const img = gdi.Image(path);
    if (img) {
      SOURCE_IMG_CACHE[filename] = img;
      return img;
    }
  }
  return null;
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
  const titleMeasureFull = measure_string(
    CONTENTS.title.text,
    FONTS.Title,
    max_text_w,
    TEXT_FLAGS,
  );
  CONTENTS.title.w = titleMeasureFull.Width + _scale(1);
  CONTENTS.title.h = Math.min(titleMeasureFull.Height, LINE_H);
  CONTENTS.artist.w =
    measure_string(CONTENTS.artist.text, FONTS.Body, max_text_w, TEXT_FLAGS)
      .Width + _scale(1);
  // _scale(1) GDI、GDI+计算偏差 一个像素容差
  CONTENTS.album.w =
    measure_string(CONTENTS.album.text, FONTS.Body, max_text_w, TEXT_FLAGS)
      .Width + _scale(1);
  CONTENTS.year.w = CONTENTS.year.text
    ? measure_string(CONTENTS.year.text, FONTS.Body, max_text_w, TEXT_FLAGS)
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
    const badgeTextSize = measure_string(
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
  gr.FillSolidRect(0, 0, window.Width, window.Height, COLORS.bg);
  gr.SetTextRenderingHint(5); // ClearType

  // --- 绘制文本 ---
  gr.GdiDrawText(
    CONTENTS.title.text,
    FONTS.Title,
    COLORS.Title,
    CONTENTS.title.x,
    CONTENTS.title.y,
    CONTENTS.title.w,
    CONTENTS.title.h,
    TEXT_FLAGS,
  );

  gr.GdiDrawText(
    CONTENTS.artist.text,
    FONTS.Body,
    CONTENTS.artist.is_hover ? COLORS.Accent : COLORS.Body,
    CONTENTS.artist.x,
    CONTENTS.artist.y,
    CONTENTS.artist.w,
    CONTENTS.artist.h,
    TEXT_FLAGS,
  );

  gr.GdiDrawText(
    CONTENTS.album.text,
    FONTS.Body,
    CONTENTS.album.is_hover ? COLORS.Accent : COLORS.Body,
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
      COLORS.Body,
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
    COLORS.bg,
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
function _element_trace(x, y, ele) {
  return x >= ele.x && x <= ele.x + ele.w && y >= ele.y && y <= ele.y + ele.h;
}

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
    if (_element_trace(x, y, CONTENTS.artist)) {
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
  // console.log(reason);
  console.log("==========  on_playback_stop: " + reason);
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
  // 释放测量用的临时 Image
  if (_measureImg) {
    _measureImg.ReleaseGraphics(_measureGr);
    if (typeof _measureImg.Dispose === "function") _measureImg.Dispose();
  }

  // 释放星星图标
  for (let key in STAR_ICONS) {
    if (STAR_ICONS[key] && typeof STAR_ICONS[key].Dispose === "function") {
      STAR_ICONS[key].Dispose();
    }
  }

  // 释放来源图标缓存
  for (let key in SOURCE_IMG_CACHE) {
    const img = SOURCE_IMG_CACHE[key];
    if (img && typeof img.Dispose === "function") {
      img.Dispose();
    }
  }
}
