/**
 * @description 控制按钮 — 输出设备切换、音量控制、搜索、队列、最近播放、最受欢迎、主菜单
 */

"use strict";
/** 启用 Direct2D 硬件加速渲染模式 */
window.DrawMode = 1;

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");
include("lib/icons.js");
include("lib/i18n.js");

window.DefineScript("Control Buttons", {
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
  iconSize: _scale(15),
  itemGap: _scale(6),
  items: [
    // 布局顺序: 右→左
    {
      key: "menu",
      img: "menu",
      func: (x, y) => showMainMenu(x, y),
      tipText: I18N.t("control_buttons.menu"),
    },
    { key: "volumeBar", type: "volume", w: _scale(60) },
    {
      key: "volumeBtn",
      img: "vol",
      func: () => fb.VolumeMute(),
      margin: _scale(2),
    },
    { key: "device", img: null, fnRightClick: (x, y) => showDevicesMenu(x, y) },
    {
      key: "replaygain",
      img: null,
      func: () => {
        fb.ReplaygainMode = fb.ReplaygainMode === 0 ? 1 : 0;
      },
    },
    {
      key: "search",
      img: "search",
      func: () => {
        fb.RunMainMenuCommand("View/Show now playing in playlist");
        fb.RunMainMenuCommand("Edit/Search");
      },
      tipText: I18N.t("control_buttons.search"),
      fnRightClick: (x, y) => showSearchMenu(x, y),
    },
    {
      key: "queue",
      img: "queue",
      func: () => fb.RunMainMenuCommand("View/Queue Viewer"),
      tipText: I18N.t("control_buttons.queue"),
    },
    {
      key: "favorite",
      img: "favorite",
      func: () => runCustomQuery("favorite"),
      tipText: I18N.t("control_buttons.favorite"),
    },
    {
      key: "recent",
      img: "recent",
      func: () => runCustomQuery("recent"),
      tipText: I18N.t("control_buttons.recent"),
    },
  ],
};

// ============================================================================
// 3. UI 组件类
// ============================================================================

/**
 * @typedef {"recent"|"favorite"} QueryType
 */

/**
 * 音量条组件：处理拖拽、滚轮与进度绘制。
 */
class VolumeControl {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.drag = false;
    this.hover = false;
    this.color = THEME.COL.SEL_FG;
    this.currentTip = "";
  }

  repaint() {
    window.RepaintRect(this.x, this.y, this.w, this.h);
  }

  /**
   * @param {GdiGraphics} gr
   * @returns {void}
   */
  paint(gr) {
    if (this.w <= 0 || this.h <= 0) return;
    const arc = Math.max(1, _scale(1));
    // 抗锯齿
    gr.SetSmoothingMode(4);
    gr.FillRoundRect(this.x, this.y, this.w, this.h, arc, arc, THEME.COL.FG);

    const posW = this.getPosWidth();
    // 这里如果值posW太小的话绘制不了arc值得圆角矩形
    if (posW >= 6) {
      gr.FillRoundRect(this.x, this.y, posW, this.h, arc, arc, this.color);
    }
    // 关闭抗锯齿
    gr.SetSmoothingMode(0);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  containsPoint(x, y) {
    const m = this.drag ? 200 : 0; // 拖拽时扩大热区范围，避免鼠标移出滑块
    return (
      x >= this.x - m &&
      x <= this.x + this.w + m &&
      y >= this.y - m &&
      y <= this.y + this.h + m * 2
    );
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  on_mouse_move(x, y) {
    this.currentTip = "";
    const isOver = this.containsPoint(x, y);

    if (this.drag) {
      let v = (x - this.x) / this.w;
      v = Math.max(0, Math.min(1, v));
      let db = (10 * Math.log(v)) / Math.LN2; // 线性 0~1 → 对数 dB 转换 (底数 2)
      if (v <= 0) db = -100;
      if (db > 0) db = 0;

      fb.Volume = db;
      this.currentTip = db.toFixed(2) + " dB";
      this.repaint();
      return true;
    }

    if (isOver !== this.hover) {
      this.hover = isOver;
      this.color = isOver ? THEME.COL.FRAME : THEME.COL.SEL_FG;
      this.repaint();
    }

    return isOver;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  on_mouse_lbtn_down(x, y) {
    if (this.containsPoint(x, y)) {
      this.drag = true;
      this.on_mouse_move(x, y);
      return true;
    }
    return false;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  on_mouse_lbtn_up(x, y) {
    if (this.drag) {
      this.drag = false;
      return true;
    }
    return false;
  }

  /**
   * @param {number} step
   * @returns {boolean|void}
   */
  on_mouse_wheel(step) {
    if (this.hover) {
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
let panelW = window.Width;
let panelH = window.Height;

// 透明同步通知 freshness 窗口与兜底延迟 — 通道定义见 lib/data.js NOTIFY.TRANSPARENT_SYNC
let transparentTrackRepaintTimer = null;
let lastTransparentNotifyEpoch = 0;
let lastTransparentNotifyTs = 0;

const libraryQueryConfigs = {
  recent: {
    query: "%last_played% PRESENT",
    sort: fb.TitleFormat(
      "%last_played%|%artist%|%date%|%album%|%discnumber%|%tracknumber%",
    ),
  },
  favorite: {
    query: "%play_count% PRESENT",
    sort: fb.TitleFormat(
      "%play_count%|%artist%|%date%|%album%|%discnumber%|%tracknumber%",
    ),
  },
  search: [
    { query: '%title% HAS "" SORT DESCENDING BY [%date%]', label: I18N.t("control_buttons.search_song") },
    { query: '%artist% HAS "" SORT DESCENDING BY [%date%]', label: I18N.t("control_buttons.search_artist") },
    {
      query: '%album artist% HAS "" SORT DESCENDING BY [%date%]',
      label: I18N.t("control_buttons.search_album_artist"),
    },
    { query: '%album% HAS "" SORT DESCENDING BY [%date%]', label: I18N.t("control_buttons.search_album") },
    {
      query: '(%album artist% HAS "") AND (NOT %rating% EQUAL 1)',
      label: I18N.t("control_buttons.search_smart"),
    },
  ],
};

/**
 * @param {QueryType} type
 * @returns {void}
 */
function runCustomQuery(type) {
  const config =
    type === "recent"
      ? { tf: libraryQueryConfigs.recent, plName: I18N.t("control_buttons.playlist_recent") }
      : { tf: libraryQueryConfigs.favorite, plName: I18N.t("control_buttons.playlist_favorite") };

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

/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function showMainMenu(x, y) {
  let menu = window.CreatePopupMenu();
  const add = (name, id) => {
    let sub = window.CreatePopupMenu();
    let mm = fb.CreateMainMenuManager();
    mm.Init(name);
    mm.BuildMenu(sub, id, -1);
    sub.AppendTo(menu, MF_STRING, name);
    return mm;
  };

  let mmFile = add("File", 1000);
  let mmEdit = add("Edit", 2000);
  let mmView = add("View", 3000);
  let mmPlayback = add("Playback", 4000);
  let mmLibrary = add("Library", 5000);
  let mmHelp = add("Help", 6000);

  let idx = menu.TrackPopupMenu(x, y);

  if (idx >= 1000 && idx < 2000) mmFile.ExecuteByID(idx - 1000);
  else if (idx < 3000) mmEdit.ExecuteByID(idx - 2000);
  else if (idx < 4000) mmView.ExecuteByID(idx - 3000);
  else if (idx < 5000) mmPlayback.ExecuteByID(idx - 4000);
  else if (idx < 6000) mmLibrary.ExecuteByID(idx - 5000);
  else if (idx < 7000) mmHelp.ExecuteByID(idx - 6000);
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function showDevicesMenu(x, y) {
  const menu = window.CreatePopupMenu();
  let devices;
  try {
    devices = JSON.parse(fb.GetOutputDevices());
  } catch (e) {
    console.log("Device list error: " + e);
    return;
  }
  let activeIdx = -1;

  devices.forEach((dev, i) => {
    menu.AppendMenuItem(MF_STRING, i + 1, dev.name);
    if (dev.active) activeIdx = i;
  });

  if (activeIdx !== -1) {
    menu.CheckMenuRadioItem(1, devices.length, activeIdx + 1);
  }

  const idx = menu.TrackPopupMenu(x, y);
  if (idx > 0 && idx - 1 !== activeIdx) {
    fb.RunMainMenuCommand(`Playback/Device/${devices[idx - 1].name}`);
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function showSearchMenu(x, y) {
  const menu = window.CreatePopupMenu();
  const items = libraryQueryConfigs.search;
  items.forEach((item, i) => menu.AppendMenuItem(MF_STRING, i + 1, item.label));
  const idx = menu.TrackPopupMenu(x, y);
  if (idx > 0 && idx <= items.length) {
    fb.ShowLibrarySearchUI(items[idx - 1].query);
  }
}

// 数组索引 = fb.ReplaygainMode 值: 0=None, 1=Track, 2=Album, 3=Smart
const replayGainConfigs = [
  { img: iconMgr.get("ui", "rg_off"), text: I18N.t("control_buttons.rg_none") },
  { img: iconMgr.get("ui", "rg_track"), text: I18N.t("control_buttons.rg_track") },
  { img: iconMgr.get("ui", "rg_album"), text: I18N.t("control_buttons.rg_album") },
  { img: iconMgr.get("ui", "rg_album"), text: I18N.t("control_buttons.rg_smart") },
];

/** 根据 ReplayGain 模式同步按钮图标与提示文字 */
function syncRgState() {
  const mode = fb.ReplaygainMode;
  const cfg = replayGainConfigs[mode] || replayGainConfigs[0];
  if (buttons.replaygain)
    buttons.replaygain.updateState(
      cfg.img,
      iconMgr.get("ui", "rg_hover"),
      cfg.text,
    );
}

/**
 * 设备类型识别。
 *   device_asio          — 含 "ASIO"
 *   device_wasapi_ex     — 含 "exclusive"（Default [exclusive] 也是 WASAPI exclusive）
 *   device_wasapi_share  — 含 "WASAPI" + "shared"
 *   device_default       — 其他（Default : xxx、XAudio2 : xxx）
 * @param {string} name
 * @returns {"device_asio"|"device_wasapi_ex"|"device_wasapi_share"|"device_default"}
 */
function classifyDevice(name) {
  if (name.includes("ASIO")) return "device_asio";
  if (name.includes("exclusive") && (name.includes("Default") || name.includes("WASAPI")))
    return "device_wasapi_ex";
  if (name.includes("WASAPI") && name.includes("shared")) return "device_wasapi_share";
  return "device_default";
}

/**
 * 根据当前输出设备同步按钮图标、tooltip 与切换逻辑。
 * 点击按钮在 device_asio → device_wasapi_ex → device_wasapi_share 之间循环，
 * device_default 不入循环。不可用时按优先级轮询，deviceArr[0] 绝对兜底。
 */
function syncDeviceState() {
  const deviceIconMap = {
    device_asio:          "device_asio",
    device_wasapi_ex:     "device_wasapi_ex",
    device_wasapi_share:  "device_wasapi_share",
    device_default:       "device_default",
  };

  const deviceTipMap = {
    device_asio:          "control_buttons.device_asio",
    device_wasapi_ex:     "control_buttons.device_wasapi_ex",
    device_wasapi_share:  "control_buttons.device_wasapi_share",
    device_default:       "Unknown",
  };
  let deviceArr;
  try {
    deviceArr = JSON.parse(fb.GetOutputDevices());
  } catch (e) {
    console.log("Device switch error: " + e);
    return;
  }

  const current = deviceArr.find((d) => d.active)?.name || "";
  const currentType = classifyDevice(current);

  // Cycle: device_asio → device_wasapi_ex → device_wasapi_share
  const CYCLE = ["device_asio", "device_wasapi_ex", "device_wasapi_share"];
  const curIdx = CYCLE.indexOf(currentType);
  const nextType = CYCLE[(curIdx + 1) % CYCLE.length];

  // 目标查找 + 优先级轮询 fallback
  const start = CYCLE.indexOf(nextType);
  let target = null;
  for (let i = 0; i < CYCLE.length; i++) {
    const tryType = CYCLE[(start + i) % CYCLE.length];
    target = deviceArr.find((d) => classifyDevice(d.name) === tryType);
    if (target) break;
  }
  target = target || deviceArr[0];

  const cmd = target ? "Playback/Device/" + target.name : "";

  const icon = iconMgr.get("ui", deviceIconMap[currentType]);
  const iconHover = iconMgr.get("ui", deviceIconMap[currentType] + "_hover");
  const tip = I18N.t(deviceTipMap[currentType]);

  if (buttons.device) {
    buttons.device.updateState(icon, iconHover, tip, () => {
      if (!cmd) return;
      try {
        fb.RunMainMenuCommand(cmd);
      } catch (e) {
        console.log("Device switch error: " + e);
      }
    });
  }
}

/**
/** 根据静音状态同步音量按钮图标与提示文字 */
function syncVolumeState() {
  const isMuted = fb.Volume === -100;
  const img = isMuted ? iconMgr.get("ui", "mute") : iconMgr.get("ui", "vol");
  const hover = isMuted
    ? iconMgr.get("ui", "mute_hover")
    : iconMgr.get("ui", "vol_hover");
  const text = isMuted ? I18N.t("control_buttons.unmute") : I18N.t("control_buttons.mute");

  if (buttons.volumeBtn) buttons.volumeBtn.updateState(img, hover, text);
}

// ============================================================================
// 5. 初始化与布局
// ============================================================================

function createButtons() {
  BTN_LAYOUT.items.forEach((it) => {
    if (it.type === "volume") return;
    buttons[it.key] = new Button({
      imgNormal: it.img ? iconMgr.get("ui", it.img) : null,
      imgHover: it.img ? iconMgr.get("ui", it.img + "_hover") : null,
      func: it.func || null,
      fnRightClick: it.fnRightClick || null,
      tipText: it.tipText || "",
    });
  });
  syncRgState();
  syncDeviceState();
  syncVolumeState();
}

createButtons();

function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;
  panelW = window.Width;
  panelH = window.Height;

  const cfg = BTN_LAYOUT;
  let x = panelW;
  const cy = Math.floor(panelH / 2);
  cfg.items.forEach((it) => {
    const w = it.w || cfg.iconSize;
    const m = it.margin !== undefined ? it.margin : cfg.itemGap;
    x -= w + m;
    if (it.type === "volume") {
      volumeBar.x = x;
      volumeBar.y = Math.floor(cy - _scale(3) / 2);
      volumeBar.w = w;
      volumeBar.h = _scale(3);
    } else {
      const btn = buttons[it.key];
      if (btn) {
        btn.x = x;
        btn.y = Math.floor(cy - cfg.iconSize / 2);
        btn.w = w;
        btn.h = cfg.iconSize;
      }
    }
  });
}

function on_paint(gr) {
  if (!window.IsTransparent) {
    gr.FillSolidRect(0, 0, panelW, panelH, THEME.COL.BG);
  }
  for (let key in buttons) {
    buttons[key].paint(gr);
  }
  volumeBar.paint(gr);
}

// ============================================================================
// ============================================================================
// 6. 全局回调 (Event Handlers)
// ============================================================================

// --- 悬停状态机 ---
/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function on_mouse_move(x, y) {
  // 1. 优先处理音量条
  const isVolumeActive = volumeBar.on_mouse_move(x, y);

  if (isVolumeActive) {
    if (currentHoverBtn) {
      currentHoverBtn.deactivate();
      currentHoverBtn = null;
    }

    if (volumeBar.drag) {
      tooltip(volumeBar.currentTip);
      _setCursor(CURSOR_HAND);
    } else {
      tooltip("");
      _setCursor(CURSOR_ARROW);
    }
    return;
  }

  // 2. 检测按钮 (状态机逻辑)
  let newHoverBtn = null;
  for (let key in buttons) {
    if (buttons[key].containsPoint(x, y)) {
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
  volumeBar.hover = false;
  volumeBar.drag = false;
  volumeBar.color = THEME.COL.SEL_FG;
  volumeBar.repaint();
  tooltip("");
  _setCursor(CURSOR_ARROW);
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function on_mouse_lbtn_down(x, y) {
  volumeBar.on_mouse_lbtn_down(x, y);
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function on_mouse_lbtn_up(x, y) {
  if (volumeBar.on_mouse_lbtn_up(x, y)) return;
  if (currentHoverBtn) {
    currentHoverBtn.onLbtnUp(x, y);
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function on_mouse_rbtn_down(x, y) {
  if (currentHoverBtn) {
    return currentHoverBtn.onRbtnDown(x, y);
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function on_mouse_rbtn_up(x, y) {
  // 这里屏蔽默认的右键菜单, 返回true即可
  if (currentHoverBtn) {
    return true;
  }
}

/**
 * @param {number} step
 * @returns {void}
 */
function on_mouse_wheel(step) {
  volumeBar.on_mouse_wheel(step);
}

/**
 * @param {number} val
 * @returns {void}
 */
function on_volume_change(val) {
  syncVolumeState();
  volumeBar.repaint();
}

/**
 * @returns {void}
 */
function on_output_device_changed() {
  syncDeviceState();
}

/**
 * @returns {void}
 */
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
    if (
      Date.now() - lastTransparentNotifyTs <=
      THEME.LAYOUT.TRANSPARENT_SYNC_NOTIFY_FRESH_MS
    )
      return;
    window.Repaint();
  }, THEME.LAYOUT.TRANSPARENT_REPAINT_FALLBACK_DELAY_MS);
}
function on_replaygain_mode_changed() {
  syncRgState();
}

function on_playback_new_track() {
  scheduleTransparentTrackRepaintFallback();
}

/** 主题颜色变化时刷新 */
function on_colours_changed() {
  _refreshThemeColors();
  window.Repaint();
}

/** 系统字体变化时刷新 */
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
  // iconMgr 缓存由 JSplitter 管理生命周期，此处不手动清理
}
