/**
 * @file tab_stack.js
 * @author XYSRe
 * @created 2026-05-02
 * @updated 2026-05-06
 * @version 1.2.0
 * @description JSplitter Tab 单选切换控制器（支持图标与文字样式）
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/theme.js");
include("lib/interaction.js");
include("lib/background.js");

window.DefineScript("tab_stack", {
    author: "XYSRe",
    version: "1.2.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

const TAB_KIND_ICON = "icon";
const TAB_KIND_TEXT = "text";

const TAB_BAR_PADDING = _scale(2);
const ICON_TAB_SIZE = _scale(12);
const TAB_ITEM_GAP = _scale(8);

const ALIGN_LEFT = "left";
const ALIGN_CENTER = "center";
const ALIGN_RIGHT = "right";
const TAB_ALIGNMENT = ALIGN_CENTER;

const tooltip = _initTooltip(THEME.FONT.BODY, _scale(13), 1200);

const TAB_BAR_BG_CFG = {
    // 背景模式：
    // - "theme": 使用主题背景色
    // - "cover-color": 使用封面提色（无封面回退主题色）
    // - "cover-image": 使用封面图背景（无封面回退主题色）
    mode: "cover-color",
    gradient: {
        // 渐变仅在 theme / cover-color 参与底色绘制时生效；cover-image 下不参与底图绘制。
        enabled: true,
        // 渐变角度，推荐 [0, 360]。
        angle: 90,
        // 渐变跨度：2=第1色与第2色，5=第1色与第5色（不足则回退最后可用色）。
        span: 10,        
    },
    image: {
        // 仅在 mode="cover-image" 生效：cover=铺满可能裁切；fit=完整显示可能留边。
        scaleMode: "cover",
        // 仅在 mode="cover-image" 生效，范围 [0, 200]，越大越模糊。
        blurRadius: 150,
        // 仅在 mode="cover-image" 生效，最小 1；越大占用越多内存但重建更少。
        cacheSize: 3,
    },
    mask: {
        // 遮罩在所有 mode 都生效。
        enabled: true,
        // 遮罩 RGB 颜色（alpha 由下方 alpha 控制）。
        color: _rgb(0, 0, 0),
        // 遮罩透明度，范围 [0, 255]；0=透明，255=不透明。
        alpha: 120,
    },
    // auto controller 颜色缓存条目数，最小 1。
    cacheSize: Math.min(5, THEME.CFG.CACHE_SIZE),
};

const tabBarBackground = createPanelBackgroundAutoController({
    background: {
        mode: TAB_BAR_BG_CFG.mode,
        gradient: TAB_BAR_BG_CFG.gradient,
        image: TAB_BAR_BG_CFG.image,
        mask: TAB_BAR_BG_CFG.mask,
        cacheSize: TAB_BAR_BG_CFG.cacheSize,
        keyTf: fb.TitleFormat("%album artist% - %album%"),
    },
    getPreferredMetadb: function () {
        // const selection = fb.GetSelection();
        // const selection = fb.GetFocusItem();
        // if (selection) return selection;
        if (fb.IsPlaying) return fb.GetNowPlaying();
        return null;
    },
    getTargetSize: function () {
        return { w: window.Width, h: getBgPaintHeight() };
    },
    getAlbumArt: function (metadb) {
        return utils.GetAlbumArtV2(metadb, 0);
    },
});
tabBarBackground.setThemeColor(THEME.COL.BG);


/**
 * @typedef {Object} TabConfig
 * @property {"icon"|"text"} [kind] - Tab 类型，缺省为 icon
 * @property {number} [index] - JSplitter 面板索引（caption 未命中时回退）
 * @property {string} [caption] - JSplitter 面板标题（优先解析）
 * @property {string} [label] - 文字 Tab 显示文本
 * @property {GdiBitmap|null} [imgNormal] - 图标 Tab 默认图标
 * @property {GdiBitmap|null} [imgHover] - 图标 Tab 悬停图标
 * @property {GdiBitmap|null} [imgActivate] - 图标 Tab 激活图标
 * @property {string} [tipText] - Tooltip 文案
 */

/**
 * @typedef {Object} TabRuntimeItem
 * @property {*} panel - JSplitter panel 对象
 * @property {Button|TextTab} button - 对应交互控件
 * @property {"icon"|"text"} kind - 控件类型
 */

