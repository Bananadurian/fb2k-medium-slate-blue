/**
 * @file bg_panel_container_control.js
 * @author XYSRe
 * @created 2026-05-10
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
include("lib/interaction.js");
include("lib/background.js");

window.DefineScript("bg_panel_container_control", {
    author: "XYSRe",
    version: "1.0.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// --- 常量定义 ---


const playbackTimeTf = fb.TitleFormat('%playback_time%');
const lengthTf = fb.TitleFormat('%length%');

const playbackTimeLabel = {x:0, y:0, w: _scale(40), h:_scale(40)}
const lengthLabel = {x:0, y:0, w: _scale(40), h:_scale(40)}

/**
 * 子面板配置表（运行时状态 + 布局缓存）
 *
 * 字段说明：
 * - key: 逻辑主键，用于布局分派
 * - panelCaption/panelIndex: JSplitter 子面板定位信息（caption优先，index兜底）
 * - x/y/w/h: 上一次已应用的几何信息（用于 Move 去重）
 * - panel: 运行时绑定到的子面板对象
 * - missingLogged: 缺失日志去抖标记（避免连续刷屏）
 */
const SUB_PANELS = {
    coverPanel: {key: "coverPanel", panelCaption: "cover", panelIndex: 0, x: 0, y: 0, w: _scale(40), h: _scale(40), panel: null, missingLogged: false},
    trackInfoPanel: {key: "trackInfoPanel", panelCaption: "track_info", panelIndex: 1, x: 0, y: 0, w: _scale(40), h: _scale(40), panel: null, missingLogged: false},
    playbackBtnPanel: {key: "playbackBtnPanel", panelCaption: "playback_button", panelIndex: 4, x: 0, y: 0, w: _scale(40), h: _scale(40), panel: null, missingLogged: false},
    waveformMinibarPanel: {key: "waveformMinibarPanel", panelCaption: "waveform_minibar", panelIndex: 3, x: 0, y: 0, w: _scale(40), h: _scale(40), panel: null, missingLogged: false},
    controlBtnPanel: {key: "controlBtnPanel", panelCaption: "control_button", panelIndex: 2, x: 0, y: 0, w: _scale(40), h: _scale(40), panel: null, missingLogged: false},
};

/**
 * 子面板遍历顺序
 *
 * 该顺序仅用于布局计算与绑定扫描，不改变视觉层级。
 * 维持固定顺序可以让日志、排障和坐标比对更稳定。
 */
const SUB_PANEL_ORDER = [
    "coverPanel",
    "trackInfoPanel",
    "playbackBtnPanel",
    "waveformMinibarPanel",
    "controlBtnPanel",
];

// 子面板的padding
const PANEL_AREA_PADDING = normalizePadding({top:_scale(4), right:_scale(4), bottom:_scale(4), left:_scale(4)});


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
// 透明同步通知 epoch — 通道定义见 lib/data.js NOTIFY.TRANSPARENT_SYNC
let bgTransparentNotifyEpoch = 0;

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
    gradientEnabled: false,                 // 是否启用渐变
    gradientAngle: 180,                     // 渐变角度 [0, 360]
    gradientSpan: 8,                        // 渐变跨度 (>=2)；2=第1/2色，N=第1/N色

    // ===== 形状（全模式生效）=====
    shapeType: "round-rect",                // "rect" | "round-rect"
    shapeRadius: THEME.LAYOUT.CORNER_RADIUS, // 圆角半径 (px)，<=0 等同矩形
    padding: {top:0, right:_scale(8), bottom:_scale(8), left:_scale(8)}, // 背景绘制内边距 (px)

    // ===== 背景图（仅 cover-image 生效）=====
    imageScaleMode: "cover",                // "cover"=铺满裁切 | "fit"=完整留边
    imageBlurRadius: 150,                   // 模糊半径 [0, 200]
    imageCacheSize: 3,                      // 图片缓存条目数 (>=1)

    // ===== 遮罩（全模式生效，可与 fill alpha 叠加）=====
    maskEnabled: false,
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

let lastPlaybackText = "";
let lastLengthText = "";
let layoutApplied = false;

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
function syncBackground(metadb, publishNotify) {
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
    if (publishNotify !== false) {
        publishTransparentSyncNotify("sync", target);
    }
}

/**
 * 发布背景同步通知给透明子面板。
 * 通道定义见 lib/data.js NOTIFY.TRANSPARENT_SYNC，发送方标识见 NOTIFY.SOURCE.BG_PANEL_CONTAINER_CONTROL。
 * @param {string} eventName 同步事件名
 * @param {FbMetadbHandle|null} [metadb] 可选，指定当前轨道
 */
