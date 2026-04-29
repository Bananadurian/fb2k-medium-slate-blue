/**
 * @file playback_buttons.js
 * @author XYSRe
 * @created 2025-12-14
 * @updated 2026-04-29
 * @version 2.0.0
 * @description 播放控制按钮 — 播放/暂停、停止、上下曲、快进快退、播放模式、随机
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");

window.DefineScript("Playback Buttons", {
    author: "XYSRe",
    version: "2.0.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. 工具与别名
// ============================================================================

const COL = THEME.COL;
let tooltip = _initTooltip(THEME.FONT.TEXT_SM, _scale(13), 1200);

// ============================================================================
// 2. 资源定义
// ============================================================================

const images = {
    stop: _loadImage(IMGS_LUCIDE_DIR + "stop.png"),
    stop_after: _loadImage(IMGS_LUCIDE_DIR + "stop_after.png"),
    stop_hover: _loadImage(IMGS_LUCIDE_DIR + "stop_hover.png"),

    pause: _loadImage(IMGS_LUCIDE_DIR + "pause.png"),
    pause_hover: _loadImage(IMGS_LUCIDE_DIR + "pause_hover.png"),

    play: _loadImage(IMGS_LUCIDE_DIR + "play.png"),
    play_hover: _loadImage(IMGS_LUCIDE_DIR + "play_hover.png"),

    previous: _loadImage(IMGS_LUCIDE_DIR + "previous.png"),
    previous_hover: _loadImage(IMGS_LUCIDE_DIR + "previous_hover.png"),

    next: _loadImage(IMGS_LUCIDE_DIR + "next.png"),
    next_hover: _loadImage(IMGS_LUCIDE_DIR + "next_hover.png"),

    order_default: _loadImage(IMGS_LUCIDE_DIR + "order_other.png"),
    order_default_hover: _loadImage(IMGS_LUCIDE_DIR + "order_other_hover.png"),
    order_repeat: _loadImage(IMGS_LUCIDE_DIR + "order_repeat_playlist.png"),
    order_repeat_hover: _loadImage(IMGS_LUCIDE_DIR + "order_repeat_playlist_hover.png"),
    order_track: _loadImage(IMGS_LUCIDE_DIR + "order_repeat_track.png"),
    order_track_hover: _loadImage(IMGS_LUCIDE_DIR + "order_repeat_track_hover.png"),
    order_shuffle: _loadImage(IMGS_LUCIDE_DIR + "order_shuffle_tracks.png"),
    order_shuffle_hover: _loadImage(IMGS_LUCIDE_DIR + "order_shuffle_tracks_hover.png"),

    replay: _loadImage(IMGS_LUCIDE_DIR + "rotate-ccw.png"),
    replay_hover: _loadImage(IMGS_LUCIDE_DIR + "rotate-ccw_hover.png"),
    rewind: _loadImage(IMGS_LUCIDE_DIR + "rewind.png"),
    rewind_hover: _loadImage(IMGS_LUCIDE_DIR + "rewind_hover.png"),
    forward: _loadImage(IMGS_LUCIDE_DIR + "fast-forward.png"),
    forward_hover: _loadImage(IMGS_LUCIDE_DIR + "fast-forward_hover.png"),
    random: _loadImage(IMGS_LUCIDE_DIR + "dices.png"),
    random_hover: _loadImage(IMGS_LUCIDE_DIR + "dices_hover.png"),
};

const ICON_W = _scale(18);
const ICON_H = _scale(18);
const MARGIN = _scale(10);




// ============================================================================
// 3. 业务逻辑
// ============================================================================

const buttons = {};
let currentHoverBtn = null; 

const ORDER_CONFIG = {
    0: { img: images.order_default, hover: images.order_default_hover, tip: "顺序播放" },
    1: { img: images.order_repeat,  hover: images.order_repeat_hover,  tip: "列表循环" },
    2: { img: images.order_track,   hover: images.order_track_hover,   tip: "单曲循环" },
    3: { img: images.order_default, hover: images.order_default_hover, tip: "随机播放 (Random)" },
    4: { img: images.order_shuffle, hover: images.order_shuffle_hover, tip: "随机乱序 (Shuffle)" },
    default: { img: images.order_default, hover: images.order_default_hover, tip: "其他模式" }
};

function initUi() {
    buttons.stop = new Button({ imgNormal: images.stop, imgHover: images.stop_hover, func: () => fb.Stop(), tipText: "Stop" });
    buttons.prev = new Button({ imgNormal: images.previous, imgHover: images.previous_hover, func: () => fb.Prev(), tipText: "上一曲" });
    buttons.play = new Button({ imgNormal: images.play, imgHover: images.play_hover, func: () => fb.PlayOrPause(), tipText: "播放" });
    buttons.next = new Button({ imgNormal: images.next, imgHover: images.next_hover, func: () => fb.Next(), tipText: "下一曲" });
    buttons.order = new Button({ imgNormal: images.order_default, imgHover: images.order_default_hover, func: () => togglePlaybackOrder(), tipText: "播放模式" });

    buttons.replay = new Button({ imgNormal: images.replay, imgHover: images.replay_hover, func: () => fb.Play(), tipText: "重放" });
    buttons.rewind = new Button({ imgNormal: images.rewind, imgHover: images.rewind_hover, func: () => fb.RunMainMenuCommand("Playback/Seek/Back by 5 seconds"), tipText: "Seek -5s" });
    buttons.forward = new Button({ imgNormal: images.forward, imgHover: images.forward_hover, func: () => fb.RunMainMenuCommand("Playback/Seek/Ahead by 5 seconds"), tipText: "Seek +5s" });
    buttons.random = new Button({ imgNormal: images.random, imgHover: images.random_hover, func: () => fb.Random(), tipText: "Random" });            
    updateAllStates();
}

function updatePlayPauseButton() {
    if (fb.IsPlaying && !fb.IsPaused) {
        buttons.play.updateState(images.pause, images.pause_hover, "暂停");
    } else {
        buttons.play.updateState(images.play, images.play_hover, "播放");
    }
}

function updateStopState() {
    if (fb.StopAfterCurrent) {
        buttons.stop.updateState(images.stop_after, images.stop_hover, "立即停止 (右键: 取消稍后停止)", () => fb.Stop());
    } else {
        buttons.stop.updateState(images.stop, images.stop_hover, "停止播放 (右键: 稍后停止)", () => fb.Stop());
    }
}

function updateOrderState() {
    const orderId = plman.PlaybackOrder;
    const cfg = ORDER_CONFIG[orderId] || ORDER_CONFIG.default;
    buttons.order.updateState(cfg.img, cfg.hover, cfg.tip);
}

function updateAllStates() {
    updatePlayPauseButton();
    updateStopState();
    updateOrderState();
}

function togglePlaybackOrder() {
    const cycle = [0, 1, 2, 4]; // 跳过模式 3 (随机播放), 仅循环 Default/Repeat/Shuffle
    const current = plman.PlaybackOrder;
    let nextIndex = cycle.indexOf(current) + 1;
    if (nextIndex >= cycle.length || nextIndex === 0) {
        nextIndex = 0;
        if (cycle.indexOf(current) === -1) nextIndex = 1; 
    }
    plman.PlaybackOrder = cycle[nextIndex];
}

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

initUi();

function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;

    // 6 个小按钮 + 3 个大按钮 (1.5x) + 8 个间距
    const totalW = (ICON_W * 6) + (ICON_W * 1.5 * 3) + (MARGIN * 8);
    let currentX = Math.round((window.Width - totalW) / 2);
    const centerY = Math.round(window.Height / 2);
    const midY = Math.round(centerY - ICON_H / 2);
    const largeY = Math.round(centerY - (ICON_H * 1.5) / 2);

    buttons.replay.x = currentX; buttons.replay.y = midY;
    buttons.replay.w = ICON_W;   buttons.replay.h = ICON_H;
    currentX += ICON_W + MARGIN;    

    buttons.stop.x = currentX; buttons.stop.y = midY;
    buttons.stop.w = ICON_W;   buttons.stop.h = ICON_H;
    currentX += ICON_W + MARGIN;

    buttons.rewind.x = currentX; buttons.rewind.y = midY;
    buttons.rewind.w = ICON_W;   buttons.rewind.h = ICON_H;
    currentX += ICON_W + MARGIN;        

    buttons.prev.x = currentX; buttons.prev.y = largeY;
    buttons.prev.w = ICON_W * 1.5;   buttons.prev.h = ICON_H * 1.5;
    currentX += (ICON_W * 1.5) + MARGIN;

    buttons.play.x = currentX; buttons.play.y = largeY;
    buttons.play.w = ICON_W * 1.5; buttons.play.h = ICON_H * 1.5;
    currentX += (ICON_W * 1.5) + MARGIN;

    buttons.next.x = currentX; buttons.next.y = largeY;
    buttons.next.w = ICON_W * 1.5;   buttons.next.h = ICON_H * 1.5;
    currentX += (ICON_W * 1.5) + MARGIN;

    buttons.forward.x = currentX; buttons.forward.y = midY;
    buttons.forward.w = ICON_W;   buttons.forward.h = ICON_H;
    currentX += ICON_W + MARGIN;        

    buttons.order.x = currentX; buttons.order.y = midY;
    buttons.order.w = ICON_W;   buttons.order.h = ICON_H;
    currentX += ICON_W + MARGIN; 

    buttons.random.x = currentX; buttons.random.y = midY;
    buttons.random.w = ICON_W;   buttons.random.h = ICON_H;
}

function on_paint(gr) {
    gr.FillSolidRect(0, 0, window.Width, window.Height, COL.ITEM_DETAIL_BG);
    for (let key in buttons) {
        buttons[key].paint(gr);
    }
}

// UI 状态机
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

function on_mouse_leave() {
    if (currentHoverBtn) {
        currentHoverBtn.deactivate();
        currentHoverBtn = null;
    }
    tooltip("");
    _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_up(x, y) {
    if (currentHoverBtn) {
        currentHoverBtn.onLbtnUp(x, y);
    }
}

function on_mouse_lbtn_dblclk(x, y) {
    if (!currentHoverBtn) {
        fb.RunMainMenuCommand("View/Show now playing in playlist");
    }
}

function on_mouse_rbtn_up(x, y) {
    if (buttons.stop.containsPoint(x, y)) {
        fb.StopAfterCurrent = !fb.StopAfterCurrent;
        updateStopState(); 
        return true;
    }
    if (buttons.order.containsPoint(x, y)) {
        showOrderMenu(x, y);
        return true;
    }
    return false;
}

function on_mouse_rbtn_down(x, y) {
    // 屏蔽默认右键菜单
    for (let key in buttons) {
        if (buttons[key].containsPoint(x, y)) return true;
    }
    return false;
}

function on_playback_starting() { updatePlayPauseButton(); }
function on_playback_new_track() { updatePlayPauseButton(); }
function on_playback_stop(reason) {
    if (reason !== 2) { updatePlayPauseButton(); updateStopState(); }
}
function on_playback_pause() { updatePlayPauseButton(); }
function on_playback_order_changed() { updateOrderState(); }

function on_script_unload() {
    _disposeImageDict(images);
}