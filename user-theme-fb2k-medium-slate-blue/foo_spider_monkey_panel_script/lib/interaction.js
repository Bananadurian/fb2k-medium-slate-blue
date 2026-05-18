/**
 * @file interaction.js
 * @author XYSRe
 * @created 2026-04-27
 * @updated 2026-05-18
 * @version 2.1.0
 * @description 共享 UI 交互组件 — Button、光标、滚动条、轮播、选项卡、文本缓冲、页码指示器、Tooltip 工厂、_drawText/_drawIcon 样式绘制
 * @requires lib/utils.js
 */

"use strict";

// ============================================================================
// 1. 光标缓存
// ============================================================================

const CURSOR_ARROW = 32512; // IDC_ARROW
const CURSOR_HAND  = 32649; // IDC_HAND

let _lastCursorId = CURSOR_ARROW;

/**
 * 设置光标 (去重，避免重复调用 SetCursor)
 * @param {number} id - 光标 ID (32512=Arrow, 32649=Hand)
 * @returns {void}
 */
function _setCursor(id) {
    if (_lastCursorId === id) return;
    _lastCursorId = id;
    window.SetCursor(id);
}

// ============================================================================
// 2. Button 类 (合并版)
// ============================================================================

const BUTTON_STATE_NORMAL = 0;
const BUTTON_STATE_HOVER = 1;
const BUTTON_STATE_ACTIVE = 2;

/**
 * @typedef {0|1|2} ButtonState
 */

/**
 * @callback ButtonClickHandler
 * @param {number} x - 鼠标 X 坐标
 * @param {number} y - 鼠标 Y 坐标
 * @returns {void}
 */

/**
 * @callback ButtonRightClickHandler
 * @param {number} x - 鼠标 X 坐标
 * @param {number} y - 鼠标 Y 坐标
 * @returns {void}
 */

/**
 * @typedef {Object} ButtonConfig
 * @property {GdiBitmap} imgNormal - 默认图标
 * @property {GdiBitmap} [imgHover] - 悬停图标，默认同 imgNormal
 * @property {GdiBitmap} [imgActivate] - 激活图标，默认同 imgHover
 * @property {ButtonClickHandler} [func] - 左键点击回调
 * @property {ButtonRightClickHandler} [fnRightClick] - 右键点击回调
 * @property {string} [tipText] - Tooltip 文案
 */

/**
 * 可交互图标按钮。
 * 支持 normal / hover / active 三态，以及左右键回调。
 */
class Button {
    /**
     * @param {ButtonConfig} config - 按钮初始化配置
     */
    constructor(config) {
        this.x = 0; this.y = 0; this.w = 0; this.h = 0;
        this.imgNormal = config.imgNormal || null;
        this.imgHover = config.imgHover || this.imgNormal;
        this.imgActivate = config.imgActivate || this.imgHover || this.imgNormal;
        this.imgCurrent = this.imgNormal;
        this.fnClick = config.func || null;
        this.fnRightClick = config.fnRightClick || null;
        this.tipText = config.tipText || "";
        this.isHover = false;
        this.isActive = false;
        this.State = BUTTON_STATE_NORMAL;
    }

    /**
     * 动态更新按钮资源与回调。
     * @param {GdiBitmap} [imgNormal] - 默认图标
     * @param {GdiBitmap} [imgHover] - 悬停图标
     * @param {string} [tipText] - Tooltip 文案
     * @param {ButtonClickHandler} [func] - 左键点击回调
     * @param {GdiBitmap} [imgActivate] - 激活图标
     * @returns {void}
     */
    updateState(imgNormal, imgHover, tipText, func, imgActivate) {
        this.imgNormal = imgNormal || this.imgNormal;
        this.imgHover = imgHover || this.imgNormal;
        this.imgActivate = imgActivate || this.imgActivate || this.imgHover || this.imgNormal;
        this.tipText = tipText || "";
        if (func) this.fnClick = func;
        this._applyVisualState();
        this.repaint();
    }

