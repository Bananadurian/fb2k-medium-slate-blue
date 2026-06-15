/**
 * @description 专辑信息面板: 封面轮播、版本/来源/AQ标识、艺人、风格、日期、语言、简介/曲目切换。接入 THEME.TEXT 样式预设。
 */

"use strict";

window.DrawMode = 1;

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");
include("lib/flag.js");
include("lib/icons.js");


window.DefineScript("Album Info", {
    author: "XRE",
    version: "2.1.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS }
});

// =========================================================================
// 全局常量配置 (Configuration)
// =========================================================================


// 布局常量别名 (值来自 THEME.LAYOUT)
const SCROLL_STEP = THEME.LAYOUT.SCROLL_STEP;
const ICON_SIZE = THEME.LAYOUT.ICON_SIZE;
const IMG_CYCLE_MS = THEME.LAYOUT.IMG_CYCLE_MS;

// 面板配置开关
const PANEL_CFG = {
    coverAspectRatio:      1 / 1,   // 封面宽高比
    showCover:       true,    // 是否显示封面
    showArtistCover: false,   // 是否显示艺人封面
    coverMode: "fit",   // 封面缩放模式 (fit=完整显示, cover=裁剪填充)
    cornerRadius: THEME.LAYOUT.CORNER_RADIUS, // 封面圆角半径, 0=直角
    coverPadding: {top:_scale(10), right:_scale(10), bottom: _scale(10), left:_scale(10)}, // 封面内边距
};


// =========================================================================
// 视觉样式与资源 (Theme & Resources)
// =========================================================================


const COL = THEME.COL;
const TS = THEME.TEXT;


// 语言映射表见 lib/flag.js LANGUAGE_MAP

// =========================================================================
// 全局状态与缓存 (State & Cache)
// =========================================================================

// 数据状态
let currentAlbumKey = null;       // 当前显示的专辑 Key (去重用)
let albumData = null;               // 当前解析好的专辑数据
const albumCache = new LRUCache(THEME.CFG.CACHE_SIZE);
// 封面与轮播
const carousel = {
    images: [],
    index: 0,
    timer: null,
    rawTypes: [],
    fallbackMetadb: null,
};
let lastCarouselTimerKey = ""; // 轮播定时器签名，未变化则不重建 interval
let deferredCoverTimer = null; // 延后 fallback 任务句柄，切歌时可取消旧任务
let deferredPaintEnsureTimer = null; // 避免在 on_paint 内做重型封面处理

// 视图与交互状态
let isShowingTracklist = false;          // false=介绍 (Description), true=曲目 (Tracklist)
let scrollY = 0;
let maxScrollY = 0;
let currentText = "";               // 当前显示的文本内容
let fullTextH = 0;                  // 文本总高度
let errorText = "Select or play a track...";
let activeElement = null;         // [状态机] 当前激活的 UI 元素

let panelW = window.Width;
let panelH = window.Height;
// 布局计算变量 (动态更新)
let titleH = _getFontLineHeight(TS.title.font);
let genresH = _getFontLineHeight(TS.body.font);
let editionW = 0;
let currentLanguageFlagImg = null;      // 当前语言对应的国旗图标
let lastLanguageCode = null;             // 缓存 code，不变则跳过 loadFlagImage

const elements = {
    descBtn:      { displayText: "Description", x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: ""  },
    tracklistBtn: { displayText: "Tracklist", x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: ""  },
    // 来源图标 (布局 + 悬停状态)，img 由 IconManager 管理
    sourceIcon:   { x: 0, y: 0, w: THEME.CFG.SOURCE_ICON_SIZE, h: THEME.CFG.SOURCE_ICON_SIZE, img: null, isHover: false, tooltip: "" },
    // 音质标识 (布局 + 悬停状态)，w/h 动态测量
    badgeElement: { x: 0, y: 0, w: 0,
      h: _getFontLineHeight(TS.label.font)
        + THEME.CFG.AQ_BADGE.PADDING.top
        + THEME.CFG.AQ_BADGE.PADDING.bottom,
      isHover: false, tooltip: "" },
    // source icon + badge 合并点击区 (包围盒)
    badgeGroup:   { x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: "" },
};

// 音质标识状态
let currentAQBadge = null;

