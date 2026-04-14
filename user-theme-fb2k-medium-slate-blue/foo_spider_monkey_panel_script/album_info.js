/**
 * @file album_info.js
 * @author XYSRe
 * @created 2025-12-28
 * @updated 2026-02-06
 * @version 1.8.8
 * @description 专辑资料面板 (优化版：Flags 详解 + 单行/多行排版分离 + 布局逻辑优化)
 * 几个常用开关：
 * SHOW_COVER 设置封面是否显示
 * COVER_SCALE 封面比例
 * SHOW_ARTIST_COVER 是否显示艺人封面
 */

"use strict";

// =========================================================================
// 1. 脚本定义与基础工具 (Script Definition & Utils)
// =========================================================================

window.DefineScript("Album Info", {
    author: "XYSRe",
    version: "1.8.8",
    options: { grab_focus: false }
});

const DPI = window.DPI;

/**
 * 根据 DPI 缩放像素值
 * @param {number} size - 原始像素值 (基于 96 DPI)
 * @returns {number} 缩放后的像素值
 */
function _scale(size) {
    return Math.round((size * DPI) / 72);
}

function _RGB(r, g, b) {
    return 0xff000000 | (r << 16) | (g << 8) | b;
}

function _ARGB(a, r, g, b) {
    return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

/**
 * 安全加载图片
 */
function load_image(path) {
    return utils.IsFile(path) ? gdi.Image(path) : null;
}

// =========================================================================
// 2. 全局常量配置 (Configuration)
// =========================================================================

// [路径]
const LINK_ICONS_DIR = fb.ProfilePath + "\\user-theme-fb2k-medium-slate-blue\\imgs\\Links\\";

// [布局参数]
const SCROLL_STEP = _scale(30);         // 滚轮步长
const MAX_BUFFER_H = _scale(2000);      // 文本缓冲最大高度 (防显存溢出)
const MARGIN = _scale(10);              // 通用内边距
const LINE_H = _scale(16);              // 基础行高
const LINE_SPACE = _scale(8);           // 行间距
const COVER_SCALE = 1 / 1;              // 封面宽高比 (正方形)
const SHOW_COVER = true;                // 开关：是否显示封面
const SHOW_ARTIST_COVER = false;        // 显示封面情况下，是否显示艺人图片
const ICON_SIZE = _scale(10);           // 信息行小图标尺寸
const SOURCE_ICON_SIZE = _scale(10);    // 来源/格式图标尺寸
const DEFAULT_SOURCE_ICON_FILENAME = "cloud.png"; // 默认来源图标

// --- GDI 文本绘制标志位说明 (Flags) ---
// 详见: http://msdn.microsoft.com/en-us/library/dd162498(VS.85).aspx
const DT_LEFT         = 0x00000000; // 左对齐
const DT_CENTER       = 0x00000001; // 水平居中
const DT_RIGHT        = 0x00000002; // 右对齐
const DT_VCENTER      = 0x00000004; // 垂直居中 (仅限单行)
const DT_BOTTOM       = 0x00000008; // 底部对齐
const DT_WORDBREAK    = 0x00000010; // 自动换行
const DT_NOPREFIX     = 0x00000800; // 禁用 '&' 转义
const DT_EDITCONTROL  = 0x00002000; // 编辑控件样式 (显示部分最后一行)
const DT_END_ELLIPSIS = 0x00008000; // 超出显示省略号
const DT_SINGLELINE   = 0x00000020; // 单行模式

// --- 预设组合样式 ---
// 1. 多行文本 (标题/风格): 左对齐 + 自动换行 + 省略号 + 无转义
const MULTI_LINE_FLAGS = DT_LEFT | DT_WORDBREAK | DT_END_ELLIPSIS | DT_NOPREFIX;
// 2. 单行文本 (艺人/日期): 左对齐 + 垂直居中 + 省略号 + 无转义
const ONE_LINE_FLAGS = DT_LEFT | DT_VCENTER | DT_END_ELLIPSIS | DT_NOPREFIX;
// 3. 按钮: 双居中 + 无转义 + 自动换行
const BTN_STYLE_FLAGS   = DT_CENTER | DT_VCENTER | DT_NOPREFIX | DT_WORDBREAK;
// 4. 音质标识: 双居中 + 单行
const BADGE_TEXT_ALIGN = DT_CENTER | DT_VCENTER | DT_SINGLELINE;

// =========================================================================
// 3. 视觉样式与资源 (Theme & Resources)
// =========================================================================

/**
 * 计算背景色 (自动变暗)
 * 公式：亮度 * 0.2，如果是纯白则转换为冷灰
 * @param {number} color - 原始颜色整数
 */
function getDimColor(color) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    // 特殊处理：纯白色 (#FFFFFF) -> 冷灰色 (#393940)
    if (r === 255 && g === 255 && b === 255) {
        return 0xff000000 | (57 << 16) | (57 << 8) | 64;
    }
    // 通用公式：乘以 0.2 并取整
    const r2 = Math.round(r * 0.2);
    const g2 = Math.round(g * 0.2);
    const b2 = Math.round(b * 0.2);
    return 0xff000000 | (r2 << 16) | (g2 << 8) | b2;
}

