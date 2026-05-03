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

window.DefineScript("tab_stack", {
    author: "XYSRe",
    version: "1.1.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. Tab 配置（纯图标模式）
// - caption 与 index 二选一：caption 优先
// - iconNormal/iconHover 必须都存在，缺失则该项跳过
// ============================================================================
const TAB_CONFIGS = [
    {
        index: 0,
        caption: "Album",
        iconNormal: IMGS_LUCIDE_DIR + "disc-album.png",
        iconHover: IMGS_LUCIDE_DIR + "disc-album_hover.png",
    },
    {
        index: 1,
        caption: "Biography",
        iconNormal: IMGS_LUCIDE_DIR + "users-round.png",
        iconHover: IMGS_LUCIDE_DIR + "users-round_hover.png",
    },
    {
        index: 2,
        caption: "ESlyric",
        iconNormal: IMGS_LUCIDE_DIR + "disc-3.png",
        iconHover: IMGS_LUCIDE_DIR + "disc-3_hover.png",
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

// 运行时状态：tabs/button 映射、当前激活索引、尺寸缓存
let tabs = [];
let idToIndex = {};
let activeIndex = -1;
let lastWidth = -1;
let lastHeight = -1;

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

/** @param {{iconNormal?: string, iconHover?: string}} cfg */
function isValidIconConfig(cfg) {
    return !!cfg.iconNormal && !!cfg.iconHover && utils.IsFile(cfg.iconNormal) && utils.IsFile(cfg.iconHover);
}

// 删除并重置所有运行时创建的按钮与映射 / Dispose runtime buttons and mappings
function destroyButtons() {
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].button) {
            window.RemoveButton(tabs[i].button);
        }
    }
    tabs = [];
    idToIndex = {};
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
        tabs[i].button.Move(x, y);
        tabs[i].button.Resize(TAB_BUTTON_SIZE, TAB_BUTTON_SIZE);
        tabs[i].x = x;
        tabs[i].y = y;
        tabs[i].w = TAB_BUTTON_SIZE;
        tabs[i].h = TAB_BUTTON_SIZE;
    }
}

// 将受控 panel 统一铺到 tab 栏下方剩余区域 / Layout controlled panels in content area
function layoutPanels() {
    if (window.Width <= 0 || window.Height <= 0) return;

    const contentY = TAB_BAR_HEIGHT;
    // const contentY = 10;

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
            console.log("tab_stack: skipped tab, icon files invalid at config index " + i);
            continue;
        }

        const btn = window.CreateButton(
            0,
            0,
            [cfg.iconNormal, cfg.iconHover],
            [cfg.iconHover, cfg.iconHover],
        );
        btn.HandOnHover = true;

        const tabIndex = tabs.length;
        tabs.push({ panel, button: btn });
        idToIndex[btn.ID] = tabIndex;
    }

    if (tabs.length) {
        // 有效 tab 存在时才开启全局手型，避免空配置时残留手型状态
        window.HandOnButtons = true;

        layoutButtons();
        layoutPanels();
        applyActive(0);
    } else {
        window.HandOnButtons = false;
        activeIndex = -1;
    }
}

/** @param {number} nextIndex */
function applyActive(nextIndex) {
    if (nextIndex < 0 || nextIndex >= tabs.length) return;
    if (nextIndex === activeIndex) {
        // 防止 JSplitter 按钮内部状态切换导致当前激活按钮显示漂移
        if (tabs[nextIndex].button.State !== 1) {
            tabs[nextIndex].button.State = 1;
        }
        return;
    }

    const nextTab = tabs[nextIndex];
    if (!nextTab) return;

    if (activeIndex < 0 || activeIndex >= tabs.length) {
        // 初始化路径：全量对齐一次状态
        for (let i = 0; i < tabs.length; i++) {
            tabs[i].panel.Show(i === nextIndex);
            tabs[i].button.State = i === nextIndex ? 1 : 0;
        }
        activeIndex = nextIndex;
        return;
    }

    // 常规切换路径：仅更新前后两个 tab
    const prevTab = tabs[activeIndex];

    // 先显示新 panel，避免切换瞬间出现内容区全空导致闪速
    nextTab.panel.Show(true);
    nextTab.button.State = 1;

    if (prevTab) {
        prevTab.panel.Show(false);
        prevTab.button.State = 0;
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
}

/** @param {number} id */
function on_button_click(id) {
    const nextIndex = idToIndex[id];
    if (nextIndex === undefined) return;
    applyActive(nextIndex);
}

// 脚本卸载时释放运行时按钮资源 / Cleanup runtime button resources on unload
function on_script_unload() {
    destroyButtons();
}
