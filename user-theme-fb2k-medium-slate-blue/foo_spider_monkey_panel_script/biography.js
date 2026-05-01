/**
 * @file biography.js
 * @author XYSRe
 * @created 2025-12-23
 * @updated 2026-04-29
 * @version 2.0.0
 * @description 艺人资料面板: 封面轮播、风格/生日/地区、外部链接、简介/作品集切换。
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");


window.DefineScript("Biography", {
    author: "XYSRe",
    version: "2.0.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS }
});

// =========================================================================
// 全局常量配置 (Configuration)
// =========================================================================

// 面板配置开关
const PANEL_CFG = {
    dataPath:    "D:\\11_MusicLib\\_Extras\\",  // 数据根目录
    showCover:   true,                            // 是否显示封面
    coverAspectRatio: 3 / 4,                      // 封面宽高比
    coverMode:   "fit",                          // 封面缩放模式 (fit=完整显示, cover=裁剪填充)
    cornerRadius: _scale(0),                              // 封面圆角半径, 0=直角
    coverMargin: _scale(0),                               // 封面四周内边距
};
const JSON_DIR = PANEL_CFG.dataPath + "ArtistBiography\\";
const ARTIST_COVER_DIR = PANEL_CFG.dataPath + "ArtistCover\\";
const SCROLL_STEP = THEME.LAYOUT.SCROLL_STEP;
const ICON_SIZE = THEME.LAYOUT.ICON_SIZE;
const MARGIN = THEME.LAYOUT.MARGIN;
const LINE_H = THEME.LAYOUT.LINE_H;
const LINE_SPACE = THEME.LAYOUT.LINE_SPACE;
const IMG_CYCLE_MS = THEME.LAYOUT.IMG_CYCLE_MS;
const COVER_IDENTIFIER = "_Cover_";    // 封面文件名特征匹配符


// =========================================================================
// 视觉样式与资源 (Theme & Resources)
// =========================================================================

const COL = THEME.COL;


// [图标资源]
const LINK_ICONS = {
    "Genres":       _loadImage(IMGS_LINKS_DIR + "circle-small.png"),
    "Country":      _loadImage(IMGS_LINKS_DIR + "locate.png"),
    "Born":         _loadImage(IMGS_LINKS_DIR + "calendar.png"),
    "Links":        _loadImage(IMGS_LINKS_DIR + "milestone.png"),
    "default":      _loadImage(IMGS_LINKS_DIR + "default.png"),
    "official":     _loadImage(IMGS_LINKS_DIR + "house.png"),
    "soundcloud":   _loadImage(IMGS_LINKS_DIR + "soundcloud.png"),
    "bandcamp":     _loadImage(IMGS_LINKS_DIR + "bandcamp.png"),
    "instagram":    _loadImage(IMGS_LINKS_DIR + "Instagram.png"),
    "x":            _loadImage(IMGS_LINKS_DIR + "X.png"),
    "tiktok":       _loadImage(IMGS_LINKS_DIR + "TikTok.png"),
    "youtube":      _loadImage(IMGS_LINKS_DIR + "YouTube.png"),
    "discogs":      _loadImage(IMGS_LINKS_DIR + "Discogs.png"),
    "allmusic":     _loadImage(IMGS_LINKS_DIR + "ALLMUSIC.png"),
    "musicbrainz":  _loadImage(IMGS_LINKS_DIR + "Musicbrainz.png"),
    "rateyourmusic":_loadImage(IMGS_LINKS_DIR + "rateyourmusic.png"),
    "aoty":         _loadImage(IMGS_LINKS_DIR + "aoty.png"),
    "pitchfork":    _loadImage(IMGS_LINKS_DIR + "pitchfork.png"),
    "metacritic":   _loadImage(IMGS_LINKS_DIR + "metacritic.png"),
    "fandom":       _loadImage(IMGS_LINKS_DIR + "fandom.png"),
    "wikipedia":    _loadImage(IMGS_LINKS_DIR + "wikipedia.png")  
};

// [UI组件] TitleFormat 与 Tooltip
// $meta(artist,0) 用于避免多值艺人字段导致的文件路径匹配失败
const artistTf = fb.TitleFormat("$meta(artist,0)");  
const albumTf = fb.TitleFormat(" ▸ [%date%]: [%album%] ['('$meta(EDITION)')']"); 

let tooltip = _initTooltip(THEME.FONT.BODY, _scale(13), 1200);

// =========================================================================
// 全局状态变量 (State Management)
// =========================================================================

// 数据状态
let artistName = null;      // 缓存当前加载的艺人名 (用于比对是否需要重载)
let currentMetadb = null;    // 当前数据来源句柄 (用于尺寸变化后重建封面)
let lastCoverProcessKey = ""; // 最近一次封面预处理签名 (避免重复重建)
let reloadSeq = 0; // 重载序列号，防止快速切换时旧任务回写
let deferredRefreshTimer = null; // 合并同帧内重复重活刷新，降低切换抖动
let deferredPaintEnsureTimer = null; // 避免在 on_paint 内执行重型封面处理
let lastCarouselTimerKey = ""; // 轮播定时器签名，未变化则不重建 interval
let artistData = null;       // 解析后的艺人 JSON 数据对象
const ARTIST_CACHE = new LRUCache(THEME.CFG.CACHE_SIZE); // LRU 缓存 (存储最近访问的艺人数据和图片路径)

// 图片与轮播状态
const carousel = {
    images: [],
    index: 0,
    timer: null,
    rawPaths: [],
    fallbackMetadb: null,
};
// IMG_CYCLE_MS 来自上方别名 (THEME.LAYOUT.IMG_CYCLE_MS)

// UI 视图状态
let isShowingDiscography = false; // Tab状态：False=简介(Profile), True=作品集(Discography)
let scrollY = 0;             // 当前垂直滚动条位置
let maxScrollY = 0;          // 最大可滚动距离
let currentText = "";        // 当前显示的文本内容
let fullTextH = 0;           // 文本总高度
let errorText = "请选择或播放歌曲..."; // 空状态或错误提示文案

// 交互状态
let activeLinkBtns = [];     // 当前生成的外部链接按钮数组
let activeElement = null;  // [状态机] 当前鼠标悬停/激活的 UI 元素

// 布局动态计算变量 (初始化为 LINE_H 防止除零或计算异常)
let panelW = window.Width;
let panelH = window.Height;
const coverRect = { x: 0, y: 0, w: 0, h: 0 };
let titleH = LINE_H;        
let titleW = 0;     
let coverH = 0;              
let genresH = LINE_H;        
let lineW = 0;               
let lineStartY = 0;
let headerHeight = 0;        
let viewW = 0;               
let viewH = 0;               

// 固定 UI 元素定义
const elements = {
    profileBtn:     { displayText: "Profile", x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: "艺人简介" },
    discographyBtn: { displayText: "Discography", x: 0, y: 0, w: 0, h: 0, isHover: false, tooltip: "本地专辑" }
};


// 构建封面处理签名 (用于尺寸/模式变化失效)
function buildCoverProcessKey(pathsSig) {
    return [
        artistName,
        coverRect.w,
        coverRect.h,
        PANEL_CFG.coverMode,
        PANEL_CFG.cornerRadius,
        PANEL_CFG.showCover,
        pathsSig || "",
    ].join("|");
}

// 确保指定索引封面已处理完成
function ensureCarouselImageReady(nextIndex, carouselState, reason) {
    if (!carouselState || !carouselState.images || carouselState.images.length === 0) return false;

    // _carouselNext/_manageCarousel 可能给出越界索引，统一归一化避免切图失败
    const count = carouselState.images.length;
    const index = ((nextIndex % count) + count) % count;
    if (carouselState.images[index]) return true;

    const targetW = Math.max(1, coverRect.w);
    const targetH = Math.max(1, coverRect.h);

    if (carouselState.rawPaths && carouselState.rawPaths.length > 0) {
        const path = carouselState.rawPaths[index];
        if (!path) return false;
        try {
            let srcImg = gdi.Image(path);
            if (!srcImg) return false;
            const processed = _createRoundedImage(srcImg, targetW, targetH, PANEL_CFG.cornerRadius, PANEL_CFG.coverMode);
            if (typeof srcImg.Dispose === "function") srcImg.Dispose();
            srcImg = null;
            if (!processed) return false;
            carouselState.images[index] = processed;
            return true;
        } catch (e) {
            console.log("Image load error: " + e);
            return false;
        }
    }

    if (carouselState.fallbackMetadb) {
        const tryTypes = [4, 0];
        for (const typeId of tryTypes) {
            let internalArt = utils.GetAlbumArtV2(carouselState.fallbackMetadb, typeId);
            if (!internalArt) continue;
            const processed = _createRoundedImage(internalArt, targetW, targetH, PANEL_CFG.cornerRadius, PANEL_CFG.coverMode);
            if (typeof internalArt.Dispose === "function") internalArt.Dispose();
            internalArt = null;
            if (processed) {
                carouselState.images[index] = processed;
                return true;
            }
        }
    }

    return false;
}
function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;

    // 1. 计算Tab按钮尺寸
    calcElementsBtnSize();
    // 2. 计算整体布局 (确定Y坐标和高度)
    updateLayoutMetrics();

    if (currentMetadb && artistName) {
        const cached = ARTIST_CACHE.get(artistName);
        if (cached !== undefined) {
            const pathsSig = cached.imgPaths && cached.imgPaths.length > 0 ? cached.imgPaths.join("||") : "fallback";
            const nextKey = buildCoverProcessKey(pathsSig);
            if (nextKey !== lastCoverProcessKey) {
                loadImagesFromCache(cached.imgPaths, currentMetadb);
                lastCoverProcessKey = nextKey;
            }
        }
    }

    // 3. 生成文本缓冲 (耗时操作)
    createTextBuffer();
}


function scheduleDeferredRefresh(seq) {
    if (deferredRefreshTimer) {
        window.ClearTimeout(deferredRefreshTimer);
        deferredRefreshTimer = null;
    }
    deferredRefreshTimer = window.SetTimeout(() => {
        deferredRefreshTimer = null;
        if (seq !== reloadSeq) return;

        createLinkButtons();
        updateLayoutMetrics();
        createTextBuffer();
        if (window.Width > 0) {
            window.Repaint();
        }
    }, 0);
}

function on_paint(gr) {
    // 1. 绘制背景 (关闭抗锯齿以保持矩形边缘锐利)
    gr.SetSmoothingMode(0);
    gr.FillSolidRect(0, 0, window.Width, window.Height, COL.BG);

    if (!artistData) {
        _drawEmptyState(gr, errorText, THEME.FONT.BODY, COL.FG, window.Width, window.Height);
        return;
    }

    // 2. 绘制滚动文本 (在封面/头部之前，溢出部分会被后续遮盖)
    _drawScrollText(gr, currentText, THEME.FONT.BODY, COL.FG, MARGIN, headerHeight - scrollY, viewW, fullTextH, MULTI_LINE_FLAGS, COL.BG, window.Width, headerHeight);

    // 3. 绘制封面区
    if (PANEL_CFG.showCover && carousel.images.length > 0) {
        const count = carousel.images.length;
        const index = ((carousel.index % count) + count) % count;
        if (!carousel.images[index]) {
            scheduleEnsureFromPaint();
        }

        const currentImg = carousel.images[index];
        if (currentImg) {
            gr.DrawImage(currentImg, coverRect.x, coverRect.y, coverRect.w, coverRect.h, 0, 0, currentImg.Width, currentImg.Height);

            if (carousel.images.length > 1) {
                _drawPageIndicator(gr, carousel.index, carousel.images.length, coverRect.x + MARGIN, coverRect.y + coverRect.h - MARGIN - LINE_H, _scale(50), LINE_H, THEME.FONT.BODY, COL.FG, _argb(153, (COL.BG >> 16) & 0xff, (COL.BG >> 8) & 0xff, COL.BG & 0xff));
            }
        }
    }

    let currentY = lineStartY;

    // 4. 绘制头部信息 (Header)

    // 3.1 艺人标题 (超长截断逻辑)
    gr.GdiDrawText(artistData.title, THEME.FONT.TITLE, COL.FG, MARGIN, currentY, titleW > lineW ? lineW : titleW, titleH, ONE_LINE_FLAGS);
    // 别名 (如果标题没占满一行，在后面追加显示)
    if (artistData.aliases && titleW < (lineW - MARGIN * 2)) {
        gr.GdiDrawText(" (" + artistData.aliases + ")", THEME.FONT.BODY, COL.FG, titleW + MARGIN, currentY + _scale(4), lineW - titleW - MARGIN, LINE_H, ONE_LINE_FLAGS);
    }
    currentY += titleH + LINE_SPACE;

    // 3.2 风格 (多行)
    if (LINK_ICONS.Genres) gr.DrawImage(LINK_ICONS.Genres, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Genres.Width, LINK_ICONS.Genres.Height);
    gr.GdiDrawText(artistData.genres || "Unknown Genre", THEME.FONT.BODY, COL.FG, MARGIN * 2.5, currentY, lineW, genresH, MULTI_LINE_FLAGS);
    currentY += genresH + LINE_SPACE;

    // 3.3 生日
    if (LINK_ICONS.Born) gr.DrawImage(LINK_ICONS.Born, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Born.Width, LINK_ICONS.Born.Height);
    gr.GdiDrawText(artistData.born || "-", THEME.FONT.BODY, COL.FG, MARGIN * 2.5, currentY, lineW, LINE_H, ONE_LINE_FLAGS);

    // 3.4 地区 (与生日同一行，靠右侧布局)
    if (LINK_ICONS.Country) gr.DrawImage(LINK_ICONS.Country, MARGIN * 13, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Country.Width, LINK_ICONS.Country.Height);
    gr.GdiDrawText(artistData.country || "-", THEME.FONT.BODY, COL.FG, MARGIN * 14.5, currentY, lineW, LINE_H, ONE_LINE_FLAGS);
    currentY += LINE_H + LINE_SPACE;

    // 3.5 链接图标按钮
    if (LINK_ICONS.Links) gr.DrawImage(LINK_ICONS.Links, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.Links.Width, LINK_ICONS.Links.Height);

    activeLinkBtns.forEach(btn => {
        if (!btn.img) return;
        // if (btn.isHover) { ... } // 可选：绘制按钮Hover背景
        gr.DrawImage(btn.img, btn.x, btn.y, btn.w, btn.h, 0, 0, btn.img.Width, btn.img.Height);
    });

    // 5. 绘制 Tab 切换按钮
    const pBtn = elements.profileBtn;
    const dBtn = elements.discographyBtn;
    const isProfile = !isShowingDiscography;

    // 根据状态确定颜色
    const pColor = isProfile ? COL.FG : (pBtn.isHover ? COL.FRAME : COL.FG);
    const dColor = !isProfile ? COL.FG : (dBtn.isHover ? COL.FRAME : COL.FG);

    gr.GdiDrawText(pBtn.displayText, isProfile ? THEME.FONT.BOLD : THEME.FONT.BODY, pColor, pBtn.x, pBtn.y, pBtn.w, pBtn.h, BTN_STYLE_FLAGS);
    gr.GdiDrawText(dBtn.displayText, !isProfile ? THEME.FONT.BOLD : THEME.FONT.BODY, dColor, dBtn.x, dBtn.y, dBtn.w, dBtn.h, BTN_STYLE_FLAGS);

    // Tab 指示线
    const activeBtn = isProfile ? pBtn : dBtn;
    _drawTabIndicator(gr, activeBtn, headerHeight, window.Width, MARGIN, COL.SEL_BG, COL.FG);

    // 6. 绘制滚动条
    if (currentText && maxScrollY > 0) {
        _drawScrollbar(gr, viewH, fullTextH, scrollY, maxScrollY, window.Width, headerHeight, COL.SCROLLBAR);
    }
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
            window.RepaintRect(0, 0, panelW, coverH);
        }
    }, 0);
}

// =========================================================================
// 数据处理与缓存 (Data Processing & Cache)
// =========================================================================

/**
 * [核心] 数据加载入口：重载艺人数据
 * @param {FbMetadbHandle} metadb - 音频文件句柄
 */
