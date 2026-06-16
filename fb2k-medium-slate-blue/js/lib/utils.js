/**
 * @description 共享工具函数库 — DPI 缩放、颜色、图片、命中检测、文本测量(_measureText)、图片绘制
 */

"use strict";

// ============================================================================
// 1. DPI 缩放
// ============================================================================

/**
 * 根据屏幕 DPI 缩放像素值
 * @param {number} size - 原始尺寸值 (1/72 英寸点数，等效于 typographic points)
 * @returns {number} 缩放后的像素值
 */
function _scale(size) {
    return Math.round((size * window.DPI) / 72);
}

// ============================================================================
// 2. 颜色生成
// ============================================================================

/**
 * 生成不透明 RGB 颜色整数 (0xAARRGGBB)
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} 颜色整数
 */
function _rgb(r, g, b) {
    return 0xff000000 | (r << 16) | (g << 8) | b;
}

/**
 * 生成带透明度的 ARGB 颜色整数
 * 支持两种调用方式：
 * 1) _argb(a, r, g, b)
 * 2) _argb(a, color)  // color 可传 0xRRGGBB / 0xAARRGGBB
 * @param {number} a - Alpha (0-255, 0=全透明, 255=不透明)
 * @param {number} r - Red (0-255) 或 color 整数
 * @param {number} [g] - Green (0-255)
 * @param {number} [b] - Blue (0-255)
 * @returns {number} 颜色整数
 */
function _argb(a, r, g, b) {
    if (typeof g !== "number" || typeof b !== "number") {
        const color = r >>> 0;
        const rr = (color >> 16) & 0xff;
        const gg = (color >> 8) & 0xff;
        const bb = color & 0xff;
        return ((a & 0xff) << 24) | (rr << 16) | (gg << 8) | bb;
    }
    return ((a & 0xff) << 24) | (r << 16) | (g << 8) | b;
}

/**
 * 计算背景调暗色 (用于 AQ 音质标识背景)
 * 公式：亮度 * 0.2，纯白(#FFFFFF)则转为冷灰(#393940)
 * @param {number} color - 原始颜色整数
 * @returns {number} 调暗后的颜色整数
 */
function _getDimColor(color) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    if (r === 255 && g === 255 && b === 255) {
        return 0xff000000 | (57 << 16) | (57 << 8) | 64;
    }
    const r2 = Math.round(r * 0.2);
    const g2 = Math.round(g * 0.2);
    const b2 = Math.round(b * 0.2);
    return 0xff000000 | (r2 << 16) | (g2 << 8) | b2;
}

// ============================================================================
// 3. 图片加载
// ============================================================================

/**
 * 安全加载图片，自动按扩展名选择加载方式（SVG 光栅化 / PNG 直读），文件不存在返回 null
 * @param {string} path - 图片文件路径
 * @param {number} [maxWidth=96] - SVG 光栅化宽度（PNG 忽略），默认 96px（覆盖 13-54px 显示场景，≥1.78× 超采样）
 * @returns {GdiBitmap|null} 图片对象或 null
 */
function _loadImage(path, maxWidth) {
    if (!utils.IsFile(path)) return null;
    if (path.endsWith('.svg')) return gdi.LoadSVG(path, maxWidth || 96);
    return gdi.Image(path);
}

// ============================================================================
// 4. 命中检测
// ============================================================================

/**
 * 检测坐标是否在元素矩形内
 * @param {number} x - 鼠标 X
 * @param {number} y - 鼠标 Y
 * @param {Object} ele - 包含 { x, y, w, h } 的元素
 * @returns {boolean}
 */
function _hitTest(x, y, ele) {
    if (!ele) return false;
    return x >= ele.x && x <= ele.x + ele.w && y >= ele.y && y <= ele.y + ele.h;
}

// ============================================================================
// 5. 文本测量 (单例模式)
// ============================================================================

const _measure = { img: null, gr: null };

/**
 * 测量字符串在指定字体和宽度下的渲染尺寸
 * @param {string} text - 要测量的文本
 * @param {GdiFont} font - 字体对象
 * @param {number} maxWidth - 最大宽度
 * @param {number} textStyleFlag - GDI 文本格式标志
 * @returns {{Width: number, Height: number}}
 */