    /**
     * 根据 isActive / isHover 同步当前图标与 State。
     * @private
     * @returns {void}
     */
    _applyVisualState() {
        if (this.isActive) {
            this.imgCurrent = this.imgActivate;
            this.State = BUTTON_STATE_ACTIVE;
            return;
        }
        if (this.isHover) {
            this.imgCurrent = this.imgHover;
            this.State = BUTTON_STATE_HOVER;
            return;
        }
        this.imgCurrent = this.imgNormal;
        this.State = BUTTON_STATE_NORMAL;
    }

    /**
     * 直接设置按钮状态。
     * @param {ButtonState} state - BUTTON_STATE_NORMAL / BUTTON_STATE_HOVER / BUTTON_STATE_ACTIVE
     * @returns {void}
     */
    setState(state) {
        this.isActive = state === BUTTON_STATE_ACTIVE;
        this.isHover = state === BUTTON_STATE_HOVER;
        this._applyVisualState();
        this.repaint();
    }

    /**
     * 设置激活态。
     * @param {boolean} value - true 激活，false 取消激活
     * @returns {void}
     */
    setActive(value) {
        const nextActive = !!value;
        if (this.isActive === nextActive) return;
        this.isActive = nextActive;
        this._applyVisualState();
        this.repaint();
    }

    /**
     * 局部重绘当前按钮区域。
     * @returns {void}
     */
    repaint() {
        window.RepaintRect(this.x, this.y, this.w, this.h);
    }

    /**
     * 绘制按钮当前图像。
     * @param {GdiGraphics} gr
     * @returns {void}
     */
    paint(gr) {
        if (this.imgCurrent) {
            gr.DrawImage(this.imgCurrent, this.x, this.y, this.w, this.h, 0, 0, this.imgCurrent.Width, this.imgCurrent.Height);
        }
    }

    /**
     * 命中检测 (使用 >= 和 <= 消除 1px 间隙导致的闪烁)。
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
    }

    /**
     * 进入 hover 态。
     * @returns {void}
     */
    activate() {
        if (this.isHover) return;
        this.isHover = true;
        if (!this.isActive) {
            this._applyVisualState();
            this.repaint();
        }
    }

    /**
     * 退出 hover 态。
     * @returns {void}
     */
    deactivate() {
        if (!this.isHover) return;
        this.isHover = false;
        if (!this.isActive) {
            this._applyVisualState();
            this.repaint();
        }
    }

    /**
     * 处理左键抬起。
     * @param {number} x
     * @param {number} y
     * @returns {boolean} - 命中且执行点击回调时返回 true
     */
    onLbtnUp(x, y) {
        if (this.containsPoint(x, y) && this.fnClick) {
            this.fnClick(x, y);
            return true;
        }
        return false;
    }

    /**
     * 处理右键按下。
     * @param {number} x
     * @param {number} y
     * @returns {boolean} - 命中且执行右键回调时返回 true
     */
    onRbtnDown(x, y) {
        if (this.containsPoint(x, y) && this.fnRightClick) {
            this.fnRightClick(x, y);
            return true;
        }
        return false;
    }
}

/**
 * @typedef {Object} TextTabStateStyle
 * @property {number} bgColor - 背景颜色（支持 alpha）
 * @property {number} textColor - 文字颜色
 * @property {GdiFont} font - 文字字体
 */

/**
 * @typedef {Object} TextTabMetrics
 * @property {number} paddingX - 左右内边距
 * @property {number} paddingY - 上下内边距
 * @property {number} height - 控件高度
 * @property {number} radius - 背景圆角半径
 */

/**
 * @typedef {Object} TextTabStyleConfig
 * @property {TextTabMetrics} metrics - 尺寸与圆角配置
 * @property {{normal: TextTabStateStyle, hover: TextTabStateStyle, select: TextTabStateStyle}} states - 三态样式
 */

/**
 * @typedef {Object} TextTabConfig
 * @property {string} label - 文本内容
 * @property {TextTabStyleConfig} [style] - 样式配置（可选，缺省使用内置默认样式）
 * @property {Partial<TextTabStyleConfig>} [styleOverrides] - 样式局部覆盖（字段级合并）
 * @property {ButtonClickHandler} [func] - 左键点击回调
 * @property {string} [tipText] - Tooltip 文案
 * @property {number} [textFlags] - GdiDrawText 对齐标记
 * @property {"rect"|"underline"} [bgStyle] - 背景样式，缺省 "rect"
 */