function reloadArtistData(metadb) {
    if (!metadb) return;

    const seq = ++reloadSeq;
    currentMetadb = metadb;

    const artist = artistTf.EvalWithMetadb(metadb);
    const safeName = artist.replace(/[\\\/:*?"<>|]/g, "_");

    if (artistName === safeName) {
        if (window.Width > 0) {
            panelW = window.Width;
            panelH = window.Height;
            coverH = PANEL_CFG.showCover ? Math.floor(panelW * PANEL_CFG.coverAspectRatio) : 0;
            recalculateCoverLayout();

            let coverReloaded = false;
            if (PANEL_CFG.showCover) {
                carousel.fallbackMetadb = metadb;
                if (!carousel.images || carousel.images.length === 0) {
                    carousel.images = [null];
                    carousel.rawPaths = [];
                    carousel.index = 0;
                }

                const count = carousel.images.length;
                const index = ((carousel.index % count) + count) % count;
                if (!carousel.images[index]) {
                    const changed = ensureCarouselImageReady(index, carousel, "same-artist-refresh");
                    manageCycleTimer();
                    if (changed) {
                        window.RepaintRect(0, 0, panelW, coverH);
                        coverReloaded = true;
                    }
                }
            }

            updateLayoutMetrics();
            if (coverReloaded) {
                window.Repaint();
            } else {
                window.RepaintRect(0, coverH, window.Width, window.Height - coverH);
            }
        }
        return;
    }

    artistName = safeName;

    scrollY = 0;
    maxScrollY = 0;
    currentText = "";
    fullTextH = 0;

    const cacheEntry = getArtistCacheEntry(safeName);
    artistData = cacheEntry.json;
    if (cacheEntry.jsonError) {
        errorText = cacheEntry.jsonError;
    } else {
        errorText = artistData ? "" : "暂无艺人资料: " + safeName;
    }

    if (window.Width > 0) {
        panelW = window.Width;
        panelH = window.Height;
        coverH = PANEL_CFG.showCover ? Math.floor(panelW * PANEL_CFG.coverAspectRatio) : 0;
        recalculateCoverLayout();

        loadImagesFromCache(cacheEntry.imgPaths, metadb, seq);
        const pathsSig = cacheEntry.imgPaths && cacheEntry.imgPaths.length > 0 ? cacheEntry.imgPaths.join("||") : "fallback";
        lastCoverProcessKey = buildCoverProcessKey(pathsSig);

        if (window.Width > 0) {
            window.Repaint();
        }
        scheduleDeferredRefresh(seq);
    }
}

/**
 * 扫描艺人封面图片文件
 * @returns {Array<string>} 图片路径数组
 */
function scanImagePaths(safeName) {
    let paths = [];
    let index = 1;
    const maxCheck = 10; // 最大尝试扫描数量
    const exts = [".jpg", ".jpeg", ".png"];

    while (index <= maxCheck) {
        let numStr = (index < 10 ? "0" : "") + index;
        let basePath = ARTIST_COVER_DIR + safeName + COVER_IDENTIFIER + numStr;
        let foundCurrentIndex = false;

        for (let i = 0; i < exts.length; i++) {
            let fullPath = basePath + exts[i];
            if (utils.IsFile(fullPath)) {
                paths.push(fullPath);
                foundCurrentIndex = true;
                break; // 找到一种格式即可
            }
        }
        if (foundCurrentIndex) {
            index++;
        } else {
            break; // 遇到中断序号则停止扫描
        }
    }
    return paths;
}

/**
 * 获取缓存的艺人数据，如果不存在则读取文件
 */
function getArtistCacheEntry(safeName) {
    // 命中缓存：直接返回 (LRUCache.get 自动刷新到最新位置)
    const cached = ARTIST_CACHE.get(safeName);
    if (cached !== undefined) return cached;

    // 未命中：读取 JSON
    let jsonData = null;
    let jsonErrorData = null;
    const jsonPath = JSON_DIR + safeName + ".json";
    if (utils.IsFile(jsonPath)) {
        const rawText = utils.ReadTextFile(jsonPath);
        try {
            jsonData = JSON.parse(rawText);
            // 数组转字符串，方便显示
            if (jsonData.aliases && Array.isArray(jsonData.aliases)) {
                jsonData.aliases = jsonData.aliases.join(", ");
            }
            if (jsonData.genres && Array.isArray(jsonData.genres)) {
                jsonData.genres = jsonData.genres.join(", ");
            }
        } catch (e) {
            const sanitizedText = rawText
                .replace(/^﻿/, "")
                .replace(/[\x00-\x1F]/g, " ");

            const variants = [];
            variants.push(sanitizedText);
            variants.push(sanitizedText.replace(/,\s*([}\]])/g, "$1"));

            const objStart = sanitizedText.indexOf("{");
            const objEnd = sanitizedText.lastIndexOf("}");
            if (objStart >= 0 && objEnd > objStart) {
                const sliced = sanitizedText.slice(objStart, objEnd + 1);
                variants.push(sliced);
                variants.push(sliced.replace(/,\s*([}\]])/g, "$1"));
            }

            let parsed = null;
            let lastErr = null;
            for (let i = 0; i < variants.length; i++) {
                try {
                    parsed = JSON.parse(variants[i]);
                    break;
                } catch (e2) {
                    lastErr = e2;
                }
            }

            if (parsed) {
                jsonData = parsed;
                if (jsonData.aliases && Array.isArray(jsonData.aliases)) {
                    jsonData.aliases = jsonData.aliases.join(", ");
                }
                if (jsonData.genres && Array.isArray(jsonData.genres)) {
                    jsonData.genres = jsonData.genres.join(", ");
                }
                console.log("JSON Warning: sanitized/recovered -> " + jsonPath);
            } else {
                const errText = String(lastErr || "unknown parse error");
                const colMatch = errText.match(/column\s+(\d+)/i);
                if (colMatch) {
                    const col = Math.max(1, parseInt(colMatch[1], 10));
                    const idx = Math.max(0, col - 1);
                    const start = Math.max(0, idx - 80);
                    const end = Math.min(sanitizedText.length, idx + 80);
                    console.log("JSON Error Context (" + jsonPath + "): " + sanitizedText.slice(start, end));
                }

                jsonData = {
                    title: safeName,
                    aliases: "",
                    genres: "",
                    born: "",
                    country: "",
                    artistbiography: "",
                    links: {}
                };
                jsonErrorData = "JSON Error (" + jsonPath + "): " + errText;
                console.log("JSON Error (" + jsonPath + "): " + errText + " -> fallback object used");
            }
        }
    }

    // 扫描封面路径
    const paths = scanImagePaths(safeName);
    const entry = { json: jsonData, imgPaths: paths, jsonError: jsonErrorData};

    ARTIST_CACHE.set(safeName, entry);
    return entry;
}

