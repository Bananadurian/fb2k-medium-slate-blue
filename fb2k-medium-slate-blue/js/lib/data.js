/**
 * @description 共享数据常量与音质系统 — GDI 标志({LEFT,CENTER}_{WRAP,LINE}_FLAGS)、AQ 音质标识、来源图标、LRU 缓存、音质/来源解析
 * @requires lib/utils.js
 */

"use strict";

// ============================================================================
// 1. 杂项常量
// ============================================================================

const MF_STRING = 0x00000000; // PopupMenu 菜单项标志

// ============================================================================
// 2. GDI DrawText 标志位
// ============================================================================
// 详见: http://msdn.microsoft.com/en-us/library/dd162498(VS.85).aspx

const DT_LEFT         = 0x00000000; // 左对齐
const DT_CENTER       = 0x00000001; // 水平居中
const DT_RIGHT        = 0x00000002; // 右对齐
const DT_VCENTER      = 0x00000004; // 垂直居中 (垂直居中文本。 此值仅用于DT_SINGLELINE值。)
const DT_TOP          = 0x00000000; // 顶？
const DT_BOTTOM       = 0x00000008; // 底部对齐 将文本与矩形底部对齐。 此值仅用于DT_SINGLELINE值。
const DT_WORDBREAK    = 0x00000010; // 自动换行
const DT_WORD_ELLIPSIS= 0x00040000; // 截断矩形中不适合的任何单词，并添加省略号。与DT_END_ELLIPSIS和DT_PATH_ELLIPSIS进行比较。
const DT_SINGLELINE   = 0x00000020; // 单行模式
const DT_NOPREFIX     = 0x00000800; // 禁用 '&' 转义
const DT_EDITCONTROL  = 0x00002000; // 编辑控件样式 (显示部分最后一行)
const DT_END_ELLIPSIS = 0x00008000; // 超出显示省略号
const DT_CALCRECT     = 0x00000400; // 计算矩形

// 常用组合样式 — {LEFT,CENTER} × {WRAP,LINE}_FLAGS 矩阵
// VCENTER 、DT_BOTTOM仅与 SINGLELINE 配对有效；WRAP 与 SINGLELINE 互斥
const LEFT_WRAP_FLAGS   = DT_LEFT   | DT_WORDBREAK | DT_END_ELLIPSIS | DT_NOPREFIX;
const LEFT_LINE_FLAGS   = DT_LEFT   | DT_VCENTER   | DT_END_ELLIPSIS | DT_NOPREFIX | DT_SINGLELINE;
const CENTER_WRAP_FLAGS = DT_CENTER | DT_WORDBREAK | DT_END_ELLIPSIS | DT_NOPREFIX;
const CENTER_LINE_FLAGS = DT_CENTER | DT_VCENTER   | DT_END_ELLIPSIS | DT_NOPREFIX | DT_SINGLELINE;
const BOTTOM_LINE_FLAGS = DT_LEFT   | DT_BOTTOM    | DT_END_ELLIPSIS | DT_NOPREFIX | DT_SINGLELINE;

// ============================================================================
// 3. 音质标识系统 (AQ Badge)
// ============================================================================

// 音质标识颜色 (与专辑信息面板和歌曲信息面板共用)
const AQ_COLORS = {
    silver:    _rgb(178, 180, 188), // AQ-CD   冷灰
    teal:      _rgb(155, 160, 200), // AQ-CD+  紫调冷灰蓝
    green:     _rgb(120, 190, 182), // AQ-ST   冷静青绿
    amber:     _rgb(195, 173, 100), // AQ-HR   驯化琥珀黄
    gold:      _rgb(214, 194, 127), // AQ-HR+  亮阶琥珀
    titanium:  _rgb(230, 232, 240), // AQ-UHR  冷白
    purple:    _rgb(127, 90, 240),  // AQ-DSD  主题紫
    fallback:  _rgb(115, 115, 115), // LOSSY   中灰
    dolbyLossy: _rgb(100, 165, 215), // DD/DD+ 柔和科技蓝
    dolbyHd:    _rgb(130, 195, 255), // TrueHD/Atmos 高亮蓝
};

const _AQ_WHITE = _rgb(255, 255, 255);
const _AQ_BLACK = _rgb(0, 0, 0);

// Dark/light AQ palettes live in one place. Dark backgrounds keep the legacy
// 20% dim formula (now tunable); light backgrounds are generated in OKLCH from
// each AQ_COLORS seed. Both modes share the same text-contrast search.
const AQ_BADGE_CONFIG = {
    dark: {
        bgDim: 0.20,          // dark background = accent * 0.20
        whiteBg: _rgb(57, 57, 64), // pure-white accent fallback
        textContrast: 6.0,    // unified target
    },
    light: {
        bgTone: 0.94,         // OKLCH L: consistent pill lightness
        bgChromaScale: 0.35,  // keep a soft tint
        bgChromaMax: 0.06,
        textContrast: 6.0,    // unified target
    },
    textChromaMax: 0.18,
    textToneStep: 0.01,
};