// 区域定义 — 每个区域自带 layout/draw 逻辑，layoutSections 垂直堆叠
// 离屏滚动文本 padding — section 与渲染器共享，保证布局一致
const SCROLL_TEXT_PADDING = { top: _scale(6), right: _scale(10), bottom: _scale(6), left: _scale(10) };

const SECTIONS = [
    {
        name: "cover",
        padding: PANEL_CFG.coverPadding,
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        visible: PANEL_CFG.showCover,
        getContentHeight() {
            const rawH = Math.floor(panelW * PANEL_CFG.coverAspectRatio);
            const p = PANEL_CFG.coverPadding;
            return Math.max(0, rawH - p.top - p.bottom);
        },
        draw(gr) {
            if (!carousel.images || carousel.images.length === 0) return;
            const count = carousel.images.length;
            const idx = ((carousel.index % count) + count) % count;
            if (!carousel.images[idx]) scheduleEnsureFromPaint();
            const img = carousel.images[idx];
            if (!img) return;
            gr.DrawImage(img, this.content.x, this.content.y, this.content.w, this.content.h,
                0, 0, img.Width, img.Height);
            if (count > 1) {
                const ph = _getFontLineHeight(TS.body.font);
                const pp = _scale(10);
                _drawPageIndicator(gr, carousel.index, count,
                    this.content.x + pp,
                    this.content.y + this.content.h - pp - ph,
                    _scale(50), ph, TS.body.font, TS.body.color,
                    _argb(153, (COL.BG >> 16) & 0xff, (COL.BG >> 8) & 0xff, COL.BG & 0xff));
            }
        },
    },
    {
        name: "title",
        padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        visible: true,
        getContentHeight() { return titleH; },
        draw(gr) {
            _drawText(gr, TS.title, albumData.title,
                this.content.x, this.content.y, this.content.w, titleH);
        },
    },
    {
        name: "badge",
        padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
        icon:    iconMgr.get('brands', 'Edition'),
        iconGap: _scale(5),
        itemGap: _scale(2),
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        visible: true,
        getContentHeight() { return Math.max(elements.badgeElement.h, _getFontLineHeight(TS.body.font)); },
        draw(gr) { drawBadgeSection(gr, this); },
    },
    {
        name: "artist",
        padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
        icon:    iconMgr.get('brands', 'Artist'),
        iconGap: _scale(5),
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        visible: true,
        getContentHeight() { return _getFontLineHeight(TS.body.font); },
        draw(gr) {
            drawIconTextSection(gr, this, albumData.artist || "Unknown Artist",
                TS.bodyLine.font, LEFT_LINE_FLAGS);
        },
    },
    {
        name: "genres",
        padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
        icon:    iconMgr.get('brands', 'Genres'),
        iconGap: _scale(5),
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        visible: true,
        getContentHeight() { return genresH; },
        draw(gr) {
            drawIconTextSection(gr, this, albumData.genres || "Unknown Genre",
                TS.body.font, LEFT_WRAP_FLAGS);
        },
    },
    {
        name: "dateLang",
        padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
        icon:    iconMgr.get('brands', 'Date'),
        iconGap: _scale(5),
        icon2:   iconMgr.get('brands', 'Language'),
        colGap:  _scale(100),
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        visible: true,
        getContentHeight() { return _getFontLineHeight(TS.body.font); },
        draw(gr) { drawDateLangSection(gr, this); },
    },
    {
        name: "tab",
        padding: { left: _scale(25), top: 0, right: _scale(10), bottom: 0 },
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        visible: true,
        getContentHeight() { return _getFontLineHeight(TS.tab.font) * 2; },
        draw(gr) { drawTabSection(gr, this); },
    },
    {
        name: "scrollText",
        fillRemaining: true,
        padding: SCROLL_TEXT_PADDING,
        rect:    { x: 0, y: 0, w: 0, h: 0 },
        content: { x: 0, y: 0, w: 0, h: 0 },
        visible: true,
        getContentHeight() { return 0; },
        draw(gr) {
            if (!currentText) return;
            scrollText.draw(gr, scrollY, this.content.x, this.content.y, this.content.w);
            if (maxScrollY > 0) {
                _drawScrollbar(gr, this.content.h, fullTextH, scrollY, maxScrollY,
                    panelW, this.content.y, COL.SCROLLBAR);
            }
        },
    },
];

const SEC = {};
SECTIONS.forEach(function(sec) { SEC[sec.name] = sec; });