/**
 * 根据路径加载图片资源
 * @param {Array<String>} paths - 图片路径数组
 * @param {FbMetadbHandle} metadb - 音频句柄 (用于Fallback)
 */
function loadImagesFromCache(paths, metadb, seq) {
    if (carousel.images && carousel.images.length > 0) {
        carousel.images.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }
    carousel.images = [];
    carousel.index = 0;
    carousel.rawPaths = [];
    carousel.fallbackMetadb = null;

    if (!PANEL_CFG.showCover) {
        manageCycleTimer();
        return;
    }

    const targetW = Math.max(1, coverRect.w);
    const targetH = Math.max(1, coverRect.h);

    if (paths && paths.length > 0) {
        carousel.rawPaths = paths.slice();
        carousel.images = new Array(paths.length).fill(null);

        try {
            let srcImg = gdi.Image(paths[0]);
            if (srcImg) {
                const processed = _createRoundedImage(srcImg, targetW, targetH, PANEL_CFG.cornerRadius, PANEL_CFG.coverMode);
                if (typeof srcImg.Dispose === "function") srcImg.Dispose();
                srcImg = null;
                if (processed) carousel.images[0] = processed;
            }
        } catch (e) {
            console.log("Image load error: " + e);
        }

        if (!carousel.images[0]) {
            ensureCarouselImageReady(0, carousel, "initial");
        }

        manageCycleTimer();
        return;
    }

    carousel.fallbackMetadb = metadb;
    carousel.images = [null];
    manageCycleTimer();

    window.SetTimeout(() => {
        // 切歌很快时，旧轮次的 deferred fallback 不能覆盖当前艺人状态
        if (typeof seq === "number" && seq !== reloadSeq) return;
        if (!carousel.fallbackMetadb) return;

        ensureCarouselImageReady(0, carousel, "fallback-deferred");
        if (!carousel.images[0]) {
            carousel.images = [];
        }

        manageCycleTimer();
        window.RepaintRect(0, 0, panelW, coverH);
    }, 0);
}

