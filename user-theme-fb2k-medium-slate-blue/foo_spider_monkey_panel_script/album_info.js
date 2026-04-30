/**
 * @file album_info.js
 * @author XYSRe
 * @created 2025-12-28
 * @updated 2026-04-29
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
// 全局常量配置 (Configuration)
// =========================================================================


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
    isCoverFit: false,   // true=适配, false=裁剪
};


// =========================================================================
// 视觉样式与资源 (Theme & Resources)
// =========================================================================


const COL = THEME.COL;


// 图标资源
const LINK_ICONS = {
    "Artist":   _loadImage(IMGS_LINKS_DIR + "users-round.png"),
    "Genres":   _loadImage(IMGS_LINKS_DIR + "circle-small.png"),
    "Date":     _loadImage(IMGS_LINKS_DIR + "calendar.png"),
    "Language": _loadImage(IMGS_LINKS_DIR + "languages.png"),
    "Edition":  _loadImage(IMGS_LINKS_DIR + "badge.png"),
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
// 全局状态与缓存 (State & Cache)
// =========================================================================

// 数据状态
let currentAlbumKey = null;       // 当前显示的专辑 Key (去重用)
let albumData = null;               // 当前解析好的专辑数据
const albumCache = new LRUCache(THEME.CFG.CACHE_SIZE);
const sourceIconCache = new SourceIconCache(IMGS_LINKS_DIR); // 来源图标缓存

// 封面与轮播
const carousel = { images: [], index: 0, timer: null };
// IMG_CYCLE_MS 来自 THEME.LAYOUT.IMG_CYCLE_MS

// 视图与交互状态
let isShowingTracklist = false;          // False=介绍, True=曲目
let scrollY = 0;
let maxScrollY = 0;
let currentText = "";               // 当前显示的文本内容
let fullTextH = 0;                  // 文本总高度
let errorText = "请选择或播放歌曲...";
let activeElement = null;         // [状态机] 当前激活的 UI 元素

// 布局计算变量 (动态更新)
let titleH = LINE_H;               
let genresH = LINE_H;
let coverH = 0;
let editionW = 0;                  // GDI/GDI+ 计算容差缓存

let lineW = 0;
let lineStartY = 0;
let headerHeight = 0;              
let viewW = 0;                     
let viewH = 0;                     

// UI 元素 (按钮)
const elements = {
    descBtn:      { displayText: "Description", x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: "专辑介绍"  },
    tracklistBtn: { displayText: "Tracklist", x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: "专辑曲目"  }
};

// 音质标识状态
let currentAQBadge = null;
let badgeElement = { x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: ""};
let currentSourceIcon = { x: 0, y: 0, w: THEME.CFG.SOURCE_ICON_SIZE, h: THEME.CFG.SOURCE_ICON_SIZE, img: null, isHover: false, tooltip: "" };



// =========================================================================
// TitleFormatting & UI Utils
// =========================================================================

// TitleFormat 定义
const albumKeyTf = fb.TitleFormat("%date%%album%$meta(EDITION)$meta(discsubtitle)"); 
const albumTitleTf = fb.TitleFormat("%album%");
const albumEditionTf = fb.TitleFormat("$meta(EDITION)");   
const albumDescriptionTf = fb.TitleFormat("$meta(ALBUMDESCRIPTION)");
const albumTracklistTf = fb.TitleFormat("$meta(TRACKLIST)");
const albumGenresTf = fb.TitleFormat("$meta(GENRE)");
const albumDateTf = fb.TitleFormat("$meta(DATE)");
const albumLanguageTf = fb.TitleFormat("$meta(LANGUAGE)");
const albumSourceTf = fb.TitleFormat("$if2($meta(SOURCE),WEB)");
const albumArtistTf = fb.TitleFormat("%album artist%");

// AQ 音质参数提取 TF
const codecTf = fb.TitleFormat("%codec%");
const sampleRateTf = fb.TitleFormat("%samplerate%");
const bitDepthTf = fb.TitleFormat("%__bitspersample%");

// tooltip 来自 lib/interaction.js
let tooltip = _initTooltip(THEME.FONT.BODY, _scale(13), 1200);


// =========================================================================
// 核心逻辑 (Core Logic: Loading, Calculation)
// =========================================================================

/**
 * [核心] 加载数据与刷新
 * @param {FbMetadbHandle} metadb - 歌曲句柄
 */
