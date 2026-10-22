/**
 * @description 共享主题配置 — 颜色、字体(GdiFont)、布局、配置开关(CFG)、文本样式预设(TEXT)、路径
 * @requires lib/utils.js
 */

"use strict";

// ============================================================================
// THEME — 集中管理 CUI/DUI 系统颜色、字体和路径
// ============================================================================

/*
 * CUI API reference — enum values are implemented as real constants below.
 *
window.GetColourCUI(type, client_guidopt)
window.GetFontCUI(type, client_guidopt)

// Used in window.GetColourCUI()
const ColourTypeCUI = {
    text: 0,
    selection_text: 1,
    inactive_selection_text: 2,
    background: 3,
    selection_background: 4,
    inactive_selection_background: 5,
    active_item_frame: 6
};

// Used in window.GetFontCUI()
const FontTypeCUI = {
    items: 0,
    labels: 1
};

SupportColourFlagCUI = {
    text: 0x0,
    selection_text: 0x2,
    inactive_selection_text: 0x4,
    background: 0x8,
    selection_background: 0x10;
    inactive_selection_background: 0x20,
    active_item_frame: 0x40,
    group_foreground: 0x80,
    group_background: 0x100,
    colour_flag_all: 0x1ff
};

=== Colours ===
Used in GetColourCUI() as client_guid
NG Playlist: "{C882D3AC-C014-44DF-9C7E-2DADF37645A0}" Support Bits: 0x000001ff
Columns Playlist: "{0CF29D60-1262-4F55-A6E1-BC4AE6579D19}" Support Bits: 0x000001ff
Item Details: "{4E20CEED-42F6-4743-8EB3-610454457E19}" Support Bits: 0x00000009
Album List: "{DA66E8F3-D210-4AD2-89D4-9B2CC58D0235}" Support Bits: 0x00000049
Filter Panel: "{4D6774AF-C292-44AC-8A8F-3B0855DCBDF4}" Support Bits: 0x000001ff
Biography View: "{1CE33A5C-1D79-48F7-82EF-089EC49A9CA3}" Support Bits: 0x00000059
Artwork View: "{E32DCBA9-A2BF-4901-AB43-228628071410}" Support Bits: 0x00000008
Playlist Switcher: "{EB38A997-3B5F-4126-8746-262AA9C1F94B}" Support Bits: 0x000001ff
Item Properties: "{862F8A37-16E0-4A74-B27E-2B73DB567D0F}" Support Bits: 0x000001ff

=== Fonts ===
Used in GetFontCUI() as client_guid
Album List: "{06B856CC-86E7-4459-A75C-2DAB5B33B8BB}"
Item Properties: Group Titles: "{AF5A96A6-96ED-468F-8BA1-C22533C53491}"
Columns Playlist: Items: "{82196D79-69BC-4041-8E2A-E3B4406BB6FC}"
NG Playlist: Group Titles: "{FB127FFA-1B35-4572-9C1A-4B96A5C5D537}"
NG Playlist: Column Titles: "{30FBD64C-2031-4F0B-A937-F21671A2E195}"
Playlist Switcher: "{70A5C273-67AB-4BB6-B61C-F7975A6871FD}"
Filter Panel: Column Titles: "{FCA8752B-C064-41C4-9BE3-E125C7C7FC34}"
Columns Playlist: Column Titles: "{C0D3B76C-324D-46D3-BB3C-E81C7D3BCB85}"
Tab Stack: "{6F000FC4-3F86-4FC5-80EA-F7AA4D9551E6}"
Console: "{26059FEB-488B-4CE1-824E-4DF113B4558E}"
Biography View: "{F692FE36-D0CB-40A9-A53E-1492D6EFAC65}"
NG Playlist: Items: "{19F8E0B3-E822-4F07-B200-D4A67E4872F9}"
Playlist Tabs: "{942C36A4-4E28-4CEA-9644-F223C9A838EC}"
Status Bar: "{B9D5EA18-5827-40BE-A896-302A71BCAA9C}"
Item Details: "{77F3FA70-E39C-46F8-8E8A-6ECC64DDE234}"
Item Properties: Column Titles: "{7B9DF268-4ECC-4E10-A308-E145DA9692A5}"
Item Properties: Items: "{755FBB3D-A8D4-46F3-B0BA-005B0A10A01A}"
Filter Panel: Items: "{D93F1EF3-4AEE-4632-B5BF-0220CEC76DED}"
*/

