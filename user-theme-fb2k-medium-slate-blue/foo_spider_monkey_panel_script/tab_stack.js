/**
 * @file tab_stack.js
 * @author XYSRe
 * @created 2026-05-02
 * @updated 2026-05-03
 * @version 1.1.0
 * @description JSplitter 图标 Tab 单选切换控制器（配置驱动动态数量）
 */

"use strict";

include("lib/utils.js");
include("lib/theme.js");
include("lib/interaction.js");

window.DefineScript("tab_stack", {
    author: "XYSRe",
    version: "1.1.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. Tab 配置（纯图标模式）
// - caption 与 index 二选一：caption 优先
// - imgNormal/imgHover 必须存在，imgActivate 可选（Button 内部会回退）
// ============================================================================
const TAB_CONFIGS = [
    {
        index: 0,
        caption: "Album",
        imgNormal: _loadImage(IMGS_LUCIDE_DIR + "disc-2.png"),
        imgHover: _loadImage(IMGS_LUCIDE_DIR + "disc-2_hover.png"),
        imgActivate: _loadImage(IMGS_LUCIDE_DIR + "disc-2_activate.png"),
        tipText: "Album",
    },
    {
        index: 1,
        caption: "Biography",
        imgNormal: _loadImage(IMGS_LUCIDE_DIR + "circle-user-round.png"),
        imgHover: _loadImage(IMGS_LUCIDE_DIR + "circle-user-round_hover.png"),
        imgActivate: _loadImage(IMGS_LUCIDE_DIR + "circle-user-round_activate.png"),
        tipText: "Biography",
    },
    {
        index: 2,
        caption: "ESlyric",
        imgNormal: _loadImage(IMGS_LUCIDE_DIR + "disc-3.png"),
        imgHover: _loadImage(IMGS_LUCIDE_DIR + "disc-3_hover.png"),
        imgActivate: _loadImage(IMGS_LUCIDE_DIR + "disc-3_activate.png"),
        tipText: "ESlyric",
    },
];

// 统一 tab 栏布局常量：顶部固定高度，内容区占用剩余空间
const TAB_BAR_PADDING = _scale(2);
const TAB_BUTTON_SIZE = _scale(12);
const TAB_BUTTON_GAP = _scale(8);
const TAB_BAR_HEIGHT = TAB_BUTTON_SIZE + TAB_BAR_PADDING * 2;

const ALIGN_LEFT = "left";
const ALIGN_CENTER = "center";
const ALIGN_RIGHT = "right";
const TAB_ALIGNMENT = ALIGN_CENTER; // left | center | right

const tooltip = _initTooltip(THEME.FONT.BODY, _scale(13), 1200);

// 运行时状态：tabs/button 映射、当前激活索引、尺寸缓存
let tabs = [];
let activeIndex = -1;
let lastWidth = -1;
let lastHeight = -1;
let currentHoverBtn = null;

/** @param {{caption?: string, index?: number}} cfg */
function resolvePanel(cfg) {
    // caption 优先，方便后续改布局时保持索引不敏感
    if (cfg.caption) {
        try {
            const panelByCaption = window.GetPanel(cfg.caption);
            if (panelByCaption) return panelByCaption;
        } catch (e) {
            console.log("tab_stack: GetPanel failed for caption \"" + cfg.caption + "\": " + e);
        }
    }

    if (typeof cfg.index === "number") {
        try {
            const panelByIndex = window.GetPanelByIndex(cfg.index);
            if (panelByIndex) return panelByIndex;
        } catch (e) {
            console.log("tab_stack: GetPanelByIndex failed for index " + cfg.index + ": " + e);
        }
    }

    return null;
}

/** @param {{imgNormal?: GdiBitmap, imgHover?: GdiBitmap, imgActivate?: GdiBitmap}} cfg */
function isValidIconConfig(cfg) {
    return !!cfg.imgNormal && !!cfg.imgHover;
}

// 删除并重置所有运行时创建的按钮与映射 / Dispose runtime buttons and mappings
function destroyButtons() {
    tabs = [];
    currentHoverBtn = null;
    tooltip("");
    _setCursor(CURSOR_ARROW);
}

// 按左/中/右对齐策略计算并更新 tab 按钮位置 / Layout tab buttons by alignment
function layoutButtons() {
    if (!tabs.length || window.Width <= 0 || window.Height <= 0) return;

    const totalWidth = tabs.length * TAB_BUTTON_SIZE + (tabs.length - 1) * TAB_BUTTON_GAP;

    let startX;
    if (TAB_ALIGNMENT === ALIGN_LEFT) {
        startX = TAB_BAR_PADDING;
    } else if (TAB_ALIGNMENT === ALIGN_RIGHT) {
        startX = window.Width - TAB_BAR_PADDING - totalWidth;
    } else {
        startX = Math.floor((window.Width - totalWidth) / 2);
    }

    const y = TAB_BAR_PADDING;

    for (let i = 0; i < tabs.length; i++) {
        const x = startX + i * (TAB_BUTTON_SIZE + TAB_BUTTON_GAP);
        tabs[i].button.x = x;
        tabs[i].button.y = y;
        tabs[i].button.w = TAB_BUTTON_SIZE;
        tabs[i].button.h = TAB_BUTTON_SIZE;
    }
}

// 将受控 panel 统一铺到 tab 栏下方剩余区域 / Layout controlled panels in content area
function layoutPanels() {
    if (window.Width <= 0 || window.Height <= 0) return;

    const contentY = TAB_BAR_HEIGHT;
    const contentH = Math.max(0, window.Height - contentY);

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].panel) {
            tabs[i].panel.Move(0, contentY, window.Width, contentH, false);
        }
    }
}

