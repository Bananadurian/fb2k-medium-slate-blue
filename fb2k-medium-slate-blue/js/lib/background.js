/**
 * @description 面板背景控制器: 统一背景色策略（主题色/封面提色/封面背景图）与可选遮罩层绘制。
 * @requires lib/utils.js
 * @requires lib/data.js
 */

"use strict";

const BG_SOURCE_AUTO_FETCH = "auto-fetch";
const BG_SOURCE_PROVIDED_RAW = "provided-raw";
const BG_SOURCE_EXPLICIT_NO_ART = "explicit-no-art";

/**
 * @typedef {Object} PanelBackgroundGradientConfig
 * @property {boolean} [enabled=false] - 是否启用渐变背景（theme/cover-color 会参与；cover-image 不参与底色绘制）
 * @property {number} [angle=90] - 渐变角度，取值区间 [0, 360]（仅在参与渐变绘制的模式下生效）
 * @property {number} [span=2] - 渐变跨度（仅在 cover-color 且 enabled=true 时生效，最小值 2）
 */

/**
 * @typedef {Object} PanelBackgroundMaskConfig
 * @property {boolean} [enabled=false] - 是否叠加遮罩层（所有 mode 都生效）
 * @property {number} [color=_rgb(0,0,0)] - 遮罩 RGB 颜色（忽略 alpha 通道，所有 mode 都生效）
 * @property {number} [alpha=0] - 遮罩透明度，取值区间 [0, 255]（所有 mode 都生效）
 */

/**
 * @typedef {Object} PanelBackgroundImageConfig
 * @property {"cover"|"fit"} [scaleMode="cover"] - 背景图铺放方式（仅在 cover-image 模式生效）
 * @property {number} [blurRadius=0] - 模糊半径，取值区间 [0, 200]（仅在 cover-image 模式生效）
 * @property {number} [cacheSize] - 背景图缓存条目数，最小值 1（仅在 cover-image 模式生效）
 */

/**
 * @typedef {Object} PanelBackgroundShapeConfig
 * @property {"rect"|"round-rect"} [type="rect"] - 背景几何形状
 * @property {number} [radius=0] - 圆角半径（像素，<=0 等同矩形）
 */

/**
 * @typedef {Object} PanelBackgroundControllerConfig
 * @property {"theme"|"cover-color"|"cover-image"|"custom"} [mode="cover-color"] - 背景模式
 * @property {PanelBackgroundGradientConfig} [gradient]
 * @property {PanelBackgroundMaskConfig} [mask]
 * @property {PanelBackgroundImageConfig} [image]
 * @property {PanelBackgroundShapeConfig} [shape]
 * @property {PanelBackgroundCustomConfig} [custom]
 * @property {number} [cacheSize=5] - 颜色缓存条目数，最小值 1
 * @property {FbTitleFormat} [keyTf] - 曲目缓存键格式器
 */

/**
 * @typedef {Object} PanelBackgroundCustomConfig
 * @property {number} [color1] - 自定义填充色1 (ARGB, 默认 0x000000)
 * @property {number} [color2] - 自定义填充色2 (ARGB, 默认等于 color1)
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
 * @property {function(FbMetadbHandle|null): boolean} tryApplyCachedColorsByMetadb
 * @property {function(PanelBackgroundColors): void} applyColors
 * @property {function(): PanelBackgroundColors} getColors
 * @property {function(GdiGraphics, number, number, number, number): void} paint
 * @property {function(): void} clearCache
 */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * @param {GdiBitmap} bmp
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 * @returns {void}
 */
