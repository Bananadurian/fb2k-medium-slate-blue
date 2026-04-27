/**
 * @file playback_buttons_v2.js
 * @author XYSRe
 * @created 2025-12-14
 * @updated 2026-04-14
 * @version 1.5.0
 * @description 重构版：引入共享库，使用统一的 Button 类。
 *              播放控制按钮, 播放模式(Order)写死了几个模式！
 */

"use strict";

// 共享库
include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");

window.DefineScript("Playback Buttons", {
    author: "XYSRe",
    version: "1.5.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. 工具函数
// ============================================================================

// 主题别名
const COL = THEME.COL;
// _init_tooltip / _setCursor 来自 lib/interaction.js
let _tt = _init_tooltip(THEME.FONT.TEXT_SM, _scale(13), 1200);

// ============================================================================
// 2. 资源定义
// ============================================================================

const imgs = {
    stop: _load_image(IMGS_LUCIDE_DIR + "stop.png"),
    stop_after: _load_image(IMGS_LUCIDE_DIR + "stop_after.png"),
    stop_hover: _load_image(IMGS_LUCIDE_DIR + "stop_hover.png"),

    pause: _load_image(IMGS_LUCIDE_DIR + "pause.png"),
    pause_hover: _load_image(IMGS_LUCIDE_DIR + "pause_hover.png"),

    play: _load_image(IMGS_LUCIDE_DIR + "play.png"),
    play_hover: _load_image(IMGS_LUCIDE_DIR + "play_hover.png"),

    previous: _load_image(IMGS_LUCIDE_DIR + "previous.png"),
    previous_hover: _load_image(IMGS_LUCIDE_DIR + "previous_hover.png"),

    next: _load_image(IMGS_LUCIDE_DIR + "next.png"),
    next_hover: _load_image(IMGS_LUCIDE_DIR + "next_hover.png"),

    order_default: _load_image(IMGS_LUCIDE_DIR + "order_other.png"),
    order_default_hover: _load_image(IMGS_LUCIDE_DIR + "order_other_hover.png"),
    order_repeat: _load_image(IMGS_LUCIDE_DIR + "order_repeat_playlist.png"),
    order_repeat_hover: _load_image(IMGS_LUCIDE_DIR + "order_repeat_playlist_hover.png"),
    order_track: _load_image(IMGS_LUCIDE_DIR + "order_repeat_track.png"),
    order_track_hover: _load_image(IMGS_LUCIDE_DIR + "order_repeat_track_hover.png"),
    order_shuffle: _load_image(IMGS_LUCIDE_DIR + "order_shuffle_tracks.png"),
    order_shuffle_hover: _load_image(IMGS_LUCIDE_DIR + "order_shuffle_tracks_hover.png"),

    replay: _load_image(IMGS_LUCIDE_DIR + "rotate-ccw.png"),
    replay_hover: _load_image(IMGS_LUCIDE_DIR + "rotate-ccw_hover.png"),
    rewind: _load_image(IMGS_LUCIDE_DIR + "rewind.png"),
    rewind_hover: _load_image(IMGS_LUCIDE_DIR + "rewind_hover.png"),
    forward: _load_image(IMGS_LUCIDE_DIR + "fast-forward.png"),
    forward_hover: _load_image(IMGS_LUCIDE_DIR + "fast-forward_hover.png"),
    random: _load_image(IMGS_LUCIDE_DIR + "dices.png"),
    random_hover: _load_image(IMGS_LUCIDE_DIR + "dices_hover.png"),
};

const ICON_W = _scale(18);
const ICON_H = _scale(18);
const MARGIN = _scale(10);

// ============================================================================
// 3. 组件类
// ============================================================================

// Button 类来自 lib/interaction.js

// ============================================================================
// 4. 业务逻辑
// ============================================================================

const buttons = {};
let currentHoverBtn = null; 

const ORDER_CONFIG = {
    0: { img: imgs.order_default, hover: imgs.order_default_hover, tip: "顺序播放" },
    1: { img: imgs.order_repeat,  hover: imgs.order_repeat_hover,  tip: "列表循环" },
    2: { img: imgs.order_track,   hover: imgs.order_track_hover,   tip: "单曲循环" },
    3: { img: imgs.order_default, hover: imgs.order_default_hover, tip: "随机播放 (Random)" },
    4: { img: imgs.order_shuffle, hover: imgs.order_shuffle_hover, tip: "随机乱序 (Shuffle)" },
    default: { img: imgs.order_default, hover: imgs.order_default_hover, tip: "其他模式" }
};

function init_ui() {
    buttons.stop = new Button({ img_normal: imgs.stop, img_hover: imgs.stop_hover, func: () => fb.Stop(), tiptext: "Stop" });
    buttons.prev = new Button({ img_normal: imgs.previous, img_hover: imgs.previous_hover, func: () => fb.Prev(), tiptext: "上一曲" });
    buttons.play = new Button({ img_normal: imgs.play, img_hover: imgs.play_hover, func: () => fb.PlayOrPause(), tiptext: "播放" });
    buttons.next = new Button({ img_normal: imgs.next, img_hover: imgs.next_hover, func: () => fb.Next(), tiptext: "下一曲" });
    buttons.order = new Button({ img_normal: imgs.order_default, img_hover: imgs.order_default_hover, func: () => toggle_playback_order(), tiptext: "播放模式" });

    buttons.replay = new Button({ img_normal: imgs.replay, img_hover: imgs.replay_hover, func: () => fb.Play(), tiptext: "重放" });
    buttons.rewind = new Button({ img_normal: imgs.rewind, img_hover: imgs.rewind_hover, func: () => fb.RunMainMenuCommand("Playback/Seek/Back by 5 seconds"), tiptext: "Seek -5s" });
    buttons.forward = new Button({ img_normal: imgs.forward, img_hover: imgs.forward_hover, func: () => fb.RunMainMenuCommand("Playback/Seek/Ahead by 5 seconds"), tiptext: "Seek +5s" });
    buttons.random = new Button({ img_normal: imgs.random, img_hover: imgs.random_hover, func: () => fb.Random(), tiptext: "Random" });            
    update_all_states();
}

function update_play_state() {
    if (fb.IsPlaying && !fb.IsPaused) {
        buttons.play.updateState(imgs.pause, imgs.pause_hover, "暂停");
    } else {
        buttons.play.updateState(imgs.play, imgs.play_hover, "播放");
    }
}

function update_stop_state() {
    if (fb.StopAfterCurrent) {
        buttons.stop.updateState(imgs.stop_after, imgs.stop_hover, "立即停止 (右键: 取消稍后停止)", () => fb.Stop());
    } else {
        buttons.stop.updateState(imgs.stop, imgs.stop_hover, "停止播放 (右键: 稍后停止)", () => fb.Stop());
    }
}

function update_order_state() {
    const orderId = plman.PlaybackOrder;
    const cfg = ORDER_CONFIG[orderId] || ORDER_CONFIG.default;
    buttons.order.updateState(cfg.img, cfg.hover, cfg.tip);
}

function update_all_states() {
    update_play_state();
    update_stop_state();
    update_order_state();
}

function toggle_playback_order() {
    const cycle = [0, 1, 2, 4];
    const current = plman.PlaybackOrder;
    let nextIndex = cycle.indexOf(current) + 1;
    if (nextIndex >= cycle.length || nextIndex === 0) {
        nextIndex = 0;
        if (cycle.indexOf(current) === -1) nextIndex = 1; 
    }
    plman.PlaybackOrder = cycle[nextIndex];
}

function show_order_menu(x, y) {
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
// 5. 主回调函数
// ============================================================================

init_ui();

function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;

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
    gr.FillSolidRect(0, 0, window.Width, window.Height, COL.ITEMDETAIL_BG);
    for (let key in buttons) {
        buttons[key].paint(gr);
    }
}

// [核心] 状态机 + 原版 TT
function on_mouse_move(x, y) {
    let newHoverBtn = null;

    // 查找当前悬停按钮
    for (let key in buttons) {
        if (buttons[key].trace(x, y)) {
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
            _tt(newHoverBtn.tiptext);
            _setCursor(CURSOR_HAND);
        } else {
            _tt(""); // 清除
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
    _tt("");
    _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_up(x, y) {
    if (currentHoverBtn) {
        currentHoverBtn.on_mouse_lbtn_up(x, y);
    }
}

function on_mouse_lbtn_dblclk(x, y) {
    if (!currentHoverBtn) {
        fb.RunMainMenuCommand("View/Show now playing in playlist");
    }
}

function on_mouse_rbtn_up(x, y) {
    if (buttons.stop.trace(x, y)) {
        fb.StopAfterCurrent = !fb.StopAfterCurrent;
        update_stop_state(); 
        return true;
    }
    if (buttons.order.trace(x, y)) {
        show_order_menu(x, y);
        return true;
    }
    return false;
}

function on_mouse_rbtn_down(x, y) {
    // 屏蔽默认右键菜单
    if (buttons.stop.trace(x, y) || buttons.order.trace(x, y)) {
        return true; 
    }
    return false;
}

function on_playback_starting() { update_play_state(); }
function on_playback_new_track() { update_play_state(); }
function on_playback_stop() { update_play_state(); update_stop_state(); }
function on_playback_pause() { update_play_state(); }
function on_playback_order_changed() { update_order_state(); }

function on_script_unload() {
    _dispose_image_dict(imgs);
}