/**
 * @typedef {Object} ThemeConfig
 * @property {number} UI_TYPE - 0 = Columns UI, 1 = Default UI
 * @property {Object} COL - CUI/DUI 颜色值，键名为 UPPER_SNAKE_CASE
 * @property {number} COL.FG - 普通文字颜色
 * @property {number} COL.SEL_FG - 选中文字颜色
 * @property {number} COL.BG - 全局背景色
 * @property {number} COL.SEL_BG - 选中项背景色
 * @property {number} COL.FRAME - 激活项/强调色
 * @property {number} COL.SCROLLBAR - 滚动条颜色 (硬编码)
 * @property {number} COL.MASK - 遮罩层底色
 * @property {number} COL.PLAYLIST_SWICHER_MASK - Playlist Switcher 遮罩底色 (CUI 指定 GUID；DUI 回退全局背景)
 * @property {number} COL.PLAYLIST_MASK - NG Playlist 遮罩底色 (CUI 指定 GUID；DUI 回退全局背景)
 * @property {Object} FONT - GdiFont 对象集合
 * @property {GdiFont} FONT.TITLE - 大标题字体
 * @property {GdiFont} FONT.BODY - 正文字体
 * @property {GdiFont} FONT.BOLD - 加粗正文字体
 * @property {GdiFont} FONT.LABEL - 标签字体 (CUI Labels / DUI Tabs)
 * @property {Object} LAYOUT - DPI 缩放后的布局常量
 * @property {number} LAYOUT.ICON_SIZE - 图标尺寸
 * @property {number} LAYOUT.SCROLL_STEP - 滚轮步长
 * @property {number} LAYOUT.IMG_CYCLE_MS - 封面轮播间隔(ms)
 * @property {number} LAYOUT.TRANSPARENT_SYNC_NOTIFY_FRESH_MS - 子面板通知 freshness 窗口(ms)
 * @property {number} LAYOUT.TRANSPARENT_REPAINT_FALLBACK_DELAY_MS - 子面板兜底重绘延迟(ms)
 * @property {number} LAYOUT.BG_TRANSPARENT_SYNC_DELAY_MS - 背景面板同步延迟(ms)
 * @property {number} LAYOUT.BG_TRANSPARENT_SYNC_LATE_DELAY_MS - 背景面板晚发同步延迟(ms)
 * @property {number} LAYOUT.CORNER_RADIUS - 统一圆角半径 (已缩放)
 * @property {number} LAYOUT.TOOLTIP_FONT_SIZE - Tooltip 字号
 * @property {number} LAYOUT.TOOLTIP_MAX_WIDTH - Tooltip 最大宽度
 * @property {Object} CFG - 共享配置开关
 * @property {boolean} CFG.GRAB_FOCUS - DefineScript 焦点选项
 * @property {number} CFG.CACHE_SIZE - LRU 缓存上限
 * @property {number} CFG.SOURCE_ICON_SIZE - 来源图标尺寸
 * @property {Object} CFG.AQ_BADGE - 音质标识布局配置
 * @property {{top:number,right:number,bottom:number,left:number}} CFG.AQ_BADGE.PADDING - 四边内边距
 * @property {number} CFG.AQ_BADGE.RADIUS - 圆角半径
 * @property {number} CFG.AQ_BADGE.BORDER_W - 边框宽度
 * @property {Object} TF - 共享 TitleFormat 实例
 * @property {FbTitleFormat} TF.COVER_KEY - 封面缓存键格式
 */