// 离屏滚动文本渲染器
const scrollText = createScrollTextRenderer(TS.body.font, TS.body.color, TS.body.flags, SCROLL_TEXT_PADDING);

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
let tooltip = _createDefaultTooltip();


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

    // 缓存检查 (同专辑时仅刷新曲目级状态)
    if (currentAlbumKey === safeAlbumKey) {
        if (panelW > 0) {
            const latestSource = albumSourceTf.EvalWithMetadb(metadb).trim().toUpperCase();
            if (albumData) {
                albumData.source = latestSource;
            }
            updateSourceIcon(latestSource);

            let coverReloaded = false;
            if (PANEL_CFG.showCover) {
                carousel.fallbackMetadb = metadb;
                let needsCoverRefresh = !carousel.images || carousel.images.length === 0;
                if (!needsCoverRefresh && carousel.images.length === 1 && !carousel.images[0]) {
                    needsCoverRefresh = true;
                }
                if (needsCoverRefresh) {
                    loadAlbumImages(metadb);
                    coverReloaded = true;
                }
            }

            updateLayoutMetrics();
            if (coverReloaded) {
                window.Repaint();
            } else if (window.IsTransparent) {
                window.Repaint();
            } else {
                window.RepaintRect(0, SEC.cover.rect.h, panelW, panelH - SEC.cover.rect.h);
            }
        }
        return;
    }
    currentAlbumKey = safeAlbumKey;
    
    scrollY = 0;
    maxScrollY = 0;
    
    albumData = getAlbumCacheEntry(safeAlbumKey, metadb);

    errorText = albumData ? "" : "No album information available";

    updateSourceIcon(albumData.source);
    updateLanguageFlag();

    if (panelW > 0) {
        updateLayoutMetrics();
        loadAlbumImages(metadb);
        createTextBuffer();
        window.Repaint();
    }
}

/**
 * 获取或创建 LRU 缓存条目 (命中直接返回，未命中从 TitleFormat 提取)
 * @param {string} safeAlbumKey - 去重用的专辑 Key
 * @param {FbMetadbHandle} metadb
 * @returns {Object} albumData
 */
function getAlbumCacheEntry(safeAlbumKey, metadb) {
    const cached = albumCache.get(safeAlbumKey);
    if (cached !== undefined) return cached;

    const rawLang = albumLanguageTf.EvalWithMetadb(metadb);
    let newData = {
        title: albumTitleTf.EvalWithMetadb(metadb),
        edition: albumEditionTf.EvalWithMetadb(metadb),
        description: albumDescriptionTf.EvalWithMetadb(metadb),
        tracklist: albumTracklistTf.EvalWithMetadb(metadb),
        genres: albumGenresTf.EvalWithMetadb(metadb),
        date: albumDateTf.EvalWithMetadb(metadb),
        artist: albumArtistTf.EvalWithMetadb(metadb),
        language: getLanguageName(rawLang),
        languageFlagCode: resolveLanguageCode(rawLang),
        source: albumSourceTf.EvalWithMetadb(metadb).trim().toUpperCase(),
        aliases: []
    };

    albumCache.set(safeAlbumKey, newData);
    return newData;
}

/**
 * 音质分级判断 (委托给共享库 _resolveBadge)
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


/** @param {Object} sec - SECTIONS item with icon/iconGap */
function drawIconTextSection(gr, sec, text, font, flags) {
    const cx = sec.content.x, cy = sec.content.y, cw = sec.content.w, ch = sec.content.h;
    if (sec.icon) {
        _drawIcon(gr, sec.icon, cx, cy, ch);
    }
    const tx = cx + ICON_SIZE + sec.iconGap;
    gr.GdiDrawText(text, font, COL.FG, tx, cy, cw - ICON_SIZE - sec.iconGap, ch, flags);
}

