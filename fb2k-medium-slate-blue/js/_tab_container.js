/**
 * @description JSplitter Tab 单选切换控制器（支持图标与文字样式）
 */

"use strict";
window.DrawMode = 1;

include("lib/utils.js");
include("lib/data.js");
include("lib/theme.js");
include("lib/interaction.js");
include("lib/background.js");
include("lib/icons.js");

window.DefineScript("_tab_container", {
    author: "XRE",
    version: "2.1.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

const TAB_KIND_ICON = "icon";
const TAB_KIND_TEXT = "text";

const TAB_BAR_PADDING = normalizePadding({top:_scale(12), right:0, bottom:0, left:0});
const PANEL_AREA_PADDING = normalizePadding({top:0, right:_scale(6), bottom:_scale(10), left:_scale(6)});
const ICON_TAB_SIZE = _scale(12);
const TAB_ITEM_GAP = _scale(8);

// 按钮位置，靠左、居中、靠右
const ALIGN_LEFT = "left";
const ALIGN_CENTER = "center";
const ALIGN_RIGHT = "right";
const TAB_ALIGNMENT = ALIGN_CENTER;

const tooltip = _createDefaultTooltip();

const TAB_BAR_BG_CFG = {
    // 背景模式: "theme" | "cover-color" | "cover-image" | "custom"
    // - "theme": 使用主题背景色
    // - "cover-color": 使用封面提色（无封面回退主题色）
    // - "cover-image": 使用封面图背景（无封面回退主题色）
    // - "custom": 使用 custom.color1/color2 填充（无需封面/meta，支持 _argb 半透明）
    mode: "cover-image",
    
    // ===== 形状（全模式生效）=====
    shapeType: "round-rect",                // "rect" | "round-rect"
    shapeRadius: THEME.LAYOUT.CORNER_RADIUS, // 圆角半径 (px)，<=0 等同矩形
    padding: _scale(8),                     // 背景绘制内边距 (px)

    // ===== 渐变（theme / cover-color / custom 生效，cover-image 不参与底图绘制）=====
    gradientEnabled: true,                  // 是否启用渐变
    gradientAngle: 90,                      // 渐变角度 [0, 360]
    gradientSpan: 8,                        // 渐变跨度 (>=2)；2=第1/2色，N=第1/N色

    // ===== 背景图（仅 cover-image 生效）=====
    imageScaleMode: "cover",                // "cover"=铺满裁切 | "fit"=完整留边
    imageBlurRadius: 150,                   // 模糊半径 [0, 200]
    imageCacheSize: 3,                      // 图片缓存条目数 (>=1)

    // ===== 遮罩（全模式生效，可与 fill alpha 叠加）=====
    maskEnabled: true,
    maskColor: THEME.COL.MASK,              // 遮罩 RGB 颜色
    maskAlpha: 150,                         // 遮罩透明度 [0, 255]；0=透明

    // ===== 缓存（cover-color / cover-image 用于颜色/图片缓存）=====
    cacheSize: Math.min(5, THEME.CFG.CACHE_SIZE), // 颜色缓存条目数 (>=1)

    // ===== custom 模式专用（仅在 mode="custom" 生效）=====
    // custom: {
    //     color1: _argb(255, 30, 35, 45),  // ARGB 填充色1（必填）
    //     color2: _argb(255, 40, 45, 55),  // ARGB 填充色2（可选，不设=单色无渐变）
    // },
};


const tabBarBackground = createPanelBackgroundLayer({
    background: {
        mode: TAB_BAR_BG_CFG.mode,
        gradient: {
            enabled: TAB_BAR_BG_CFG.gradientEnabled,
            angle: TAB_BAR_BG_CFG.gradientAngle,
            span: TAB_BAR_BG_CFG.gradientSpan,
        },
        image: {
            scaleMode: TAB_BAR_BG_CFG.imageScaleMode,
            blurRadius: TAB_BAR_BG_CFG.imageBlurRadius,
            cacheSize: TAB_BAR_BG_CFG.imageCacheSize,
        },
        shape: {
            type: TAB_BAR_BG_CFG.shapeType,
            radius: TAB_BAR_BG_CFG.shapeRadius,
        },        
        mask: {
            enabled: TAB_BAR_BG_CFG.maskEnabled,
            color: TAB_BAR_BG_CFG.maskColor,
            alpha: TAB_BAR_BG_CFG.maskAlpha,
        },
        custom: TAB_BAR_BG_CFG.custom,
        cacheSize: TAB_BAR_BG_CFG.cacheSize,
        keyTf: THEME.TF.COVER_KEY,
    },
    getPreferredMetadb: function () {
        return resolveMetadbByMode(METADB_RESOLVE_MODE.PLAYING_FIRST);
    },
    getTargetRect: function () {
        return calcContentRect(window.Width, getBgPaintHeight(), TAB_BAR_BG_CFG.padding);
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
        imgNormal: iconMgr.get('ui', 'disc-3'),
        imgHover: iconMgr.get('ui', 'disc-3_hover'),
        imgActivate: iconMgr.get('ui', 'disc-3_activate'),
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
            console.log("tab_container: GetPanel failed for caption \"" + cfg.caption + "\": " + e);
        }
    }

    if (typeof cfg.index === "number") {
        try {
            const panelByIndex = window.GetPanelByIndex(cfg.index);
            if (panelByIndex) return panelByIndex;
        } catch (e) {
            console.log("tab_container: GetPanelByIndex failed for index " + cfg.index + ": " + e);
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

    tabBarHeightCache = maxControlH + TAB_BAR_PADDING.top + TAB_BAR_PADDING.bottom;
    return totalWidth;
}
function getTabBarHeight() {
    return tabBarHeightCache;
}
function getBgPaintHeight() {
    // 不是伪透明模式下直接重绘区域高度
    if (!window.IsTransparent) return window.Height;
    // 避免画圆角矩形报错
    const minRoundRectHeight = TAB_BAR_BG_CFG.shapeType === "round-rect" ? TAB_BAR_BG_CFG.shapeRadius * 2 : 1;
    return Math.max(tabBarHeightCache, minRoundRectHeight);
}

function layoutButtons() {
    if (!tabs.length || window.Width <= 0 || window.Height <= 0) return;

    const totalWidth = recalcLayoutMetrics();

    let startX;
    if (TAB_ALIGNMENT === ALIGN_LEFT) {
        startX = TAB_BAR_PADDING.left;
    } else if (TAB_ALIGNMENT === ALIGN_RIGHT) {
        startX = window.Width - TAB_BAR_PADDING.right - totalWidth;
    } else {
        startX = Math.floor((window.Width - totalWidth) / 2);
    }

    const maxControlH = tabBarHeightCache - TAB_BAR_PADDING.top - TAB_BAR_PADDING.bottom;

    let x = startX;
    for (let i = 0; i < tabs.length; i++) {
        const w = tabLayoutSizes[i].w;
        const h = tabLayoutSizes[i].h;
        const y = TAB_BAR_PADDING.top + Math.floor((maxControlH - h) / 2);

        tabs[i].button.x = x;
        tabs[i].button.y = y;
        tabs[i].button.w = w;
        tabs[i].button.h = h;

        x += w + TAB_ITEM_GAP;
    }
}

function layoutPanels() {
    if (window.Width <= 0 || window.Height <= 0) return;

    const roundInset = TAB_BAR_BG_CFG.shapeType === "round-rect" ? TAB_BAR_BG_CFG.shapeRadius : 0;
    const contentY = tabBarHeightCache;
    const panelX = PANEL_AREA_PADDING.left + roundInset;
    const panelY = contentY + PANEL_AREA_PADDING.top + roundInset;
    const panelW = Math.max(0, window.Width - PANEL_AREA_PADDING.left - PANEL_AREA_PADDING.right - roundInset * 2);
    const panelH = Math.max(0, window.Height - panelY - PANEL_AREA_PADDING.bottom - roundInset);

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].panel) {
            tabs[i].panel.Move(panelX, panelY, panelW, panelH, false);
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
            console.log("tab_container: skipped tab, target panel not found at config index " + i);
            continue;
        }

        const kind = resolveTabKind(cfg);
        const tabIndex = tabs.length;
        const tipText = cfg.tipText || cfg.label || cfg.caption || "";
        let button = null;

        if (kind === TAB_KIND_TEXT) {
            if (!isValidTextConfig(cfg)) {
                console.log("tab_container: skipped text tab, label is invalid at config index " + i);
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
                console.log("tab_container: skipped icon tab, icon images invalid at config index " + i);
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
    tabBarBackground.paint(gr);
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
    tabBarBackground.setMaskColor(THEME.COL.MASK);
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
    const target = resolveMetadbByMode(METADB_RESOLVE_MODE.PLAYING_FIRST);
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