const COLORS = {
    // --- 基础界面配色 ---
    Bg:        window.GetColourCUI(3),                  // CUI 全局 背景 颜色
    Title:     window.GetColourCUI(1),                  // CUI 全局 选中文案 颜色
    Accent:    window.GetColourCUI(6),                  // CUI 全局 Active item 颜色
    Accent1:   window.GetColourCUI(4),                  // CUI 全局 select item 背景 颜色
    Body:      window.GetColourCUI(0),                  // CUI 全局 Item 颜色
    Dim:       window.GetColourCUI(0),                  // 非激活态文字颜色
    BtnNormal: window.GetColourCUI(1),                  // 按钮常态
    BtnHover:  window.GetColourCUI(6),                  // 按钮悬停
    Scroll:    _RGB(149, 149, 149),                     // 滚动条颜色  
    // ===== 基础音质 =====
    silver:   _RGB(178, 180, 188), // AQ-CD   冷灰
    teal:     _RGB(155, 160, 200), // AQ-CD+  紫调冷灰蓝

    // ===== Studio / Pro =====
    green:   _RGB(120, 190, 182), // AQ-ST   冷静青绿（Studio Cyan）

    // ===== Hi-Res（传统黄 × 现代 UI）=====
    amber:    _RGB(195, 173, 100), // AQ-HR   驯化琥珀黄
    gold:     _RGB(214, 194, 127), // AQ-HR+  亮阶琥珀

    // ===== 极限音质 =====
    titanium: _RGB(230, 232, 240), // AQ-UHR  冷白
    purple:   _RGB(127, 90, 240),  // AQ-DSD  主题紫

    // ===== Fallback =====
    fallback: _RGB(115, 115, 115), // LOSSY   稍亮的中灰，保证可读性

    // ===== Dolby =====
    dolby_lossy: _RGB(100, 165, 215),  // DD / DD+ 柔和科技蓝
    dolby_hd:    _RGB(130, 195, 255),  // TrueHD / Atmos 高亮但不刺眼      
};

const CUI_GLOBAL_FONT = window.GetFontCUI(0).Name;     // CUI 通用项字体
const CUI_TEXT_FONT = window.GetFontCUI(0, "{19F8E0B3-E822-4F07-B200-D4A67E4872F9}").Name; // NG Playlist 字体

const FONTS = {
    Title:          gdi.Font(CUI_GLOBAL_FONT, _scale(18), 1), // Bold
    Body:           gdi.Font(CUI_TEXT_FONT, _scale(12), 0),
    ButtonNormal:   gdi.Font(CUI_GLOBAL_FONT, _scale(12), 0),
    ButtonSelected: gdi.Font(CUI_GLOBAL_FONT, _scale(12), 1), // Bold
    BadgeLabel:     gdi.Font(CUI_GLOBAL_FONT, _scale(8), 1),  // Bold for Badge
    Info:           gdi.Font(CUI_GLOBAL_FONT, _scale(9), 0)    
};

// 图标资源
const LINK_ICONS = {
    "Artist":   load_image(LINK_ICONS_DIR + "users-round.png"),
    "Genres":   load_image(LINK_ICONS_DIR + "circle-small.png"),
    "Date":     load_image(LINK_ICONS_DIR + "calendar.png"),
    "Language": load_image(LINK_ICONS_DIR + "languages.png"),
    "Edition":  load_image(LINK_ICONS_DIR + "badge.png"),
};

// 来源图标映射
const SOURCE_ICON_MAP = {
    "CD": "disc-2.png",
    "SACD": "sacd.png",
    "SACD (CD LAYER)": "sacd.png",
    "JAPAN FIRST PRESS": "disc-3.png",
    "WEB": "cloud.png",
    "TIDAL": "Tidal.png",
    "QOBUZ": "Qobuz.png",
    "HDTRACKS": "HDtracks.png",
    "MORA": "mora.png",
    "APPLE MUSIC": "AppleMusic.png",
    "AMAZON MUSIC": "AmazonMusic.png",
    "DEEZER": "Deezer.png",
    "GENIUS": "Genius.png",
    "NETEASE": "NetEase.png",
    "QQ MUSIC": "QQMusic.png",
    "7DIGITAL": "7digital.png",
    "BANDCAMP": "Bandcamp.png",
    "SOUNDCLOUD": "SoundCloud.png"
};

// 语言映射表
const LANGUAGE_MAP = {
    "chi": "Chinese", "zho": "Chinese", "zh": "Chinese",
    "yue": "Cantonese",
    "jpn": "Japanese", "ja": "Japanese",
    "eng": "English", "en": "English",
    "kor": "Korean", "ko": "Korean",
    "vie": "Vietnamese", "vi": "Vietnamese",
    "fre": "French", "fra": "French", "fr": "French",
    "ger": "German", "deu": "German", "de": "German",
    "ita": "Italian", "it": "Italian",
    "spa": "Spanish", "es": "Spanish",
    "rus": "Russian", "ru": "Russian",
    "und": "Undetermined", "zxx": "Instrumental"
};

// =========================================================================
// 4. 全局状态与缓存 (State & Cache)
// =========================================================================

// 数据状态
let current_album_key = null;       // 当前显示的专辑 Key (去重用)
let albumData = null;               // 当前解析好的专辑数据
const ALBUM_CACHE = new Map();      // LRU 缓存
const CACHE_MAX_SIZE = 50;   
const SOURCE_IMG_CACHE = {};        // 来源图标缓存

