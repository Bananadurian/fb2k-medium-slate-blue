/**
 * @file data.js
 * @author XYSRe
 * @created 2026-04-27
 * @updated 2026-04-29
 * @version 2.0.0
 * @description 共享数据常量与音质系统 — GDI 标志、AQ 音质标识、来源图标、LRU 缓存、音质/来源解析
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
const DT_VCENTER      = 0x00000004; // 垂直居中 (仅限单行)
const DT_BOTTOM       = 0x00000008; // 底部对齐
const DT_WORDBREAK    = 0x00000010; // 自动换行
const DT_SINGLELINE   = 0x00000020; // 单行模式
const DT_NOPREFIX     = 0x00000800; // 禁用 '&' 转义
const DT_EDITCONTROL  = 0x00002000; // 编辑控件样式 (显示部分最后一行)
const DT_END_ELLIPSIS = 0x00008000; // 超出显示省略号
const DT_CALCRECT     = 0x00000400; // 计算矩形

// 常用组合样式
const MULTI_LINE_FLAGS = DT_LEFT | DT_WORDBREAK | DT_END_ELLIPSIS | DT_NOPREFIX;
const ONE_LINE_FLAGS   = DT_LEFT | DT_VCENTER | DT_END_ELLIPSIS | DT_NOPREFIX;
const BTN_STYLE_FLAGS  = DT_CENTER | DT_VCENTER | DT_NOPREFIX | DT_WORDBREAK;
const BADGE_TEXT_ALIGN = DT_CENTER | DT_VCENTER | DT_SINGLELINE;

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

/**
 * 音质标识样式类
 */
class AQBadgeStyle {
    constructor(label, color, desc) {
        this.label = label;
        this.color = color;
        this.bgColor = _getDimColor(color);
        this.desc = desc;
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
// 4. 来源图标系统 (Source Icon)
// ============================================================================

// 来源图标映射，键全部使用大写命名
const SOURCE_ICON_MAP = {
    "OFFICIAL DIGITAL": "shopping-bag.png",
    "CD": "disc-2.png",
    "SACD": "sacd.png",
    "SACD (CD LAYER)": "sacd.png",
    "JAPAN FIRST PRESS": "disc-3.png",
    "WEB": "cloud.png",
    "TIDAL": "Tidal.png",
    "QOBUZ": "Qobuz.png",
    "HDTRACKS": "HDtracks.png",
    "MORA": "mora.png",
    "APPLE MUSIC": "AppleMusic.png",
    "AMAZON MUSIC": "AmazonMusic.png",
    "DEEZER": "Deezer.png",
    "GENIUS": "Genius.png",
    "NETEASE": "NetEase.png",
    "QQ MUSIC": "QQMusic.png",
    "7DIGITAL": "7digital.png",
    "BANDCAMP": "Bandcamp.png",
    "SOUNDCLOUD": "SoundCloud.png"
};

const DEFAULT_SOURCE_ICON_FILENAME = "cloud.png";

/**
 * 根据来源文本解析图标文件名
 * @param {string} sourceText - 已转为大写的来源文本
 * @returns {string} 图标文件名
 */
function _resolveSourceIconFilename(sourceText) {
    return SOURCE_ICON_MAP[sourceText] || DEFAULT_SOURCE_ICON_FILENAME;
}

/**
 * 来源图标缓存管理器
 * 需要传入 LINK_ICONS_DIR 路径
 */
class SourceIconCache {
    constructor(iconsDir) {
        this._dir = iconsDir;
        this._cache = {};
    }

    /**
     * 根据文件名获取图标，自动缓存
     * @param {string} filename - 图标文件名
     * @returns {GdiBitmap|null}
     */
    get(filename) {
        if (this._cache[filename]) {
            return this._cache[filename];
        }
        const path = this._dir + filename;
        if (utils.IsFile(path)) {
            const img = gdi.Image(path);
            if (img) {
                this._cache[filename] = img;
                return img;
            }
        }
        return null;
    }

    /**
     * 释放所有缓存的图标
     */
    clear() {
        for (let key in this._cache) {
            const img = this._cache[key];
            if (img && typeof img.Dispose === "function") img.Dispose();
        }
        this._cache = {};
    }
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
        if (!this._map.has(key) && this._map.size >= this._maxSize) {
            const oldestKey = this._map.keys().next().value;
            const oldestValue = this._map.get(oldestKey);
            this._map.delete(oldestKey);
            if (this._onEvict) this._onEvict(oldestValue, oldestKey);
        }
        this._map.set(key, value);
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