/** @param {Object} sec - SECTIONS badge item */
function drawBadgeSection(gr, sec) {
    const cx = sec.content.x, cy = sec.content.y, ch = sec.content.h;
    if (sec.icon) {
        _drawIcon(gr, sec.icon, cx, cy, ch);
    }
    if (albumData.edition) {
        const tx = cx + ICON_SIZE + sec.iconGap;
        _drawText(gr, TS.bodyLine, albumData.edition,
            tx, cy, editionW, ch);
    }
    if (elements.sourceIcon.img) {
        gr.SetInterpolationMode(7);
        gr.DrawImage(elements.sourceIcon.img, elements.sourceIcon.x, elements.sourceIcon.y,
            elements.sourceIcon.w, elements.sourceIcon.h, 0, 0,
            elements.sourceIcon.img.Width, elements.sourceIcon.img.Height);
    }
    if (currentAQBadge) {
        gr.SetSmoothingMode(4);
        gr.FillRoundRect(elements.badgeElement.x, elements.badgeElement.y, elements.badgeElement.w, elements.badgeElement.h,
            THEME.CFG.AQ_BADGE.RADIUS, THEME.CFG.AQ_BADGE.RADIUS, currentAQBadge.bgColor);
        gr.SetSmoothingMode(0);
        gr.GdiDrawText(currentAQBadge.label, TS.labelCenter.font, currentAQBadge.color,
            elements.badgeElement.x, elements.badgeElement.y, elements.badgeElement.w, elements.badgeElement.h, CENTER_LINE_FLAGS);
    }
}

/** @param {Object} sec - SECTIONS dateLang item with icon/icon2/colGap */
function drawDateLangSection(gr, sec) {
    const cx = sec.content.x, cy = sec.content.y, ch = sec.content.h, cw = sec.content.w;
    // 第一列: date
    if (sec.icon) {
        _drawIcon(gr, sec.icon, cx, cy, ch);
    }
    const tx1 = cx + ICON_SIZE + sec.iconGap;
    _drawText(gr, TS.bodyLine, albumData.date || "-",
        tx1, cy, sec.colGap - sec.iconGap - ICON_SIZE, ch);
    // 第二列: language (国旗优先，无国旗回退通用语言图标)
    const cx2 = cx + sec.colGap;
    if (currentLanguageFlagImg) {
        _drawIcon(gr, currentLanguageFlagImg, cx2, cy, ch);
    } else if (sec.icon2) {
        _drawIcon(gr, sec.icon2, cx2, cy, ch);
    }
    const tx2 = cx2 + ICON_SIZE + sec.iconGap;
    _drawText(gr, TS.bodyLine, albumData.language || "-",
        tx2, cy, cw - sec.colGap - ICON_SIZE - sec.iconGap, ch);
}

/** @param {Object} sec - SECTIONS tab item */
function drawTabSection(gr, sec) {
    const dBtn = elements.descBtn;
    const tBtn = elements.tracklistBtn;
    const isDescMode = !isShowingTracklist;

    const dColor = isDescMode ? COL.FG : (dBtn.isHover ? COL.FRAME : COL.FG);
    const tColor = !isDescMode ? COL.FG : (tBtn.isHover ? COL.FRAME : COL.FG);

    gr.GdiDrawText(dBtn.displayText, isDescMode ? TS.tab.font : TS.body.font,
        dColor, dBtn.x, dBtn.y, dBtn.w, dBtn.h, CENTER_WRAP_FLAGS);
    gr.GdiDrawText(tBtn.displayText, !isDescMode ? TS.tab.font : TS.body.font,
        tColor, tBtn.x, tBtn.y, tBtn.w, tBtn.h, CENTER_WRAP_FLAGS);

    const activeBtn = isDescMode ? dBtn : tBtn;
    _drawTabIndicator(gr, activeBtn, panelW, _scale(10), COL.FRAME, COL.FG);
}

/**
 * 核心布局计算: 测量文本尺寸 → layoutSections → 计算图标/徽章坐标
 * 在 on_size / reloadAlbumData 中触发
 */