function publishTransparentSyncNotify(eventName, metadb) {
    if (!window.IsTransparent) return;

    bgTransparentNotifyEpoch += 1;
    window.NotifyOthers(NOTIFY.TRANSPARENT_SYNC.name, {
        v: NOTIFY.TRANSPARENT_SYNC.version,
        source: NOTIFY.SOURCE.BG_PANEL_CONTAINER_CONTROL,
        event: eventName || "sync",
        epoch: bgTransparentNotifyEpoch,
        ts: Date.now(),
        trackKey: metadb ? (THEME.TF.COVER_KEY.EvalWithMetadb(metadb) || metadb.Path || "") : "",
    });
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
        syncBackground(metadb, false);
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
            syncBackground(metadb, false);
        }, THEME.LAYOUT.BG_TRANSPARENT_SYNC_LATE_DELAY_MS);
    }, THEME.LAYOUT.BG_TRANSPARENT_SYNC_DELAY_MS);
}


function resolveSubPanel(subPanelState) {
    let panel = null;
    try {
        panel = window.GetPanel(subPanelState.panelCaption);
    } catch (e) {
        panel = null;
    }

    if (!panel) {
        try {
            panel = window.GetPanelByIndex(subPanelState.panelIndex);
        } catch (e) {
            panel = null;
        }
    }

    return panel;
}

/**
 * 计算单个子面板的目标矩形（不直接执行 Move）
 *
 * 版式规则：
 * 1) 整体采用三栏：左 30% / 中 40% / 右 30%。
 * 2) 左栏再拆分：cover 占左栏 35%（保持正方形），info 占左栏 65%。
 * 3) 中栏上下拆分：上半为播放按钮，下半为 waveform + 时间标签。
 * 4) 右栏全部给 control 按钮面板。
 *
 * 说明：
 * - 此函数只负责"目标坐标"计算，调用方再做差异比较和 Move。
 * - 保持原有 Math.round 时机，避免像素级偏移。
 */
function computeSubPanelRect(panelKey, layoutContext) {
    const containerX = layoutContext.containerX;
    const containerY = layoutContext.containerY;
    const containerW = layoutContext.containerW;
    const containerH = layoutContext.containerH;
    const containerLeftWidth = layoutContext.containerLeftWidth;
    const containerCenterWidth = layoutContext.containerCenterWidth;
    const containerRightStartX = layoutContext.containerRightStartX;
    const centerStartX = layoutContext.centerStartX;
    const halfContainerHeight = layoutContext.halfContainerHeight;

    // 左栏-封面：左栏 35%，并限制为正方形（不超过容器高度）
    if (panelKey === "coverPanel") {
        const side = Math.min(Math.round(containerLeftWidth * 0.35), containerH);
        return {
            x: containerX,
            y: Math.round((containerH - side) / 2 + containerY),
            w: side,
            h: side,
        };
    }

    // 左栏-信息评分：左栏剩余 65%，与容器同高
    if (panelKey === "trackInfoPanel") {
        const width = Math.round(containerLeftWidth * 0.5);
        return {
            x: Math.round(containerX + Math.min(containerLeftWidth * 0.35, containerH)),
            y: Math.round((containerH - containerH) / 2 + containerY),
            w: width,
            h: containerH,
        };
    }

    // 中栏上半-播放按钮：占中栏宽度，上半区内垂直居中
    if (panelKey === "playbackBtnPanel") {
        const height = Math.round(containerH * 0.5);
        return {
            x: centerStartX,
            y: Math.round((halfContainerHeight - height) / 2 + containerY),
            w: containerCenterWidth,
            h: height,
        };
    }

    // 中栏下半-waveform：两侧预留时间标签宽度（左 elapsed / 右 length）
    if (panelKey === "waveformMinibarPanel") {
        const height = Math.round(containerH * 0.4);
        const width = Math.round(containerCenterWidth - playbackTimeLabel.w * 2);
        return {
            x: Math.round(centerStartX + playbackTimeLabel.w),
            y: Math.round((halfContainerHeight - height) / 2 + containerY + halfContainerHeight),
            w: width,
            h: height,
        };
    }

    // 右栏-控制按钮：完整占据右栏区域
    if (panelKey === "controlBtnPanel") {
        return {
            x: containerRightStartX,
            y: Math.round((containerH - containerH) / 2 + containerY),
            w: Math.round(containerW * 0.3),
            h: containerH,
        };
    }

    return { x: 0, y: 0, w: 0, h: 0 };
}

/**
 * 在几何信息变化时才触发 Move，避免宿主层重复布局/重绘。
 */
function moveSubPanelIfNeeded(subPanelState, targetRect) {
    const nextX = targetRect.x;
    const nextY = targetRect.y;
    const nextW = Math.max(0, targetRect.w);
    const nextH = Math.max(0, targetRect.h);

    if (
        subPanelState.x === nextX &&
        subPanelState.y === nextY &&
        subPanelState.w === nextW &&
        subPanelState.h === nextH
    ) {
        return;
    }

    subPanelState.x = nextX;
    subPanelState.y = nextY;
    subPanelState.w = nextW;
    subPanelState.h = nextH;
    subPanelState.panel.Move(nextX, nextY, nextW, nextH, false);
}

/**
 * 执行整套子面板布局：
 * - 计算容器可用区（扣除 panel padding 与内部 padding）
 * - 预计算三栏关键参考线
 * - 逐项解析子面板、计算目标矩形、按需 Move
 * - 更新 waveform 左右时间标签锚点
 */