// ============================================================================
// UI adapter — Columns UI (0) / Default UI (1)
// ============================================================================

const _THEME_UI_TYPE = window.InstanceType; // 0 = Columns UI, 1 = Default UI
const _THEME_IS_DUI = _THEME_UI_TYPE === 1;

// Used in window.GetColourCUI()
const ColourTypeCUI = {
    text: 0,
    selection_text: 1,
    inactive_selection_text: 2,
    background: 3,
    selection_background: 4,
    inactive_selection_background: 5,
    active_item_frame: 6,
};

// Used in window.GetFontCUI()
const FontTypeCUI = { items: 0, labels: 1 };

// Used in window.GetColourDUI()
const ColourTypeDUI = { text: 0, background: 1, highlight: 2, selection: 3 };

// Used in window.GetFontDUI()
const FontTypeDUI = {
    defaults: 0, tabs: 1, lists: 2, playlists: 3, statusbar: 4, console: 5,
};

const _CUI_GUID_PLAYLIST_SWITCHER = "{EB38A997-3B5F-4126-8746-262AA9C1F94B}";
const _CUI_GUID_PLAYLIST = "{C882D3AC-C014-44DF-9C7E-2DADF37645A0}";

/**
 * Read CUI theme colours.
 * ColourTypeCUI: 0 text, 1 selected text, 3 background,
 * 4 selection background, 6 active item frame.
 * @returns {Object}
 */
function _readCUIColors() {
    return {
        FG: window.GetColourCUI(ColourTypeCUI.text),
        SEL_FG: window.GetColourCUI(ColourTypeCUI.selection_text),
        BG: window.GetColourCUI(ColourTypeCUI.background),
        SEL_BG: window.GetColourCUI(ColourTypeCUI.selection_background),
        FRAME: window.GetColourCUI(ColourTypeCUI.active_item_frame),
        MASK: window.GetColourCUI(ColourTypeCUI.background),
        PLAYLIST_SWICHER_MASK:
            window.GetColourCUI(ColourTypeCUI.background, _CUI_GUID_PLAYLIST_SWITCHER),
        PLAYLIST_MASK:
            window.GetColourCUI(ColourTypeCUI.background, _CUI_GUID_PLAYLIST),
    };
}

/**
 * Read DUI theme colours.
 * @returns {Object}
 */
function _readDUIColors() {
    const text = window.GetColourDUI(ColourTypeDUI.text);
    const background = window.GetColourDUI(ColourTypeDUI.background);
    const highlight = window.GetColourDUI(ColourTypeDUI.highlight);
    const selection = window.GetColourDUI(ColourTypeDUI.selection);

    // DUI has no configurable selected-text colour. Use the accent only when
    // it is readable on both the normal and selection backgrounds; otherwise use text.
    const selFg = Math.min(
        _contrastRatio(highlight, background),
        _contrastRatio(highlight, selection)
    ) >= _MIN_TEXT_CONTRAST ? highlight : text;

    return {
        FG: text,
        SEL_FG: selFg,
        BG: background,
        SEL_BG: selection,
        FRAME: highlight,
        MASK: background,
        // DUI has no per-client colour overrides.
        PLAYLIST_SWICHER_MASK: background,
        PLAYLIST_MASK: background,
    };
}

/**
 * Read colours for the current UI.
 * @returns {Object}
 */
function _readThemeColors() {
    const colors = _THEME_IS_DUI ? _readDUIColors() : _readCUIColors();
    // UI-independent hardcoded colour; keep the original THEME.COL contract.
    colors.SCROLLBAR = _rgb(149, 149, 149);
    return colors;
}

/**
 * Build THEME.FONT from the base UI fonts.
 * @param {?GdiFont} itemsFont
 * @param {?GdiFont} labelsFont
 * @returns {Object}
 */