const TEXT_TAB_MIN_HEIGHT = _scale(20);

/**
 * @returns {TextTabStyleConfig}
 */
function _createDefaultTextTabStyle() {
    function withAlpha(alpha) {
        return _argb(alpha, THEME.COL.SEL_BG);
    }

    return {
        metrics: {
            paddingX: _scale(6),
            paddingY: _scale(2),
            height: TEXT_TAB_MIN_HEIGHT,
            radius: THEME.LAYOUT.CORNER_RADIUS,
        },
        states: {
            normal: {
                bgColor: withAlpha(0),
                textColor: THEME.COL.FG,
                font: THEME.FONT.LABEL,
            },
            hover: {
                bgColor: withAlpha(102),
                textColor: THEME.COL.SEL_FG,
                font: THEME.FONT.LABEL,
            },
            select: {
                bgColor: withAlpha(204),
                textColor: THEME.COL.SEL_FG,
                font: THEME.FONT.LABEL,
            },
        },
    };
}

/**
 * @param {TextTabStyleConfig} base
 * @param {Partial<TextTabStyleConfig>} [override]
 * @returns {TextTabStyleConfig}
 */
function _mergeTextTabStyle(base, override) {
    if (!override) return base;

    const merged = {
        metrics: {
            paddingX: base.metrics.paddingX,
            paddingY: base.metrics.paddingY,
            height: base.metrics.height,
            radius: base.metrics.radius,
        },
        states: {
            normal: {
                bgColor: base.states.normal.bgColor,
                textColor: base.states.normal.textColor,
                font: base.states.normal.font,
            },
            hover: {
                bgColor: base.states.hover.bgColor,
                textColor: base.states.hover.textColor,
                font: base.states.hover.font,
            },
            select: {
                bgColor: base.states.select.bgColor,
                textColor: base.states.select.textColor,
                font: base.states.select.font,
            },
        },
    };

    if (override.metrics) {
        if (typeof override.metrics.paddingX === "number") merged.metrics.paddingX = override.metrics.paddingX;
        if (typeof override.metrics.paddingY === "number") merged.metrics.paddingY = override.metrics.paddingY;
        if (typeof override.metrics.height === "number") merged.metrics.height = override.metrics.height;
        if (typeof override.metrics.radius === "number") merged.metrics.radius = override.metrics.radius;
    }

    if (override.states) {
        const stateKeys = ["normal", "hover", "select"];
        for (let i = 0; i < stateKeys.length; i++) {
            const key = stateKeys[i];
            const src = override.states[key];
            if (!src) continue;
            if (typeof src.bgColor === "number") merged.states[key].bgColor = src.bgColor;
            if (typeof src.textColor === "number") merged.states[key].textColor = src.textColor;
            if (src.font) merged.states[key].font = src.font;
        }
    }

    return merged;
}
const TEXT_TAB_DEFAULT_FLAGS =
    (typeof DT_CENTER === "number" ? DT_CENTER : 0x00000001) |
    (typeof DT_VCENTER === "number" ? DT_VCENTER : 0x00000004) |
    (typeof DT_SINGLELINE === "number" ? DT_SINGLELINE : 0x00000020) |
    (typeof DT_NOPREFIX === "number" ? DT_NOPREFIX : 0x00000800);

/**
 * 可交互文字选项卡。
 * 支持 normal / hover / active 三态，绘制圆角背景与文字。
 */