function layoutSubPanels() {
    const rect = calcContentRect(panelW, panelH, PANEL_CFG.padding);
    const containerW = Math.max(0, Math.round(rect.w - PANEL_AREA_PADDING.left - PANEL_AREA_PADDING.right));
    const containerH = Math.max(0, Math.round(rect.h - PANEL_AREA_PADDING.top - PANEL_AREA_PADDING.bottom));
    const containerX = Math.round(rect.x + PANEL_AREA_PADDING.left);
    const containerY = Math.round(rect.y + PANEL_AREA_PADDING.top);

    // 几何参考线：左/中/右三栏与中栏半高
    const containerLeftWidth = containerW * 0.3;
    const containerCenterWidth = Math.round(containerW * 0.4);
    const centerStartX = Math.round(containerX + containerLeftWidth);
    const containerRightStartX = Math.round(containerX + containerW * 0.7);
    const halfContainerHeight = containerH / 2;

    const layoutContext = {
        containerX: containerX,
        containerY: containerY,
        containerW: containerW,
        containerH: containerH,
        containerLeftWidth: containerLeftWidth,
        containerCenterWidth: containerCenterWidth,
        containerRightStartX: containerRightStartX,
        centerStartX: centerStartX,
        halfContainerHeight: halfContainerHeight,
    };

    for (let i = 0; i < SUB_PANEL_ORDER.length; i++) {
        const panelKey = SUB_PANEL_ORDER[i];
        const subPanelState = SUB_PANELS[panelKey];
        if (!subPanelState) continue;

        if (!subPanelState.panel) {
            const panel = resolveSubPanel(subPanelState);
            if (!panel) {
                if (!subPanelState.missingLogged) {
                    console.log("Not Found:" + subPanelState.panelCaption + " / index=" + subPanelState.panelIndex);
                    subPanelState.missingLogged = true;
                }
                continue;
            }
            subPanelState.panel = panel;
            subPanelState.missingLogged = false;
        }

        const targetRect = computeSubPanelRect(panelKey, layoutContext);
        moveSubPanelIfNeeded(subPanelState, targetRect);
    }

    // 时间标签锚点：与 waveform 同行，分别贴中栏左右边缘。
    playbackTimeLabel.x = Math.round(containerX + containerW * 0.3);
    playbackTimeLabel.y = Math.round((halfContainerHeight - playbackTimeLabel.h) / 2 + containerY + halfContainerHeight);
    lengthLabel.x = Math.round(containerX + containerW * 0.7 - lengthLabel.w);
    lengthLabel.y = playbackTimeLabel.y;
}


// --- 回调函数接口 ---

/**
 * 当面板尺寸改变时触发
 *
 * 流程：
 * 1) 过滤无效尺寸
 * 2) 若尺寸未变化且已完成过布局，直接返回（避免重复布局热路径）
 * 3) 更新尺寸缓存并触发背景层 resize/sync
 * 4) 重新布局子面板与时间标签
 */
function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;

    const nextW = window.Width;
    const nextH = window.Height;
    if (layoutApplied && nextW === panelW && nextH === panelH) return;

    panelW = nextW;
    panelH = nextH;
    layoutApplied = true;

    if (bgLayer) bgLayer.onResize();
    scheduleBackgroundSync();
    layoutSubPanels();
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
    if (!fb.IsPlaying) return;
    const playbackText = playbackTimeTf.Eval();
    if (playbackText) {
        lastPlaybackText = playbackText;
    }
    const lengthText = lengthTf.Eval();
    if (lengthText) {
        lastLengthText = lengthText;
    }
    // 启动/切歌瞬间 Eval 可能为空：继续保留上一次有效值，避免文本闪空。
    if (!lastPlaybackText || !lastLengthText) return;
    gr.SetSmoothingMode(2);
    // 上下左右居中显示
    _drawText(gr, THEME.TEXT.bodyCenter, lastPlaybackText, playbackTimeLabel.x, playbackTimeLabel.y, playbackTimeLabel.w, playbackTimeLabel.h);
    _drawText(gr, THEME.TEXT.bodyCenter, lastLengthText, lengthLabel.x, lengthLabel.y, lengthLabel.w, lengthLabel.h);

}

function on_playback_time(time){
    window.RepaintRect(playbackTimeLabel.x, playbackTimeLabel.y, playbackTimeLabel.w, playbackTimeLabel.h);
}

function on_playback_seek(time){
    window.RepaintRect(playbackTimeLabel.x, playbackTimeLabel.y, playbackTimeLabel.w, playbackTimeLabel.h);
}

/**
 * 当播放新轨道时触发
 * @param {FbMetadbHandle} metadb
 */
function on_playback_new_track(metadb) {
    // scheduleBackgroundSync会触发全局重绘
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
    if (panelW > 0 && panelH > 0) {
        layoutSubPanels();
        layoutApplied = true;
    }
}

init();