function _buildThemeFonts(itemsFont, labelsFont) {
    const name = (itemsFont && itemsFont.Name) || "Segoe UI";
    return {
        TITLE: gdi.Font(name, _scale(18), 1),
        BODY:  gdi.Font(name, _scale(12), 0),
        BOLD:  gdi.Font(name, _scale(12), 1),
        LABEL: labelsFont || gdi.Font(name, _scale(12), 0),
    };
}

/**
 * Read CUI theme fonts.
 * FontTypeCUI: 0 = items, 1 = labels.
 * @returns {Object}
 */
function _readCUIFonts() {
    return _buildThemeFonts(
        window.GetFontCUI(FontTypeCUI.items),
        window.GetFontCUI(FontTypeCUI.labels)
    );
}

/**
 * Read DUI theme fonts.
 * @returns {Object}
 */
function _readDUIFonts() {
    const defaults = window.GetFontDUI(FontTypeDUI.defaults);
    return _buildThemeFonts(
        window.GetFontDUI(FontTypeDUI.lists) || defaults,
        window.GetFontDUI(FontTypeDUI.tabs) || defaults
    );
}

/**
 * Read fonts for the current UI.
 * @returns {Object}
 */
function _readThemeFonts() {
    return _THEME_IS_DUI ? _readDUIFonts() : _readCUIFonts();
}

// console.log("============theme初始化");

const THEME = {
    // --- UI type: 0 = Columns UI, 1 = Default UI ---
    UI_TYPE: _THEME_UI_TYPE,

    // --- Theme mode: true = dark, false = light ---
    // Assigned after COL is initialised; kept in sync by _refreshThemeColors().
    IS_DARK: true,

    // --- Global colours (CUI / DUI) ---
    // CUI index mapping is documented in _readCUIColors().
    COL: _readThemeColors(),

    // --- Fonts (unified GdiFont objects for CUI / DUI) ---
    // Font sources are documented in _readCUIFonts() / _readDUIFonts().
    FONT: _readThemeFonts(),

    // --- 通用布局常量 (已 DPI 缩放) ---
    LAYOUT: {
        ICON_SIZE:                      _scale(10),
        SCROLL_STEP:                    _scale(30),
        IMG_CYCLE_MS:                   8000,
        // --- 透明背景同步计时 ---
        TRANSPARENT_SYNC_NOTIFY_FRESH_MS:  220,
        TRANSPARENT_REPAINT_FALLBACK_DELAY_MS: 80,
        BG_TRANSPARENT_SYNC_DELAY_MS:       75,
        BG_TRANSPARENT_SYNC_LATE_DELAY_MS:  180,
        // --- Tooltip ---
        CORNER_RADIUS:                 _scale(6),  // 统一圆角半径, 0=直角
        TOOLTIP_FONT_SIZE:             _scale(13),
        TOOLTIP_MAX_WIDTH:             1200,
    },

    // --- 共享配置开关 (跨面板复用) ---
    CFG: {
        GRAB_FOCUS:       false,         // DefineScript 选项
        LANGUAGE:         "en",          // UI 语言 (en/zh)，可被 GetProperty("ui.language") 覆盖
        CACHE_SIZE:       50,            // LRU 缓存上限
        SOURCE_ICON_SIZE: _scale(10),    // 来源图标尺寸
        AQ_BADGE: {                      // 音质标识布局
            PADDING:  { top: _scale(1), right: _scale(6), bottom: _scale(1), left: _scale(6) },
            RADIUS:   _scale(4),
            BORDER_W:  _scale(1),
        },
    },

    // --- 共享 TitleFormat 实例 ---
    TF: {
        COVER_KEY: fb.TitleFormat("%album artist% - %album%"),
    },

    // --- 文本样式预设 (font + color + flags 三元组) ---
    // 使用 getter 确保 on_font_changed / on_colours_changed 后自动反映最新值
    TEXT: {
        get body()      { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: LEFT_WRAP_FLAGS }; },
        get bodyLine()  { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: LEFT_LINE_FLAGS }; },
        get bodyLineBottom()  { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: BOTTOM_LINE_FLAGS }; },
        get title()     { return { font: THEME.FONT.TITLE, color: THEME.COL.SEL_FG, flags: LEFT_WRAP_FLAGS }; },
        get titleLine() { return { font: THEME.FONT.TITLE, color: THEME.COL.SEL_FG, flags: LEFT_LINE_FLAGS }; },
        get titleLineBottom() { return { font: THEME.FONT.TITLE, color: THEME.COL.SEL_FG, flags: BOTTOM_LINE_FLAGS }; },
        get tab()       { return { font: THEME.FONT.BOLD,  color: THEME.COL.FG, flags: CENTER_WRAP_FLAGS }; },
        get label()      { return { font: THEME.FONT.LABEL, color: THEME.COL.FG, flags: LEFT_LINE_FLAGS }; },
        get boldCenter() { return { font: THEME.FONT.BOLD,  color: THEME.COL.FG, flags: CENTER_LINE_FLAGS }; },
        get labelCenter(){ return { font: THEME.FONT.LABEL, color: THEME.COL.FG, flags: CENTER_LINE_FLAGS }; },
        get bodyCenter() { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: CENTER_LINE_FLAGS }; },
        get empty()      { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: CENTER_LINE_FLAGS }; },
    },
};

