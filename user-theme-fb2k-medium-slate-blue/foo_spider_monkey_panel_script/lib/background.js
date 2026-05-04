/**
 * @file background.js
 * @author XYSRe
 * @created 2026-05-04
 * @updated 2026-05-04
 * @version 1.1.0
 * @description 面板背景控制器: 统一背景色策略（主题色/封面提色/封面背景图）与可选遮罩层绘制。
 * @requires lib/utils.js
 * @requires lib/data.js
 */

"use strict";

/**
 * @typedef {Object} PanelBackgroundControllerConfig
 * @property {"theme"|"cover-color"|"cover-image"} [mode]
 * @property {{enabled?: boolean, angle?: number}} [gradient]
 * @property {{enabled?: boolean, color?: number, alpha?: number}} [mask]
 * @property {{scaleMode?: "cover"|"fit", blurRadius?: number, cacheSize?: number}} [image]
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
 * @property {function(FbMetadbHandle|null, GdiBitmap|null, number, number): void} updateBackgroundImage
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
    const mode =
        safeCfg.mode === "theme" ||
        safeCfg.mode === "cover-image"
            ? safeCfg.mode
            : "cover-color";

    const gradientCfg = safeCfg.gradient || {};
    const maskCfg = safeCfg.mask || {};
    const imageCfg = safeCfg.image || {};

    const gradientEnabled = !!gradientCfg.enabled;
    const gradientAngle = _clamp(Math.round(gradientCfg.angle || 90), 0, 360);

    const imageScaleMode = imageCfg.scaleMode === "fit" ? "fit" : "cover";
    const blurRadius = _clamp(Math.round(imageCfg.blurRadius || 0), 0, 200);

    let themeColor = _rgb(0, 0, 0);
    let color1 = themeColor;
    let color2 = themeColor;

    let bgImage = null;

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
    const colorCacheSize = Math.max(1, Math.round(safeCfg.cacheSize || 5));
    const imageCacheSize = Math.max(1, Math.round(imageCfg.cacheSize || colorCacheSize));

    const colorCache = new LRUCache(colorCacheSize);
    const imageCache = new LRUCache(imageCacheSize, (img) => {
        if (img && typeof img.Dispose === "function") img.Dispose();
    });

    function applyColors(c1, c2) {
        color1 = c1;
        color2 = c2;
    }

    function getTrackKey(metadb) {
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

        if (mode === "cover-image") {
            return;
        }

        if (!metadb) {
            resetToThemeColor();
            return;
        }

        const key = getTrackKey(metadb);
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

    /**
     * @param {FbMetadbHandle|null} metadb
     * @param {GdiBitmap|null} rawImg
     * @param {number} w
     * @param {number} h
     */
    function updateBackgroundImage(metadb, rawImg, w, h) {
        if (mode !== "cover-image") return;

        const width = Math.floor(w);
        const height = Math.floor(h);

        if (!metadb || !rawImg || width <= 0 || height <= 0) {
            bgImage = null;
            return;
        }

        const key =
            getTrackKey(metadb) +
            "|" + width + "x" + height +
            "|" + imageScaleMode +
            "|" + blurRadius;

        const cached = imageCache.get(key);
        if (cached) {
            bgImage = cached;
            return;
        }

        const bmp = gdi.CreateImage(width, height);
        if (!bmp) {
            bgImage = null;
            return;
        }

        const gr = bmp.GetGraphics();
        try {
            if (imageScaleMode === "fit") {
                _drawImageFit(gr, rawImg, 0, 0, width, height);
            } else {
                _drawImageCover(gr, rawImg, 0, 0, width, height);
            }
        } finally {
            bmp.ReleaseGraphics(gr);
        }

        if (blurRadius > 0 && typeof bmp.StackBlur === "function") {
            bmp.StackBlur(blurRadius);
        }

        imageCache.set(key, bmp);
        bgImage = bmp;
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

        if (mode === "cover-image" && bgImage) {
            gr.DrawImage(
                bgImage,
                px,
                py,
                pw,
                ph,
                0,
                0,
                bgImage.Width,
                bgImage.Height,
            );
        } else if (gradientEnabled) {
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
        imageCache.clear();
        bgImage = null;
    }

    return {
        setThemeColor,
        resetToThemeColor,
        updateFromMetadb,
        updateBackgroundImage,
        applyColors: applyColorsByObject,
        getColors,
        paint,
        clearCache,
    };
}
