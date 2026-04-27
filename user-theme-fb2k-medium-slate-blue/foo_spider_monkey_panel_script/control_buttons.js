/**
 * @file control_buttons.js
 * @author XYSRe
 * @created 2025-12-12
 * @updated 2026-04-27
 * @version 1.5.0
 * @description 控制按钮 — 输出设备切换、音量控制、搜索、队列、最近播放、最受欢迎、主菜单
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");

window.DefineScript("Control Buttons", {
    author: "XYSRe",
    version: "1.5.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. 工具与别名
// ============================================================================

const COL = THEME.COL;
let _tt = _init_tooltip(THEME.FONT.TEXT_SM, _scale(13), 1200);

// ============================================================================
// 2. 资源定义
// ============================================================================

const imgs = {
    recent: _load_image(IMGS_LUCIDE_DIR + "history.png"),
    recent_hover: _load_image(IMGS_LUCIDE_DIR + "history_hover.png"),
    favorite: _load_image(IMGS_LUCIDE_DIR + "flame.png"),
    favorite_hover: _load_image(IMGS_LUCIDE_DIR + "flame_hover.png"),
    rg_off: _load_image(IMGS_LUCIDE_DIR + "replaygain_off.png"),
    rg_track: _load_image(IMGS_LUCIDE_DIR + "replaygain_track_on.png"),
    rg_album: _load_image(IMGS_LUCIDE_DIR + "replaygain_other_on.png"),
    rg_hover: _load_image(IMGS_LUCIDE_DIR + "replaygain_hover.png"),
    vol: _load_image(IMGS_LUCIDE_DIR + "volume.png"),
    vol_hover: _load_image(IMGS_LUCIDE_DIR + "volume_hover.png"),
    mute: _load_image(IMGS_LUCIDE_DIR + "volume_mute.png"),
    mute_hover: _load_image(IMGS_LUCIDE_DIR + "volume_mute_hover.png"),
    asio: _load_image(IMGS_LUCIDE_DIR + "asio.png"),
    asio_hover: _load_image(IMGS_LUCIDE_DIR + "asio_hover.png"),
    wasapi: _load_image(IMGS_LUCIDE_DIR + "wasapi.png"),
    wasapi_share: _load_image(IMGS_LUCIDE_DIR + "wasapi_share.png"),
    wasapi_hover: _load_image(IMGS_LUCIDE_DIR + "wasapi_hover.png"),
    search: _load_image(IMGS_LUCIDE_DIR + "search.png"),
    search_hover: _load_image(IMGS_LUCIDE_DIR + "search_hover.png"),
    queue: _load_image(IMGS_LUCIDE_DIR + "queue.png"),
    queue_hover: _load_image(IMGS_LUCIDE_DIR + "queue_hover.png"),
    menu: _load_image(IMGS_LUCIDE_DIR + "menu.png"),
    menu_hover: _load_image(IMGS_LUCIDE_DIR + "menu_hover.png"),
};

const ICON_W = _scale(15);
const ICON_H = _scale(15);
const DEFAULT_MARGIN = _scale(6);

// ============================================================================
// 3. UI 组件类
// ============================================================================

// Button 类来自 lib/interaction.js (含 fn_rclick 支持)

class VolumeControl {
    constructor() {
        this.x = 0; this.y = 0; this.w = 0; this.h = 0;
        this.drag = false;
        this.hover = false;
        this.color = COL.SELECTED_TEXT;
        this.current_tip = "";
    }

    repaint() {
        window.RepaintRect(this.x, this.y, this.w, this.h);
    }

    paint(gr) {
        if (this.w <= 0 || this.h <= 0) return;
        const arc = Math.max(1, _scale(1));
        // 抗锯齿
        gr.SetSmoothingMode(4); 
        gr.FillRoundRect(this.x, this.y, this.w, this.h, arc, arc, COL.ITEM_TEXT);
        
        const posW = this.getPosWidth();
        // 这里如果值posW太小的话绘制不了arc值得圆角矩形
        if (posW >= 6) {
            gr.FillRoundRect(this.x, this.y, posW, this.h, arc, arc, this.color);
        }
        // 关闭抗锯齿
        gr.SetSmoothingMode(0); 
    }

    trace(x, y) {
        const m = this.drag ? 200 : 0;
        return x > this.x - m && x < this.x + this.w + m && y > this.y - m && y < this.y + this.h + m * 2;
    }

    on_mouse_move(x, y) {
        this.current_tip = "";
        const isOver = this.trace(x, y);
        
        if (this.drag) {
            let v = (x - this.x) / this.w;
            v = Math.max(0, Math.min(1, v));
            let db = (10 * Math.log(v)) / Math.LN2;
            if (v <= 0) db = -100;
            if (db > 0) db = 0;
            
            fb.Volume = db;
            this.current_tip = db.toFixed(2) + " dB";
            this.repaint();
            return true;
        } 
        
        if (isOver !== this.hover) {
            this.hover = isOver;
            this.color = isOver ? COL.ACTIVE_ITEM : COL.SELECTED_TEXT;
            this.repaint();
        }
        
        return isOver;
    }

    on_mouse_lbtn_down(x, y) {
        if (this.trace(x, y)) {
            this.drag = true;
            this.on_mouse_move(x, y); 
            return true;
        }
        return false;
    }

    on_mouse_lbtn_up(x, y) {
        if (this.drag) {
            this.drag = false;
            return true;
        }
        return false;
    }

    on_mouse_wheel(step) {
        if (this.trace(this.x, this.y) || this.hover) {
            if (step > 0) fb.VolumeUp();
            else fb.VolumeDown();
            return true;
        }
    }

    getPosWidth() {
        if (this.w <= 0) return 0;
        if (fb.Volume <= -100) return 0;
        const w = Math.ceil(this.w * Math.pow(2, fb.Volume / 10));
        return Math.max(0, Math.min(this.w, w));
    }
}

// ============================================================================
// 4. 业务逻辑
// ============================================================================

const buttons = {};
const volumeBar = new VolumeControl();
let currentHoverBtn = null;

const TF = {
    recent: {
        query: "%last_played% PRESENT",
        sort: fb.TitleFormat("%last_played%|%artist%|%date%|%album%|%discnumber%|%tracknumber%")
    },
    favorite: {
        query: "%play_count% PRESENT",
        sort: fb.TitleFormat("%play_count%|%artist%|%date%|%album%|%discnumber%|%tracknumber%")
    }
};

function run_custom_query(type) {
    const config = (type === "recent") 
        ? { tf: TF.recent, plName: "🕤️ 最近播放" }
        : { tf: TF.favorite, plName: "🔥 最受欢迎" };
    
    const handleList = fb.GetQueryItems(fb.GetLibraryItems(), config.tf.query);
    handleList.OrderByFormat(config.tf.sort, -1);
    
    if (handleList.Count > 50) {
        // 只拿前50
        handleList.RemoveRange(50, handleList.Count - 50);
    }

    const plIndex = plman.FindOrCreatePlaylist(config.plName, false);
    plman.ClearPlaylist(plIndex);
    plman.InsertPlaylistItems(plIndex, 0, handleList, false);
    plman.ActivePlaylist = plIndex;
}

function show_main_menu(x, y) {
    let menu = window.CreatePopupMenu();
    const add = (name, id) => {
        let sub = window.CreatePopupMenu();
        let mm = fb.CreateMainMenuManager();
        mm.Init(name);
        mm.BuildMenu(sub, id, -1);
        sub.AppendTo(menu, MF_STRING, name);
        return mm;
    };

    let mm_file = add("File", 1000);
    let mm_edit = add("Edit", 2000);
    let mm_view = add("View", 3000);
    let mm_playback = add("Playback", 4000);
    let mm_library = add("Library", 5000);
    let mm_help = add("Help", 6000);

    let idx = menu.TrackPopupMenu(x, y);
    
    if (idx >= 1000 && idx < 2000) mm_file.ExecuteByID(idx - 1000);
    else if (idx < 3000) mm_edit.ExecuteByID(idx - 2000);
    else if (idx < 4000) mm_view.ExecuteByID(idx - 3000);
    else if (idx < 5000) mm_playback.ExecuteByID(idx - 4000);
    else if (idx < 6000) mm_library.ExecuteByID(idx - 5000);
    else if (idx < 7000) mm_help.ExecuteByID(idx - 6000);
    
}

function show_devices_menu(x, y) {
    const menu = window.CreatePopupMenu();
    const devices = JSON.parse(fb.GetOutputDevices());
    let active_idx = -1;

    devices.forEach((dev, i) => {
        menu.AppendMenuItem(MF_STRING, i + 1, dev.name);
        if (dev.active) active_idx = i;
    });

    if (active_idx !== -1) {
        menu.CheckMenuRadioItem(1, devices.length, active_idx + 1);
    }

    const idx = menu.TrackPopupMenu(x, y);
    if (idx > 0 && (idx - 1) !== active_idx) {
        fb.RunMainMenuCommand(`Playback/Device/${devices[idx - 1].name}`);
    }
}

const rg_configs = [
    { img: imgs.rg_off, text: "开启音轨增益 (当前:无)" },    
    { img: imgs.rg_track, text: "关闭音轨增益 (当前:音轨)" }, 
    { img: imgs.rg_album, text: "关闭专辑增益 (当前:专辑)" }, 
    { img: imgs.rg_album, text: "关闭增益 (当前:智能)" }      
];

// replaygain = rg
function update_rg_state() {
    const mode = fb.ReplaygainMode; 
    const cfg = rg_configs[mode] || rg_configs[0];
    if (buttons.replaygain) buttons.replaygain.updateState(cfg.img, imgs.rg_hover, cfg.text);
}

function update_device_state() {
    const deviceArr = JSON.parse(fb.GetOutputDevices());
    const current = deviceArr.find(d => d.active)?.name || "";
    
    let img = imgs.wasapi_share;
    let img_hover = imgs.wasapi_hover;
    let tip = "切换设备";
    let cmd = "";

    if (current.includes("ASIO")) {
        img = imgs.asio;
        img_hover = imgs.asio_hover;
        tip = "当前: ASIO (点击切换 WASAPI shared)";
        cmd = "Playback/Device/WASAPI (shared) : Default Sound Device"; 
    } else if(current.includes("exclusive")) {
        img = imgs.wasapi;
        img_hover = imgs.wasapi_hover;
        tip = "当前: WASAPI (点击切换 WASAPI shared)";
        cmd = "Playback/Device/WASAPI (shared) : Default Sound Device"; 
    } else {
        img = imgs.wasapi_share; 
        img_hover = imgs.wasapi_hover;
        tip = "点击切换 ASIO";
        cmd = "Playback/Device/ASIO : aune USB Audio Device"; 
    }

    if (buttons.device) {
        buttons.device.updateState(img, img_hover, tip, () => {
            try { fb.RunMainMenuCommand(cmd); } catch(e) {}
        });
    }
}

function update_volume_state() {
    const isMuted = (fb.Volume === -100);
    const img = isMuted ? imgs.mute : imgs.vol;
    const hover = isMuted ? imgs.mute_hover : imgs.vol_hover;
    const text = isMuted ? "取消静音" : "静音";
    
    if (buttons.volume_btn) buttons.volume_btn.updateState(img, hover, text);
}

// ============================================================================
// 5. 初始化与布局
// ============================================================================

function init_ui() {
    buttons.recent = new Button({ 
        img_normal: imgs.recent, img_hover: imgs.recent_hover, 
        func: () => run_custom_query("recent"), tiptext: "最近播放" 
    });
    buttons.favorite = new Button({ 
        img_normal: imgs.favorite, img_hover: imgs.favorite_hover, 
        func: () => run_custom_query("favorite"), tiptext: "最受欢迎" 
    });
    buttons.queue = new Button({ 
        img_normal: imgs.queue, img_hover: imgs.queue_hover, 
        func: () => fb.RunMainMenuCommand("View/Queue Viewer"), tiptext: "队列" 
    });
    buttons.search = new Button({ 
        img_normal: imgs.search, img_hover: imgs.search_hover, 
        func: () => {
            fb.RunMainMenuCommand("View/Show now playing in playlist");
            fb.RunMainMenuCommand("Edit/Search");
        }, tiptext: "搜索" 
    });
    buttons.replaygain = new Button({
        img_normal: imgs.rg_off, img_hover: imgs.rg_hover,
        func: () => { fb.ReplaygainMode = (fb.ReplaygainMode === 0 ? 1 : 0); }
    });
    buttons.device = new Button({
        img_normal: imgs.wasapi_share, img_hover: imgs.wasapi_hover,
        func: null, 
        func_rclick: (x, y) => show_devices_menu(x, y)
    });
    buttons.volume_btn = new Button({
        img_normal: imgs.vol, img_hover: imgs.vol_hover,
        func: () => fb.VolumeMute()
    });
    buttons.menu = new Button({
        img_normal: imgs.menu, img_hover: imgs.menu_hover,
        func: (x, y) => show_main_menu(x, y), tiptext: "主菜单"
    });

    update_rg_state();
    update_device_state();
    update_volume_state();
}

init_ui();

function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;

    const layout = [
        { key: 'menu', w: ICON_W, m: DEFAULT_MARGIN },
        { key: 'volume', w: _scale(60), m: DEFAULT_MARGIN },
        { key: 'volume_btn', w: ICON_W, m: _scale(2) },
        { key: 'device', w: ICON_W, m: DEFAULT_MARGIN },
        { key: 'replaygain', w: ICON_W, m: DEFAULT_MARGIN },
        { key: 'search', w: ICON_W, m: DEFAULT_MARGIN },
        { key: 'queue', w: ICON_W, m: DEFAULT_MARGIN },
        { key: 'favorite', w: ICON_W, m: DEFAULT_MARGIN },
        { key: 'recent', w: ICON_W, m: DEFAULT_MARGIN },
    ];

    let currentX = window.Width;
    const centerY = Math.floor(window.Height / 2);

    layout.forEach(item => {
        currentX -= (item.w + item.m);
        const y = Math.floor(centerY - ICON_H / 2);

        if (item.key === 'volume') {
            volumeBar.x = currentX;
            volumeBar.y = Math.floor(centerY - _scale(3) / 2);
            volumeBar.w = item.w;
            volumeBar.h = _scale(3);
        } else {
            const btn = buttons[item.key];
            if (btn) {
                btn.x = currentX;
                btn.y = y;
                btn.w = item.w;
                btn.h = ICON_H;
            }
        }
    });
}

function on_paint(gr) {
    gr.FillSolidRect(0, 0, window.Width, window.Height, COL.ITEMDETAIL_BG);
    for (let key in buttons) {
        buttons[key].paint(gr);
    }
    volumeBar.paint(gr);
}

// ============================================================================
// 6. 全局回调 (Event Handlers)
// ============================================================================

function on_mouse_move(x, y) {
    // 1. 优先处理音量条
    const isVolumeActive = volumeBar.on_mouse_move(x, y);
    
    if (isVolumeActive) {
        if (currentHoverBtn) {
            currentHoverBtn.deactivate();
            currentHoverBtn = null;
        }
        
        if (volumeBar.drag) {
            _tt(volumeBar.current_tip);
            _setCursor(CURSOR_HAND);
        } else {
            _tt("");
            _setCursor(CURSOR_ARROW);
        }
        return;
    }

    // 2. 检测按钮 (状态机逻辑)
    let newHoverBtn = null;
    for (let key in buttons) {
        if (buttons[key].trace(x, y)) {
            newHoverBtn = buttons[key];
            break; 
        }
    }

    if (newHoverBtn !== currentHoverBtn) {
        if (currentHoverBtn) {
            currentHoverBtn.deactivate();
        }

        if (newHoverBtn) {
            newHoverBtn.activate();
            _tt(newHoverBtn.tiptext);
            _setCursor(CURSOR_HAND);
        } else {
            _tt("");
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
    volumeBar.on_mouse_move(-1, -1);
    _tt("");
    _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_down(x, y) {
    volumeBar.on_mouse_lbtn_down(x, y);
}

function on_mouse_lbtn_up(x, y) {
    if (volumeBar.on_mouse_lbtn_up(x, y)) return;
    if (currentHoverBtn) {
        currentHoverBtn.on_mouse_lbtn_up(x, y);
    }
}

function on_mouse_rbtn_down(x, y) {
    // 这里屏蔽默认的右键菜单
    if (currentHoverBtn) {
        return currentHoverBtn.on_mouse_rbtn_down(x, y);
    }
    return true; 
}

function on_mouse_wheel(step) {
    volumeBar.on_mouse_wheel(step);
}

function on_volume_change(val) {
    update_volume_state(); 
    volumeBar.repaint();
}

function on_output_device_changed() {
    update_device_state();
}

function on_replaygain_mode_changed() {
    update_rg_state();
}

function on_script_unload() {
    _dispose_image_dict(imgs);
}