/**
 * @file background.js
 * @author XYSRe
 * @created 2026-05-04
 * @updated 2026-05-04
 * @version 1.0.0
 * @description 面板背景控制器: 统一背景色策略（主题色/封面提色）与可选遮罩层绘制。
 * @requires lib/utils.js
 * @requires lib/data.js
 */

"use strict";

/**
 * @typedef {Object} PanelBackgroundControllerConfig
 * @property {"theme"|"cover-color"} [mode]
 * @property {{enabled?: boolean, angle?: number}} [gradient]
 * @property {{enabled?: boolean, color?: number, alpha?: number}} [mask]
 * @property {number} [cacheSize]
 * @property {FbTitleFormat} [keyTf]
 */

/**
 * @typedef {Object} PanelBackgroundColors
 * @property {number} c1
 * @property {number} c2
 */

/**
 * @typedef {Object} PanelBackgroundController
 * @property {function(number): void} setThemeColor
 * @property {function(): void} resetToThemeColor
 * @property {function(FbMetadbHandle|null, GdiBitmap|null): void} updateFromMetadb
 * @property {function(PanelBackgroundColors): void} applyColors
 * @property {function(): PanelBackgroundColors} getColors
 * @property {function(GdiGraphics, number, number, number, number): void} paint
 * @property {function(): void} clearCache
 */

/** @param {number} value @param {number} min @param {number} max */
function _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * @param {PanelBackgroundControllerConfig} cfg
 * @returns {PanelBackgroundController}
 */
function createPanelBackgroundController(cfg) {
    const safeCfg = cfg || {};
    const mode = safeCfg.mode === "theme" ? "theme" : "cover-color";

    const gradientCfg = safeCfg.gradient || {};
    const maskCfg = safeCfg.mask || {};

    const gradientEnabled = !!gradientCfg.enabled;
    const gradientAngle = _clamp(Math.round(gradientCfg.angle || 90), 0, 360);

    let themeColor = _rgb(0, 0, 0);
    let color1 = themeColor;
    let color2 = themeColor;

    const maskEnabled = !!maskCfg.enabled;
    const maskAlpha = _clamp(Math.round(maskCfg.alpha || 0), 0, 255);
    const maskRgb = typeof maskCfg.color === "number" ? maskCfg.color : _rgb(0, 0, 0);
    const maskColor = _argb(
        maskAlpha,
        (maskRgb >> 16) & 0xff,
        (maskRgb >> 8) & 0xff,
        maskRgb & 0xff,
    );

    const keyTf = safeCfg.keyTf || fb.TitleFormat("%album artist% - %album%");
    const cacheSize = Math.max(1, Math.round(safeCfg.cacheSize || 5));
    const colorCache = new LRUCache(cacheSize);

    function applyColors(c1, c2) {
        color1 = c1;
        color2 = c2;
    }

    function getKey(metadb) {
        if (!metadb) return "";
        const keyByTf = keyTf && typeof keyTf.EvalWithMetadb === "function"
            ? keyTf.EvalWithMetadb(metadb)
            : "";
        return keyByTf || metadb.Path || "";
    }

    function setThemeColor(color) {
        if (typeof color === "number") themeColor = color;
    }

    function resetToThemeColor() {
        applyColors(themeColor, themeColor);
    }

    /**
     * @param {FbMetadbHandle|null} metadb
     * @param {GdiBitmap|null} rawImg
     */
    function updateFromMetadb(metadb, rawImg) {
        if (mode === "theme") {
            resetToThemeColor();
            return;
        }

        if (!metadb) {
            resetToThemeColor();
            return;
        }

        const key = getKey(metadb);
        const cached = colorCache.get(key);
        if (cached) {
            applyColors(cached.c1, cached.c2);
            return;
        }

        if (!rawImg) {
            resetToThemeColor();
            return;
        }

        const colors = _extractImageColors(rawImg, gradientEnabled, themeColor);
        applyColors(colors.c1, colors.c2);
        colorCache.set(key, { c1: color1, c2: color2 });
    }

    /** @param {PanelBackgroundColors} colors */
    function applyColorsByObject(colors) {
        if (!colors) return;
        if (typeof colors.c1 !== "number" || typeof colors.c2 !== "number") return;
        applyColors(colors.c1, colors.c2);
    }

    /** @returns {PanelBackgroundColors} */
    function getColors() {
        return { c1: color1, c2: color2 };
    }

    /**
     * @param {GdiGraphics} gr
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     */
    function paint(gr, x, y, w, h) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        const pw = Math.floor(w);
        const ph = Math.floor(h);

        if (pw <= 0 || ph <= 0) return;

        if (gradientEnabled) {
            gr.FillGradRect(px, py, pw, ph, gradientAngle, color1, color2, 1.0);
        } else {
            gr.FillSolidRect(px, py, pw, ph, color1);
        }

        if (maskEnabled && maskAlpha > 0) {
            gr.FillSolidRect(px, py, pw, ph, maskColor);
        }
    }

    function clearCache() {
        colorCache.clear();
    }

    return {
        setThemeColor,
        resetToThemeColor,
        updateFromMetadb,
        applyColors: applyColorsByObject,
        getColors,
        paint,
        clearCache,
    };
}