const TAB_CONFIGS = [
    {
        kind: TAB_KIND_TEXT,
        index: 0,
        caption: "Album",
        label: "Album",
        tipText: "Album",
    },
    {
        kind: TAB_KIND_TEXT,
        index: 1,
        caption: "Biography",
        label: "Biography",
        tipText: "Biography",
    },
    {
        kind: TAB_KIND_TEXT,
        index: 2,
        imgNormal: _loadImage(IMGS_LUCIDE_DIR + "disc-3.png"),
        imgHover: _loadImage(IMGS_LUCIDE_DIR + "disc-3_hover.png"),
        imgActivate: _loadImage(IMGS_LUCIDE_DIR + "disc-3_activate.png"),        
        caption: "ESlyric",
        label: "ESlyric",
        tipText: "ESlyric",
    },
];

/** @type {TabRuntimeItem[]} */
let tabs = [];
let activeIndex = -1;
let lastWidth = -1;
let lastHeight = -1;
/** @type {{w:number, h:number}[]} */
let tabLayoutSizes = [];
let tabBarHeightCache = 0;
/** @type {Button|TextTab|null} */
let currentHoverBtn = null;

/**
 * @param {{caption?: string, index?: number}} cfg
 * @returns {*|null}
 */
function resolvePanel(cfg) {
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

/**
 * @param {TabConfig} cfg
 * @returns {"icon"|"text"}
 */
function resolveTabKind(cfg) {
    return cfg.kind === TAB_KIND_TEXT ? TAB_KIND_TEXT : TAB_KIND_ICON;
}

/**
 * @param {TabConfig} cfg
 * @returns {boolean}
 */
function isValidIconConfig(cfg) {
    return !!cfg.imgNormal && !!cfg.imgHover;
}

/**
 * @param {TabConfig} cfg
 * @returns {boolean}
 */
function isValidTextConfig(cfg) {
    return !!(cfg.label || cfg.caption);
}

function destroyButtons() {
    tabs = [];
    currentHoverBtn = null;
    tooltip("");
    _setCursor(CURSOR_ARROW);
}

/**
 * @param {TabRuntimeItem} tab
 * @returns {{w:number, h:number}}
 */
function getTabControlSize(tab) {
    if (tab.kind === TAB_KIND_TEXT) {
        return tab.button.getPreferredSize(window.Width);
    }
    return { w: ICON_TAB_SIZE, h: ICON_TAB_SIZE };
}

/**
 * 计算每个 tab 控件尺寸并缓存 tabBar 高度，同时返回当前布局总宽度。
 * @returns {number}
 */
function recalcLayoutMetrics() {
    tabLayoutSizes = [];
    let maxControlH = ICON_TAB_SIZE;
    let totalWidth = 0;

    for (let i = 0; i < tabs.length; i++) {
        const size = getTabControlSize(tabs[i]);
        tabLayoutSizes[i] = size;
        if (size.h > maxControlH) maxControlH = size.h;
        totalWidth += size.w;
        if (i < tabs.length - 1) totalWidth += TAB_ITEM_GAP;
    }

    tabBarHeightCache = maxControlH + TAB_BAR_PADDING * 2;
    return totalWidth;
}
function getTabBarHeight() {
    return tabBarHeightCache;
}
function getBgPaintHeight() {
    return window.Height;
}

function layoutButtons() {
    if (!tabs.length || window.Width <= 0 || window.Height <= 0) return;

    const totalWidth = recalcLayoutMetrics();

    let startX;
    if (TAB_ALIGNMENT === ALIGN_LEFT) {
        startX = TAB_BAR_PADDING;
    } else if (TAB_ALIGNMENT === ALIGN_RIGHT) {
        startX = window.Width - TAB_BAR_PADDING - totalWidth;
    } else {
        startX = Math.floor((window.Width - totalWidth) / 2);
    }

    const maxControlH = tabBarHeightCache - TAB_BAR_PADDING * 2;

    let x = startX;
    for (let i = 0; i < tabs.length; i++) {
        const w = tabLayoutSizes[i].w;
        const h = tabLayoutSizes[i].h;
        const y = TAB_BAR_PADDING + Math.floor((maxControlH - h) / 2);

        tabs[i].button.x = x;
        tabs[i].button.y = y;
        tabs[i].button.w = w;
        tabs[i].button.h = h;

        x += w + TAB_ITEM_GAP;
    }
}

function layoutPanels() {
    if (window.Width <= 0 || window.Height <= 0) return;

    const contentY = tabBarHeightCache;
    const contentH = Math.max(0, window.Height - contentY);

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].panel) {
            tabs[i].panel.Move(0, contentY, window.Width, contentH, false);
        }
    }
}

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

        const kind = resolveTabKind(cfg);
        const tabIndex = tabs.length;
        const tipText = cfg.tipText || cfg.label || cfg.caption || "";
        let button = null;

        if (kind === TAB_KIND_TEXT) {
            if (!isValidTextConfig(cfg)) {
                console.log("tab_stack: skipped text tab, label is invalid at config index " + i);
                continue;
            }
            button = new TextTab({
                label: cfg.label || cfg.caption || "",
                tipText,
                func: () => applyActive(tabIndex),
                bgStyle: "underline"
            });
        } else {
            if (!isValidIconConfig(cfg)) {
                console.log("tab_stack: skipped icon tab, icon images invalid at config index " + i);
                continue;
            }
            button = new Button({
                imgNormal: cfg.imgNormal,
                imgHover: cfg.imgHover,
                imgActivate: cfg.imgActivate,
                tipText,
                func: () => applyActive(tabIndex),
            });
        }

        tabs.push({ panel, button, kind });
    }

    if (!tabs.length) {
        activeIndex = -1;
        return;
    }

    layoutButtons();
    layoutPanels();
    applyActive(0);
    tabBarBackground.sync();
}