function updateLayoutMetrics() {
    if (!albumData) return;

    // 1. 测量宽度 (基于 title section padding，统一所有文本区域测量宽度)
    const titleP = SEC.title.padding;
    const lineW = Math.max(1, panelW - titleP.left - titleP.right);

    // 2. 计算标题高度 (最多 2 行)
    if (albumData.title) {
        titleH = _measureText(albumData.title, TS.title, lineW).Height;
        titleH = Math.min(titleH, _getFontLineHeight(TS.title.font) * 2);
    } else {
        titleH = _getFontLineHeight(TS.title.font) * 2;
    }

    // 3. 计算标识 (Edition/Badge) 宽度
    if (albumData.edition) {
        editionW = _measureText(albumData.edition, TS.bodyLine, lineW).Width + _scale(1);
    }
    if (currentAQBadge) {
        const p = THEME.CFG.AQ_BADGE.PADDING;
        const badgeTextSize = _measureText(currentAQBadge.label, TS.label, lineW);
        elements.badgeElement.w = badgeTextSize.Width + p.left + p.right;
    } else {
        elements.badgeElement.w = 0;
    }

    // 4. 计算风格高度 (最多 2 行)
    if (albumData.genres) {
        genresH = _measureText(albumData.genres, TS.body, lineW).Height;
        genresH = Math.min(genresH, _getFontLineHeight(TS.body.font) * 2);
    } else {
        genresH = _getFontLineHeight(TS.body.font);
    }

    // 5. 更新 badge 区域可见性
    SEC.badge.visible = !!(albumData.edition || elements.sourceIcon.img || currentAQBadge);

    // 6. 一次性布局所有 section (cover → title → ... → tab → scrollText)
    layoutSections(SECTIONS, panelW, panelH);

    // 7. 限制 editionW 不超过剩余空间
    if (albumData.edition) {
        const sec = SEC.badge;
        let maxW = sec.content.w - ICON_SIZE - sec.iconGap;
        if (elements.sourceIcon.img) maxW -= THEME.CFG.SOURCE_ICON_SIZE + sec.itemGap;
        if (currentAQBadge) maxW -= elements.badgeElement.w + sec.itemGap;
        if (editionW > maxW) editionW = Math.max(0, maxW);
    }

    // 8. 计算来源图标和AQ徽章坐标 (用于命中测试)
    if (SEC.badge.visible) {
        const sec = SEC.badge;
        const badgeCx = sec.content.x + ICON_SIZE + sec.iconGap;
        const badgeCy = sec.content.y;
        const badgeCh = sec.content.h;
        let iconX = badgeCx;
        if (albumData.edition) {
            iconX += editionW + sec.itemGap;
        }
        elements.sourceIcon.x = iconX;
        elements.sourceIcon.y = badgeCy + Math.ceil((badgeCh - elements.sourceIcon.h) / 2);
        if (currentAQBadge) {
            elements.badgeElement.x = elements.sourceIcon.img ? iconX + THEME.CFG.SOURCE_ICON_SIZE + sec.itemGap : iconX;
            elements.badgeElement.y = badgeCy + Math.ceil((badgeCh - elements.badgeElement.h) / 2);
        }
        // 合并 source icon + AQ badge 为一个 hit-test 区域 (避免 tooltip 闪烁)
        const gLeft = elements.sourceIcon.img ? elements.sourceIcon.x : elements.badgeElement.x;
        const gRight = currentAQBadge ? elements.badgeElement.x + elements.badgeElement.w : elements.sourceIcon.x + elements.sourceIcon.w;
        elements.badgeGroup.x = gLeft;
        elements.badgeGroup.y = badgeCy;
        elements.badgeGroup.w = Math.max(1, gRight - gLeft);
        elements.badgeGroup.h = badgeCh;
    }

    // 9. 设置 Tab 按钮位置
    const tabCx = SEC.tab.content.x;
    elements.descBtn.x = tabCx;
    elements.descBtn.y = SEC.tab.content.y + Math.ceil((SEC.tab.content.h - elements.descBtn.h) / 2);
    elements.tracklistBtn.x = tabCx + elements.descBtn.w + _scale(5);
    elements.tracklistBtn.y = elements.descBtn.y;

    manageCycleTimer();
}

/**
 * 预测量 Tab 按钮尺寸 (用于 updateLayoutMetrics 中定位)
 */
function calcElementsBtnSize() {
    const pM = _measureText(elements.descBtn.displayText, TS.tab, panelW);
    elements.descBtn.w = pM.Width;
    elements.descBtn.h = pM.Height;

    const dM = _measureText(elements.tracklistBtn.displayText, TS.tab, panelW);
    elements.tracklistBtn.w = dM.Width;
    elements.tracklistBtn.h = dM.Height;
}

/**
 * 离屏渲染文本缓冲: 测量内容高度 → 更新滚动状态 → 预渲染位图
 * 文本内容或面板尺寸变化时调用
 */