// 封面与轮播
let imgList = [];                   // 封面列表
let curImgIndex = 0;                // 当前封面索引
let imgTimer = null;                // 轮播计时器
const IMG_CYCLE_MS = 8000;          // 轮播间隔 ms

// 视图与交互状态
let showTracklist = false;          // False=介绍, True=曲目
let scrollY = 0;                    
let maxScrollY = 0;             
let textImg = null;                 // 离屏渲染缓冲图 (GdiBitmap)
let errorText = "请选择或播放歌曲..."; 
let isCoverFit = false;         
let g_activeElement = null;         // [状态机] 当前激活的 UI 元素

// 布局计算变量 (动态更新)
let title_h = LINE_H;               
let title_w = LINE_H;               
let genres_h = LINE_H;              
let cover_h = 0;
let edition_w = 0;                  // GDI/GDI+ 计算容差缓存
let source_w = 0;
let line_w = 0;
let line_start_y = 0;
let header_height = 0;              
let view_w = 0;                     
let view_h = 0;                     

// UI 元素 (按钮)
const elements = {
    descBtn:      { displayText: "Description", x: 0, y: 0, w: 0, h: 0, is_hover: false, tooltip: "专辑介绍"  },
    tracklistBtn: { displayText: "Tracklist", x: 0, y: 0, w: 0, h: 0, is_hover: false, tooltip: "专辑曲目"  }
};

// 音质标识状态
let currentAQBadge = null;
let currentAQBadgeRect = { x: 0, y: 0, w: 0, h: 0, is_hover: false, tooltip: ""};
let currentSourceIcon = { x: 0, y: 0, w: SOURCE_ICON_SIZE, h: SOURCE_ICON_SIZE, img: null, is_hover: false, tooltip: "" };

// 音质标识样式类
class AQBadgeStyle {
    constructor(label, color, desc) {
        this.label = label;
        this.color = color;                  // 前景色 (文字/边框)
        this.bgColor = getDimColor(color);   // 自动计算背景色
        this.desc = desc;
    }
}

// 音质标识布局
const AQ_BADGE_LAYOUT = {
    paddingX: _scale(4),
    paddingY: _scale(4),
    radius:   _scale(4),
    borderW:  _scale(1) 
};

// 音质标识定义
const AQ_BADGES = {
    CD:      new AQBadgeStyle("AQ-CD",  COLORS.silver,   "16bit / 44.1kHz"),
    CD_PLUS: new AQBadgeStyle("AQ-CD+", COLORS.teal,     "24bit / 44.1kHz"),
    ST:      new AQBadgeStyle("AQ-ST",  COLORS.green,    "24bit / 48kHz"),
    HR:      new AQBadgeStyle("AQ-HR",  COLORS.amber,    "24bit / 88.2k-96k"),
    HR_PLUS: new AQBadgeStyle("AQ-HR+", COLORS.gold,     "24bit / 176k-192k"),
    UHR:     new AQBadgeStyle("AQ-UHR", COLORS.titanium, "≥352.8kHz (DXD)"),
    DSD:     new AQBadgeStyle("AQ-DSD", COLORS.purple,   "Native DSD"),
    LOSSY:   new AQBadgeStyle("LOSSY",  COLORS.fallback, "Compressed"),
    UNKNOWN: new AQBadgeStyle("UNKNOWN",COLORS.fallback, "Unknown"),
    // 杜比系列
    DD:      new AQBadgeStyle("AQ-DD",   COLORS.dolby_lossy, "Dolby Digital (AC3)"),
    DD_PLUS: new AQBadgeStyle("AQ-DD+",  COLORS.dolby_lossy, "Dolby Digital Plus"),
    TRUEHD:  new AQBadgeStyle("AQ-THD",  COLORS.dolby_hd,    "Dolby TrueHD (Lossless)"),
    ATMOS:   new AQBadgeStyle("AQ-ATMOS",COLORS.dolby_hd,    "Dolby Atmos"), 
};

// =========================================================================
// 5. TitleFormatting & UI Utils
// =========================================================================

// TitleFormat 定义
const tf_album_key = fb.TitleFormat("%date%%album%$meta(EDITION)$meta(discsubtitle)"); 
const tf_album_title = fb.TitleFormat("%album%");
const tf_album_edition = fb.TitleFormat("$meta(EDITION)");   
const tf_album_description = fb.TitleFormat("$meta(ALBUMDESCRIPTION)");
const tf_album_tracklist = fb.TitleFormat("$meta(TRACKLIST)");
const tf_album_genres = fb.TitleFormat("$meta(GENRE)");
const tf_album_date = fb.TitleFormat("$meta(DATE)");
const tf_album_language = fb.TitleFormat("$meta(LANGUAGE)");
const tf_album_source = fb.TitleFormat("$if2($meta(SOURCE),WEB)");
const tf_album_artist = fb.TitleFormat("%album artist%");

// AQ 音质参数提取 TF
const tf_codec = fb.TitleFormat("%codec%");
const tf_samplerate = fb.TitleFormat("%samplerate%");
const tf_bitdepth = fb.TitleFormat("%__bitspersample%");

// Tooltip 封装
const tooltip = window.CreateTooltip(CUI_GLOBAL_FONT, _scale(13));
tooltip.SetMaxWidth(1200);

function _tt(value) {
    if (tooltip.Text !== value) {
        tooltip.Text = value;
        tooltip.Activate();
    }
}