/**
 * @param {number} nextIndex
 * @returns {void}
 */
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

function init() {
    rebuildTabs();
}

init();

function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    if (window.Width === lastWidth && window.Height === lastHeight) return;

    lastWidth = window.Width;
    lastHeight = window.Height;

    layoutButtons();
    layoutPanels();
    tabBarBackground.onResize();
    window.RepaintRect(0, 0, window.Width, getBgPaintHeight());
}

/**
 * @param {GdiGraphics} gr
 * @returns {void}
 */
function on_paint(gr) {
    tabBarBackground.paint(gr, 0, 0, window.Width, getBgPaintHeight());
    // tabBarBackground.paint(gr, 0, 0, window.Width, window.Height);
    // gr.DrawLine(0, tabBarHeight - 1, window.Width, tabBarHeight - 1, 1, THEME.COL.FRAME);

    for (let i = 0; i < tabs.length; i++) {
        tabs[i].button.paint(gr);
    }
}

/**
 * 统一处理 hover 目标切换，集中更新按钮状态、tooltip 与鼠标光标。
 * @param {Button|TextTab|null} newHoverBtn
 * @returns {void}
 */
function setHoverButton(newHoverBtn) {
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

/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function on_mouse_move(x, y) {
    const tabBarHeight = getTabBarHeight();
    if (y < 0 || y > tabBarHeight) {
        setHoverButton(null);
        return;
    }

    let newHoverBtn = null;

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].button.containsPoint(x, y)) {
            newHoverBtn = tabs[i].button;
            break;
        }
    }

    setHoverButton(newHoverBtn);
}

/**
 * @returns {void}
 */
function on_mouse_leave() {
    setHoverButton(null);
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function on_mouse_lbtn_up(x, y) {
    if (currentHoverBtn) {
        currentHoverBtn.onLbtnUp(x, y);
    }
}

function on_colours_changed() {
    _refreshThemeColors();
    tabBarBackground.setThemeColor(THEME.COL.BG);
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].kind === TAB_KIND_TEXT) {
            tabs[i].button.refreshStyle();
        }
    }
    tabBarBackground.sync();
    window.RepaintRect(0, 0, window.Width, getBgPaintHeight());
}

function on_font_changed() {
    _refreshThemeFonts();
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].kind === TAB_KIND_TEXT) {
            tabs[i].button.refreshStyle();
        }
    }
    layoutButtons();
    layoutPanels();
    tabBarBackground.onResize();
    window.RepaintRect(0, 0, window.Width, getBgPaintHeight());
}

function on_playback_new_track(metadb) {
    tabBarBackground.sync(metadb);
    window.RepaintRect(0, 0, window.Width, getBgPaintHeight());
}

function on_playback_stop(reason) {
    if (reason !== 2) {
        tabBarBackground.sync();
        window.RepaintRect(0, 0, window.Width, getBgPaintHeight());
    }
}

function on_playlist_items_selection_change() {
    const now = fb.IsPlaying ? fb.GetNowPlaying() : null;
    const sel = fb.GetSelection();
    const target = now || sel || null;
    tabBarBackground.sync(target);
    window.RepaintRect(0, 0, window.Width, getBgPaintHeight());
}

/**
 * @returns {void}
 */
function on_script_unload() {
    tabBarBackground.clearCache();
    destroyButtons();
    _measureDispose();
}