class TextTab {
    /**
     * @param {TextTabConfig} config - 文字 Tab 初始化配置
     */
    constructor(config) {
        this.x = 0; this.y = 0; this.w = 0; this.h = 0;
        this.label = config.label || "";
        this.fnClick = config.func || null;
        this.tipText = config.tipText || "";
        this.textFlags = typeof config.textFlags === "number" ? config.textFlags : TEXT_TAB_DEFAULT_FLAGS;
        this.bgStyle = config.bgStyle === "underline" ? "underline" : "rect";
        this.isHover = false;
        this.isActive = false;
        this.State = BUTTON_STATE_NORMAL;

        this.styleSource = config.style || null;
        this.styleOverrides = config.styleOverrides || null;
        this.style = null;
        this._preferredSizeCacheKey = null;
        this._preferredSizeCacheValue = null;
        this._preferredSizeCacheFontSignature = "";
        this._lastRect = null;
        this.refreshStyle(undefined, true);
    }

    /**
     * @param {Partial<TextTabStyleConfig>} [styleOverrides]
     * @param {boolean} [silent]
     * @returns {void}
     */
    refreshStyle(styleOverrides, silent) {
        if (styleOverrides !== undefined) {
            this.styleOverrides = styleOverrides;
        }

        let style = _createDefaultTextTabStyle();
        if (this.styleSource) {
            style = _mergeTextTabStyle(style, this.styleSource);
        }
        if (this.styleOverrides) {
            style = _mergeTextTabStyle(style, this.styleOverrides);
        }
        this.style = style;
        this._preferredSizeCacheKey = null;
        this._preferredSizeCacheValue = null;
        this._preferredSizeCacheFontSignature = "";

        if (!silent) this.repaint();
    }

    /**
     * 获取当前文本标签推荐尺寸。
     * @param {number} [maxWidth]
     * @returns {{w:number, h:number}}
     */
    getPreferredSize(maxWidth) {
        if (!this.style || !this.style.metrics || !this.style.states) {
            return { w: TEXT_TAB_MIN_HEIGHT, h: TEXT_TAB_MIN_HEIGHT };
        }

        const widthLimit = Math.max(1, typeof maxWidth === "number" ? maxWidth : window.Width);

        const metrics = this.style.metrics;
        const states = this.style.states;

        const normalFont = states.normal && states.normal.font ? states.normal.font : THEME.FONT.BODY;
        const hoverFont = states.hover && states.hover.font ? states.hover.font : normalFont;
        const selectFont = states.select && states.select.font ? states.select.font : normalFont;

        const fontSignature =
            String(normalFont && normalFont.Name) + "|" + String(normalFont && normalFont.Size) + "|" + String(normalFont && normalFont.Style) + "|" +
            String(hoverFont && hoverFont.Name) + "|" + String(hoverFont && hoverFont.Size) + "|" + String(hoverFont && hoverFont.Style) + "|" +
            String(selectFont && selectFont.Name) + "|" + String(selectFont && selectFont.Size) + "|" + String(selectFont && selectFont.Style);

        const cacheKey =
            String(widthLimit) + "|" +
            this.label + "|" +
            String(this.textFlags) + "|" +
            String(metrics.paddingX) + "|" +
            String(metrics.paddingY) + "|" +
            String(metrics.height);

        if (
            this._preferredSizeCacheKey === cacheKey &&
            this._preferredSizeCacheFontSignature === fontSignature &&
            this._preferredSizeCacheValue
        ) {
            return this._preferredSizeCacheValue;
        }

        const measuredByFont = [];

        function getMeasured(font, label, limit, flags) {
            for (let i = 0; i < measuredByFont.length; i++) {
                if (measuredByFont[i].font === font) return measuredByFont[i].size;
            }
            const size = _measureString(label, font, limit, flags);
            measuredByFont.push({ font, size });
            return size;
        }

        const normalSize = getMeasured(normalFont, this.label, widthLimit, this.textFlags);
        const hoverSize = getMeasured(hoverFont, this.label, widthLimit, this.textFlags);
        const selectSize = getMeasured(selectFont, this.label, widthLimit, this.textFlags);

        const textW = Math.max(normalSize.Width, hoverSize.Width, selectSize.Width);
        const textH = Math.max(normalSize.Height, hoverSize.Height, selectSize.Height);
        const minH = typeof metrics.height === "number" ? metrics.height : TEXT_TAB_MIN_HEIGHT;
        const minW = minH;
        const size = {
            w: Math.max(minW, Math.ceil(textW) + metrics.paddingX * 2),
            h: Math.max(minH, Math.ceil(textH) + metrics.paddingY * 2),
        };

        this._preferredSizeCacheKey = cacheKey;
        this._preferredSizeCacheFontSignature = fontSignature;
        this._preferredSizeCacheValue = size;
        return size;
    }