function _applyRoundMaskToBitmap(bmp, width, height, radius) {
    if (!bmp || width <= 0 || height <= 0 || radius <= 0) return;

    let mask = gdi.CreateImage(width, height);
    if (!mask) return;

    let grMask = mask.GetGraphics();
    try {
        grMask.SetSmoothingMode(2);
        grMask.FillSolidRect(0, 0, width, height, _rgb(255, 255, 255));
        grMask.FillRoundRect(0, 0, width, height, radius, radius, _rgb(0, 0, 0));
    } finally {
        mask.ReleaseGraphics(grMask);
    }

    try {
        bmp.ApplyMask(mask);
    } finally {
        if (mask && typeof mask.Dispose === "function") mask.Dispose();
    }
}

/**
 * @param {PanelBackgroundControllerConfig} cfg
 * @returns {PanelBackgroundController}
 */
function createPanelBackgroundController(cfg) {
    const safeCfg = cfg || {};
    const mode =
        safeCfg.mode === "theme" || safeCfg.mode === "cover-image"
            ? safeCfg.mode
            : "cover-color";

    const gradientCfg = safeCfg.gradient || {};
    const maskCfg = safeCfg.mask || {};
    const imageCfg = safeCfg.image || {};
    const shapeCfg = safeCfg.shape || {};

    const gradientEnabled = !!gradientCfg.enabled;
    const gradientAngle = _clamp(Math.round(gradientCfg.angle || 90), 0, 360);
    const gradientSpan = Math.max(2, Math.floor(Number(gradientCfg.span) || 2));

    const imageScaleMode = imageCfg.scaleMode === "fit" ? "fit" : "cover";
    const blurRadius = _clamp(Math.round(imageCfg.blurRadius || 0), 0, 200);

    const shapeType = shapeCfg.type === "round-rect" ? "round-rect" : "rect";
    const shapeRadius = Math.max(0, Math.floor(Number(shapeCfg.radius) || 0));

    let themeColor = _rgb(0, 0, 0);
    let color1 = themeColor;
    let color2 = themeColor;

    let bgImage = null;
    let bgImageKey = "";

    let lastGradientFillKey = "";
    let lastGradientFillImage = null;

    const maskEnabled = !!maskCfg.enabled;
    const maskAlpha = _clamp(Math.round(maskCfg.alpha || 0), 0, 255);
    const maskRgb = typeof maskCfg.color === "number" ? maskCfg.color : _rgb(0, 0, 0);
    let maskColor = _argb(
        maskAlpha,
        (maskRgb >> 16) & 0xff,
        (maskRgb >> 8) & 0xff,
        maskRgb & 0xff,
    );

    const keyTf = safeCfg.keyTf || fb.TitleFormat("%album artist% - %album%");
    const colorCacheSize = Math.max(1, Math.round(safeCfg.cacheSize || 5));
    const imageCacheSize = Math.max(1, Math.round(imageCfg.cacheSize || colorCacheSize));
    const gradientCacheSize = Math.max(1, Math.min(4, imageCacheSize));

    const colorCache = new LRUCache(colorCacheSize);
    const imageCache = new LRUCache(imageCacheSize, (img) => {
        if (img && typeof img.Dispose === "function") img.Dispose();
    });
    const gradientFillCache = new LRUCache(gradientCacheSize, (img) => {
        if (img && typeof img.Dispose === "function") img.Dispose();
    });

    /**
     * @param {number} c1
     * @param {number} c2
     */
    function applyColors(c1, c2) {
        color1 = c1;
        color2 = c2;
    }

    /**
     * @param {FbMetadbHandle|null} metadb
     * @returns {string}
     */
    function getTrackKey(metadb) {
        if (!metadb) return "";
        const keyByTf =
            keyTf && typeof keyTf.EvalWithMetadb === "function"
                ? keyTf.EvalWithMetadb(metadb)
                : "";
        return keyByTf || metadb.Path || "";
    }

    /**
     * @param {string} trackKey
     * @param {number} width
     * @param {number} height
     * @returns {string}
     */
    function buildImageRenderKey(trackKey, width, height) {
        return (
            trackKey +
            "|" + width + "x" + height +
            "|" + imageScaleMode +
            "|" + blurRadius +
            "|" + shapeType +
            "|" + shapeRadius
        );
    }

    /**
     * @param {number} width
     * @param {number} height
     * @returns {string}
     */
    function buildGradientRenderKey(width, height) {
        return (
            width + "x" + height +
            "|" + gradientAngle +
            "|" + color1 +
            "|" + color2 +
            "|" + shapeType +
            "|" + shapeRadius
        );
    }

    /** @param {number} color - 仅更新主题基色，不会立即触发重绘或重算 */
    function setThemeColor(color) {
        if (typeof color === "number") themeColor = color;
    }

    /** @param {number} color - 更新遮罩 RGB 颜色值（alpha 保持创建时设定） */
    function setMaskColor(color) {
        if (typeof color !== "number") return;
        maskColor = _argb(maskAlpha, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
    }

    function resetToThemeColor() {
        applyColors(themeColor, themeColor);
    }

    /**
     * @param {FbMetadbHandle|null} metadb
     * @returns {boolean}
     */
    function tryApplyCachedColorsByMetadb(metadb) {
        if (!metadb) return false;
        const key = getTrackKey(metadb);
        if (!key) return false;
        const cached = colorCache.get(key);
        if (!cached) return false;
        applyColors(cached.c1, cached.c2);
        return true;
    }

    /**
     * 根据 metadb + rawImg 更新 cover-color/theme 颜色状态。
     * key 为空时不使用 colorCache，避免空键碰撞导致跨曲目串色。
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
        if (!key) {
            if (!rawImg) {
                resetToThemeColor();
                return;
            }
            const directColors = _extractImageColors(rawImg, gradientEnabled, themeColor, gradientSpan);
            applyColors(directColors.c1, directColors.c2);
            return;
        }

        const cached = colorCache.get(key);
        if (cached) {
            applyColors(cached.c1, cached.c2);
            return;
        }

        if (!rawImg) {
            resetToThemeColor();
            return;
        }

        const colors = _extractImageColors(rawImg, gradientEnabled, themeColor, gradientSpan);
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
            bgImageKey = "";
            return;
        }

        const trackKey = getTrackKey(metadb);
        if (!trackKey) {
            bgImage = null;
            bgImageKey = "";
            return;
        }

        const imageKey = buildImageRenderKey(trackKey, width, height);
        if (bgImage && bgImageKey === imageKey) {
            return;
        }

        const cached = imageCache.get(imageKey);
        if (cached) {
            bgImage = cached;
            bgImageKey = imageKey;
            return;
        }

        let bmp = null;

        if (shapeType === "round-rect" && shapeRadius > 0) {
            bmp = _createRoundedImage(rawImg, width, height, shapeRadius, imageScaleMode);
        } else {
            bmp = gdi.CreateImage(width, height);
            if (bmp) {
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
            }
        }

        if (!bmp) {
            bgImage = null;
            bgImageKey = "";
            return;
        }

        if (blurRadius > 0 && typeof bmp.StackBlur === "function") {
            bmp.StackBlur(blurRadius);
            if (shapeType === "round-rect" && shapeRadius > 0) {
                _applyRoundMaskToBitmap(bmp, width, height, shapeRadius);
            }
        }

        imageCache.set(imageKey, bmp);
        bgImage = bmp;
        bgImageKey = imageKey;
    }

    /**
     * 生成用于 round-rect+gradient 的填充位图。
     * 热路径优先命中最近一次渲染签名，避免每帧重复 LRU 查询。
     * @param {number} width
     * @param {number} height
     * @returns {GdiBitmap|null}
     */
    function getGradientFillImage(width, height) {
        const key = buildGradientRenderKey(width, height);

        if (lastGradientFillImage && lastGradientFillKey === key) {
            return lastGradientFillImage;
        }

        const cached = gradientFillCache.get(key);
        if (cached) {
            lastGradientFillKey = key;
            lastGradientFillImage = cached;
            return cached;
        }

        const bmp = gdi.CreateImage(width, height);
        if (!bmp) return null;

        const gr = bmp.GetGraphics();
        try {
            gr.FillGradRect(0, 0, width, height, gradientAngle, color1, color2, 1.0);
        } finally {
            bmp.ReleaseGraphics(gr);
        }

        if (shapeType === "round-rect" && shapeRadius > 0) {
            _applyRoundMaskToBitmap(bmp, width, height, shapeRadius);
        }

        gradientFillCache.set(key, bmp);
        lastGradientFillKey = key;
        lastGradientFillImage = bmp;
        return bmp;
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

        const useRoundRect = shapeType === "round-rect" && shapeRadius > 0;

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
            if (useRoundRect) {
                const fillImg = getGradientFillImage(pw, ph);
                if (fillImg) {
                    gr.DrawImage(fillImg, px, py, pw, ph, 0, 0, fillImg.Width, fillImg.Height);
                } else {
                    gr.FillGradRect(px, py, pw, ph, gradientAngle, color1, color2, 1.0);
                }
            } else {
                gr.FillGradRect(px, py, pw, ph, gradientAngle, color1, color2, 1.0);
            }
        } else if (useRoundRect) {
            gr.FillRoundRect(px, py, pw, ph, shapeRadius, shapeRadius, color1);
        } else {
            gr.FillSolidRect(px, py, pw, ph, color1);
        }

        if (maskEnabled && maskAlpha > 0) {
            if (useRoundRect) {
                gr.FillRoundRect(px, py, pw, ph, shapeRadius, shapeRadius, maskColor);
            } else {
                gr.FillSolidRect(px, py, pw, ph, maskColor);
            }
        }
    }

    function clearCache() {
        colorCache.clear();
        imageCache.clear();
        gradientFillCache.clear();
        bgImage = null;
        bgImageKey = "";
        lastGradientFillKey = "";
        lastGradientFillImage = null;
    }

    return {
        setThemeColor,
        setMaskColor,
        resetToThemeColor,
        updateFromMetadb,
        updateBackgroundImage,
        tryApplyCachedColorsByMetadb,
        applyColors: applyColorsByObject,
        getColors,
        paint,
        clearCache,
    };
}