/**
 * 管理图片轮播定时器
 */
function manageCycleTimer() {
    const nextKey = [
        PANEL_CFG.showCover ? 1 : 0,
        carousel.images && carousel.images.length > 1 ? 1 : 0,
        coverH,
        panelW,
    ].join("|");
    if (nextKey === lastCarouselTimerKey) return;
    lastCarouselTimerKey = nextKey;
    _manageCarousel(carousel, coverH, IMG_CYCLE_MS, panelW, ensureCarouselImageReady);
}

/**
 * 获取艺人作品集 (自动从音乐库读取并缓存)
 * 格式: YYYY-MM-DD - 专辑名
 */
function getDiscoText() {
    // 1. 检查缓存：如果已经有数据（且是数组），直接返回 joined 字符串
    // 注意：这里我们改变了数据结构，从原来的 Object 变成了 Array<String>
    if (artistData.discography && Array.isArray(artistData.discography)) {
        if (artistData.discography.length === 0) return "音乐库中暂无该艺人专辑记录";
        return artistData.discography.join("\n"); // 使用双换行让排版更稀疏好看
    }

    // --- 以下是初始化逻辑 (仅在第一次访问时运行) ---

    // 2. 准备查询
    // artistData.title 是艺人的真实名字 (如 "Guns N' Roses")
    // 需要处理名字中的单引号，防止查询语法错误
    const safeQueryName = artistData.title.replace(/'/g, "''");
    const query = "%artist% HAS " + safeQueryName;
    
    // 3. 获取所有相关曲目 handle list 
    const matches = fb.GetQueryItems(fb.GetLibraryItems(), query);
    let resultList = [];

    if (matches.Count > 0) {
        // 4. 排序：按日期降序 (最新的在前面)，也就是 0-9 还是 9-0 取决于你的需求
        // 排序依据: %date% %album%  1 为升序, -1 为降序
        matches.OrderByFormat(albumTf, -1);

        // 5. 格式化提取
        // 使用 TitleFormat 直接生成需要的字符串格式
        // 格式示例: [2023-01-01] - 专辑名
        const rawStrings = albumTf.EvalWithMetadbs(matches); // 返回原生字符串数组

        // 6. 去重 (核心步骤)
        // 因为查询返回的是所有歌曲，一张专辑有10首歌就会出现10次
        // 我们利用 Set 特性去除重复的 "日期 - 专辑" 行
        const uniqueSet = new Set(rawStrings);
        
        // 将 Set 转回数组
        resultList = Array.from(uniqueSet);
        
    }
    
    // 7. 写入缓存到 artistData 对象中 (内存缓存)
    // 这样下次调用 getDiscoText 就不会再次查询硬盘了
    artistData.discography = resultList;

    // 8. 返回结果
    if (resultList.length === 0) return "音乐库中暂无该艺人专辑记录";
    return resultList.join("\n");
}


// =========================================================================
// 布局与几何计算 (Layout & Geometry)
// =========================================================================

/**
 * 预计算封面绘制矩形 (coverRect): 在顶部封面区域内应用四周 margin
 */
function recalculateCoverLayout() {
    if (!PANEL_CFG.showCover) {
        coverRect.x = 0;
        coverRect.y = 0;
        coverRect.w = 0;
        coverRect.h = 0;
        return;
    }

    const margin = Math.max(0, PANEL_CFG.coverMargin);
    const coverW = Math.max(1, panelW - margin * 2);
    const coverInnerH = Math.max(1, coverH - margin * 2);

    coverRect.w = coverW;
    coverRect.h = coverInnerH;
    coverRect.x = Math.round((panelW - coverRect.w) / 2);
    coverRect.y = Math.round((coverH - coverRect.h) / 2);
}


/**
 * 布局核心算法
 * 负责计算所有元素的坐标和尺寸，实现逻辑与渲染分离
 */
function updateLayoutMetrics() {
    panelW = window.Width;
    panelH = window.Height;

    coverH = PANEL_CFG.showCover ? Math.floor(panelW * PANEL_CFG.coverAspectRatio) : 0;
    recalculateCoverLayout();
    lineW = panelW - MARGIN * 4;
    lineStartY = coverH + MARGIN;

    // 1. 计算标题高度
    if (artistData && artistData.title) {
        // 分别计算单行和完整高度，限制标题最多显示一行的高度(配合 truncate 样式)
        const measureOne = _measureString("M", THEME.FONT.TITLE, lineW, ONE_LINE_FLAGS);
        const measureFull = _measureString(artistData.title, THEME.FONT.TITLE, lineW, ONE_LINE_FLAGS);
        titleH = Math.min(measureFull.Height, measureOne.Height); 
        titleW = measureFull.Width;
    } else {
        titleH = LINE_H * 2;
        titleW = LINE_H * 2;
    }

    // 2. 计算风格高度 (限制最大2行)
    if (artistData && artistData.genres) {
        const measureOne = _measureString("M", THEME.FONT.BODY, lineW, MULTI_LINE_FLAGS);
        const measureFull = _measureString(artistData.genres, THEME.FONT.BODY, lineW, MULTI_LINE_FLAGS);
        const limitHeight = Math.ceil(measureOne.Height * 2); 
        
        // [修复] 修正了 genresH 可能为 0 的 Bug
        genresH = Math.min(limitHeight, measureFull.Height);
    } else {
        genresH = LINE_H;
    }

    // 3. 模拟垂直堆叠，计算头部总高度
    let stackY = lineStartY;
    stackY += titleH + LINE_SPACE;     // 名字
    stackY += genresH + LINE_SPACE;    // 风格
    stackY += LINE_H + LINE_SPACE;      // 生日/地区
    
    // 4. 计算链接按钮的 Y 坐标
    if (activeLinkBtns && activeLinkBtns.length > 0) {
        const linkY = stackY + _scale(1); // 微调偏移
        activeLinkBtns.forEach(btn => {
            btn.y = linkY;
        });
    }
    stackY += LINE_H + LINE_SPACE; // 链接行占用
    
    stackY += LINE_H * 2.5; // 预留给 Tab 按钮和分割线的空间
    
    headerHeight = stackY; 

    viewW = Math.max(1, window.Width - MARGIN * 2);
    viewH = Math.max(1, window.Height - headerHeight - MARGIN);

    // 设置 Tab 按钮坐标
    elements.profileBtn.y = headerHeight - elements.profileBtn.h * 2;
    elements.discographyBtn.y = elements.profileBtn.y;

    manageCycleTimer();
}

/**
 * 计算 Tab 按钮的尺寸和 X 坐标
 */
function calcElementsBtnSize() {
    const pM = _measureString(elements.profileBtn.displayText, THEME.FONT.BOLD, window.Width, BTN_STYLE_FLAGS);
    elements.profileBtn.w = pM.Width;
    elements.profileBtn.h = pM.Height;
    
    const dM = _measureString(elements.discographyBtn.displayText, THEME.FONT.BOLD, window.Width, BTN_STYLE_FLAGS);
    elements.discographyBtn.w = dM.Width;
    elements.discographyBtn.h = dM.Height;

    elements.profileBtn.x = MARGIN * 2.5;
    elements.discographyBtn.x = MARGIN * 3.5 + elements.profileBtn.w;
}

// 测量文本高度并更新滚动状态
function createTextBuffer() {
    currentText = "";
    fullTextH = 0;

    if (!artistData || viewW <= 0 || viewH <= 0) return;

    currentText = isShowingDiscography ? getDiscoText() : (artistData.artistbiography || "暂无详细简介信息");

    const measured = _measureString(currentText, THEME.FONT.BODY, viewW, MULTI_LINE_FLAGS);
    fullTextH = Math.max(1, Math.min(Math.ceil(measured.Height), _scale(2000)));

    maxScrollY = Math.max(0, fullTextH - viewH);
    if (scrollY > maxScrollY) scrollY = maxScrollY;
}

/**
 * 初始化链接按钮对象
 */
function createLinkButtons() {
    activeLinkBtns = []; 
    if (!artistData || !artistData.links) return;

    const btnSize = ICON_SIZE + _scale(4);
    const startX = MARGIN * 2.5;
    let currentX = startX;
    
    for (let key in artistData.links) {
        let url = artistData.links[key];
        // key 统一转为小写匹配
        if (url && url.length > 0) {
            activeLinkBtns.push({
                name: key,
                url: url,
                x: currentX,
                y: 0,  // 占位，updateLayoutMetrics 中计算实际值
                w: btnSize,
                h: btnSize,
                img: LINK_ICONS[key] || LINK_ICONS["default"], 
                isHover: false,
                tooltip: key,
            });
            currentX += (btnSize + _scale(6));
        }
    }
}


// =========================================================================
// 交互事件处理 (Event Handlers)
// =========================================================================

/**
 * 检测坐标是否在元素矩形内
 */

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
    if (_hitTest(x, y, elements.profileBtn)) {
        target = elements.profileBtn;
    } else if (_hitTest(x, y, elements.discographyBtn)) {
        target = elements.discographyBtn;
    } 
    // 2. 检测链接按钮
    else {
        for (let btn of activeLinkBtns) {
            if (_hitTest(x, y, btn)) {
                target = btn;
                break;
            }
        }
    }

    // 3. 状态切换
    if (activeElement === target) return; // 没变，直接返回

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
        _setCursor(CURSOR_HAND); // Hand 手型光标
    } else {
        tooltip("");
        _setCursor(CURSOR_ARROW); // Arrow 箭头光标
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
    // 1. 封面点击 (切换图片)
    if (PANEL_CFG.showCover && y < coverH && carousel.images.length > 1) {
        _carouselNext(carousel, coverH, IMG_CYCLE_MS, panelW, ensureCarouselImageReady);
        return;
    }

    // 2. Tab 切换
    if (_hitTest(x, y, elements.profileBtn)) {
        isShowingDiscography = false;
        createTextBuffer();
        window.RepaintRect(0, elements.profileBtn.y, window.Width, window.Height - elements.profileBtn.y);
        return;
    } else if (_hitTest(x, y, elements.discographyBtn)) {
        isShowingDiscography = true;
        createTextBuffer();
        window.RepaintRect(0, elements.profileBtn.y, window.Width, window.Height - elements.profileBtn.y); 
        return;
    }

    // 3. 链接点击 (ActiveX 延迟加载)
    activeLinkBtns.forEach(btn => {
        if (_hitTest(x, y, btn)) {
            try {
                // 仅在点击时实例化 WScript.Shell，节省常驻资源
                const WshShell = new ActiveXObject("WScript.Shell");
                WshShell.Run(btn.url);
            } catch (e) {
                console.log("Link Error: " + e);
            }
        }
    });
}