/**
 * Find a same-hue text color meeting the target contrast.
 * Starts from the raw accent and moves its OKLCH tone toward white (dark mode)
 * or black (light mode) until the contrast target is reached.
 * @param {number} accent
 * @param {number} bgColor
 * @param {{L:number, C:number, h:number}} seed - OKLCH of the accent
 * @param {number} targetContrast
 * @param {boolean} isDark
 * @returns {number}
 */
function _getAQBadgeTextColor(accent, bgColor, seed, targetContrast, isDark) {
    if (_contrastRatio(accent, bgColor) >= targetContrast) return accent;

    const step = isDark ? AQ_BADGE_CONFIG.textToneStep : -AQ_BADGE_CONFIG.textToneStep;
    const chroma = Math.min(seed.C, AQ_BADGE_CONFIG.textChromaMax);
    let tone = seed.L;
    for (let i = 0; i < 100; i++) {
        tone += step;
        if (tone < 0 || tone > 1) break;
        const candidate = _oklchToRgb(tone, chroma, seed.h);
        if (_contrastRatio(candidate, bgColor) >= targetContrast) return candidate;
    }
    return isDark ? _AQ_WHITE : _AQ_BLACK;
}

/**
 * Build one theme mode's AQ badge palette.
 * Does not read THEME; safe to call before theme.js loads.
 * @param {number} accent
 * @param {boolean} isDark
 * @returns {{bgColor: number, textColor: number}}
 */
function _getAQBadgePalette(accent, isDark) {
    const cfg = isDark ? AQ_BADGE_CONFIG.dark : AQ_BADGE_CONFIG.light;
    const seed = _rgbToOklch(accent);

    let bgColor;
    if (isDark) {
        bgColor = (accent & 0xffffff) === 0xffffff
            ? cfg.whiteBg
            : _mixColor(accent, _AQ_BLACK, 1 - cfg.bgDim);
    } else {
        bgColor = _oklchToRgb(
            cfg.bgTone,
            Math.min(seed.C * cfg.bgChromaScale, cfg.bgChromaMax),
            seed.h
        );
    }

    return {
        bgColor: bgColor,
        textColor: _getAQBadgeTextColor(accent, bgColor, seed, cfg.textContrast, isDark),
    };
}

/**
 * 音质标识样式类
 */
class AQBadgeStyle {
    /**
     * @param {string} label
     * @param {number} color - Raw opaque accent color (0xAARRGGBB)
     * @param {string} desc
     */
    constructor(label, color, desc) {
        this.label = label;
        this.color = color;
        this.desc = desc;

        // Precompute both modes without reading THEME, so construction is safe
        // before theme.js loads. THEME is read only by the paint-time getters.
        this._darkPalette = _getAQBadgePalette(color, true);
        this._lightPalette = _getAQBadgePalette(color, false);
    }

    /** @returns {number} Opaque, mode-aware badge background. */
    get bgColor() {
        return THEME.IS_DARK ? this._darkPalette.bgColor : this._lightPalette.bgColor;
    }

    /** @returns {number} Opaque, mode-aware WCAG AA text color. */
    get textColor() {
        return THEME.IS_DARK ? this._darkPalette.textColor : this._lightPalette.textColor;
    }
}

// 音质标识定义表
const AQ_BADGES = {
    CD:      new AQBadgeStyle("AQ-CD",   AQ_COLORS.silver,   "16bit / 44.1kHz"),
    CD_PLUS: new AQBadgeStyle("AQ-CD+",  AQ_COLORS.teal,     "24bit / 44.1kHz"),
    ST:      new AQBadgeStyle("AQ-ST",   AQ_COLORS.green,    "24bit / 48kHz"),
    HR:      new AQBadgeStyle("AQ-HR",   AQ_COLORS.amber,    "24bit / 88.2k-96k"),
    HR_PLUS: new AQBadgeStyle("AQ-HR+",  AQ_COLORS.gold,     "24bit / 176k-192k"),
    UHR:     new AQBadgeStyle("AQ-UHR",  AQ_COLORS.titanium, ">=352.8kHz (DXD)"),
    DSD:     new AQBadgeStyle("AQ-DSD",  AQ_COLORS.purple,   "Native DSD"),
    LOSSY:   new AQBadgeStyle("LOSSY",   AQ_COLORS.fallback, "Compressed"),
    DD:      new AQBadgeStyle("AQ-DD",   AQ_COLORS.dolbyLossy, "Dolby Digital (AC3)"),
    DD_PLUS: new AQBadgeStyle("AQ-DD+",  AQ_COLORS.dolbyLossy, "Dolby Digital Plus"),
    TRUEHD:  new AQBadgeStyle("AQ-THD",  AQ_COLORS.dolbyHd,    "Dolby TrueHD (Lossless)"),
};