/**
 * @param {{
 *   background: PanelBackgroundControllerConfig,
 *   getPreferredMetadb: function(): (FbMetadbHandle|null),
 *   getTargetSize: function(): {w:number, h:number},
 *   getAlbumArt?: function(FbMetadbHandle): (GdiBitmap|null)
 * }} opts
 */
function createPanelBackgroundAutoController(opts) {
    const safeOpts = opts || {};
    const backgroundCfg = safeOpts.background || {};
    const mode =
        backgroundCfg.mode === "theme" || backgroundCfg.mode === "cover-image" || backgroundCfg.mode === "custom"
            ? backgroundCfg.mode
            : "cover-color";

    const customCfg = backgroundCfg.custom || {};
    const customColor1 = typeof customCfg.color1 === "number" ? customCfg.color1 : _rgb(0, 0, 0);
    const customColor2 = typeof customCfg.color2 === "number" ? customCfg.color2 : customColor1;

    const controller = createPanelBackgroundController(backgroundCfg);
    const getPreferredMetadb =
        typeof safeOpts.getPreferredMetadb === "function"
            ? safeOpts.getPreferredMetadb
            : function () { return null; };
    const getTargetSize =
        typeof safeOpts.getTargetSize === "function"
            ? safeOpts.getTargetSize
            : function () { return { w: 0, h: 0 }; };
    const getAlbumArt =
        typeof safeOpts.getAlbumArt === "function"
            ? safeOpts.getAlbumArt
            : function (metadb) {
                return utils && typeof utils.GetAlbumArtV2 === "function"
                    ? utils.GetAlbumArtV2(metadb, 0)
                    : null;
            };

    const syncKeyTf = backgroundCfg.keyTf || fb.TitleFormat("%album artist% - %album%");

    let currentMetadb = null;
    let lastSyncedRawImg = null;
    let lastSourceHint = BG_SOURCE_AUTO_FETCH;
    let lastSizeW = -1;
    let lastSizeH = -1;
    let lastAutoFetchMissTrackKey = "";
    let lastCoverImageRenderSig = "";

    function getSize() {
        const size = getTargetSize() || { w: 0, h: 0 };
        return {
            w: Math.max(0, Math.floor(size.w || 0)),
            h: Math.max(0, Math.floor(size.h || 0)),
        };
    }

    /**
     * @param {FbMetadbHandle|null} metadb
     * @returns {string}
     */
    function getSyncTrackKey(metadb) {
        if (!metadb) return "";
        const keyByTf =
            syncKeyTf && typeof syncKeyTf.EvalWithMetadb === "function"
                ? syncKeyTf.EvalWithMetadb(metadb)
                : "";
        return keyByTf || metadb.Path || "";
    }

    /**
     * @param {FbMetadbHandle|null|undefined} metadb
     * @returns {FbMetadbHandle|null}
     */
    function resolveMetadb(metadb) {
        if (typeof metadb === "undefined") {
            return getPreferredMetadb() || null;
        }
        return metadb || null;
    }

    /**
     * @param {FbMetadbHandle|null} metadb
     * @param {string} sourceHint
     * @param {GdiBitmap|null} rawImg
     * @returns {GdiBitmap|null}
     */
    function resolveImageSource(metadb, sourceHint, rawImg) {
        if (!metadb) return null;
        if (sourceHint === BG_SOURCE_PROVIDED_RAW) return rawImg || null;
        if (sourceHint === BG_SOURCE_EXPLICIT_NO_ART) return null;
        return getAlbumArt(metadb);
    }

    /**
     * @param {string} trackKey
     * @param {number} w
     * @param {number} h
     * @param {string} sourceHint
     * @param {boolean} hasRaw
     * @returns {string}
     */
    function buildCoverImageRenderSig(trackKey, w, h, sourceHint, hasRaw) {
        return (trackKey || "") + "|" + w + "x" + h + "|" + sourceHint + "|" + (hasRaw ? 1 : 0);
    }

    /**
     * 根据 sourceHint 同步背景状态，并更新 resize 复用状态。
     * 仅在 cover-image 分支计算尺寸，避免非图像模式的无效热路径开销。
     * @param {FbMetadbHandle|null} metadb
     * @param {string} sourceHint
     * @param {GdiBitmap|null} rawImg
     * @returns {void}
     */
    function runSync(metadb, sourceHint, rawImg) {
        currentMetadb = metadb;
        lastSourceHint = sourceHint;

        if (mode === "theme") {
            lastSyncedRawImg = null;
            lastAutoFetchMissTrackKey = "";
            lastCoverImageRenderSig = "";
            lastSizeW = -1;
            lastSizeH = -1;
            controller.resetToThemeColor();
            return;
        }

        if (mode === "custom") {
            lastSyncedRawImg = null;
            lastAutoFetchMissTrackKey = "";
            lastCoverImageRenderSig = "";
            lastSizeW = -1;
            lastSizeH = -1;
            controller.applyColors({ c1: customColor1, c2: customColor2 });
            return;
        }

        if (!currentMetadb) {
            lastSyncedRawImg = null;
            lastAutoFetchMissTrackKey = "";
            lastCoverImageRenderSig = "";
            if (mode === "cover-image") {
                const size = getSize();
                lastSizeW = size.w;
                lastSizeH = size.h;
                controller.updateBackgroundImage(null, null, size.w, size.h);
            } else {
                lastSizeW = -1;
                lastSizeH = -1;
            }
            controller.resetToThemeColor();
            return;
        }

        if (
            mode === "cover-color" &&
            sourceHint === BG_SOURCE_AUTO_FETCH &&
            controller.tryApplyCachedColorsByMetadb(currentMetadb)
        ) {
            lastSyncedRawImg = null;
            lastAutoFetchMissTrackKey = "";
            lastCoverImageRenderSig = "";
            return;
        }

        const sourceImg = resolveImageSource(currentMetadb, sourceHint, rawImg || null);
        lastSyncedRawImg = sourceImg || null;

        let currentTrackKey = "";
        if (sourceHint === BG_SOURCE_AUTO_FETCH || mode === "cover-image") {
            currentTrackKey = getSyncTrackKey(currentMetadb);
        }
        if (sourceHint === BG_SOURCE_AUTO_FETCH) {
            if (sourceImg && currentTrackKey) {
                lastAutoFetchMissTrackKey = "";
            } else if (!sourceImg && currentTrackKey) {
                lastAutoFetchMissTrackKey = currentTrackKey;
            }
        } else {
            lastAutoFetchMissTrackKey = "";
        }

        if (mode === "cover-image") {
            const size = getSize();
            lastSizeW = size.w;
            lastSizeH = size.h;

            const nextSig = buildCoverImageRenderSig(
                currentTrackKey,
                size.w,
                size.h,
                sourceHint,
                !!sourceImg,
            );
            if (nextSig === lastCoverImageRenderSig) {
                return;
            }

            if (sourceImg) {
                controller.updateBackgroundImage(currentMetadb, sourceImg, size.w, size.h);
            } else {
                controller.updateBackgroundImage(null, null, size.w, size.h);
                controller.resetToThemeColor();
            }
            lastCoverImageRenderSig = nextSig;
            return;
        }

        lastCoverImageRenderSig = "";
        lastSizeW = -1;
        lastSizeH = -1;
        controller.updateFromMetadb(currentMetadb, sourceImg || null);
    }


    /**
     * @param {FbMetadbHandle|null} [metadb]
     */
    function syncAuto(metadb) {
        runSync(resolveMetadb(metadb), BG_SOURCE_AUTO_FETCH, null);
    }

    /**
     * @param {FbMetadbHandle|null} metadb
     * @param {GdiBitmap|null} rawImg
     */
    function syncWithRaw(metadb, rawImg) {
        runSync(resolveMetadb(metadb), BG_SOURCE_PROVIDED_RAW, rawImg || null);
    }

    /**
     * @param {FbMetadbHandle|null} [metadb]
     */
    function syncNoArt(metadb) {
        runSync(resolveMetadb(metadb), BG_SOURCE_EXPLICIT_NO_ART, null);
    }

    /**
     * 兼容入口：
     * - sync()：自动解析 preferred metadb 后走 auto-fetch
     * - sync(metadb)：对指定 metadb 走 auto-fetch
     * - sync(metadb, rawImg)：使用调用方提供的原图，不做 fallback 取图
     * - sync(metadb, null)：显式无图路径，不做 fallback 取图
     * @param {FbMetadbHandle|null} [metadb]
     * @param {GdiBitmap|null} [rawImg]
     */
    function sync(metadb, rawImg) {
        if (typeof rawImg === "undefined") {
            syncAuto(metadb);
            return;
        }
        if (rawImg) {
            syncWithRaw(metadb || null, rawImg);
        } else {
            syncNoArt(metadb || null);
        }
    }

    /**
     * cover-image 模式尺寸变化回调：
     * - 先复用 lastSyncedRawImg
     * - auto-fetch 且同曲目已确认无图时，抑制重复取图
     * - 通过 render signature 跳过同输入的重复 updateBackgroundImage 调用
     */
    function onResize() {
        if (mode !== "cover-image") return;

        const size = getSize();
        if (size.w === lastSizeW && size.h === lastSizeH) return;
        lastSizeW = size.w;
        lastSizeH = size.h;

        if (!currentMetadb) {
            const emptySig = buildCoverImageRenderSig("", size.w, size.h, lastSourceHint, false);
            if (emptySig === lastCoverImageRenderSig) return;
            controller.updateBackgroundImage(null, null, size.w, size.h);
            lastCoverImageRenderSig = emptySig;
            return;
        }

        const currentTrackKey = getSyncTrackKey(currentMetadb);
        let rawImg = lastSyncedRawImg;
        if (!rawImg && lastSourceHint === BG_SOURCE_AUTO_FETCH) {
            if (!(currentTrackKey && currentTrackKey === lastAutoFetchMissTrackKey)) {
                rawImg = resolveImageSource(currentMetadb, BG_SOURCE_AUTO_FETCH, null);
                if (rawImg && currentTrackKey) {
                    lastAutoFetchMissTrackKey = "";
                } else if (!rawImg && currentTrackKey) {
                    lastAutoFetchMissTrackKey = currentTrackKey;
                }
            }
        }

        const nextSig = buildCoverImageRenderSig(
            currentTrackKey,
            size.w,
            size.h,
            lastSourceHint,
            !!rawImg,
        );
        if (nextSig === lastCoverImageRenderSig) return;

        if (rawImg) {
            lastSyncedRawImg = rawImg;
            controller.updateBackgroundImage(currentMetadb, rawImg, size.w, size.h);
        } else {
            lastSyncedRawImg = null;
            controller.updateBackgroundImage(null, null, size.w, size.h);
            controller.resetToThemeColor();
        }

        lastCoverImageRenderSig = nextSig;
    }



    /**
     * 清空内部缓存与同步状态，确保后续从干净状态重新同步。
     */
    function clearCache() {
        controller.clearCache();
        currentMetadb = null;
        lastSyncedRawImg = null;
        lastSourceHint = BG_SOURCE_AUTO_FETCH;
        lastSizeW = -1;
        lastSizeH = -1;
        lastAutoFetchMissTrackKey = "";
        lastCoverImageRenderSig = "";
    }

    return {
        paint: controller.paint,
        setThemeColor: controller.setThemeColor,
        setMaskColor: controller.setMaskColor,
        sync,
        syncWithRaw,
        syncNoArt,
        onResize,
        clearCache,
        getController: function () {
            return controller;
        },
    };
}