// 根据配置重建 tabs：解析 panel、创建按钮、初始化激活态 / Rebuild tabs from config
function rebuildTabs() {
    destroyButtons();
    activeIndex = -1;

    for (let i = 0; i < TAB_CONFIGS.length; i++) {
        const cfg = TAB_CONFIGS[i];
        const panel = resolvePanel(cfg);
        if (!panel) {
            console.log("tab_stack: skipped tab, target panel not found at config index " + i);
            continue;
        }
        if (!isValidIconConfig(cfg)) {
            console.log("tab_stack: skipped tab, icon images invalid at config index " + i);
            continue;
        }

        const tabIndex = tabs.length;
        const button = new Button({
            imgNormal: cfg.imgNormal,
            imgHover: cfg.imgHover,
            imgActivate: cfg.imgActivate,
            tipText: cfg.tipText || cfg.caption || "",
            func: () => applyActive(tabIndex),
        });

        tabs.push({ panel, button });
    }

    if (!tabs.length) {
        activeIndex = -1;
        return;
    }

    layoutButtons();
    layoutPanels();
    applyActive(0);
}

/** @param {number} nextIndex */
function applyActive(nextIndex) {
    if (nextIndex < 0 || nextIndex >= tabs.length) return;
    if (nextIndex === activeIndex) return;

    const nextTab = tabs[nextIndex];
    if (!nextTab) return;

    if (activeIndex < 0 || activeIndex >= tabs.length) {
        for (let i = 0; i < tabs.length; i++) {
            const isActive = i === nextIndex;
            tabs[i].panel.Show(isActive);
            tabs[i].button.setActive(isActive);
        }
        activeIndex = nextIndex;
        return;
    }

    const prevTab = tabs[activeIndex];

    nextTab.panel.Show(true);
    nextTab.button.setActive(true);

    if (prevTab) {
        prevTab.panel.Show(false);
        prevTab.button.setActive(false);
    }

    activeIndex = nextIndex;
}



// 初始化入口：首次构建 tab 集合 / Init entry: first tab build
function init() {
    rebuildTabs();
}

init();

// 尺寸变化回调：带尺寸缓存，避免重复布局 / On size: cached layout update (uses window.Width/window.Height)
function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    if (window.Width === lastWidth && window.Height === lastHeight) return;

    lastWidth = window.Width;
    lastHeight = window.Height;

    layoutButtons();
    layoutPanels();
    window.RepaintRect(0, 0, window.Width, TAB_BAR_HEIGHT);
}

/** @param {GdiGraphics} gr */
function on_paint(gr) {
    gr.FillSolidRect(0, 0, window.Width, TAB_BAR_HEIGHT, THEME.COL.BG);
    gr.DrawLine(0, TAB_BAR_HEIGHT - 1, window.Width, TAB_BAR_HEIGHT - 1, 1, THEME.COL.FRAME);
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].button.paint(gr);
    }
}


function on_mouse_move(x, y) {
    let newHoverBtn = null;

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].button.containsPoint(x, y)) {
            newHoverBtn = tabs[i].button;
            break;
        }
    }

    if (newHoverBtn === currentHoverBtn) return;

    if (currentHoverBtn) {
        currentHoverBtn.deactivate();
    }

    if (newHoverBtn) {
        newHoverBtn.activate();
        tooltip(newHoverBtn.tipText || "");
        _setCursor(CURSOR_HAND);
    } else {
        tooltip("");
        _setCursor(CURSOR_ARROW);
    }

    currentHoverBtn = newHoverBtn;
}

function on_mouse_leave() {
    if (currentHoverBtn) {
        currentHoverBtn.deactivate();
        currentHoverBtn = null;
    }
    tooltip("");
    _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_up(x, y) {
    if (currentHoverBtn) {
        currentHoverBtn.onLbtnUp(x, y);
    }
}

function on_script_unload() {
    destroyButtons();
}