function createTextBuffer() {
    currentText = "";
    fullTextH = 0;

    if (!albumData || SEC.scrollText.content.w <= 0 || SEC.scrollText.content.h <= 0) return;

    currentText = isShowingTracklist
        ? (albumData.tracklist || "No tracklist available (requires TRACKLIST tag)")
        : (albumData.description || "No description available (requires ALBUMDESCRIPTION tag)");

    const measured = _measureText(currentText, TS.body, SEC.scrollText.content.w);
    fullTextH = Math.max(1, Math.min(Math.ceil(measured.Height), _scale(2000)));

    maxScrollY = Math.max(0, fullTextH - SEC.scrollText.content.h);
    if (scrollY > maxScrollY) scrollY = maxScrollY;
    scrollText.ensure(currentText, panelW, fullTextH);
}



function ensureCarouselImageReady(nextIndex, carouselState, reason) {
    if (!carouselState || !carouselState.images || carouselState.images.length === 0) return false;

    // _carouselNext/_manageCarousel 可能给出越界索引，统一归一化避免切图失败
    const count = carouselState.images.length;
    const index = ((nextIndex % count) + count) % count;
    if (carouselState.images[index]) return true;

    const targetW = Math.max(1, SEC.cover.content.w);
    const targetH = Math.max(1, SEC.cover.content.h);

    if (
        carouselState.fallbackMetadb &&
        carouselState.images.length === 1 &&
        carouselState.rawTypes &&
        carouselState.rawTypes.length > 0
    ) {
        for (let i = 0; i < carouselState.rawTypes.length; i++) {
            const typeId = carouselState.rawTypes[i];
            let internalArt = utils.GetAlbumArtV2(carouselState.fallbackMetadb, typeId);
            if (!internalArt) continue;

            const processed = _createRoundedImage(internalArt, targetW, targetH, PANEL_CFG.cornerRadius, PANEL_CFG.coverMode);
            if (typeof internalArt.Dispose === "function") internalArt.Dispose();
            internalArt = null;

            if (processed) {
                carouselState.images[0] = processed;
                carouselState.rawTypes = [typeId];
                carouselState.index = 0;
                return true;
            }
        }
        return false;
    }

    if (!carouselState.fallbackMetadb || !carouselState.rawTypes || carouselState.rawTypes.length <= index) return false;

    const targetType = carouselState.rawTypes[index];
    let art = utils.GetAlbumArtV2(carouselState.fallbackMetadb, targetType);
    if (!art) return false;

    const processed = _createRoundedImage(art, targetW, targetH, PANEL_CFG.cornerRadius, PANEL_CFG.coverMode);
    if (typeof art.Dispose === "function") art.Dispose();
    art = null;

    if (!processed) return false;
    carouselState.images[index] = processed;
    return true;
}
/**
 * 将语言代码（ISO 639-1/2）转为显示名称，支持 // ; , 分隔的多语言。
 * 映射表见 lib/flag.js LANGUAGE_MAP。
 * @param {string|string[]} rawLang — "eng", "jpn;chi", "eng//cho", ["eng","jpn"]
 * @returns {string} 如 "English"、"Japanese"、"English; Japanese"
 */
function getLanguageName(rawLang) {
    if (!rawLang) return "";

    // 统一处理为数组：数组直接用，字符串按 // ; , 分割
    let codeList = Array.isArray(rawLang) ? rawLang : rawLang.split(/\/\/|[;,]/);

    // 遍历每个代码，清洗并转换为语言名称
    let nameList = codeList.map(item => {
        const cleanCode = item.trim().toLowerCase();
        // 有映射则用映射值，无则保留清洗后的原代码
        const entry = LANGUAGE_MAP[cleanCode];
        return entry ? entry.name : cleanCode;
    });

    // 拼接结果（用分号分隔，保持和输入一致的分隔风格）
    return nameList.join('; ');
}


function scheduleEnsureFromPaint() {
    if (deferredPaintEnsureTimer) return;
    deferredPaintEnsureTimer = window.SetTimeout(() => {
        deferredPaintEnsureTimer = null;
        if (!PANEL_CFG.showCover || !carousel.images || carousel.images.length === 0) return;

        const count = carousel.images.length;
        const index = ((carousel.index % count) + count) % count;
        if (carousel.images[index]) return;

        const changed = ensureCarouselImageReady(index, carousel, "paint-deferred");
        if (changed) {
            manageCycleTimer();
            window.RepaintRect(0, 0, panelW, SEC.cover.rect.h);
        }
    }, 0);
}

// =========================================================================
// 渲染与绘图 (Rendering & Drawing)
// =========================================================================

