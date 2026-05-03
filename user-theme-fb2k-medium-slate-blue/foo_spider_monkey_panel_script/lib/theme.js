/**
 * @file theme.js
 * @author XYSRe
 * @created 2026-04-27
 * @updated 2026-05-03
 * @version 2.0.0
 * @description 共享主题配置 — 颜色、字体(GdiFont)、布局、配置开关(CFG)、路径
 * @requires lib/utils.js
 */

"use strict";

// ============================================================================
// THEME — 集中管理所有 CUI 系统颜色、字体和路径
// ============================================================================

/*
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
 * @property {Object} COL - CUI 颜色值，键名为 UPPER_SNAKE_CASE
 * @property {number} COL.FG - 普通文字颜色
 * @property {number} COL.SEL_FG - 选中文字颜色
 * @property {number} COL.BG - 全局背景色
 * @property {number} COL.SEL_BG - 选中项背景色
 * @property {number} COL.FRAME - 激活项/强调色
 * @property {number} COL.SCROLLBAR - 滚动条颜色 (硬编码)
 * @property {Object} FONT - GdiFont 对象集合
 * @property {GdiFont} FONT.TITLE - 大标题字体
 * @property {GdiFont} FONT.BODY - 正文字体
 * @property {GdiFont} FONT.BOLD - 加粗正文字体
 * @property {GdiFont} FONT.LABEL - 标签字体 (CUI Labels)
 * @property {Object} LAYOUT - DPI 缩放后的布局常量
 * @property {number} LAYOUT.MARGIN - 外边距
 * @property {number} LAYOUT.LINE_H - 行高
 * @property {number} LAYOUT.LINE_SPACE - 行间距
 * @property {number} LAYOUT.ICON_SIZE - 图标尺寸
 * @property {number} LAYOUT.SCROLL_STEP - 滚轮步长
 * @property {number} LAYOUT.IMG_CYCLE_MS - 封面轮播间隔(ms)
 * @property {Object} CFG - 共享配置开关
 * @property {boolean} CFG.GRAB_FOCUS - DefineScript 焦点选项
 * @property {number} CFG.CACHE_SIZE - LRU 缓存上限
 * @property {number} CFG.SOURCE_ICON_SIZE - 来源图标尺寸
 * @property {Object} CFG.AQ_BADGE - 音质标识布局配置
 * @property {number} CFG.AQ_BADGE.PADDING_X - 水平内边距
 * @property {number} CFG.AQ_BADGE.PADDING_Y - 垂直内边距
 * @property {number} CFG.AQ_BADGE.RADIUS - 圆角半径
 * @property {number} CFG.AQ_BADGE.BORDER_W - 边框宽度
 */

// CUI 字体源
const FONT_ITEMS  = window.GetFontCUI(0);  // Common (list items)
const FONT_LABELS = window.GetFontCUI(1);  // Common (labels)

console.log("============theme初始化");

const THEME = {
    // --- CUI 全局颜色 ---
    // GetColourCUI 索引说明（设置面板的7个颜色）:
    //   0 = Item Foreground (普通文字 前景色)
    //   1 = Selected item Foreground(激活面板 选中文字 前景色)
    //   2 = Inactive selected item Foreground (未激活面板 选中文字 前景色)
    //   3 = Item Background(普通文字 背景色)
    //   4 = Selected item Background (激活面板 选中文字 背景色)
    //   5 = Inactive selected item Background (未激活面板 选中文字 背景色)
    //   6 = Active item frame (激活项/强调色)
    COL: {
        FG:             window.GetColourCUI(0),
        SEL_FG:         window.GetColourCUI(1),
        BG:             window.GetColourCUI(3),
        SEL_BG:         window.GetColourCUI(4),
        FRAME:          window.GetColourCUI(6),
        // ITEM_DETAIL_BG:  window.GetColourCUI(3, "{4E20CEED-42F6-4743-8EB3-610454457E19}"),
        // 硬编码色值
        SCROLLBAR:      _rgb(149, 149, 149),
    },

    // --- CUI 字体 (统一为 GdiFont 对象) ---
    // Used in window.GetFontCUI()
    // GetFontCUI(FontTypeCUI, client_guidopt)
    // FontTypeCUI 说明：
    //   0 = Common (list items)
    //   1 = Common (labels)
    // client_guidopt:
    //   NG Playlist: Items: "{19F8E0B3-E822-4F07-B200-D4A67E4872F9}"
    // GdiFont = gdi.Font(name, size, style)
    // 面板直接使用 THEME.FONT.TITLE / .BODY 等，无需再调用 gdi.Font()
    FONT: {
        TITLE: gdi.Font(FONT_ITEMS.Name, _scale(18), 1),  // 大标题
        BODY:  gdi.Font(FONT_ITEMS.Name, _scale(12), 0),  // 正文 / 按钮 / 紧凑文字
        BOLD:  gdi.Font(FONT_ITEMS.Name, _scale(12), 1),  // 正文加粗 / 选中按钮
        LABEL: FONT_LABELS,                                 // 标签 / 徽章 / 面板标题
    },

    // --- 通用布局常量 (已 DPI 缩放) ---
    LAYOUT: {
        MARGIN:       _scale(10),
        LINE_H:       _scale(16),
        LINE_SPACE:   _scale(8),
        ICON_SIZE:    _scale(10),
        SCROLL_STEP:  _scale(30),
        IMG_CYCLE_MS: 8000,
    },

    // --- 共享配置开关 (跨面板复用) ---
    CFG: {
        GRAB_FOCUS:       false,         // DefineScript 选项
        CACHE_SIZE:       50,            // LRU 缓存上限
        SOURCE_ICON_SIZE: _scale(10),    // 来源图标尺寸
        AQ_BADGE: {                      // 音质标识布局
            PADDING_X: _scale(4),
            PADDING_Y: _scale(4),
            RADIUS:   _scale(4),
            BORDER_W:  _scale(1),
        },
    },
};

// ============================================================================
// THEME 刷新函数 — on_colours_changed / on_font_changed 时调用
// ============================================================================

/**
 * @returns {void}
 */
function _refreshThemeColors() {
    THEME.COL.FG             = window.GetColourCUI(0);
    THEME.COL.SEL_FG         = window.GetColourCUI(1);
    THEME.COL.BG             = window.GetColourCUI(3);
    THEME.COL.SEL_BG         = window.GetColourCUI(4);
    THEME.COL.FRAME          = window.GetColourCUI(6);
}

/**
 * @returns {void}
 */
function _refreshThemeFonts() {
    const itemsName  = window.GetFontCUI(0).Name;
    const labelsFont = window.GetFontCUI(1);
    THEME.FONT.TITLE = gdi.Font(itemsName, _scale(18), 1);
    THEME.FONT.BODY  = gdi.Font(itemsName, _scale(12), 0);
    THEME.FONT.BOLD  = gdi.Font(itemsName, _scale(12), 1);
    THEME.FONT.LABEL = labelsFont;
}

// --- 图片资源路径 ---
const IMGS_BASE = fb.ProfilePath + "\\user-theme-fb2k-medium-slate-blue\\imgs";
const IMGS_LUCIDE_DIR = IMGS_BASE + "\\Lucide\\";
const IMGS_LINKS_DIR  = IMGS_BASE + "\\Links\\";
