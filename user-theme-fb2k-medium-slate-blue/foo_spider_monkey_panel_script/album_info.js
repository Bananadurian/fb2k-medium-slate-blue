/**
 * @file album_info.js
 * @author XYSRe
 * @created 2025-12-28
 * @updated 2026-04-27
 * @version 2.0.0
 * @description 专辑信息面板: 封面轮播、版本/来源/AQ标识、艺人、风格、日期、语言、简介/曲目切换。
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");


window.DefineScript("Album Info", {
    author: "XYSRe",
    version: "2.0.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS }
});

// =========================================================================
// 2. 全局常量配置 (Configuration)
// =========================================================================

// IMGS_LINKS_DIR 来自 lib/theme.js

// 布局常量别名 (值来自 THEME.LAYOUT)
const SCROLL_STEP = THEME.LAYOUT.SCROLL_STEP;
const MARGIN = THEME.LAYOUT.MARGIN;
const LINE_H = THEME.LAYOUT.LINE_H;
const LINE_SPACE = THEME.LAYOUT.LINE_SPACE;
const ICON_SIZE = THEME.LAYOUT.ICON_SIZE;
const IMG_CYCLE_MS = THEME.LAYOUT.IMG_CYCLE_MS;

// 面板配置开关
const PANEL_CFG = {
    coverScale:      1 / 1,   // 封面宽高比
    showCover:       true,    // 是否显示封面
    showArtistCover: false,   // 是否显示艺人封面
    coverFit:        false,   // true=适配, false=裁剪
};

// DT_ 标志位和组合样式 (MULTI_LINE_FLAGS, ONE_LINE_FLAGS, BTN_STYLE_FLAGS, BADGE_TEXT_ALIGN) 来自 lib/data.js

// =========================================================================
// 3. 视觉样式与资源 (Theme & Resources)
// =========================================================================

// _getDimColor 来自 lib/utils.js

// THEME.COL / THEME.FONT 来自 lib/theme.js
const COL = THEME.COL;

// 字体来自 lib/theme.js (THEME.FONT.TITLE / .TEXT / .BTN / .HEADING / .BADGE)

// 图标资源
const LINK_ICONS = {
    "Artist":   _load_image(IMGS_LINKS_DIR + "users-round.png"),
    "Genres":   _load_image(IMGS_LINKS_DIR + "circle-small.png"),
    "Date":     _load_image(IMGS_LINKS_DIR + "calendar.png"),
    "Language": _load_image(IMGS_LINKS_DIR + "languages.png"),
    "Edition":  _load_image(IMGS_LINKS_DIR + "badge.png"),
};

// SOURCE_ICON_MAP 来自 lib/data.js

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
const ALBUM_CACHE = new LRUCache(THEME.CFG.CACHE_SIZE);
const g_sourceIconCache = new SourceIconCache(IMGS_LINKS_DIR); // 来源图标缓存

// 封面与轮播
const carousel = { images: [], index: 0, timer: null };
// IMG_CYCLE_MS 来自 THEME.LAYOUT.IMG_CYCLE_MS

// 视图与交互状态
let showTracklist = false;          // False=介绍, True=曲目
let scrollY = 0;                    
let maxScrollY = 0;             
let textImg = null;                 // 离屏渲染缓冲图 (GdiBitmap)
let errorText = "请选择或播放歌曲..."; 
let isCoverFit = PANEL_CFG.coverFit;         
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
let currentSourceIcon = { x: 0, y: 0, w: THEME.CFG.SOURCE_ICON_SIZE, h: THEME.CFG.SOURCE_ICON_SIZE, img: null, is_hover: false, tooltip: "" };

// AQBadgeStyle 和 AQ_BADGES 来自 lib/data.js

// AQ 音质标识布局 来自 THEME.CFG.AQ_BADGE

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

// _tt 来自 lib/interaction.js
let _tt = _init_tooltip(THEME.FONT.TEXT_SM, _scale(13), 1200);

// [单例优化] 文本测量工具 _measure_string / _measure_dispose 来自 lib/utils.js

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
    
    albumData = get_album_cache_entry(safe_album_key, metadb);
    
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

// 获取或创建 LRU 缓存条目 (使用 LRUCache 类)
function get_album_cache_entry(safe_album_key, metadb) {
    const cached = ALBUM_CACHE.get(safe_album_key);
    if (cached !== undefined) return cached;

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

    ALBUM_CACHE.set(safe_album_key, newData);
    return newData;
}

// 音质分级判断逻辑 (委托给共享库 _get_aq_badge_state)
function get_aq_badge_state(metadb) {
    if (!metadb) return null;
    const codec = tf_codec.EvalWithMetadb(metadb).toUpperCase();
    const sr = parseInt(tf_samplerate.EvalWithMetadb(metadb));
    let bits = parseInt(tf_bitdepth.EvalWithMetadb(metadb));
    return _get_aq_badge_state(codec, sr, bits);
}

// 更新布局指标 (Height, Width, Positions)
function update_layout_metrics() {
    // 没有播放歌曲的时候数据为空
    if (!albumData) return;

    cover_h = PANEL_CFG.showCover ? Math.floor(window.Width * PANEL_CFG.coverScale) : 0;
    line_w = window.Width - MARGIN * 4;  
    line_start_y = cover_h + MARGIN;

    // 1. 计算标题高度
    if (albumData.title) {
        const measureOne = _measure_string("M", THEME.FONT.TITLE, line_w, MULTI_LINE_FLAGS);
        const measureFull = _measure_string(albumData.title, THEME.FONT.TITLE, line_w, MULTI_LINE_FLAGS);
        
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
        edition_w = _measure_string(albumData.edition, THEME.FONT.TEXT, line_w, ONE_LINE_FLAGS).Width + _scale(1);
    }
    if(currentAQBadge) {
        const badgeTextSize = _measure_string(currentAQBadge.label, THEME.FONT.BADGE, line_w, ONE_LINE_FLAGS);
        currentAQBadgeRect.w = badgeTextSize.Width + THEME.CFG.AQ_BADGE.paddingX;
        currentAQBadgeRect.h = badgeTextSize.Height + THEME.CFG.AQ_BADGE.paddingY;
    }

    // 3. 计算风格高度
    if (albumData.genres) {
        const measureOne = _measure_string("M", THEME.FONT.TEXT, line_w, MULTI_LINE_FLAGS);
        const measureFull = _measure_string(albumData.genres, THEME.FONT.TEXT, line_w, MULTI_LINE_FLAGS);
        
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
    const pM = _measure_string(elements.descBtn.displayText, THEME.FONT.HEADING, window.Width, BTN_STYLE_FLAGS);
    elements.descBtn.w = pM.Width;
    elements.descBtn.h = pM.Height;
    
    const dM = _measure_string(elements.tracklistBtn.displayText, THEME.FONT.HEADING, window.Width, BTN_STYLE_FLAGS);
    elements.tracklistBtn.w = dM.Width;
    elements.tracklistBtn.h = dM.Height;

    elements.descBtn.x = MARGIN * 2.5;
    elements.tracklistBtn.x = MARGIN * 3.5 + elements.descBtn.w;
}

// 创建离屏文本缓冲 (使用 _create_text_buffer)
function create_text_buffer() {
    if (textImg && typeof textImg.Dispose === "function") textImg.Dispose();
    textImg = null;

    if (!albumData || view_w <= 0 || view_h <= 0) return;

    const text = showTracklist
        ? (albumData.tracklist || "暂无曲目信息 (需TAG (TRACKLIST)支持)")
        : (albumData.description || "暂无专辑简介 (需TAG (ALBUMDESCRIPTION)支持)");

    const result = _create_text_buffer(text, THEME.FONT.TEXT, COL.ITEM_TEXT, view_w, MULTI_LINE_FLAGS);
    textImg = result.img;
    const fullH = result.fullH;

    maxScrollY = Math.max(0, fullH - view_h);
    if (scrollY > maxScrollY) scrollY = maxScrollY;
}

// _measure_string 来自 lib/utils.js

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
    gr.FillSolidRect(0, 0, window.Width, window.Height, COL.BG);

    if (!albumData) {
        _draw_empty_state(gr, errorText, THEME.FONT.TEXT, COL.SELECTED_TEXT, window.Width, window.Height);
        return;
    }

    // --- 1. 绘制封面 (仅当 PANEL_CFG.showCover 为 true 时) ---
    if (PANEL_CFG.showCover && carousel.images.length > 0 && carousel.images[carousel.index]) {
        let currentImg = carousel.images[carousel.index];
        if (isCoverFit) {
            _drawImageFit(gr, currentImg, 0, 0, window.Width, cover_h);
        } else {
            _drawImageCover(gr, currentImg, 0, 0, window.Width, cover_h);
        }
        
        // 绘制页码 (半透明圆角矩形)
        if (carousel.images.length > 1) {
            let pageText = (carousel.index + 1) + " / " + carousel.images.length;
            gr.SetSmoothingMode(4); // 开启抗锯齿
            gr.FillRoundRect(MARGIN, cover_h - MARGIN - LINE_H, _scale(50), LINE_H, _scale(6), _scale(6), 0x99000000);
            gr.SetSmoothingMode(0); 
            gr.GdiDrawText(pageText, THEME.FONT.TEXT, 0xFFFFFFFF, MARGIN, cover_h - MARGIN - LINE_H, _scale(50), LINE_H, DT_CENTER | DT_VCENTER);
        }
    }

    let currentY = line_start_y; 
    
    // --- 2. 绘制文本信息 ---
    
    // 标题 (多行)
    gr.GdiDrawText(albumData.title, THEME.FONT.TITLE, COL.SELECTED_TEXT, MARGIN, currentY, line_w, title_h, MULTI_LINE_FLAGS);
    
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
            gr.GdiDrawText(albumData.edition, THEME.FONT.TEXT, COL.SELECTED_TEXT, currentLineX, currentY, edition_w, LINE_H, ONE_LINE_FLAGS);
            currentLineX += edition_w + _scale(2);
        }

        // 来源图标
        if (currentSourceIcon.img) {
            currentSourceIcon.x = currentLineX;
            currentSourceIcon.y = currentY + Math.ceil(((LINE_H - currentSourceIcon.h) / 2));
            gr.SetInterpolationMode(7); // HighQualityBicubic
            gr.DrawImage(currentSourceIcon.img, currentSourceIcon.x, currentSourceIcon.y, currentSourceIcon.w, currentSourceIcon.h, 0, 0, currentSourceIcon.img.Width, currentSourceIcon.img.Height);
            currentLineX += THEME.CFG.SOURCE_ICON_SIZE + _scale(2);
        }

        // AQ 音质徽章
        if(currentAQBadge){
            // 更新坐标
            currentAQBadgeRect.x = currentLineX;
            currentAQBadgeRect.y = currentY + Math.ceil(((LINE_H - currentAQBadgeRect.h) / 2));;
            gr.SetSmoothingMode(4); 
            
            // 背景 & 边框
            gr.FillRoundRect(currentAQBadgeRect.x, currentAQBadgeRect.y, currentAQBadgeRect.w, currentAQBadgeRect.h, THEME.CFG.AQ_BADGE.radius, THEME.CFG.AQ_BADGE.radius, currentAQBadge.bgColor);
            
            gr.SetSmoothingMode(0); 
            // 文字
            gr.GdiDrawText(currentAQBadge.label, THEME.FONT.BADGE, currentAQBadge.color, currentAQBadgeRect.x, currentAQBadgeRect.y, currentAQBadgeRect.w, currentAQBadgeRect.h, BADGE_TEXT_ALIGN);
        }

        currentY += LINE_H + LINE_SPACE;
    } else {
        currentY += title_h + LINE_SPACE;
    }

    // 艺人 (单行)
    if (LINK_ICONS.Artist) gr.DrawImage(LINK_ICONS.Artist, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Artist.Width, LINK_ICONS.Artist.Height);
    gr.GdiDrawText(albumData.artist || "Unknown Artist", THEME.FONT.TEXT, COL.SELECTED_TEXT, MARGIN * 2.5, currentY, line_w, LINE_H, ONE_LINE_FLAGS);
    currentY += LINE_H + LINE_SPACE;    

    // 风格 (多行)
    if (LINK_ICONS.Genres) gr.DrawImage(LINK_ICONS.Genres, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Genres.Width, LINK_ICONS.Genres.Height);
    gr.GdiDrawText(albumData.genres || "Unknown Genre", THEME.FONT.TEXT, COL.SELECTED_TEXT, MARGIN * 2.5, currentY, line_w, genres_h, MULTI_LINE_FLAGS);
    currentY += genres_h + LINE_SPACE;   // 2 是测量误差修正补偿

    // 日期 & 语言 (单行)
    if (LINK_ICONS.Date) gr.DrawImage(LINK_ICONS.Date, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Date.Width, LINK_ICONS.Date.Height);
    gr.GdiDrawText(albumData.date || "-", THEME.FONT.TEXT, COL.SELECTED_TEXT, MARGIN * 2.5, currentY, line_w, LINE_H, ONE_LINE_FLAGS);

    if (LINK_ICONS.Language) gr.DrawImage(LINK_ICONS.Language, MARGIN * 13, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Language.Width, LINK_ICONS.Language.Height);
    gr.GdiDrawText(albumData.language || "-", THEME.FONT.TEXT, COL.SELECTED_TEXT, MARGIN * 14.5, currentY, line_w, LINE_H, ONE_LINE_FLAGS);

    // --- 3. 绘制 Tab 按钮 ---
    const dBtn = elements.descBtn;
    const tBtn = elements.tracklistBtn;
    const isDescMode = !showTracklist;
    
    const dColor = isDescMode ? COL.SELECTED_TEXT : (dBtn.is_hover ? COL.ACTIVE_ITEM : COL.ITEM_TEXT);
    const tColor = !isDescMode ? COL.SELECTED_TEXT : (tBtn.is_hover ? COL.ACTIVE_ITEM : COL.ITEM_TEXT);

    gr.GdiDrawText(dBtn.displayText, isDescMode ? THEME.FONT.HEADING : THEME.FONT.BTN, dColor, dBtn.x, dBtn.y, dBtn.w, dBtn.h, BTN_STYLE_FLAGS);
    gr.GdiDrawText(tBtn.displayText, !isDescMode ? THEME.FONT.HEADING : THEME.FONT.BTN, tColor, tBtn.x, tBtn.y, tBtn.w, tBtn.h, BTN_STYLE_FLAGS);

    const activeBtn = isDescMode ? dBtn : tBtn;
    _draw_tab_indicator(gr, activeBtn, header_height, window.Width, MARGIN, COL.SELECTED_BG, COL.ITEM_TEXT);

    // --- 4. 绘制滚动内容 ---
    if (textImg) {
        const sourceH = Math.min(view_h, textImg.Height - scrollY);
        if (sourceH > 0) {
            gr.DrawImage(textImg, MARGIN, header_height, view_w, sourceH, 0, scrollY, view_w, sourceH);
        }
        if (maxScrollY > 0) {
            _draw_scrollbar(gr, view_h, textImg.Height, scrollY, maxScrollY, window.Width, header_height, COL.SCROLLBAR);
        }
    }
}

// 封面图片加载逻辑
function load_album_images(metadb) {
    if (carousel.images && carousel.images.length > 0) {
        carousel.images.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }
    // 封面开关控制
    if (!PANEL_CFG.showCover) return;

    carousel.images = [];
    carousel.index = 0;
    // const AlbumArtId = {
    //     front: 0,
    //     back: 1,
    //     disc: 2,
    //     icon: 3,
    //     artist: 4
    // };
    const tryTypes = [0, 1, 2];
    if (PANEL_CFG.showArtistCover) {tryTypes.push(4)};
    
    for (const typeId of tryTypes) {
        const internalArt = utils.GetAlbumArtV2(metadb, typeId);
        if (internalArt) {
            carousel.images.push(internalArt);
        }
    }
    manage_cycle_timer();
}

// 图片轮播定时器
function manage_cycle_timer() {
    _manage_carousel(carousel, cover_h, IMG_CYCLE_MS);
}

// 来源图标缓存更新 (使用 SourceIconCache)
function update_source_icon(sourceText) {
    let filename = SOURCE_ICON_MAP[sourceText];
    if (!filename) filename = DEFAULT_SOURCE_ICON_FILENAME;

    let img = g_sourceIconCache.get(filename);
    if (!img && filename !== DEFAULT_SOURCE_ICON_FILENAME) {
        img = g_sourceIconCache.get(DEFAULT_SOURCE_ICON_FILENAME);
    }
    currentSourceIcon.img = img;
    currentSourceIcon.tooltip = sourceText;
}

// _drawImageFit / _drawImageCover 来自 lib/utils.js

// =========================================================================
// 8. 交互事件 (Event Handlers)
// =========================================================================

// _element_trace 来自 lib/utils.js

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
        _setCursor(CURSOR_HAND); // Hand
    } else {
        _tt("");
        _setCursor(CURSOR_ARROW); // Arrow
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
    _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_up(x, y) {
    // 封面点击 -> 切换下一张图 (仅在开启封面显示时有效)
    if (PANEL_CFG.showCover && y < cover_h && carousel.images.length > 1) {
        _carousel_next(carousel, cover_h, IMG_CYCLE_MS);
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
    if (carousel.timer) {
        window.ClearInterval(carousel.timer);
        carousel.timer = null;
    }
    if (carousel.images && carousel.images.length > 0) {
        carousel.images.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }
    if (textImg && typeof textImg.Dispose === "function") textImg.Dispose();
    _dispose_image_dict(LINK_ICONS);
    _measure_dispose();
    ALBUM_CACHE.clear();
    g_sourceIconCache.clear();
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