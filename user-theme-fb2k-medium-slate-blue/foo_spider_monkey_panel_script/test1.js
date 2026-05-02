/**
 * @file control_buttons.js
 * @author XYSRe
 * @created 2025-12-12
 * @updated 2026-04-29
 * @version 2.0.0
 * @description 控制按钮 — 输出设备切换、音量控制、搜索、队列、最近播放、最受欢迎、主菜单
 */

"use strict";


include("lib/utils.js");
include("lib/interaction.js");
include("lib/theme.js");

window.DefineScript("Control Buttons", {
    author: "XYSRe",
    version: "2.0.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. 工具与别名
// ============================================================================

// ============================================================================
// 2. 资源定义
// ============================================================================

const images = {
    recent: IMGS_LUCIDE_DIR + "history.png",
    recent_hover: IMGS_LUCIDE_DIR + "history_hover.png",
    favorite: IMGS_LUCIDE_DIR + "flame.png",
    favorite_hover: IMGS_LUCIDE_DIR + "flame_hover.png",
    rg_off: IMGS_LUCIDE_DIR + "replaygain_off.png",
    rg_track: IMGS_LUCIDE_DIR + "replaygain_track_on.png",
    rg_album: IMGS_LUCIDE_DIR + "replaygain_other_on.png",
    rg_hover: IMGS_LUCIDE_DIR + "replaygain_hover.png",
    vol: IMGS_LUCIDE_DIR + "volume.png",
    vol_hover: IMGS_LUCIDE_DIR + "volume_hover.png",
    mute: IMGS_LUCIDE_DIR + "volume_mute.png",
    mute_hover: IMGS_LUCIDE_DIR + "volume_mute_hover.png",
    asio: IMGS_LUCIDE_DIR + "asio.png",
    asio_hover: IMGS_LUCIDE_DIR + "asio_hover.png",
    wasapi: IMGS_LUCIDE_DIR + "wasapi.png",
    wasapi_share: IMGS_LUCIDE_DIR + "wasapi_share.png",
    wasapi_hover: IMGS_LUCIDE_DIR + "wasapi_hover.png",
    search: IMGS_LUCIDE_DIR + "search.png",
    search_hover: IMGS_LUCIDE_DIR + "search_hover.png",
    queue: IMGS_LUCIDE_DIR + "queue.png",
    queue_hover: IMGS_LUCIDE_DIR + "queue_hover.png",
    menu: IMGS_LUCIDE_DIR + "menu.png",
    menu_hover: IMGS_LUCIDE_DIR + "menu_hover.png",
};



const a = window.CreateButton(0, 0, images.recent, images.recent_hover); 

const b = window.CreateButton(100, 0, [images.favorite, images.favorite_hover], null);

const c = window.CreateButton(200, 0, [images.mute, images.asio, images.wasapi], [images.mute_hover, images.asio_hover, images.wasapi_hover]);

var d = window.CreateButton(300, 0, [images.search, images.search_hover], null);
var e = window.CreateButton(400, 0, [images.queue, images.queue_hover], null);
window.RadioButtons([d, e]); // 按下一个，另一个将自动切换到状态0