    /**
     * 局部重绘当前控件区域。
     * 采用旧/新矩形并集 + DPI 外扩，避免抗锯齿与文本边缘像素导致的残影。
     * @returns {void}
     */
    repaint() {
        const newRect = { x: this.x, y: this.y, w: this.w, h: this.h };
        const bleed = Math.max(1, _scale(1));

        if (!this._lastRect) {
            window.RepaintRect(newRect.x - bleed, newRect.y - bleed, newRect.w + bleed * 2, newRect.h + bleed * 2);
            this._lastRect = newRect;
            return;
        }

        const left = Math.min(this._lastRect.x, newRect.x) - bleed;
        const top = Math.min(this._lastRect.y, newRect.y) - bleed;
        const right = Math.max(this._lastRect.x + this._lastRect.w, newRect.x + newRect.w) + bleed;
        const bottom = Math.max(this._lastRect.y + this._lastRect.h, newRect.y + newRect.h) + bleed;

        window.RepaintRect(left, top, right - left, bottom - top);
        this._lastRect = newRect;
    }

    /**
     * 绘制文字 Tab。
     * @param {GdiGraphics} gr
     * @returns {void}
     */
    paint(gr) {
        if (!this.style || !this.style.metrics || !this.style.states) return;

        let stateStyle = this.style.states.normal;
        if (this.isActive) {
            stateStyle = this.style.states.select || stateStyle;
            this.State = BUTTON_STATE_ACTIVE;
        } else if (this.isHover) {
            stateStyle = this.style.states.hover || stateStyle;
            this.State = BUTTON_STATE_HOVER;
        } else {
            this.State = BUTTON_STATE_NORMAL;
        }

        if (!stateStyle) return;

        const radius = this.style.metrics.radius || 0;
        gr.SetSmoothingMode(4);
        if (this.bgStyle === "underline") {
            const lineH = _scale(2);
            const insetX = _scale(5);
            gr.FillRoundRect(this.x + insetX, this.y + this.h - lineH, this.w - insetX * 2, lineH, _scale(1), _scale(1), stateStyle.bgColor);
        } else {
            gr.FillRoundRect(this.x, this.y, this.w, this.h, radius, radius, stateStyle.bgColor);
        }
        gr.SetSmoothingMode(0);
        gr.GdiDrawText(this.label, stateStyle.font, stateStyle.textColor, this.x, this.y, this.w, this.h, this.textFlags);
    }

    /**
     * 命中检测 (使用 >= 和 <= 消除 1px 间隙导致的闪烁)。
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
    }

    /**
     * 设置激活态。
     * @param {boolean} value - true 激活，false 取消激活
     * @returns {void}
     */
    setActive(value) {
        const nextActive = !!value;
        if (this.isActive === nextActive) return;
        this.isActive = nextActive;
        this.repaint();
    }

    /**
     * 进入 hover 态。
     * @returns {void}
     */
    activate() {
        if (this.isHover) return;
        this.isHover = true;
        if (!this.isActive) this.repaint();
    }

    /**
     * 退出 hover 态。
     * @returns {void}
     */
    deactivate() {
        if (!this.isHover) return;
        this.isHover = false;
        if (!this.isActive) this.repaint();
    }

    /**
     * 处理左键抬起。
     * @param {number} x
     * @param {number} y
     * @returns {boolean} - 命中且执行点击回调时返回 true
     */
    onLbtnUp(x, y) {
        if (this.containsPoint(x, y) && this.fnClick) {
            this.fnClick(x, y);
            return true;
        }
        return false;
    }
}

// ============================================================================
// 3. 滚动条绘制
// ============================================================================