function reloadAlbumData(metadb) {
    if (!metadb) return;

    // 音质标识独立处理，不缓存进 albumData, 有些专辑是混合音质
    const newAQBadge = resolveBadgeForTrack(metadb);
    if (currentAQBadge !== newAQBadge) {
        currentAQBadge = newAQBadge;
    }

    const albumKey = albumKeyTf.EvalWithMetadb(metadb);
    const safeAlbumKey = albumKey.replace(/[\\\/:*?"<>|]/g, "_");

    // 缓存检查 (如果 Key 没变，仅更新布局后返回)
    if (currentAlbumKey === safeAlbumKey) {
        if (window.Width > 0) {
            updateLayoutMetrics();
            window.Repaint();
        }
        return;
    }
    currentAlbumKey = safeAlbumKey;
    
    scrollY = 0;
    maxScrollY = 0;
    
    albumData = getAlbumCacheEntry(safeAlbumKey, metadb);

    errorText = albumData ? "" : "暂无专辑资料";

    loadAlbumImages(metadb);
    updateSourceIcon(albumData.source);

    if (window.Width > 0) {
        updateLayoutMetrics();
        createTextBuffer();
        window.Repaint();
    }
}

// 获取或创建 LRU 缓存条目 (使用 LRUCache 类)
function getAlbumCacheEntry(safeAlbumKey, metadb) {
    const cached = albumCache.get(safeAlbumKey);
    if (cached !== undefined) return cached;

    let newData = {
        title: albumTitleTf.EvalWithMetadb(metadb),
        edition: albumEditionTf.EvalWithMetadb(metadb),
        description: albumDescriptionTf.EvalWithMetadb(metadb),
        tracklist: albumTracklistTf.EvalWithMetadb(metadb),
        genres: albumGenresTf.EvalWithMetadb(metadb),
        date: albumDateTf.EvalWithMetadb(metadb),
        artist: albumArtistTf.EvalWithMetadb(metadb),
        language: getLanguageName(albumLanguageTf.EvalWithMetadb(metadb)),
        source: albumSourceTf.EvalWithMetadb(metadb).trim().toUpperCase(),
        aliases: []
    };

    albumCache.set(safeAlbumKey, newData);
    return newData;
}

// 音质分级判断逻辑 (委托给共享库 _resolveBadge)
function resolveBadgeForTrack(metadb) {
    if (!metadb) return null;
    return _resolveBadge(
        codecTf.EvalWithMetadb(metadb),
        sampleRateTf.EvalWithMetadb(metadb),
        bitDepthTf.EvalWithMetadb(metadb)
    );
}

// 更新布局指标 (Height, Width, Positions)
function updateLayoutMetrics() {
    // 没有播放歌曲的时候数据为空
    if (!albumData) return;

    coverH = PANEL_CFG.showCover ? Math.floor(window.Width * PANEL_CFG.coverScale) : 0;
    lineW = window.Width - MARGIN * 4;  
    lineStartY = coverH + MARGIN;

    // 1. 计算标题高度
    if (albumData.title) {
        const measureOne = _measureString("M", THEME.FONT.TITLE, lineW, MULTI_LINE_FLAGS);
        const measureFull = _measureString(albumData.title, THEME.FONT.TITLE, lineW, MULTI_LINE_FLAGS);
        
        titleH = measureFull.Height;
        const limitHeight = Math.ceil(measureOne.Height * 2);
        titleH = Math.min(limitHeight, titleH);
    } else {
        titleH = LINE_H * 2;
    }

    // 2. 计算标识 (Edition/Badge) 宽度
    if(albumData.edition){
        // _scale(1) 修正 GDI 绘制与计算的像素偏差
        editionW = _measureString(albumData.edition, THEME.FONT.BODY, lineW, ONE_LINE_FLAGS).Width + _scale(1);
    }
    if(currentAQBadge) {
        const badgeTextSize = _measureString(currentAQBadge.label, THEME.FONT.LABEL, lineW, ONE_LINE_FLAGS);
        badgeElement.w = badgeTextSize.Width + THEME.CFG.AQ_BADGE.PADDING_X;
        badgeElement.h = badgeTextSize.Height + THEME.CFG.AQ_BADGE.PADDING_Y;
    }

    // 计算来源图标和AQ徽章坐标 (用于命中测试)
    if (albumData.edition || currentAQBadge) {
        let lineY = lineStartY + titleH + LINE_SPACE;
        let iconX = MARGIN * 2.5;
        if (albumData.edition) {
            iconX += editionW + _scale(2);
        }
        currentSourceIcon.x = iconX;
        currentSourceIcon.y = lineY + Math.ceil(((LINE_H - currentSourceIcon.h) / 2));
        if (currentAQBadge) {
            badgeElement.x = currentSourceIcon.img ? iconX + THEME.CFG.SOURCE_ICON_SIZE + _scale(2) : iconX;
            badgeElement.y = lineY + Math.ceil(((LINE_H - badgeElement.h) / 2));
        }
    }

    // 3. 计算风格高度
    if (albumData.genres) {
        const measureOne = _measureString("M", THEME.FONT.BODY, lineW, MULTI_LINE_FLAGS);
        const measureFull = _measureString(albumData.genres, THEME.FONT.BODY, lineW, MULTI_LINE_FLAGS);
        
        genresH = measureFull.Height;
        const limitHeight = Math.ceil(measureOne.Height * 2); 
        genresH = Math.min(limitHeight, genresH);
    } else {
        genresH = LINE_H;
    }

    // 4. 堆叠计算 Header 高度
    let stackY = lineStartY;
    stackY += titleH + LINE_SPACE; // 专辑标题
    stackY += LINE_H + LINE_SPACE;  // 标识行
    stackY += LINE_H + LINE_SPACE;  // 艺人
    stackY += genresH + LINE_SPACE;// 风格
    stackY += LINE_H + LINE_SPACE;  // 日期
    stackY += LINE_H * 2;           // Tab 按钮预留
    
    headerHeight = stackY; 

    viewW = Math.max(1, window.Width - MARGIN * 2);
    viewH = Math.max(1, window.Height - headerHeight - MARGIN);

    // 设置 Tab 按钮位置
    elements.descBtn.y = headerHeight - elements.descBtn.h * 2;
    elements.tracklistBtn.y = elements.descBtn.y;

    manageCycleTimer();
}

// 计算 Tab 按钮尺寸
function calcElementsBtnSize() {
    const pM = _measureString(elements.descBtn.displayText, THEME.FONT.BOLD, window.Width, BTN_STYLE_FLAGS);
    elements.descBtn.w = pM.Width;
    elements.descBtn.h = pM.Height;
    
    const dM = _measureString(elements.tracklistBtn.displayText, THEME.FONT.BOLD, window.Width, BTN_STYLE_FLAGS);
    elements.tracklistBtn.w = dM.Width;
    elements.tracklistBtn.h = dM.Height;

    elements.descBtn.x = MARGIN * 2.5;
    elements.tracklistBtn.x = MARGIN * 3.5 + elements.descBtn.w;
}

// 测量文本高度并更新滚动状态
function createTextBuffer() {
    currentText = "";
    fullTextH = 0;

    if (!albumData || viewW <= 0 || viewH <= 0) return;

    currentText = isShowingTracklist
        ? (albumData.tracklist || "暂无曲目信息 (需TAG (TRACKLIST)支持)")
        : (albumData.description || "暂无专辑简介 (需TAG (ALBUMDESCRIPTION)支持)");

    const measured = _measureString(currentText, THEME.FONT.BODY, viewW, MULTI_LINE_FLAGS);
    fullTextH = Math.max(1, Math.min(Math.ceil(measured.Height), _scale(2000)));

    maxScrollY = Math.max(0, fullTextH - viewH);
    if (scrollY > maxScrollY) scrollY = maxScrollY;
}


// 语言代码转换为普通标识（兼容多值）
function getLanguageName(code) {
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
// 渲染与绘图 (Rendering & Drawing)
// =========================================================================

function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    
    calcElementsBtnSize();
    updateLayoutMetrics();
    createTextBuffer(); 
}

function on_paint(gr) {
    gr.SetSmoothingMode(0); 
    gr.FillSolidRect(0, 0, window.Width, window.Height, COL.BG);

    if (!albumData) {
        _drawEmptyState(gr, errorText, THEME.FONT.BODY, COL.FG, window.Width, window.Height);
        return;
    }

    // --- 1. 绘制滚动文本 (在封面/头部之前，溢出部分会被后续遮盖) ---
    _drawScrollText(gr, currentText, THEME.FONT.BODY, COL.FG, MARGIN, headerHeight - scrollY, viewW, fullTextH, MULTI_LINE_FLAGS, COL.BG, window.Width, headerHeight);

    // --- 2. 绘制封面 (仅当 PANEL_CFG.showCover 为 true 时) ---
    if (PANEL_CFG.showCover && carousel.images.length > 0 && carousel.images[carousel.index]) {
        let currentImg = carousel.images[carousel.index];
        if (PANEL_CFG.isCoverFit) {
            _drawImageFit(gr, currentImg, 0, 0, window.Width, coverH);
        } else {
            _drawImageCover(gr, currentImg, 0, 0, window.Width, coverH);
        }

        if (carousel.images.length > 1) {
            _drawPageIndicator(gr, carousel.index, carousel.images.length, MARGIN, coverH - MARGIN - LINE_H, _scale(50), LINE_H, THEME.FONT.BODY);
        }
    }

    let currentY = lineStartY; 
    
    // --- 3. 绘制文本信息 ---
    
    // 标题 (多行)
    gr.GdiDrawText(albumData.title, THEME.FONT.TITLE, COL.FG, MARGIN, currentY, lineW, titleH, MULTI_LINE_FLAGS);
    
    // 版本 & 来源 & 音质标识行
    if (albumData.edition || currentSourceIcon.img || currentAQBadge) {
        currentY += titleH + LINE_SPACE;

        if (LINK_ICONS.Edition) {
            gr.DrawImage(LINK_ICONS.Edition, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Edition.Width, LINK_ICONS.Edition.Height);
        }        

        // 版本图标 + 版本文字
        if (albumData.edition) {

            gr.GdiDrawText(albumData.edition, THEME.FONT.BODY, COL.FG, MARGIN * 2.5, currentY, editionW, LINE_H, ONE_LINE_FLAGS);
        }

        // 来源图标
        if (currentSourceIcon.img) {
            gr.SetInterpolationMode(7);
            gr.DrawImage(currentSourceIcon.img, currentSourceIcon.x, currentSourceIcon.y, currentSourceIcon.w, currentSourceIcon.h, 0, 0, currentSourceIcon.img.Width, currentSourceIcon.img.Height);
        }

        // AQ 音质徽章
        if(currentAQBadge){
            gr.SetSmoothingMode(4);
            gr.FillRoundRect(badgeElement.x, badgeElement.y, badgeElement.w, badgeElement.h, THEME.CFG.AQ_BADGE.RADIUS, THEME.CFG.AQ_BADGE.RADIUS, currentAQBadge.bgColor);
            gr.SetSmoothingMode(0);
            gr.GdiDrawText(currentAQBadge.label, THEME.FONT.LABEL, currentAQBadge.color, badgeElement.x, badgeElement.y, badgeElement.w, badgeElement.h, BADGE_TEXT_ALIGN);
        }

        currentY += LINE_H + LINE_SPACE;
    } else {
        currentY += titleH + LINE_SPACE;
    }

    // 艺人 (单行)
    if (LINK_ICONS.Artist) gr.DrawImage(LINK_ICONS.Artist, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Artist.Width, LINK_ICONS.Artist.Height);
    gr.GdiDrawText(albumData.artist || "Unknown Artist", THEME.FONT.BODY, COL.FG, MARGIN * 2.5, currentY, lineW, LINE_H, ONE_LINE_FLAGS);
    currentY += LINE_H + LINE_SPACE;    

    // 风格 (多行)
    if (LINK_ICONS.Genres) gr.DrawImage(LINK_ICONS.Genres, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Genres.Width, LINK_ICONS.Genres.Height);
    gr.GdiDrawText(albumData.genres || "Unknown Genre", THEME.FONT.BODY, COL.FG, MARGIN * 2.5, currentY, lineW, genresH, MULTI_LINE_FLAGS);
    currentY += genresH + LINE_SPACE;

    // 日期 & 语言 (单行)
    if (LINK_ICONS.Date) gr.DrawImage(LINK_ICONS.Date, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Date.Width, LINK_ICONS.Date.Height);
    gr.GdiDrawText(albumData.date || "-", THEME.FONT.BODY, COL.FG, MARGIN * 2.5, currentY, lineW, LINE_H, ONE_LINE_FLAGS);

    if (LINK_ICONS.Language) gr.DrawImage(LINK_ICONS.Language, MARGIN * 13, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Language.Width, LINK_ICONS.Language.Height);
    gr.GdiDrawText(albumData.language || "-", THEME.FONT.BODY, COL.FG, MARGIN * 14.5, currentY, lineW, LINE_H, ONE_LINE_FLAGS);

    // --- 4. 绘制 Tab 按钮 ---
    const dBtn = elements.descBtn;
    const tBtn = elements.tracklistBtn;
    const isDescMode = !isShowingTracklist;
    
    const dColor = isDescMode ? COL.FG : (dBtn.isHover ? COL.FRAME : COL.FG);
    const tColor = !isDescMode ? COL.FG : (tBtn.isHover ? COL.FRAME : COL.FG);

    gr.GdiDrawText(dBtn.displayText, isDescMode ? THEME.FONT.BOLD : THEME.FONT.BODY, dColor, dBtn.x, dBtn.y, dBtn.w, dBtn.h, BTN_STYLE_FLAGS);
    gr.GdiDrawText(tBtn.displayText, !isDescMode ? THEME.FONT.BOLD : THEME.FONT.BODY, tColor, tBtn.x, tBtn.y, tBtn.w, tBtn.h, BTN_STYLE_FLAGS);

    const activeBtn = isDescMode ? dBtn : tBtn;
    _drawTabIndicator(gr, activeBtn, headerHeight, window.Width, MARGIN, COL.SEL_BG, COL.FG);

    // --- 5. 绘制滚动条 ---
    if (currentText && maxScrollY > 0) {
        _drawScrollbar(gr, viewH, fullTextH, scrollY, maxScrollY, window.Width, headerHeight, COL.SCROLLBAR);
    }
}

// 封面图片加载逻辑
function loadAlbumImages(metadb) {
    if (carousel.images && carousel.images.length > 0) {
        carousel.images.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }
    // 封面开关控制
    if (!PANEL_CFG.showCover) return;

    carousel.images = [];
    carousel.index = 0;
    // 封面类型: 0=front, 1=back, 2=disc; 4=artist (可选)
    const tryTypes = [0, 1, 2];
    if (PANEL_CFG.showArtistCover) {tryTypes.push(4)};
    
    for (const typeId of tryTypes) {
        const internalArt = utils.GetAlbumArtV2(metadb, typeId);
        if (internalArt) {
            carousel.images.push(internalArt);
        }
    }
    manageCycleTimer();
}

// 图片轮播定时器
function manageCycleTimer() {
    _manageCarousel(carousel, coverH, IMG_CYCLE_MS);
}

// 来源图标缓存更新 (使用 SourceIconCache)
function updateSourceIcon(sourceText) {
    const filename = _resolveSourceIconFilename(sourceText);

    let img = sourceIconCache.get(filename);
    if (!img && filename !== DEFAULT_SOURCE_ICON_FILENAME) {
        img = sourceIconCache.get(DEFAULT_SOURCE_ICON_FILENAME);
    }
    currentSourceIcon.img = img;
    currentSourceIcon.tooltip = sourceText;
}


// =========================================================================
// 交互事件 (Event Handlers)
// =========================================================================


function on_mouse_wheel(step) {
    if (!currentText || maxScrollY <= 0) return;
    scrollY -= step * SCROLL_STEP;
    scrollY = Math.max(0, Math.min(scrollY, maxScrollY));
    window.RepaintRect(0, headerHeight, window.Width, window.Height - headerHeight);
}

// [核心] 状态机：on_mouse_move
function on_mouse_move(x, y) {
    let target = null;

    // 1. 检测 Tab 按钮
    if (_hitTest(x, y, elements.descBtn)) {
        target = elements.descBtn;
    } else if (_hitTest(x, y, elements.tracklistBtn)) {
        target = elements.tracklistBtn;
    } else if(_hitTest(x, y , currentSourceIcon)){
    // 2. 检测音源图标
        target = currentSourceIcon;
    } 
    else if(_hitTest(x, y , badgeElement) && currentAQBadge){
    // 3. 检测AQ音质图标
        badgeElement.tooltip = currentAQBadge.desc;
        target = badgeElement;
    } 

    // 3. 状态切换
    if (activeElement === target) return; // 没变，退出

    // 旧元素复位
    if (activeElement) {
        activeElement.isHover = false;
        window.RepaintRect(activeElement.x, activeElement.y, activeElement.w, activeElement.h);
    }

    // 新元素激活
    if (target) {
        target.isHover = true;
        window.RepaintRect(target.x, target.y, target.w, target.h);
        tooltip(target.tooltip || "");
        _setCursor(CURSOR_HAND); // Hand
    } else {
        tooltip("");
        _setCursor(CURSOR_ARROW); // Arrow
    }

    activeElement = target;
}

function on_mouse_leave() {
    if (activeElement) {
        activeElement.isHover = false;
        window.RepaintRect(activeElement.x, activeElement.y, activeElement.w, activeElement.h);
        activeElement = null;
    }
    tooltip("");
    _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_up(x, y) {
    // 封面点击 -> 切换下一张图 (仅在开启封面显示时有效)
    if (PANEL_CFG.showCover && y < coverH && carousel.images.length > 1) {
        _carouselNext(carousel, coverH, IMG_CYCLE_MS);
        return;
    }

    if (_hitTest(x, y, elements.descBtn)) {
        isShowingTracklist = false;
        createTextBuffer();
        window.RepaintRect(0, elements.descBtn.y, window.Width, window.Height - elements.descBtn.y);
        return;
    } 
    else if (_hitTest(x, y, elements.tracklistBtn)) {
        isShowingTracklist = true;
        createTextBuffer();
        window.RepaintRect(0, elements.descBtn.y, window.Width, window.Height - elements.descBtn.y); 
        return;
    }
}

// 播放/选中 逻辑
function on_playback_new_track(metadb) {
    reloadAlbumData(metadb);
}

function on_playback_stop(reason) {
    if (reason !== 2) {
        reloadAlbumData(fb.GetNowPlaying());
    }
}

function on_playlist_items_selection_change() {
    let selection = fb.GetSelection();
    if (selection) {
        reloadAlbumData(selection);
    } else if (fb.IsPlaying) {
        reloadAlbumData(fb.GetNowPlaying());
    } else {
        currentAlbumKey = null;
        albumData = null;
        errorText = "请选择或播放歌曲...";
        window.Repaint();
    }
}

function on_colours_changed() {
    _refreshThemeColors();
    createTextBuffer();
    window.Repaint();
}

function on_font_changed() {
    _refreshThemeFonts();
    createTextBuffer();
    window.Repaint();
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
    _disposeImageDict(LINK_ICONS);
    _measureDispose();
    albumCache.clear();
    sourceIconCache.clear();
}

// =========================================================================
// 初始化 (Initialization)
// =========================================================================

let initSelection = fb.GetSelection();
if (initSelection) {
    reloadAlbumData(initSelection);
} else if (fb.IsPlaying) {
    reloadAlbumData(fb.GetNowPlaying());
}