function _measureString(text, font, maxWidth, textStyleFlag) {
    if (!_measure.img) {
        _measure.img = gdi.CreateImage(1, 1);
        _measure.gr = _measure.img.GetGraphics();
    }
    const result = _measure.gr.MeasureString(text, font, 0, 0, maxWidth, _scale(2000), textStyleFlag || 0);
    return {
        Width: Math.ceil(result.Width),
        Height: Math.ceil(result.Height) + _scale(1) // GDI/GDI+ 测量高度修正，消除 1px 系统偏差
    };
}

/**
 * 释放文本测量单例的 GDI 资源 (在 on_script_unload 中调用)
 */
function _measureDispose() {
    if (_measure.img) {
        _measure.img.ReleaseGraphics(_measure.gr);
        if (typeof _measure.img.Dispose === "function") _measure.img.Dispose();
        _measure.img = null;
        _measure.gr = null;
    }
}

/**
 * 使用样式预设测量文本尺寸
 * @param {string} text
 * @param {{font:GdiFont, flags:number}} style - 样式预设对象
 * @param {number} maxW - 最大宽度
 * @returns {{Width:number, Height:number}}
 */
function _measureText(text, style, maxW) {
    return _measureString(text, style.font, maxW, style.flags);
}

/**
 * 垂直堆叠 SECTIONS 布局。
 * 遍历 sections 数组，从 y=0 开始逐段计算 rect 与 content 坐标。
 *
 * 每个 section 对象需预置以下字段:
 *   rect:    { x:0, y:0, w:0, h:0 }  — 本函数写入 (全宽矩形区域)
 *   content: { x:0, y:0, w:0, h:0 }  — 本函数写入 (rect 减去 padding 的内容区)
 *   padding: { top, right, bottom, left }  — 只读，控制内边距与段间距
 *   visible: boolean  — false 时跳过 (rect.h=0, content 归零)
 *   fillRemaining?: boolean  — true 时该段占据面板剩余高度
 *   getContentHeight(): number  — 返回内容区高度 (不含 padding)
 *
 * @param {Array<Object>} sections - SECTIONS 数组
 * @param {number} panelW - 面板宽度
 * @param {number} panelH - 面板高度
 * @returns {void}
 */
function layoutSections(sections, panelW, panelH) {
    let y = 0;
    for (const sec of sections) {
        sec.rect.x = 0;
        sec.rect.y = y;
        sec.rect.w = panelW;

        if (!sec.visible) {
            sec.rect.h = 0;
            sec.content.x = sec.content.y = sec.content.w = sec.content.h = 0;
            continue;
        }

        if (sec.fillRemaining) {
            sec.rect.h = Math.max(1, panelH - y);
        } else {
            const ch = sec.getContentHeight();
            sec.rect.h = ch + sec.padding.top + sec.padding.bottom;
        }

        sec.content.x = sec.padding.left;
        sec.content.y = y + sec.padding.top;
        sec.content.w = Math.max(1, panelW - sec.padding.left - sec.padding.right);
        sec.content.h = Math.max(1, sec.rect.h - sec.padding.top - sec.padding.bottom);

        y += sec.rect.h;
    }
}

// ============================================================================
// 6. 图片绘制辅助
// ============================================================================

/**
 * 等比缩放适配模式 (Aspect-Fit): 完整显示图片，留黑边
 * @param {GdiGraphics} gr -  Graphics 对象
 * @param {GdiBitmap} img - 源图片
 * @param {number} x - 目标 X
 * @param {number} y - 目标 Y
 * @param {number} w - 目标宽度
 * @param {number} h - 目标高度
 */
function _drawImageFit(gr, img, x, y, w, h) {
    if (!img || w <= 0 || h <= 0 || img.Width <= 0 || img.Height <= 0) return;
    const ratio = Math.min(w / img.Width, h / img.Height);
    const newW = img.Width * ratio;
    const newH = img.Height * ratio;
    const offX = x + (w - newW) / 2;
    const offY = y + (h - newH) / 2;
    gr.DrawImage(img, offX, offY, newW, newH, 0, 0, img.Width, img.Height);
}