/**
 * 绘制垂直滚动条
 * @param {GdiGraphics} gr
 * @param {number} viewH - 可视区域高度
 * @param {number} contentH - 内容总高度
 * @param {number} scrollY - 当前滚动位置
 * @param {number} maxScrollY - 最大滚动位置
 * @param {number} panelW - 面板宽度
 * @param {number} headerH - 头部高度 (滚动区域起始 Y)
 * @param {number} color - 滚动条颜色
 * @returns {void}
 */
function _drawScrollbar(gr, viewH, contentH, scrollY, maxScrollY, panelW, headerH, color) {
    if (maxScrollY <= 0 || contentH <= 0) return;
    const barH = Math.max(_scale(20), (viewH / contentH) * viewH);
    const barY = headerH + (scrollY / maxScrollY) * (viewH - barH);
    gr.FillRoundRect(panelW - _scale(5), barY, _scale(2), barH, _scale(1), _scale(1), color);
}

// ============================================================================
// 4. 图片轮播管理
// ============================================================================

/**
 * @typedef {Object} CarouselState
 * @property {GdiBitmap[]} images - 轮播图片列表
 * @property {number} index - 当前图片索引
 * @property {*} timer - 轮播定时器 ID
 */

/**
 * @callback BeforeCarouselAdvance
 * @param {number} nextIndex - 下一张图片索引
 * @param {CarouselState} carouselState - 当前轮播状态
 * @param {"timer"|"manual"} reason - 触发原因
 * @returns {boolean|void} - 返回 false 时取消切换
 */

/**
 * 管理封面图片轮播定时器。
 * @param {CarouselState} carouselState - 轮播状态对象
 * @param {number} coverH - 封面区域高度
 * @param {number} [cycleMs=8000] - 轮播间隔 (毫秒)
 * @param {number} [panelW=window.Width] - 面板宽度
 * @param {BeforeCarouselAdvance} [beforeAdvance] - 切换前钩子
 * @returns {void}
 */
function _manageCarousel(carouselState, coverH, cycleMs, panelW, beforeAdvance) {
    if (!cycleMs) cycleMs = 8000;
    if (!panelW) panelW = window.Width;

    if (carouselState.timer) {
        window.ClearInterval(carouselState.timer);
        carouselState.timer = null;
    }
    if (carouselState.images && carouselState.images.length > 1) {
        carouselState.timer = window.SetInterval(() => {
            const nextIndex = (carouselState.index + 1) % carouselState.images.length;
            if (typeof beforeAdvance === "function") {
                const canAdvance = beforeAdvance(nextIndex, carouselState, "timer");
                if (canAdvance === false) return;
            }
            carouselState.index = nextIndex;
            window.RepaintRect(0, 0, panelW, coverH);
        }, cycleMs);
    }
}

/**
 * 切换到下一张轮播图片并重置自动轮播计时。
 * @param {CarouselState} carouselState - 轮播状态对象
 * @param {number} coverH - 封面区域高度
 * @param {number} [cycleMs=8000] - 轮播间隔 (毫秒)
 * @param {number} [panelW=window.Width] - 面板宽度
 * @param {BeforeCarouselAdvance} [beforeAdvance] - 切换前钩子
 * @returns {void}
 */
function _carouselNext(carouselState, coverH, cycleMs, panelW, beforeAdvance) {
    if (!panelW) panelW = window.Width;
    if (!carouselState.images || carouselState.images.length === 0) return;

    const nextIndex = (carouselState.index + 1) % carouselState.images.length;
    if (typeof beforeAdvance === "function") {
        const canAdvance = beforeAdvance(nextIndex, carouselState, "manual");
        if (canAdvance === false) return;
    }

    carouselState.index = nextIndex;
    _manageCarousel(carouselState, coverH, cycleMs, panelW, beforeAdvance);
    window.RepaintRect(0, 0, panelW, coverH);
}

// ============================================================================
// 5. 选项卡指示线
// ============================================================================

/**
 * @typedef {Object} TabIndicatorButton
 * @property {number} x - 按钮左侧 X 坐标
 * @property {number} w - 按钮宽度
 */