/**
 * SMP resize 回调: 重算按钮尺寸 → 布局 → 文本缓冲
 */
function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    panelW = window.Width;
    panelH = window.Height;
    
    calcElementsBtnSize();
    updateLayoutMetrics();
    createTextBuffer(); 
}

/**
 * SMP paint 回调: 背景填充 → 空状态或 section 循环绘制
 */
function on_paint(gr) {
    gr.SetSmoothingMode(0);
    if (!window.IsTransparent) gr.FillSolidRect(0, 0, panelW, panelH, COL.BG);

    if (!albumData) {
        _drawEmptyState(gr, errorText, TS.body.font, TS.body.color, panelW, panelH);
        return;
    }

    for (const sec of SECTIONS) {
        if (sec.visible) sec.draw(gr);
    }
}

/**
 * 封面图片加载: 按 typeId 尝试获取专辑封面 → 预处理圆角 → 填充 carousel
 * @param {FbMetadbHandle} metadb
 */
function loadAlbumImages(metadb) {
    if (deferredCoverTimer) {
        window.ClearTimeout(deferredCoverTimer);
        deferredCoverTimer = null;
    }

    if (carousel.images && carousel.images.length > 0) {
        carousel.images.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }

    carousel.images = [];
    carousel.index = 0;
    carousel.rawTypes = [];
    carousel.fallbackMetadb = null;

    if (!PANEL_CFG.showCover) {
        manageCycleTimer();
        return;
    }

    const tryTypes = [0, 1, 2];
    if (PANEL_CFG.showArtistCover) {
        tryTypes.push(4);
    }

    carousel.fallbackMetadb = metadb;
    const targetW = Math.max(1, SEC.cover.content.w);
    const targetH = Math.max(1, SEC.cover.content.h);

    for (const typeId of tryTypes) {
        let internalArt = utils.GetAlbumArtV2(metadb, typeId);
        if (!internalArt) continue;

        const idx = carousel.images.length;
        carousel.rawTypes.push(typeId);
        carousel.images.push(null);

        if (idx === 0) {
            const processed = _createRoundedImage(internalArt, targetW, targetH, PANEL_CFG.cornerRadius, PANEL_CFG.coverMode);
            if (processed) carousel.images[0] = processed;
        }

        if (typeof internalArt.Dispose === "function") internalArt.Dispose();
        internalArt = null;
    }

    if (carousel.images.length === 0) {
        carousel.images = [null];
        carousel.rawTypes = tryTypes.slice();
        manageCycleTimer();

        deferredCoverTimer = window.SetTimeout(() => {
            // 把 fallback 处理延后到当前帧后，优先保证首帧文字和交互响应
            deferredCoverTimer = null;
            ensureCarouselImageReady(0, carousel, "fallback-deferred");
            if (!carousel.images[0]) carousel.images = [];
            manageCycleTimer();
            window.RepaintRect(0, 0, panelW, SEC.cover.rect.h);
        }, 0);
        return;
    }

    if (!carousel.images[0]) {
        ensureCarouselImageReady(0, carousel, "initial");
    }

    manageCycleTimer();
}

/**
 * 轮播定时器管理: 比较签名 → 旧 timer 销毁 → 需要时重建 interval
 */
function manageCycleTimer() {
    const nextKey = [
        PANEL_CFG.showCover ? 1 : 0,
        carousel.images && carousel.images.length > 1 ? 1 : 0,
        SEC.cover.rect.h,
        panelW,
    ].join("|");
    if (nextKey === lastCarouselTimerKey) return;
    lastCarouselTimerKey = nextKey;
    _manageCarousel(carousel, SEC.cover.rect.h, IMG_CYCLE_MS, panelW, ensureCarouselImageReady);
}

/**
 * 来源图标更新: 通过 IconManager 获取品牌图标 → 写入 elements.sourceIcon
 * @param {string} sourceText - 已转为大写的来源文本
 */
function updateSourceIcon(sourceText) {
    elements.sourceIcon.img = iconMgr.get('brands', sourceText);
    elements.sourceIcon.tooltip = sourceText;
}

/**
 * 根据 albumData.languageFlagCode 加载语言国旗图标（预存于 getAlbumCacheEntry）
 */
function updateLanguageFlag() {
    const code = albumData ? albumData.languageFlagCode : null;
    if (code === lastLanguageCode) return;
    lastLanguageCode = code;
    currentLanguageFlagImg = code ? loadFlagImage(code) : null;
}


