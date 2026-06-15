/**
 * @description 播放控制按钮 — 播放/暂停、停止、上下曲、快进快退、播放模式、随机
 */

"use strict";
/** 启用 Direct2D 硬件加速渲染模式 */
window.DrawMode = 1;

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");
include("lib/icons.js");

window.DefineScript("Playback Buttons", {
    author: "XRE",
    version: "2.1.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. 工具
// ============================================================================

let tooltip = _createDefaultTooltip();

// ============================================================================
// 2. 资源定义
// ============================================================================

const BTN_LAYOUT = {
    itemGap: _scale(10),
    sizes: { S: _scale(18), L: _scale(27) },
    items: [
        { key: "replay",  size: "S", img: "replay",        func: () => fb.Play(),                   tipText: "重放" },
        { key: "stop",    size: "S", img: "stop",          func: () => fb.Stop(),                   tipText: "Stop" },
        { key: "rewind",  size: "S", img: "rewind",        func: () => fb.RunMainMenuCommand("Playback/Seek/Back by 5 seconds"), tipText: "Seek -5s" },
        { key: "prev",    size: "L", img: "previous",      func: () => fb.Prev(),                   tipText: "上一曲" },
        { key: "play",    size: "L", img: "play",          func: () => fb.PlayOrPause(),            tipText: "播放" },
        { key: "next",    size: "L", img: "next",          func: () => fb.Next(),                   tipText: "下一曲" },
        { key: "forward", size: "S", img: "forward",       func: () => fb.RunMainMenuCommand("Playback/Seek/Ahead by 5 seconds"), tipText: "Seek +5s" },
        { key: "order",   size: "S", img: "order_default", func: () => togglePlaybackOrder(),       tipText: "播放模式" },
        { key: "random",  size: "S", img: "random",        func: () => fb.Random(),                 tipText: "Random" },
    ],
};

// ============================================================================
// 3. 业务逻辑
// ============================================================================

const buttons = {};
let currentHoverBtn = null;
let panelW = window.Width;
let panelH = window.Height;

// 透明同步通知 freshness 窗口与兜底延迟 — 通道定义见 lib/data.js NOTIFY.TRANSPARENT_SYNC
let transparentTrackRepaintTimer = null;
let lastTransparentNotifyEpoch = 0;
let lastTransparentNotifyTs = 0;

const ORDER_CONFIG = {
    0: { img: iconMgr.get('player', 'order_default'), hover: iconMgr.get('player', 'order_default_hover'), tip: "顺序播放" },
    1: { img: iconMgr.get('player', 'order_repeat'),  hover: iconMgr.get('player', 'order_repeat_hover'),  tip: "列表循环" },
    2: { img: iconMgr.get('player', 'order_track'),   hover: iconMgr.get('player', 'order_track_hover'),   tip: "单曲循环" },
    3: { img: iconMgr.get('player', 'order_default'), hover: iconMgr.get('player', 'order_default_hover'), tip: "随机播放 (Random)" },
    4: { img: iconMgr.get('player', 'order_shuffle'), hover: iconMgr.get('player', 'order_shuffle_hover'), tip: "随机乱序 (Shuffle)" },
    default: { img: iconMgr.get('player', 'order_default'), hover: iconMgr.get('player', 'order_default_hover'), tip: "其他模式" }
};

/** 从 BTN_LAYOUT 配置创建所有按钮并同步初始状态 */
function createButtons() {
    BTN_LAYOUT.items.forEach(it => {
        buttons[it.key] = new Button({
            imgNormal: iconMgr.get('player', it.img),
            imgHover:  iconMgr.get('player', it.img + '_hover'),
            func:      it.func,
            tipText:   it.tipText,
        });
    });
    syncButtonStates();
}

/** 同步播放/暂停按钮图标与提示文字 */
function syncPlayPauseState() {
    if (fb.IsPlaying && !fb.IsPaused) {
        buttons.play.updateState(iconMgr.get('player', 'pause'), iconMgr.get('player', 'pause_hover'), "暂停");
    } else {
        buttons.play.updateState(iconMgr.get('player', 'play'), iconMgr.get('player', 'play_hover'), "播放");
    }
}

/** 同步停止按钮图标（区分普通停止 / 稍后停止） */
function syncStopState() {
    if (fb.StopAfterCurrent) {
        buttons.stop.updateState(iconMgr.get('player', 'stop_after'), iconMgr.get('player', 'stop_hover'), "立即停止 (右键: 取消稍后停止)", () => fb.Stop());
    } else {
        buttons.stop.updateState(iconMgr.get('player', 'stop'), iconMgr.get('player', 'stop_hover'), "停止播放 (右键: 稍后停止)", () => fb.Stop());
    }
}

/** 同步播放模式按钮图标与提示文字 */
function syncOrderState() {
    const orderId = plman.PlaybackOrder;
    const cfg = ORDER_CONFIG[orderId] || ORDER_CONFIG.default;
    buttons.order.updateState(cfg.img, cfg.hover, cfg.tip);
}

/** 同步所有按钮外观状态（播放/停止/模式） */
function syncButtonStates() {
    syncPlayPauseState();
    syncStopState();
    syncOrderState();
}

/** 循环切换播放模式 (Default → Repeat → Shuffle)，跳过随机模式 */
function togglePlaybackOrder() {
    const cycle = [0, 1, 2, 4]; // 跳过模式 3 (随机播放), 仅循环 Default/Repeat/Shuffle
    const pos = cycle.indexOf(plman.PlaybackOrder);
    const nextIndex = (pos === -1 || pos >= cycle.length - 1) ? 0 : pos + 1;
    plman.PlaybackOrder = cycle[nextIndex];
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function showOrderMenu(x, y) {
    const menu = window.CreatePopupMenu();
    const modes = [
        { id: 0, text: "顺序播放 (Default)" },
        { id: 1, text: "列表循环 (Repeat Playlist)" },
        { id: 2, text: "单曲循环 (Repeat Track)" },
        { id: 3, text: "随机播放 (Random)" },
        { id: 4, text: "随机乱序 (Shuffle Tracks)" },
        { id: 5, text: "专辑乱序 (Shuffle Albums)" },
        { id: 6, text: "目录乱序 (Shuffle Folders)" },
    ];

    modes.forEach((m, i) => {
        menu.AppendMenuItem(MF_STRING, i + 1, m.text);
    });

    const currentIdx = modes.findIndex(m => m.id === plman.PlaybackOrder);
    if (currentIdx !== -1) {
        menu.CheckMenuRadioItem(1, modes.length, currentIdx + 1);
    }

    const idx = menu.TrackPopupMenu(x, y);
    if (idx > 0) {
        plman.PlaybackOrder = modes[idx - 1].id;
    }
}

// ============================================================================
// 4. 主回调函数
// ============================================================================

createButtons();

/**
 * @returns {void}
 */
function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    panelW = window.Width;
    panelH = window.Height;

    const cfg = BTN_LAYOUT;
    const items = cfg.items;
    const totalW = items.reduce((s, it) => s + cfg.sizes[it.size], 0) + cfg.itemGap * (items.length - 1);
    let x = Math.round((panelW - totalW) / 2);
    const cy = Math.round(panelH / 2);
    items.forEach(it => {
        const btn = buttons[it.key];
        const s = cfg.sizes[it.size];
        btn.x = x; btn.y = Math.round(cy - s / 2);
        btn.w = s; btn.h = s;
        x += s + cfg.itemGap;
    });
}

/**
 * @param {GdiGraphics} gr
 * @returns {void}
 */
function on_paint(gr) {
    if (!window.IsTransparent) {
        gr.FillSolidRect(0, 0, panelW, panelH, THEME.COL.BG);
    }
    for (let key in buttons) {
        buttons[key].paint(gr);
    }
}

// --- 悬停状态机 ---
/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function on_mouse_move(x, y) {
    let newHoverBtn = null;

    // 查找当前悬停按钮
    for (let key in buttons) {
        if (buttons[key].containsPoint(x, y)) {
            newHoverBtn = buttons[key];
            break;
        }
    }

    if (newHoverBtn !== currentHoverBtn) {
        // 离开旧按钮
        if (currentHoverBtn) {
            currentHoverBtn.deactivate();
        }

        // 进入新按钮
        if (newHoverBtn) {
            newHoverBtn.activate();
            tooltip(newHoverBtn.tipText);
            _setCursor(CURSOR_HAND);
        } else {
            tooltip("");
            _setCursor(CURSOR_ARROW);
        }

        currentHoverBtn = newHoverBtn;
    }
}

/**
 * @returns {void}
 */
function on_mouse_leave() {
    if (currentHoverBtn) {
        currentHoverBtn.deactivate();
        currentHoverBtn = null;
    }
    tooltip("");
    _setCursor(CURSOR_ARROW);
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

/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function on_mouse_lbtn_dblclk(x, y) {
    if (!currentHoverBtn) {
        fb.RunMainMenuCommand("View/Show now playing in playlist");
    }
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function on_mouse_rbtn_up(x, y) {
    if (buttons.stop.containsPoint(x, y)) {
        fb.StopAfterCurrent = !fb.StopAfterCurrent;
        syncStopState();
        return true;
    }
    if (buttons.order.containsPoint(x, y)) {
        showOrderMenu(x, y);
        return true;
    }
    return false;
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function on_mouse_rbtn_down(x, y) {
    // 屏蔽默认右键菜单
    for (let key in buttons) {
        if (buttons[key].containsPoint(x, y)) return true;
    }
    return false;
}

function clearTransparentTrackRepaintTimers() {
    if (transparentTrackRepaintTimer) {
        window.ClearTimeout(transparentTrackRepaintTimer);
        transparentTrackRepaintTimer = null;
    }
}

function scheduleTransparentTrackRepaintFallback() {
    if (!window.IsTransparent || !window.IsVisible) return;

    clearTransparentTrackRepaintTimers();
    transparentTrackRepaintTimer = window.SetTimeout(function () {
        transparentTrackRepaintTimer = null;
        if (!window.IsVisible) return;
        if (Date.now() - lastTransparentNotifyTs <= THEME.LAYOUT.TRANSPARENT_SYNC_NOTIFY_FRESH_MS) return;
        window.Repaint();
    }, THEME.LAYOUT.TRANSPARENT_REPAINT_FALLBACK_DELAY_MS);
}

/** @returns {void} */
function on_playback_starting() { syncPlayPauseState(); }
/** @returns {void} */
function on_playback_new_track() {
    syncPlayPauseState();
    scheduleTransparentTrackRepaintFallback();
}
/**
 * @param {number} reason
 * @returns {void}
 */
function on_playback_stop(reason) {
    if (reason !== 2) { syncPlayPauseState(); syncStopState(); }
}
/** @returns {void} */
function on_playback_pause() { syncPlayPauseState(); }
/** @returns {void} */
function on_playback_order_changed() { syncOrderState(); }

/**
 * @returns {void}
 */
function on_colours_changed() {
    _refreshThemeColors();
    window.Repaint();
}

/**
 * @returns {void}
 */
function on_font_changed() {
    _refreshThemeFonts();
    window.Repaint();
}

/**
 * 透明同步通知：bg_panel_container_control 重绘后触发本面板跟随重绘。
 * 通道与发送方标识见 lib/data.js NOTIFY。
 * @param {string} name
 * @param {*} info
 * @returns {void}
 */
function on_notify_data(name, info) {
    if (!window.IsTransparent) return;
    if (name !== NOTIFY.TRANSPARENT_SYNC.name) return;
    if (!info || typeof info !== "object") return;

    const version = typeof info.v === "number" ? info.v : 0;
    if (version !== NOTIFY.TRANSPARENT_SYNC.version) return;

    const source = typeof info.source === "string" ? info.source : "";
    if (source !== NOTIFY.SOURCE.BG_PANEL_CONTAINER_CONTROL) return;

    const notifyEpoch = typeof info.epoch === "number" ? info.epoch : 0;
    if (notifyEpoch <= lastTransparentNotifyEpoch) return;

    lastTransparentNotifyEpoch = notifyEpoch;
    lastTransparentNotifyTs = Date.now();
    clearTransparentTrackRepaintTimers();
    if (window.IsVisible) window.Repaint();
}

function on_script_unload() {
    clearTransparentTrackRepaintTimers();
}