/**
 * 绘制选项卡底部指示线和分割线
 * @param {GdiGraphics} gr
 * @param {TabIndicatorButton} activeBtn - 当前激活的按钮
 * @param {number} panelW - 面板宽度
 * @param {number} inset - 边缘内缩距离 (已缩放)
 * @param {number} activeColor - 激活指示线颜色
 * @param {number} separatorColor - 分割线颜色
 * @returns {void}
 */
function _drawTabIndicator(gr, activeBtn, panelW, inset, activeColor, separatorColor) {
    const lineSize = _scale(1);
    gr.SetSmoothingMode(4);
    gr.FillRoundRect(inset, activeBtn.y + activeBtn.h,  panelW - inset * 2, lineSize, 0, 0, separatorColor);
    gr.FillRoundRect(activeBtn.x, activeBtn.y + activeBtn.h - lineSize / 2, activeBtn.w, lineSize * 2, _scale(1), _scale(1), activeColor);
    gr.SetSmoothingMode(0);
}

/**
 * 使用样式预设绘制文本
 * @param {GdiGraphics} gr
 * @param {{font:GdiFont, color:number, flags:number}} style - 样式预设对象
 * @param {string} text - 文本内容
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {void}
 */
function _drawText(gr, style, text, x, y, w, h) {
    gr.GdiDrawText(text, style.font, style.color, x, y, w, h, style.flags);
}

/**
 * 绘制垂直居中的图标
 * @param {GdiGraphics} gr
 * @param {GdiBitmap} icon - 图标位图
 * @param {number} x - 左上角 X
 * @param {number} y - 行顶部 Y
 * @param {number} rowH - 行高度 (图标在行内垂直居中)
 * @returns {void}
 */
function _drawIcon(gr, icon, x, y, rowH) {
    const sz = THEME.LAYOUT.ICON_SIZE;
    gr.DrawImage(icon, x, y + Math.ceil((rowH - sz) / 2), sz, sz, 0, 0, icon.Width, icon.Height);
}

// ============================================================================
// 6. 空状态绘制
// ============================================================================

/**
 * 绘制空状态/错误提示文本 (垂直水平居中)
 * @param {GdiGraphics} gr
 * @param {string} text - 提示文本
 * @param {GdiFont} font - 字体
 * @param {number} color - 文字颜色
 * @param {number} panelW - 面板宽度
 * @param {number} panelH - 面板高度
 * @returns {void}
 */
function _drawEmptyState(gr, text, font, color, panelW, panelH) {
    gr.GdiDrawText(text, font, color, 0, panelH / 2, panelW, panelH, DT_CENTER);
}

// ============================================================================
// 7. 封面页码指示器
// ============================================================================

/**
 * 绘制封面轮播页码指示器 (半透明圆角矩形)
 * @param {GdiGraphics} gr
 * @param {number} currentIndex - 当前图片索引 (0-based)
 * @param {number} totalCount - 图片总数
 * @param {number} x - 指示器左上角 X
 * @param {number} y - 指示器左上角 Y
 * @param {number} w - 指示器宽度
 * @param {number} h - 指示器高度
 * @param {GdiFont} font - 页码字体
 * @param {number} [fgColor=0xFFFFFFFF] - 文字颜色
 * @param {number} [bgColor=0x99000000] - 背景颜色
 * @returns {void}
 */