// 播放/停止/切歌 -> 触发数据更新
function on_playback_new_track(metadb) {
    reloadArtistData(metadb);
}

function on_playback_stop(reason) {
    if (reason !== 2) {
        reloadArtistData(fb.GetNowPlaying());
    }
}

function on_playlist_items_selection_change() {
    let selection = fb.GetSelection();
    if (selection) {
        reloadArtistData(selection);
    } else if (fb.IsPlaying) {
        reloadArtistData(fb.GetNowPlaying());
    } else {
        artistName = null;
        artistData = null;
        errorText = "请选择或播放歌曲...";
        if (window.Width > 0) {
            window.Repaint();
        }
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

// 脚本卸载/重载时释放资源
function on_script_unload() {
    if (deferredPaintEnsureTimer) {
        window.ClearTimeout(deferredPaintEnsureTimer);
        deferredPaintEnsureTimer = null;
    }
    if (deferredRefreshTimer) {
        window.ClearTimeout(deferredRefreshTimer);
        deferredRefreshTimer = null;
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
    _disposeImageDict(LINK_ICONS);
    _measureDispose();
    ARTIST_CACHE.clear();
}

// =========================================================================
// 初始化执行 (Initialization)
// =========================================================================

let initSelection = fb.GetSelection();
if (initSelection) {
    reloadArtistData(initSelection);
} else if (fb.IsPlaying) {
    reloadArtistData(fb.GetNowPlaying());
}