// =========================================================================
// 交互事件 (Event Handlers)
// =========================================================================


function on_mouse_wheel(step) {
    if (!currentText || maxScrollY <= 0) return;
    scrollY -= step * SCROLL_STEP;
    scrollY = Math.max(0, Math.min(scrollY, maxScrollY));
    window.RepaintRect(0, SEC.scrollText.rect.y, panelW, panelH - SEC.scrollText.rect.y);
}

// [核心] 状态机：on_mouse_move — hover/点击命中测试 + 局部重绘
function on_mouse_move(x, y) {
    let target = null;

    // 1. 检测 Tab 按钮
    if (_hitTest(x, y, elements.descBtn)) {
        target = elements.descBtn;
    } else if (_hitTest(x, y, elements.tracklistBtn)) {
        target = elements.tracklistBtn;
    } else if(_hitTest(x, y , elements.badgeGroup) && SEC.badge.visible){
    // 2. 检测音源/AQ 图标
        target = elements.badgeGroup;
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
        if (target === elements.badgeGroup) {
            const parts = [elements.sourceIcon.tooltip];
            if (currentAQBadge && currentAQBadge.desc) parts.push(currentAQBadge.desc);
            tooltip(parts.join(" · "));
        } else {
            tooltip(target.tooltip || "");
        }
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
    if (PANEL_CFG.showCover && y < SEC.cover.rect.y + SEC.cover.rect.h && carousel.images.length > 1) {
        _carouselNext(carousel, SEC.cover.rect.h, IMG_CYCLE_MS, panelW, ensureCarouselImageReady);
        return;
    }

    if (_hitTest(x, y, elements.descBtn)) {
        isShowingTracklist = false;
        scrollY = 0;
        createTextBuffer();
        if (window.IsTransparent) {
            window.Repaint();
        } else {
            window.RepaintRect(0, elements.descBtn.y, panelW, panelH - elements.descBtn.y);
        }
        return;
    }
    else if (_hitTest(x, y, elements.tracklistBtn)) {
        isShowingTracklist = true;
        scrollY = 0;
        createTextBuffer();
        window.RepaintRect(0, elements.descBtn.y, panelW, panelH - elements.descBtn.y);
        return;
    }
}

// 播放/选中 逻辑
function on_playback_new_track(metadb) {
    reloadAlbumData(metadb);
    if (window.IsTransparent) {
        window.SetTimeout(() => {
            window.Repaint();
        }, 0);
    }
}

function on_playback_stop(reason) {
    if (reason !== 2) {
        reloadAlbumData(resolveMetadbByMode(METADB_RESOLVE_MODE.SELECTION_FIRST));
    }
}

function on_playlist_items_selection_change() {
    const target = resolveMetadbByMode(METADB_RESOLVE_MODE.SELECTION_FIRST);
    if (target) {
        reloadAlbumData(target);
    } else {
        currentAlbumKey = null;
        albumData = null;
        errorText = "Select or play a track...";
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
    elements.badgeElement.h = _getFontLineHeight(TS.label.font)
        + THEME.CFG.AQ_BADGE.PADDING.top
        + THEME.CFG.AQ_BADGE.PADDING.bottom;
    createTextBuffer();
    window.Repaint();
}

// 脚本资源清理
function on_script_unload() {
    if (deferredPaintEnsureTimer) {
        window.ClearTimeout(deferredPaintEnsureTimer);
        deferredPaintEnsureTimer = null;
    }
    if (deferredCoverTimer) {
        window.ClearTimeout(deferredCoverTimer);
        deferredCoverTimer = null;
    }
    if (carousel.timer) {
        window.ClearInterval(carousel.timer);
        carousel.timer = null;
    }
    if (carousel.images && carousel.images.length > 0) {
        carousel.images.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }
    scrollText.dispose();
    _measureDispose();
    albumCache.clear();
}

// =========================================================================
// 初始化 (Initialization)
// =========================================================================

const initSelection = resolveMetadbByMode(METADB_RESOLVE_MODE.SELECTION_ONLY);
if (initSelection) {
    reloadAlbumData(initSelection);
} else {
    const initPlaying = resolveMetadbByMode(METADB_RESOLVE_MODE.PLAYING_ONLY);
    if (initPlaying) {
        reloadAlbumData(initPlaying);
    }
}