// Cached dark-mode flag, derived from THEME.COL.BG.
// Use _isDarkTheme(bgColor) for panels with custom / sampled backgrounds.
THEME.IS_DARK = _isDarkTheme();

// ============================================================================
// THEME 刷新函数 — on_colours_changed / on_font_changed 时调用
// ============================================================================

/**
 * Refresh colours in place so cached THEME.COL references stay valid.
 * @returns {void}
 */
function _refreshThemeColors() {
    Object.assign(THEME.COL, _readThemeColors());
    THEME.IS_DARK = _isDarkTheme();
}

/**
 * Refresh fonts in place so cached THEME.FONT references stay valid.
 * @returns {void}
 */
function _refreshThemeFonts() {
    Object.assign(THEME.FONT, _readThemeFonts());
}

// ============================================================================
// 主题模式判断
// ============================================================================

/**
 * Heuristically detect whether the current theme is dark, based on the
 * background colour reported by Columns UI / Default UI.
 * Uses BT.601 luma with the same threshold as _getHoverColor(), so both
 * helpers agree on what counts as a dark colour.
 * Read the cached THEME.IS_DARK for the global mode; call this only for
 * per-surface or one-off custom colours.
 * TODO: Temporary heuristic — JSplitter currently exposes no direct theme-mode
 * API. Replace this with the official API once it becomes available.
 * @param {number} [bgColor=THEME.COL.BG] - Background colour to test
 *        (0xAARRGGBB / 0xRRGGBB). Pass a custom or sampled colour for
 *        transparent / image-backed panels.
 * @returns {boolean} true when the background is perceptually dark.
 */
function _isDarkTheme(bgColor) {
    const c = (Number.isFinite(bgColor) ? bgColor : THEME.COL.BG) >>> 0;
    const luma = 299 * ((c >> 16) & 0xff)
               + 587 * ((c >> 8) & 0xff)
               + 114 * (c & 0xff);
    return luma < 128000;
}

// --- 图片资源路径 ---
const IMGS_BASE     = fb.ProfilePath + "\\fb2k-medium-slate-blue\\imgs";
const ICONS_BRANDS  = IMGS_BASE + "\\icons\\brands\\";
const ICONS_FLAGS   = IMGS_BASE + "\\icons\\flags\\4x3\\";
const ICONS_PLAYER  = IMGS_BASE + "\\icons\\player\\";
const ICONS_UI      = IMGS_BASE + "\\icons\\ui\\";