/**
 * 根据 codec/采样率/位深 分级并返回对应的音质标识样式
 * 优先级: DSD > Dolby > Hi-Res PCM > CD > Lossy
 * @param {string} codec - 编解码器名称 (需由调用方预先转为大写)
 * @param {number} sampleRate - 采样率 (Hz, 如 44100)
 * @param {number} bitDepth - 位深 (如 16, 24; NaN 视为 0)
 * @returns {AQBadgeStyle}
 */
function _classifyAudioQuality(codec, sampleRate, bitDepth) {
    if (isNaN(bitDepth)) bitDepth = 0;
    if (isNaN(sampleRate)) sampleRate = 0;

    // DSD
    if (codec.includes("DSD") || codec.includes("DST")) return AQ_BADGES.DSD;

    // Dolby
    if (codec === "TRUEHD") return AQ_BADGES.TRUEHD;
    if (codec === "E-AC3")  return AQ_BADGES.DD_PLUS;
    if (codec === "AC3" || codec === "ATSC A/52") return AQ_BADGES.DD;

    // Lossy
    if (["MP3", "AAC", "VORBIS", "OPUS", "MUSEPACK"].includes(codec)) return AQ_BADGES.LOSSY;

    // PCM by sample rate
    if (sampleRate >= 352800) return AQ_BADGES.UHR;
    if (sampleRate >= 176400) return AQ_BADGES.HR_PLUS;
    if (sampleRate >= 88200)  return AQ_BADGES.HR;
    if (sampleRate === 48000 && bitDepth >= 24) return AQ_BADGES.ST;
    if (sampleRate === 44100 && bitDepth >= 24) return AQ_BADGES.CD_PLUS;
    if (bitDepth === 16 && sampleRate >= 44100 && sampleRate <= 48000) return AQ_BADGES.CD;

    return AQ_BADGES.CD;
}

/**
 * 共享音质解析：从已提取的参数判断音质分级
 * @param {string} codec - 编解码器名称
 * @param {string|number} sampleRate - 采样率 (从 TF 提取的原始值)
 * @param {string|number} bitDepth - 位深 (从 TF 提取的原始值)
 * @returns {AQBadgeStyle}
 */
function _resolveBadge(codec, sampleRate, bitDepth) {
    if (!codec) return AQ_BADGES.CD;
    return _classifyAudioQuality(codec.toUpperCase(), parseInt(sampleRate, 10), parseInt(bitDepth, 10));
}

// ============================================================================
// 5. LRU 缓存基类
// ============================================================================

/**
 * 基于 Map 的 LRU 缓存
 */
class LRUCache {
    constructor(maxSize, onEvict) {
        this._map = new Map();
        this._maxSize = maxSize;
        this._onEvict = typeof onEvict === "function" ? onEvict : null;
    }

    /**
     * 获取缓存条目 (命中则刷新到最新位置)
     * @param {string} key
     * @returns {*|undefined}
     */
    get(key) {
        if (!this._map.has(key)) return undefined;
        const entry = this._map.get(key);
        this._map.delete(key);
        this._map.set(key, entry);
        return entry;
    }

    /**
     * 存入缓存条目，超出 maxSize 时按 LRU 驱逐最旧条目
     * (利用 Map 的插入顺序保证迭代顺序)
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
        if (this._map.has(key)) {
            this._map.delete(key);
        } else if (this._map.size >= this._maxSize) {
            const oldestKey = this._map.keys().next().value;
            const oldestValue = this._map.get(oldestKey);
            this._map.delete(oldestKey);
            if (this._onEvict) this._onEvict(oldestValue, oldestKey);
        }
        this._map.set(key, value);
    }

    invalidate(key) {
        if (!this._map.has(key)) return false;
        const value = this._map.get(key);
        this._map.delete(key);
        if (this._onEvict) this._onEvict(value, key);
        return true;
    }

    clear() {
        if (this._onEvict) {
            for (const [key, value] of this._map) {
                this._onEvict(value, key);
            }
        }
        this._map.clear();
    }

    get size() {
        return this._map.size;
    }
}

// ============================================================================
// 6. 通知系统 (Notification Protocol)
// ============================================================================

const NOTIFY = {
    // 发送方唯一标识 — 跨通知通道复用
    SOURCE: {
        BG_PANEL_CONTAINER_CONTROL: "bg_panel_container_control",
        _TAB_CONTAINER:              "_tab_container",
        TAB_CONTAINER_DETAIL:       "tab_container_detail",
        TAB_CONTAINER_PLAYLIST:     "tab_container_playlist",
        TRACK_INFO:                 "track_info",
    },
    // 通知通道定义
    TRANSPARENT_SYNC:    { name: "fb2k.theme.transparent_sync", version: 1 },
    SWITCH_DETAIL_TAB:   { name: "fb2k.detail.switch_tab",      version: 1 },
};