/**
 * @param {{
 *   background: PanelBackgroundControllerConfig,
 *   getPreferredMetadb: function(): (FbMetadbHandle|null),
 *   getTargetRect: function(): {x:number, y:number, w:number, h:number},
 *   getAlbumArt?: function(FbMetadbHandle): (GdiBitmap|null)
 * }} opts
 */
function createPanelBackgroundLayer(opts) {
    const safeOpts = opts || {};
    const getTargetRect =
        typeof safeOpts.getTargetRect === "function"
            ? safeOpts.getTargetRect
            : function () { return { x: 0, y: 0, w: 0, h: 0 }; };

    const auto = createPanelBackgroundAutoController({
        background: safeOpts.background || {},
        getPreferredMetadb: safeOpts.getPreferredMetadb,
        getTargetSize: function () {
            const rect = getTargetRect() || { x: 0, y: 0, w: 0, h: 0 };
            return { w: rect.w || 0, h: rect.h || 0 };
        },
        getAlbumArt: safeOpts.getAlbumArt,
    });

    function paint(gr) {
        const rect = getTargetRect() || { x: 0, y: 0, w: 0, h: 0 };
        auto.paint(gr, rect.x || 0, rect.y || 0, rect.w || 0, rect.h || 0);
    }

    function paintAt(gr, x, y, w, h) {
        auto.paint(gr, x, y, w, h);
    }

    return {
        paint,
        paintAt,
        sync: auto.sync,
        syncWithRaw: auto.syncWithRaw,
        syncNoArt: auto.syncNoArt,
        onResize: auto.onResize,
        setThemeColor: auto.setThemeColor,
        setMaskColor: auto.setMaskColor,
        clearCache: auto.clearCache,
        getController: auto.getController,
    };
}