// [单例优化] 文本测量工具
let _measureImg = null;
let _measureGr = null;

// =========================================================================
// 6. 核心逻辑 (Core Logic: Loading, Calculation)
// =========================================================================

/**
 * [核心] 加载数据与刷新
 * @param {FbMetadbHandle} metadb - 歌曲句柄
 */
function reload_album_data(metadb) {
    if (!metadb) return;

    const album_key = tf_album_key.EvalWithMetadb(metadb);
    const safe_album_key = album_key.replace(/[\\\/:*?"<>|]/g, "_");
    
    // 缓存检查 (如果 Key 没变，无需重新解析数据)
    if (current_album_key === safe_album_key) return; 
    current_album_key = safe_album_key;
    
    scrollY = 0;
    maxScrollY = 0;
    
    const cacheEntry = get_album_cache_entry(safe_album_key, metadb);
    albumData = cacheEntry;
    
    // 音质标识独立处理，不缓存进 albumData, 有些专辑是混合音质
    const newAQBadge = get_aq_badge_state(metadb);
    if (currentAQBadge !== newAQBadge) {
        currentAQBadge = newAQBadge;
    }

    errorText = albumData ? "" : "暂无专辑资料";

    load_album_images(metadb);
    update_source_icon(albumData.source);

    if (window.Width > 0) {
        update_layout_metrics();
        create_text_buffer();
        window.Repaint();
    }
}

// 获取或创建 LRU 缓存条目
function get_album_cache_entry(safe_album_key, metadb) {
    if (ALBUM_CACHE.has(safe_album_key)) {
        const entry = ALBUM_CACHE.get(safe_album_key);
        ALBUM_CACHE.delete(safe_album_key); 
        ALBUM_CACHE.set(safe_album_key, entry);
        return entry;
    }
    
    let newData = {
        title: tf_album_title.EvalWithMetadb(metadb),
        edition: tf_album_edition.EvalWithMetadb(metadb),
        description: tf_album_description.EvalWithMetadb(metadb),
        tracklist: tf_album_tracklist.EvalWithMetadb(metadb),
        genres: tf_album_genres.EvalWithMetadb(metadb),
        date: tf_album_date.EvalWithMetadb(metadb),
        artist: tf_album_artist.EvalWithMetadb(metadb),
        language: get_language_name(tf_album_language.EvalWithMetadb(metadb)),
        source: tf_album_source.EvalWithMetadb(metadb).trim().toUpperCase(),        
        aliases: []
    };

    if (ALBUM_CACHE.size >= CACHE_MAX_SIZE) {
        const oldestKey = ALBUM_CACHE.keys().next().value;
        ALBUM_CACHE.delete(oldestKey);
    }
    ALBUM_CACHE.set(safe_album_key, newData);

    return newData;
}

// 音质分级判断逻辑
function get_aq_badge_state(metadb) {
    if (!metadb) return null;

    const codec = tf_codec.EvalWithMetadb(metadb).toUpperCase();
    const sr = parseInt(tf_samplerate.EvalWithMetadb(metadb));
    let bits = parseInt(tf_bitdepth.EvalWithMetadb(metadb));

    if (isNaN(bits)) bits = 0;

    if (codec.indexOf("DSD") !== -1 || codec.indexOf("DST") !== -1) return AQ_BADGES.DSD;

    // --- 杜比格式判定 ---
    // TrueHD (无损)
    if (codec === "TRUEHD") {
        return AQ_BADGES.TRUEHD;
    }
    // E-AC3 (Dolby Digital Plus)
    if (codec === "E-AC3") {
        return AQ_BADGES.DD_PLUS;
    }
    // AC3 (Dolby Digital)
    if (codec === "AC3" || codec === "ATSC A/52") {
        return AQ_BADGES.DD;
    }
    
    // --- 常规 PCM 判定 ---
    if (["MP3", "AAC", "VORBIS", "OPUS", "MUSEPACK"].includes(codec)) return AQ_BADGES.LOSSY;

    if (sr >= 352800) return AQ_BADGES.UHR;
    if (sr >= 176400) return AQ_BADGES.HR_PLUS;
    if (sr >= 88200) return AQ_BADGES.HR;
    if (sr === 48000 && bits >= 24) return AQ_BADGES.ST;
    if (sr === 44100 && bits >= 24) return AQ_BADGES.CD_PLUS;
    if (bits === 16 && sr >= 44100 && sr <= 48000) return AQ_BADGES.CD;

    return AQ_BADGES.CD;
}

// 更新布局指标 (Height, Width, Positions)
function update_layout_metrics() {
    // 没有播放歌曲的时候数据为空
    if (!albumData) return;

    cover_h = SHOW_COVER ? Math.floor(window.Width * COVER_SCALE) : 0;
    line_w = window.Width - MARGIN * 4;  
    line_start_y = cover_h + MARGIN;

    // 1. 计算标题高度
    if (albumData.title) {
        const measureOne = measure_string("M", FONTS.Title, line_w, MULTI_LINE_FLAGS);
        const measureFull = measure_string(albumData.title, FONTS.Title, line_w, MULTI_LINE_FLAGS);
        
        title_h = measureFull.Height;
        const limitHeight = Math.ceil(measureOne.Height * 2);
        title_h = Math.min(limitHeight, title_h);
        title_w = measureFull.Width;
    } else {
        title_h = LINE_H * 2;
        title_w = LINE_H * 2;
    }

    // 2. 计算标识 (Edition/Badge) 宽度
    if(albumData.edition){
        // _scale(1) 修正 GDI 绘制与计算的像素偏差
        edition_w = measure_string(albumData.edition, FONTS.Body, line_w, ONE_LINE_FLAGS).Width + _scale(1);
    }
    if(currentAQBadge) {
        const badgeTextSize = measure_string(currentAQBadge.label, FONTS.BadgeLabel, line_w, ONE_LINE_FLAGS);
        currentAQBadgeRect.w = badgeTextSize.Width + AQ_BADGE_LAYOUT.paddingX;
        currentAQBadgeRect.h = badgeTextSize.Height + AQ_BADGE_LAYOUT.paddingY;
    }

    // 3. 计算风格高度
    if (albumData.genres) {
        const measureOne = measure_string("M", FONTS.Body, line_w, MULTI_LINE_FLAGS);
        const measureFull = measure_string(albumData.genres, FONTS.Body, line_w, MULTI_LINE_FLAGS);
        
        genres_h = measureFull.Height;
        const limitHeight = Math.ceil(measureOne.Height * 2); 
        genres_h = Math.min(limitHeight, genres_h);
    } else {
        genres_h = LINE_H;
    }

    // 4. 堆叠计算 Header 高度
    let stackY = line_start_y;
    stackY += title_h + LINE_SPACE; // 专辑标题
    stackY += LINE_H + LINE_SPACE;  // 标识行
    stackY += LINE_H + LINE_SPACE;  // 艺人
    stackY += genres_h + LINE_SPACE;// 风格
    stackY += LINE_H + LINE_SPACE;  // 日期
    stackY += LINE_H * 2;           // Tab 按钮预留
    
    header_height = stackY; 

    view_w = Math.max(1, window.Width - MARGIN * 2);
    view_h = Math.max(1, window.Height - header_height - MARGIN);

    // 设置 Tab 按钮位置
    elements.descBtn.y = header_height - elements.descBtn.h * 2;
    elements.tracklistBtn.y = elements.descBtn.y;
}

// 计算 Tab 按钮尺寸
function calc_elements_btn_size() {
    const pM = measure_string(elements.descBtn.displayText, FONTS.ButtonSelected, window.Width, BTN_STYLE_FLAGS);
    elements.descBtn.w = pM.Width;
    elements.descBtn.h = pM.Height;
    
    const dM = measure_string(elements.tracklistBtn.displayText, FONTS.ButtonSelected, window.Width, BTN_STYLE_FLAGS);
    elements.tracklistBtn.w = dM.Width;
    elements.tracklistBtn.h = dM.Height;

    elements.descBtn.x = MARGIN * 2.5;
    elements.tracklistBtn.x = MARGIN * 3.5 + elements.descBtn.w;
}

// 创建离屏文本缓冲 (Text Buffer)
function create_text_buffer() {
    if (textImg && typeof textImg.Dispose === "function") textImg.Dispose();
    textImg = null;
    
    if (!albumData || view_w <= 0 || view_h <= 0) return;

    const text = showTracklist 
        ? (albumData.tracklist || "暂无曲目信息 (需TAG (TRACKLIST)支持)") 
        : (albumData.description || "暂无专辑简介 (需TAG (ALBUMDESCRIPTION)支持)");
    
    const measured = measure_string(text, FONTS.Body, view_w, MULTI_LINE_FLAGS);
    let fullH = Math.ceil(measured.Height);
    fullH = Math.max(1, Math.min(fullH, MAX_BUFFER_H));
    
    try {
        textImg = gdi.CreateImage(view_w, fullH);
        const gr = textImg.GetGraphics();
        gr.GdiDrawText(text, FONTS.Body, COLORS.Body, 0, 0, view_w, fullH, MULTI_LINE_FLAGS);
        textImg.ReleaseGraphics(gr);
    } catch (e) {
        console.log("Buffer Error: " + e);
        textImg = null;
    }

    maxScrollY = Math.max(0, fullH - view_h);
    if (scrollY > maxScrollY) scrollY = maxScrollY;
}

// 文本测量辅助函数
function measure_string(text, font, maxWidth, text_style_flag) {
    if (!_measureImg) {
        _measureImg = gdi.CreateImage(1, 1);
        _measureGr = _measureImg.GetGraphics();
    }
    const result = _measureGr.MeasureString(text, font, 0, 0, maxWidth, MAX_BUFFER_H, text_style_flag || MULTI_LINE_FLAGS);
    return {
        Width: Math.ceil(result.Width),
        Height: Math.ceil(result.Height) - _scale(1)
    };
}

// 语言代码转换为普通标识
// function get_language_name(code) {
//     console.log(code)
//     if (!code) return "";
//     let firstCode = Array.isArray(code) ? code[0] : code.split(/[;,]/)[0];
//     const cleanCode = firstCode.trim().toLowerCase();
//     return LANGUAGE_MAP[cleanCode] || code;
// }
// 语言代码转换为普通标识（兼容多值）
function get_language_name(code) {
    // console.log(code);
    if (!code) return "";

    // 统一处理为数组：数组直接用，字符串按 ; 或 , 分割
    let codeList = Array.isArray(code) ? code : code.split(/[;,]/);
    
    // 遍历每个代码，清洗并转换为语言名称
    let nameList = codeList.map(item => {
        const cleanCode = item.trim().toLowerCase();
        // 有映射则用映射值，无则保留清洗后的原代码
        return LANGUAGE_MAP[cleanCode] || cleanCode;
    });

    // 拼接结果（用分号分隔，保持和输入一致的分隔风格）
    return nameList.join('; ');
}


// =========================================================================
// 7. 渲染与绘图 (Rendering & Drawing)
// =========================================================================

function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    
    calc_elements_btn_size();
    update_layout_metrics();
    create_text_buffer(); 
}

function on_paint(gr) {
    gr.SetSmoothingMode(0); 
    gr.FillSolidRect(0, 0, window.Width, window.Height, COLORS.Bg);

    if (!albumData) {
        gr.GdiDrawText(errorText, FONTS.Body, COLORS.Title, 0, window.Height / 2, window.Width, window.Height, BTN_STYLE_FLAGS);
        return;
    }

    // --- 1. 绘制封面 (仅当 SHOW_COVER 为 true 时) ---
    if (SHOW_COVER && imgList.length > 0 && imgList[curImgIndex]) {
        let currentImg = imgList[curImgIndex];
        if (isCoverFit) {
            drawImageFit(gr, currentImg, 0, 0, window.Width, cover_h);
        } else {
            drawImageCover(gr, currentImg, 0, 0, window.Width, cover_h);
        }
        
        // 绘制页码 (半透明圆角矩形)
        if (imgList.length > 1) {
            let pageText = (curImgIndex + 1) + " / " + imgList.length;
            gr.SetSmoothingMode(4); // 开启抗锯齿
            gr.FillRoundRect(MARGIN, cover_h - MARGIN - LINE_H, _scale(50), LINE_H, _scale(6), _scale(6), 0x99000000);
            gr.SetSmoothingMode(0); 
            gr.GdiDrawText(pageText, FONTS.Body, 0xFFFFFFFF, MARGIN, cover_h - MARGIN - LINE_H, _scale(50), LINE_H, DT_CENTER | DT_VCENTER);
        }
    }

    let currentY = line_start_y; 
    
    // --- 2. 绘制文本信息 ---
    
    // 标题 (多行)
    gr.GdiDrawText(albumData.title, FONTS.Title, COLORS.Title, MARGIN, currentY, line_w, title_h, MULTI_LINE_FLAGS);
    
    // 版本 & 来源 & 音质标识行
    // 判断是否有内容需要绘制，避免空行
    if (albumData.edition || currentSourceIcon.img || currentAQBadge) {
        currentY += title_h + LINE_SPACE;        
        
        // 版本图标
        if (LINK_ICONS.Edition) {
            gr.DrawImage(LINK_ICONS.Edition, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Edition.Width, LINK_ICONS.Edition.Height);
        }

        let currentLineX = MARGIN * 2.5;
        
        // 版本文字
        if (albumData.edition) {
            gr.GdiDrawText(albumData.edition, FONTS.Body, COLORS.Title, currentLineX, currentY, edition_w, LINE_H, ONE_LINE_FLAGS);
            currentLineX += edition_w + _scale(2);
        }

        // 来源图标
        if (currentSourceIcon.img) {
            currentSourceIcon.x = currentLineX;
            currentSourceIcon.y = currentY + Math.ceil(((LINE_H - currentSourceIcon.h) / 2));
            gr.SetInterpolationMode(7); // HighQualityBicubic
            gr.DrawImage(currentSourceIcon.img, currentSourceIcon.x, currentSourceIcon.y, currentSourceIcon.w, currentSourceIcon.h, 0, 0, currentSourceIcon.img.Width, currentSourceIcon.img.Height);
            currentLineX += SOURCE_ICON_SIZE + _scale(2);
        }

        // AQ 音质徽章
        if(currentAQBadge){
            // 更新坐标
            currentAQBadgeRect.x = currentLineX;
            currentAQBadgeRect.y = currentY + Math.ceil(((LINE_H - currentAQBadgeRect.h) / 2));;
            gr.SetSmoothingMode(4); 
            
            // 背景 & 边框
            gr.FillRoundRect(currentAQBadgeRect.x, currentAQBadgeRect.y, currentAQBadgeRect.w, currentAQBadgeRect.h, AQ_BADGE_LAYOUT.radius, AQ_BADGE_LAYOUT.radius, currentAQBadge.bgColor);
            
            gr.SetSmoothingMode(0); 
            // 文字
            gr.GdiDrawText(currentAQBadge.label, FONTS.BadgeLabel, currentAQBadge.color, currentAQBadgeRect.x, currentAQBadgeRect.y, currentAQBadgeRect.w, currentAQBadgeRect.h, BADGE_TEXT_ALIGN);
        }

        currentY += LINE_H + LINE_SPACE;
    } else {
        currentY += title_h + LINE_SPACE;
    }

    // 艺人 (单行)
    if (LINK_ICONS.Artist) gr.DrawImage(LINK_ICONS.Artist, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Artist.Width, LINK_ICONS.Artist.Height);
    gr.GdiDrawText(albumData.artist || "Unknown Artist", FONTS.Body, COLORS.Title, MARGIN * 2.5, currentY, line_w, LINE_H, ONE_LINE_FLAGS);
    currentY += LINE_H + LINE_SPACE;    

    // 风格 (多行)
    if (LINK_ICONS.Genres) gr.DrawImage(LINK_ICONS.Genres, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Genres.Width, LINK_ICONS.Genres.Height);
    gr.GdiDrawText(albumData.genres || "Unknown Genre", FONTS.Body, COLORS.Title, MARGIN * 2.5, currentY, line_w, genres_h, MULTI_LINE_FLAGS);
    currentY += genres_h + LINE_SPACE;   // 2 是测量误差修正补偿

    // 日期 & 语言 (单行)
    if (LINK_ICONS.Date) gr.DrawImage(LINK_ICONS.Date, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Date.Width, LINK_ICONS.Date.Height);
    gr.GdiDrawText(albumData.date || "-", FONTS.Body, COLORS.Title, MARGIN * 2.5, currentY, line_w, LINE_H, ONE_LINE_FLAGS);

    if (LINK_ICONS.Language) gr.DrawImage(LINK_ICONS.Language, MARGIN * 13, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Language.Width, LINK_ICONS.Language.Height);
    gr.GdiDrawText(albumData.language || "-", FONTS.Body, COLORS.Title, MARGIN * 14.5, currentY, line_w, LINE_H, ONE_LINE_FLAGS);

    // --- 3. 绘制 Tab 按钮 ---
    const dBtn = elements.descBtn;
    const tBtn = elements.tracklistBtn;
    const isDescMode = !showTracklist;
    
    const dColor = isDescMode ? COLORS.BtnNormal : (dBtn.is_hover ? COLORS.BtnHover : COLORS.Dim);
    const tColor = !isDescMode ? COLORS.BtnNormal : (tBtn.is_hover ? COLORS.BtnHover : COLORS.Dim);

    gr.GdiDrawText(dBtn.displayText, isDescMode ? FONTS.ButtonSelected : FONTS.ButtonNormal, dColor, dBtn.x, dBtn.y, dBtn.w, dBtn.h, BTN_STYLE_FLAGS);
    gr.GdiDrawText(tBtn.displayText, !isDescMode ? FONTS.ButtonSelected : FONTS.ButtonNormal, tColor, tBtn.x, tBtn.y, tBtn.w, tBtn.h, BTN_STYLE_FLAGS);

    gr.SetSmoothingMode(4); 
    const activeBtn = isDescMode ? dBtn : tBtn;
    gr.DrawLine(activeBtn.x, header_height - MARGIN, activeBtn.x + activeBtn.w, header_height - MARGIN, _scale(2), COLORS.Accent1);
    gr.DrawLine(MARGIN, header_height - MARGIN, window.Width - MARGIN, header_height - MARGIN, _scale(1), COLORS.Dim);
    gr.SetSmoothingMode(0);

    // --- 4. 绘制滚动内容 ---
    if (textImg) {
        const sourceH = Math.min(view_h, textImg.Height - scrollY);
        if (sourceH > 0) {
            gr.DrawImage(textImg, MARGIN, header_height, view_w, sourceH, 0, scrollY, view_w, sourceH);
        }
        if (maxScrollY > 0) {
            const barH = Math.max(_scale(20), (view_h / textImg.Height) * view_h);
            const barY = header_height + (scrollY / maxScrollY) * (view_h - barH);
            gr.FillRoundRect(window.Width - _scale(3), barY, _scale(2.5), barH, _scale(1), _scale(1), COLORS.Scroll);
        }
    }
}

// 封面图片加载逻辑
function load_album_images(metadb) {
    if (imgList && imgList.length > 0) {
        imgList.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }
    // 封面开关控制
    if (!SHOW_COVER) return;

    imgList = [];
    curImgIndex = 0;
    // const AlbumArtId = {
    //     front: 0,
    //     back: 1,
    //     disc: 2,
    //     icon: 3,
    //     artist: 4
    // };
    const tryTypes = [0, 1, 2];
    if (SHOW_ARTIST_COVER) {tryTypes.push(4)};
    
    for (const typeId of tryTypes) {
        const internalArt = utils.GetAlbumArtV2(metadb, typeId);
        if (internalArt) {
            imgList.push(internalArt);
        }
    }
    manage_cycle_timer();
}

// 图片轮播定时器
function manage_cycle_timer() {
    if (imgTimer) {
        window.ClearInterval(imgTimer);
        imgTimer = null;
    }
    if (imgList.length > 1) {
        imgTimer = window.SetInterval(() => {
            curImgIndex++;
            if (curImgIndex >= imgList.length) curImgIndex = 0;
            window.RepaintRect(0, 0, window.Width, cover_h);
        }, IMG_CYCLE_MS);
    }
}

// 来源图标缓存更新
function update_source_icon(sourceText) {
    let filename = SOURCE_ICON_MAP[sourceText];
    if (!filename) filename = DEFAULT_SOURCE_ICON_FILENAME;

    let img = get_source_image_from_cache(filename);
    if (!img && filename !== DEFAULT_SOURCE_ICON_FILENAME) {
        img = get_source_image_from_cache(DEFAULT_SOURCE_ICON_FILENAME);
    }
    currentSourceIcon.img = img;
    currentSourceIcon.tooltip = sourceText;
}

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

function drawImageFit(gr, img, x, y, w, h) {
    if (!img || w <= 0 || h <= 0) return;
    const ratio = Math.min(w / img.Width, h / img.Height);
    const newW = img.Width * ratio;
    const newH = img.Height * ratio;
    const offX = x + (w - newW) / 2;
    const offY = y + (h - newH) / 2;
    gr.DrawImage(img, offX, offY, newW, newH, 0, 0, img.Width, img.Height);
}

function drawImageCover(gr, img, x, y, w, h) {
    if (!img) return;
    const ratio = Math.max(w / img.Width, h / img.Height);
    const srcW = w / ratio;
    const srcH = h / ratio;
    const srcX = (img.Width - srcW) / 2;
    const srcY = (img.Height - srcH) / 2;
    gr.DrawImage(img, x, y, w, h, srcX, srcY, srcW, srcH);
}

// =========================================================================
// 8. 交互事件 (Event Handlers)
// =========================================================================

function _element_trace(x, y, ele) {
    return (x >= ele.x && x <= ele.x + ele.w && y >= ele.y && y <= ele.y + ele.h);
}

function on_mouse_wheel(step) {
    if (!textImg || maxScrollY <= 0) return;
    scrollY -= step * SCROLL_STEP;
    scrollY = Math.max(0, Math.min(scrollY, maxScrollY));
    window.RepaintRect(0, header_height, window.Width, window.Height - header_height);
}

// [核心] 状态机：on_mouse_move
function on_mouse_move(x, y) {
    let target = null;

    // 1. 检测 Tab 按钮
    if (_element_trace(x, y, elements.descBtn)) {
        target = elements.descBtn;
    } else if (_element_trace(x, y, elements.tracklistBtn)) {
        target = elements.tracklistBtn;
    } else if(_element_trace(x, y , currentSourceIcon)){
    // 2. 检测音源图标
        target = currentSourceIcon;
    } 
    else if(_element_trace(x, y , currentAQBadgeRect) && currentAQBadge){
    // 3. 检测AQ音质图标
        currentAQBadgeRect.tooltip = currentAQBadge.desc;
        target = currentAQBadgeRect;
    } 

    // 3. 状态切换
    if (g_activeElement === target) return; // 没变，退出

    // 旧元素复位
    if (g_activeElement) {
        g_activeElement.is_hover = false;
        window.RepaintRect(g_activeElement.x, g_activeElement.y, g_activeElement.w, g_activeElement.h);
    }

    // 新元素激活
    if (target) {
        target.is_hover = true;
        window.RepaintRect(target.x, target.y, target.w, target.h);
        _tt(target.tooltip || "");
        window.SetCursor(32649); // Hand
    } else {
        _tt("");
        window.SetCursor(32512); // Arrow
    }

    g_activeElement = target;
}

function on_mouse_leave() {
    if (g_activeElement) {
        g_activeElement.is_hover = false;
        window.RepaintRect(g_activeElement.x, g_activeElement.y, g_activeElement.w, g_activeElement.h);
        g_activeElement = null;
    }
    _tt("");
    window.SetCursor(32512);
}

function on_mouse_lbtn_up(x, y) {
    // 封面点击 -> 切换下一张图 (仅在开启封面显示时有效)
    if (SHOW_COVER && y < cover_h && imgList.length > 1) {
        curImgIndex++;
        if (curImgIndex >= imgList.length) curImgIndex = 0;
        manage_cycle_timer(); 
        window.RepaintRect(0, 0, window.Width, cover_h);
        return; 
    }
    
    if (_element_trace(x, y, elements.descBtn)) {
        showTracklist = false;
        create_text_buffer();
        window.RepaintRect(0, elements.descBtn.y, window.Width, window.Height - elements.descBtn.y);
        return;
    } 
    else if (_element_trace(x, y, elements.tracklistBtn)) {
        showTracklist = true;
        create_text_buffer();
        window.RepaintRect(0, elements.descBtn.y, window.Width, window.Height - elements.descBtn.y); 
        return;
    }
}

// 播放/选中 逻辑
function on_playback_new_track(metadb) {
    reload_album_data(metadb);
}

function on_playlist_items_selection_change() {
    let selection = fb.GetSelection(); 
    if (selection) {
        reload_album_data(selection);
    } else {
        if (fb.IsPlaying) reload_album_data(fb.GetNowPlaying());
    }
}

// 脚本资源清理
function on_script_unload() {
    if (imgTimer) {
        window.ClearInterval(imgTimer);
        imgTimer = null;
    }
    if (imgList && imgList.length > 0) {
        imgList.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }
    if (textImg && typeof textImg.Dispose === "function") textImg.Dispose();
    
    for (let key in LINK_ICONS) {
        if (LINK_ICONS[key] && typeof LINK_ICONS[key].Dispose === "function") {
            LINK_ICONS[key].Dispose();
        }
    }
    if (_measureImg) {
        _measureImg.ReleaseGraphics(_measureGr);
        if (typeof _measureImg.Dispose === "function") _measureImg.Dispose();
    }
    if (ALBUM_CACHE) ALBUM_CACHE.clear();

    for (let key in SOURCE_IMG_CACHE) {
        const img = SOURCE_IMG_CACHE[key];
        if (img && typeof img.Dispose === 'function') {
            img.Dispose();
        }
    }
}

// =========================================================================
// 9. 初始化 (Initialization)
// =========================================================================

let initSelection = fb.GetSelection();
if (initSelection) {
    reload_album_data(initSelection);
} else if (fb.IsPlaying) {
    reload_album_data(fb.GetNowPlaying());
}