/**
 * 等比缩放覆盖模式 (Aspect-Cover): 填满目标区域，裁剪超出部分
 * @param {GdiGraphics} gr -  Graphics 对象
 * @param {GdiBitmap} img - 源图片
 * @param {number} x - 目标 X
 * @param {number} y - 目标 Y
 * @param {number} w - 目标宽度
 * @param {number} h - 目标高度
 */
function _drawImageCover(gr, img, x, y, w, h) {
    if (!img || w <= 0 || h <= 0 || img.Width <= 0 || img.Height <= 0) return;
    const ratio = Math.max(w / img.Width, h / img.Height);
    const srcW = w / ratio;
    const srcH = h / ratio;
    const srcX = (img.Width - srcW) / 2;
    const srcY = (img.Height - srcH) / 2;
    gr.DrawImage(img, x, y, w, h, srcX, srcY, srcW, srcH);
}

// ============================================================================
// 7. 图片处理
// ============================================================================

/**
 * 创建目标尺寸图片：按 mode 做 fit/cover 缩放，radius>0 时应用圆角遮罩
 * @param {GdiBitmap} img - 源图片
 * @param {number} targetW - 目标宽度
 * @param {number} targetH - 目标高度
 * @param {number} radius - 圆角半径 (<=0 时保持直角)
 * @param {string} mode - 缩放模式 ("fit" | "cover"，未指定时默认 cover)
 * @returns {GdiBitmap|null}
 */
function _createRoundedImage(img, targetW, targetH, radius, mode) {
    targetW = Math.floor(targetW);
    targetH = Math.floor(targetH);
    if (!img || targetW <= 0 || targetH <= 0) return null;

    const drawMode = mode === "fit" ? "fit" : "cover";

    let bmp = gdi.CreateImage(targetW, targetH);
    let gr = bmp.GetGraphics();
    try {
        let srcW = img.Width;
        let srcH = img.Height;

        let scale = drawMode === "fit"
            ? Math.min(targetW / srcW, targetH / srcH)
            : Math.max(targetW / srcW, targetH / srcH);
        let drawW = Math.round(srcW * scale);
        let drawH = Math.round(srcH * scale);
        let drawX = Math.round((targetW - drawW) / 2);
        let drawY = Math.round((targetH - drawH) / 2);

        gr.SetInterpolationMode(7);
        gr.DrawImage(img, drawX, drawY, drawW, drawH, 0, 0, srcW, srcH);
    } finally {
        bmp.ReleaseGraphics(gr);
    }

    const maxRadius = Math.floor(Math.min(targetW, targetH) / 2);
    const safeRadius = Math.max(0, Math.min(maxRadius, Math.floor(radius || 0)));
    if (safeRadius <= 0) {
        return bmp;
    }

    let mask = gdi.CreateImage(targetW, targetH);
    let grMask = mask.GetGraphics();
    try {
        grMask.SetSmoothingMode(2);
        grMask.FillSolidRect(0, 0, targetW, targetH, _rgb(255, 255, 255));
        grMask.FillRoundRect(0, 0, targetW, targetH, safeRadius, safeRadius, _rgb(0, 0, 0));
    } finally {
        mask.ReleaseGraphics(grMask);
    }

    try {
        bmp.ApplyMask(mask);
    } finally {
        if (mask && typeof mask.Dispose === "function") mask.Dispose();
    }
    return bmp;
}

/**
 * 从图片中提取主色调
 * @param {GdiBitmap} img - 源图片
 * @param {boolean} useGradient - true=提取双色渐变, false=单色
 * @param {number} fallbackColor - 兜底色
 * @param {number} [gradientSpan=2] - 渐变跨度（useGradient=true 时生效，最小 2）
 * @returns {{ c1: number, c2: number }}
 */
