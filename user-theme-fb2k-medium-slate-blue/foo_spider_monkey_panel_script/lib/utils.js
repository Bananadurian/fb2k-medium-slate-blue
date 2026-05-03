/**
 * @file utils.js
 * @author XYSRe
 * @created 2026-04-27
 * @updated 2026-04-29
 * @version 2.0.0
 * @description 共享工具函数库 — DPI 缩放、颜色、图片、命中检测、文本测量、图片绘制
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
 * @param {number} a - Alpha (0-255, 0=全透明, 255=不透明)
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} 颜色整数
 */
function _argb(a, r, g, b) {
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
 * 安全加载图片，文件不存在则返回 null
 * @param {string} path - 图片文件路径
 * @returns {GdiBitmap|null} 图片对象或 null
 */
function _loadImage(path) {
    return utils.IsFile(path) ? gdi.Image(path) : null;
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
        Height: Math.ceil(result.Height) - 1 // GDI/GDI+ 测量高度修正，消除 1px 系统偏差
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
 * @returns {{ c1: number, c2: number }}
 */
function _extractImageColors(img, useGradient, fallbackColor) {
    let result = { c1: fallbackColor, c2: fallbackColor };
    if (!img) return result;

    try {
        let colorsJson = img.GetColourSchemeJSON(2);
        let colors = JSON.parse(colorsJson);

        if (colors && colors.length > 0) {
            result.c1 = colors[0].col;
            if (useGradient && colors.length >= 2) {
                result.c2 = colors[1].col;
            } else {
                result.c2 = colors[0].col;
            }
        }
    } catch (e) {
        console.log("SMP Extract Colors Error: " + e);
    }
    return result;
}
