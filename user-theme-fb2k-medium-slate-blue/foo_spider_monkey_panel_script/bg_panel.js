/**
 * @file bg_panel.js
 * @author XYSRe
 * @created 2026-05-08
 * @updated 2026-05-18
 * @version 2.1.0
 * @description 背景控制器专用面板：支持封面提取色彩、高斯模糊背景，并优化了原生组件（如波形条）的伪透明同步。
 */

"use strict";

/** 启用 Direct2D 硬件加速渲染模式 */
window.DrawMode = 1;

// --- 外部库引入 ---
include("lib/utils.js");
include("lib/data.js");
include("lib/theme.js");
include("lib/background.js");

window.DefineScript("bg_panel", {
    author: "XYSRe",
    version: "1.1.1",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// --- 常量定义 ---

/** @const {string} 主题背景模式 */
const BG_MODE_THEME = "theme";
/** @const {string} 封面提色模式 */
const BG_MODE_COVER_COLOR = "cover-color";
/** @const {string} 封面图片模式 */
const BG_MODE_COVER_IMAGE = "cover-image";

// 同步策略：
// - SYNC_MODE_AUTO: 使用标准 auto-fetch 路径（sync / sync(metadb)）
// - SYNC_MODE_WITH_RAW: 调用方提供 raw 图（syncWithRaw），用于验证“无重复取图”路径
// - SYNC_MODE_NO_ART: 显式声明无图（syncNoArt），用于验证 no-art 回退路径
/** @const {string} 自动同步策略 */
const SYNC_MODE_AUTO = "auto";
/** @const {string} 原生图片同步策略 */
const SYNC_MODE_WITH_RAW = "with-raw";
/** @const {string} 无图回退策略 */
const SYNC_MODE_NO_ART = "no-art";

/**
 * 面板核心配置对象
 * @type {Object}
 * @property {string} mode 背景渲染模式选择
 * @property {boolean} gradientEnabled 是否开启渐变底色
 * @property {number} gradientAngle 渐变角度 (0-360)
 * @property {number} gradientSpan 渐变色彩跨度
 * @property {string} shapeType 形状类型 ("rect" | "round-rect")
 * @property {number} shapeRadius 圆角半径 (px)
 * @property {number} padding 背景内边距 (px)
 * @property {string} imageScaleMode 图片缩放模式 ("cover" | "fit")
 * @property {number} imageBlurRadius 模糊半径 (0-200)
 * @property {number} imageCacheSize 图片缓存数量
 * @property {boolean} maskEnabled 是否启用遮罩层
 * @property {number} maskColor 遮罩层颜色 (RGB)
 * @property {number} maskAlpha 遮罩层透明度 (0-255)
 * @property {string} syncMode 封面获取同步模式
 */
const PANEL_CFG = {
    // 背景模式: "theme" | "cover-color" | "cover-image" | "custom"
    // - "theme": 使用主题背景色
    // - "cover-color": 使用封面提色（无封面回退主题色）
    // - "cover-image": 使用封面图背景（无封面回退主题色）
    // - "custom": 使用 custom.color1/color2 填充（无需封面/meta，支持 _argb 半透明）
    mode: BG_MODE_THEME,

    // ===== 渐变（theme / cover-color / custom 生效，cover-image 不参与底图绘制）=====
    gradientEnabled: true,                  // 是否启用渐变
    gradientAngle: 90,                      // 渐变角度 [0, 360]
    gradientSpan: 8,                        // 渐变跨度 (>=2)；2=第1/2色，N=第1/N色

    // ===== 形状（全模式生效）=====
    shapeType: "round-rect",                // "rect" | "round-rect"
    shapeRadius: THEME.LAYOUT.CORNER_RADIUS, // 圆角半径 (px)，<=0 等同矩形
    padding: _scale(8),                     // 背景绘制内边距 (px)

    // ===== 背景图（仅 cover-image 生效）=====
    imageScaleMode: "cover",                // "cover"=铺满裁切 | "fit"=完整留边
    imageBlurRadius: 150,                   // 模糊半径 [0, 200]
    imageCacheSize: 3,                      // 图片缓存条目数 (>=1)

    // ===== 遮罩（全模式生效，可与 fill alpha 叠加）=====
    maskEnabled: true,
    maskColor: THEME.COL.MASK,              // 遮罩 RGB 颜色
    maskAlpha: 255,                         // 遮罩透明度 [0, 255]；0=透明

    // ===== 同步策略 =====
    syncMode: SYNC_MODE_AUTO,

    // ===== custom 模式专用（仅在 mode="custom" 生效）=====
    // custom: {
    //     color1: _argb(255, 30, 35, 45),  // ARGB 填充色1（必填）
    //     color2: _argb(255, 40, 45, 55),  // ARGB 填充色2（可选，不设=单色无渐变）
    // },
};

// --- 状态变量 ---

/** @type {number} 当前面板宽度 */
let panelW = window.Width;
/** @type {number} 当前面板高度 */
let panelH = window.Height;
/** @type {Object|null} 背景层实例对象 */
let bgLayer = null;

// --- 同步与计时器管理 ---

/** @type {number} 当前同步版本纪元，用于废弃过时的异步请求 */
let bgSyncEpoch = 0;

/** @type {number|null} 延迟同步主计时器 */
let deferredBgSyncTimer = null;
/** @type {number|null} 延迟同步补充计时器 */
let deferredBgLateSyncTimer = null;

/** @type {number|null} 启动刷新主计时器 */
let bgStartupKickTimer = null;
/** @type {number|null} 启动刷新补充计时器 */
let bgStartupKickLateTimer = null;
/** @type {boolean} 启动刷新序列是否已完成 */
let bgStartupKickDone = false;

// --- 逻辑函数 ---

/**
 * 获取当前活动的媒体元数据句柄
 * @returns {FbMetadbHandle|null} 优先返回播放中歌曲，其次返回选中的歌曲
 */
function getActiveMetadb() {
    return resolveMetadbByMode(METADB_RESOLVE_MODE.PLAYING_FIRST);
}

/**
 * 从元数据中提取专辑封面
 * @param {FbMetadbHandle} metadb 歌曲句柄
 * @returns {GdiBitmap|null} 封面位图对象
 */
function fetchAlbumArt(metadb) {
    return utils.GetAlbumArtV2(metadb, 0);
}

/**
 * 强制触发原生组件（Native Components）的背景重捕获。
 * 原理：通过极小的进度跳转（10ms）绕过组件内部的等值判断，强制产生 Seek 信号。
 */
function syncNativePanel() {
    if (fb.IsPlaying || fb.IsPaused) {
        try {
            const now = fb.PlaybackTime;
            const delta = 0.01;
            fb.PlaybackTime = Math.max(0, now - delta);
            fb.PlaybackTime = now;
        } catch (e) {}
    }
}

/**
 * 清除所有与启动刷新相关的计时器
 */
function clearStartupKickTimers() {
    if (bgStartupKickTimer) { window.ClearTimeout(bgStartupKickTimer); bgStartupKickTimer = null; }
    if (bgStartupKickLateTimer) { window.ClearTimeout(bgStartupKickLateTimer); bgStartupKickLateTimer = null; }
}

/**
 * 启动或重置播放时的"强效刷新"序列，用于修复波形条等组件启动变灰的问题。
 */
function triggerStartupChildRefreshKick() {
    if (bgStartupKickDone || bgStartupKickTimer) return;

    bgStartupKickTimer = window.SetTimeout(function () {
        bgStartupKickTimer = null;
        if (bgStartupKickDone) return;

        syncNativePanel();

        bgStartupKickLateTimer = window.SetTimeout(function () {
            bgStartupKickLateTimer = null;
            if (bgStartupKickDone) return;

            syncNativePanel();
            bgStartupKickDone = true;
        }, THEME.LAYOUT.BG_TRANSPARENT_SYNC_LATE_DELAY_MS + 200);
    }, THEME.LAYOUT.BG_TRANSPARENT_SYNC_DELAY_MS + 160);
}

/**
 * 重新创建背景渲染层实例并初始化配置
 */
function recreateBackgroundLayer() {
    if (bgLayer) bgLayer.clearCache();

    bgLayer = createPanelBackgroundLayer({
        background: {
            mode: PANEL_CFG.mode,
            gradient: {
                enabled: PANEL_CFG.gradientEnabled,
                angle: PANEL_CFG.gradientAngle,
                span: PANEL_CFG.gradientSpan,
            },
            image: {
                scaleMode: PANEL_CFG.imageScaleMode,
                blurRadius: PANEL_CFG.imageBlurRadius,
                cacheSize: PANEL_CFG.imageCacheSize,
            },
            shape: {
                type: PANEL_CFG.shapeType,
                radius: PANEL_CFG.shapeRadius,
            },
            mask: {
                enabled: PANEL_CFG.maskEnabled,
                color: PANEL_CFG.maskColor,
                alpha: PANEL_CFG.maskAlpha,
            },
            custom: PANEL_CFG.custom,
            cacheSize: Math.min(5, THEME.CFG.CACHE_SIZE),
            keyTf: THEME.TF.COVER_KEY,
        },
        getPreferredMetadb: getActiveMetadb,
        getTargetRect: function () {
            return calcContentRect(panelW, panelH, PANEL_CFG.padding);
        },
        getAlbumArt: fetchAlbumArt,
    });

    bgLayer.setThemeColor(THEME.COL.BG);
    syncBackground();
}

/**
 * 立即执行背景同步
 * @param {FbMetadbHandle|null} [metadb] 可选，指定同步的元数据
 */
function syncBackground(metadb) {
    if (!bgLayer) return;

    const target = (typeof metadb !== "undefined") ? (metadb || null) : getActiveMetadb();

    if (PANEL_CFG.syncMode === SYNC_MODE_WITH_RAW) {
        if (!target) {
            bgLayer.syncNoArt(null);
        } else {
            const raw = fetchAlbumArt(target);
            raw ? bgLayer.syncWithRaw(target, raw) : bgLayer.syncNoArt(target);
        }
    } else if (PANEL_CFG.syncMode === SYNC_MODE_NO_ART) {
        bgLayer.syncNoArt(target);
    } else {
        bgLayer.sync(target);
    }
    window.Repaint();
}

/**
 * 清除背景同步相关的防抖计时器
 */
function clearDeferredBackgroundSyncTimers() {
    if (deferredBgSyncTimer) { window.ClearTimeout(deferredBgSyncTimer); deferredBgSyncTimer = null; }
    if (deferredBgLateSyncTimer) { window.ClearTimeout(deferredBgLateSyncTimer); deferredBgLateSyncTimer = null; }
}

/**
 * 计划一次背景同步，包含透明模式下的双重延迟逻辑
 * @param {FbMetadbHandle|null} [metadb] 可选，指定同步的元数据
 */
function scheduleBackgroundSync(metadb) {
    if (!window.IsTransparent) {
        syncBackground(metadb);
        return;
    }

    const epoch = ++bgSyncEpoch;
    clearDeferredBackgroundSyncTimers();

    deferredBgSyncTimer = window.SetTimeout(function () {
        deferredBgSyncTimer = null;
        if (epoch !== bgSyncEpoch) return;
        syncBackground(metadb);

        deferredBgLateSyncTimer = window.SetTimeout(function () {
            deferredBgLateSyncTimer = null;
            if (epoch !== bgSyncEpoch) return;
            syncBackground(metadb);
        }, THEME.LAYOUT.BG_TRANSPARENT_SYNC_LATE_DELAY_MS);
    }, THEME.LAYOUT.BG_TRANSPARENT_SYNC_DELAY_MS);
}

// --- 回调函数接口 ---

/**
 * 当面板尺寸改变时触发
 */
function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    panelW = window.Width;
    panelH = window.Height;
    if (bgLayer) bgLayer.onResize();
    scheduleBackgroundSync();
}

/**
 * 核心绘图函数
 * @param {GdiGraphics} gr
 */
function on_paint(gr) {
    if (bgLayer) {
        bgLayer.paint(gr);
    } else {
        gr.FillSolidRect(0, 0, panelW, panelH, THEME.COL.BG);
    }
}

/**
 * 当播放新轨道时触发
 * @param {FbMetadbHandle} metadb
 */
function on_playback_new_track(metadb) {
    scheduleBackgroundSync(metadb);
}

/**
 * 当播放开始或状态切换时触发
 * @param {number} cmd 启动命令
 * @param {boolean} is_paused 暂停状态
 */
function on_playback_starting(cmd, is_paused) {
    if (cmd === 1) { // 停止后重新开始
        clearStartupKickTimers();
        bgStartupKickDone = false;
        triggerStartupChildRefreshKick();
    }
}

/**
 * 当播放停止时触发
 * @param {number} reason 停止原因 (0: 停止, 1: 切歌, 2: 结束)
 */
function on_playback_stop(reason) {
    if (reason !== 2) {
        scheduleBackgroundSync(null);
    }
}

/**
 * 当界面配色方案改变时触发
 */
function on_colours_changed() {
    _refreshThemeColors();
    if (bgLayer) {
        bgLayer.setThemeColor(THEME.COL.BG);
        bgLayer.setMaskColor(THEME.COL.MASK);
    }
    scheduleBackgroundSync();
}

// 停止播放显示选中的歌曲信息
// function on_playlist_items_selection_change() {
//     const now = fb.IsPlaying ? fb.GetNowPlaying() : null;
//     const sel = fb.GetSelection();
//     const target = now || sel || null;
//     scheduleBackgroundSync(target);
// }

// Columns UI 有一个通知
// function on_notify_data(name, info) {
//     console.log("=================on_notify_data\n" +name)
//     if (name === "CUI_COLOURS_CHANGED" || name === "CUI_FONT_CHANGED") {
//         console.log("=================on_notify_data\n" +name)
//         window.Repaint();
//     }
// }


/**
 * 当脚本卸载或重载前触发
 */
function on_script_unload() {
    clearStartupKickTimers();
    clearDeferredBackgroundSyncTimers();
    if (bgLayer) {
        bgLayer.clearCache();
        bgLayer = null;
    }
}

// --- 初始化流程 ---

/**
 * 面板启动初始化
 */
function init() {
    recreateBackgroundLayer();
    scheduleBackgroundSync();
    triggerStartupChildRefreshKick();
}

init();