function _drawPageIndicator(gr, currentIndex, totalCount, x, y, w, h, font, fgColor, bgColor) {
    if (!fgColor) fgColor = 0xFFFFFFFF;
    if (!bgColor) bgColor = 0x99000000;
    const pageText = (currentIndex + 1) + " / " + totalCount;
    gr.SetSmoothingMode(4);
    gr.FillRoundRect(x, y, w, h, THEME.LAYOUT.CORNER_RADIUS, THEME.LAYOUT.CORNER_RADIUS, bgColor);
    gr.SetSmoothingMode(0);
    gr.GdiDrawText(pageText, font, fgColor, x, y, w, h, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
}

// ============================================================================
// 8. 可滚动文本渲染
// ============================================================================

/**
 * 直接渲染可滚动文本 (用于 on_paint 回调中)
 * 使用 GdiDrawText 获得原生 ClearType，并用背景色遮盖溢出到头部的文字。
 * 调用后需重绘封面和头部内容（遮盖区域之上）。
// ============================================================================
// 9. 图片字典资源释放
// ============================================================================

/**
 * 安全释放图片字典中的所有 GDI 资源
 * @param {Object.<string, GdiBitmap>} dict - 图片字典
 * @returns {void}
 */
function _disposeImageDict(dict) {
    for (let key in dict) {
        const img = dict[key];
        if (img && typeof img.Dispose === "function") img.Dispose();
    }
}

// ============================================================================
// 10. Tooltip 工厂
// ============================================================================

/**
 * 创建 Tooltip 管理器
 * 用法: let tooltip = _initTooltip(THEME.FONT.TEXT_SM, _scale(13), 1200);
 *        tooltip("tooltip text");
 * @param {GdiFont} gdiFont - GdiFont 对象 (提取 .Name 用于 tooltip)
 * @param {number} fontSize - 字体大小 (已缩放)
 * @param {number} [maxWidth=1200] - 最大宽度
 * @returns {(value: string) => void} - Tooltip 文本更新函数
 */
function _initTooltip(gdiFont, fontSize, maxWidth) {
    if (!maxWidth) maxWidth = 1200;
    const tt = window.CreateTooltip(gdiFont.Name, fontSize);
    tt.SetMaxWidth(maxWidth);
    let _lastText = "";
    return function(value) {
        if (_lastText !== value) {
            _lastText = value;
            tt.Text = value;
            tt.Activate();
        }
    };
}

/**
 * 创建默认 Tooltip 管理器 — 使用 THEME 字体/字号/最大宽度
 * @returns {(value: string) => void}
 */
function _createDefaultTooltip() {
    return _initTooltip(THEME.FONT.BODY, THEME.LAYOUT.TOOLTIP_FONT_SIZE, THEME.LAYOUT.TOOLTIP_MAX_WIDTH);
}

// ============================================================================
// 11. 离屏滚动文本渲染器工厂
// ============================================================================

/**
 * 创建离屏滚动文本渲染器 — 预渲染位图 + DrawImage 子矩形裁剪
 * @param {GdiFont} font
 * @param {number} color
 * @param {number} flags - GDI 文本标志
 * @param {{top:number, right:number, bottom:number, left:number}} padding - 四周边距
 * @returns {{ensure, draw, contentW, dispose}}
 */
function createScrollTextRenderer(font, color, flags, padding) {
    let bmp = null;
    let key = "";

    function contentW(panelW) {
        return Math.max(1, panelW - padding.left - padding.right);
    }

    return {
        /** @param {string} text @param {number} panelW @param {number} fullTextH */
        ensure(text, panelW, fullTextH) {
            const w = contentW(panelW);
            const nextKey = text + "|" + w + "|" + fullTextH;
            if (key === nextKey) return;
            if (bmp && typeof bmp.Dispose === "function") bmp.Dispose();
            bmp = null;
            key = nextKey;
            if (!text || w <= 0 || fullTextH <= 0) return;
            bmp = gdi.CreateImage(w, fullTextH);
            let g = bmp.GetGraphics();
            try {
                g.SetSmoothingMode(4);
                g.GdiDrawText(text, font, color, 0, 0, w, fullTextH, flags);
            } finally {
                bmp.ReleaseGraphics(g);
            }
        },

        /** @param {number} scrollY @param {number} destX @param {number} destY @param {number} destW */
        draw(gr, scrollY, destX, destY, destW) {
            if (!bmp || bmp.Height <= 0) return;
            const srcY = scrollY;
            const srcH = bmp.Height - srcY;
            if (srcH <= 0) return;
            gr.SetInterpolationMode(7);
            gr.DrawImage(bmp,
                destX, destY, destW, srcH,
                0, srcY, destW, srcH);
        },

        /** @param {number} pw @returns {number} */
        contentW(pw) { return contentW(pw); },

        dispose() {
            if (bmp && typeof bmp.Dispose === "function") bmp.Dispose();
            bmp = null;
            key = "";
        },
    };
}