function _extractImageColors(img, useGradient, fallbackColor, gradientSpan) {
    let result = { c1: fallbackColor, c2: fallbackColor };
    if (!img) return result;

    const safeSpan = Math.max(2, Math.floor(Number(gradientSpan) || 2));
    const sampleCount = useGradient ? safeSpan : 1;

    try {
        let colorsJson = img.GetColourSchemeJSON(sampleCount);
        let colors = JSON.parse(colorsJson);

        if (colors && colors.length > 0) {
            result.c1 = colors[0].col;
            if (useGradient) {
                const c2Index = Math.min(safeSpan - 1, colors.length - 1);
                result.c2 = colors[c2Index].col;
            } else {
                result.c2 = colors[0].col;
            }
        }
    } catch (e) {
        console.log("SMP Extract Colors Error: " + e);
    }
    return result;
}

// ============================================================================
// 8. Metadb 选择策略
// ============================================================================

const METADB_RESOLVE_MODE = {
    PLAYING_FIRST: "playing-first",
    SELECTION_FIRST: "selection-first",
    PLAYING_ONLY: "playing-only",
    SELECTION_ONLY: "selection-only",
};

/**
 * 封面类型 ID 枚举
 * @enum {number}
 * @reserved 后续功能会使用，暂时保留
 */
const ALBUM_ART_ID = {
    FRONT: 0,
    BACK: 1,
    DISC: 2,
    ICON: 3,
    ARTIST: 4,
};

/**
 * 按策略解析目标歌曲句柄
 * @param {string} mode - METADB_RESOLVE_MODE.*
 * @param {{ now?: FbMetadbHandle|null, selection?: FbMetadbHandle|null }} [opts]
 * @returns {FbMetadbHandle|null}
 */
function resolveMetadbByMode(mode, opts) {
    const options = opts || {};
    const now = Object.prototype.hasOwnProperty.call(options, "now")
        ? options.now
        : (fb.IsPlaying ? fb.GetNowPlaying() : null);
    const selection = Object.prototype.hasOwnProperty.call(options, "selection")
        ? options.selection
        : fb.GetSelection();

    if (mode === METADB_RESOLVE_MODE.PLAYING_ONLY) return now || null;
    if (mode === METADB_RESOLVE_MODE.SELECTION_ONLY) return selection || null;
    if (mode === METADB_RESOLVE_MODE.SELECTION_FIRST) return selection || now || null;
    return now || selection || null;
}

// ============================================================================
// 9. 布局计算
// ============================================================================

/**
 * 将统一数字或对象格式的内边距规范化为 {top, right, bottom, left} 对象
 * @param {number|{top?:number, right?:number, bottom?:number, left?:number}} padding
 *        number: 四边统一；对象: 独立指定各边，未指定的边默认为 0
 * @returns {{top:number, right:number, bottom:number, left:number}}
 */
function normalizePadding(padding) {
    if (typeof padding === "number") {
        const p = Math.max(0, padding | 0);
        return { top: p, right: p, bottom: p, left: p };
    }
    return {
        top:    Math.max(0, (padding.top    | 0) || 0),
        right:  Math.max(0, (padding.right  | 0) || 0),
        bottom: Math.max(0, (padding.bottom | 0) || 0),
        left:   Math.max(0, (padding.left   | 0) || 0),
    };
}

/**
 * 计算内容区域矩形（扣除 padding 后的可用区域）
 * @param {number} panelW - 面板宽度
 * @param {number} panelH - 面板高度
 * @param {number|{top?:number, right?:number, bottom?:number, left?:number}} padding
 *        number: 四边统一；对象: 独立指定各边，未指定的边默认为 0
 * @returns {{x:number, y:number, w:number, h:number}}
 */
function calcContentRect(panelW, panelH, padding) {
    const p = normalizePadding(padding);
    return {
        x: p.left,
        y: p.top,
        w: Math.max(0, panelW - p.left - p.right),
        h: Math.max(0, panelH - p.top - p.bottom)
    };
}

const _fontLineH = new Map();

/**
 * 获取字体单行高度（缓存）
 * @param {GdiFont} font
 * @returns {number}
 */
function _getFontLineHeight(font) {
    const key = font.Name + "|" + font.Size + "|" + font.Style;
    let h = _fontLineH.get(key);
    if (h === undefined) {
        h = _measureString("M", font, 10000, 0).Height;
        _fontLineH.set(key, h);
    }
    return h;
}
