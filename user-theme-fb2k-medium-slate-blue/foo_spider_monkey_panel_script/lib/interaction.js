/**
 * @file interaction.js
 * @author XYSRe
 * @created 2026-04-27
 * @updated 2026-05-03
 * @version 2.0.0
 * @description 共享 UI 交互组件 — Button、光标、滚动条、轮播、选项卡、文本缓冲、页码指示器、Tooltip 工厂
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
    gr.FillRoundRect(panelW - _scale(3), barY, _scale(2.5), barH, _scale(1), _scale(1), color);
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
 * @param {number} headerH - 头部区域底部 Y 坐标
 * @param {number} panelW - 面板宽度
 * @param {number} margin - 边距值 (已缩放)
 * @param {number} accentColor - 指示线高亮色
 * @param {number} dimColor - 分割线暗色
 * @returns {void}
 */
function _drawTabIndicator(gr, activeBtn, headerH, panelW, margin, accentColor, dimColor) {
    gr.SetSmoothingMode(4);
    gr.DrawLine(activeBtn.x, headerH - margin, activeBtn.x + activeBtn.w, headerH - margin, _scale(2), accentColor);
    gr.DrawLine(margin, headerH - margin, panelW - margin, headerH - margin, _scale(1), dimColor);
    gr.SetSmoothingMode(0);
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
    gr.FillRoundRect(x, y, w, h, _scale(6), _scale(6), bgColor);
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
 * @param {GdiGraphics} gr - on_paint 传入的 Graphics
 * @param {string} text - 要渲染的文本
 * @param {GdiFont} font - 字体
 * @param {number} color - 文字颜色
 * @param {number} x - 渲染区域左上角 X
 * @param {number} y - 渲染区域左上角 Y
 * @param {number} w - 渲染区域宽度
 * @param {number} h - 渲染区域高度
 * @param {number} flags - 文本格式标志
 * @param {number} bgColor - 背景色 (通常为 COL.BG)
 * @param {number} panelW - 面板宽度
 * @param {number} headerH - 头部区域高度 (遮盖到此处)
 * @returns {void}
 */
function _drawScrollText(gr, text, font, color, x, y, w, h, flags, bgColor, panelW, headerH) {
    if (!text) return;
    gr.GdiDrawText(text, font, color, x, y, w, h, flags);
    gr.FillSolidRect(0, 0, panelW, headerH, bgColor);
}

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
