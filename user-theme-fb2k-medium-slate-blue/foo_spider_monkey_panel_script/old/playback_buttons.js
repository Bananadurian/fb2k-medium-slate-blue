/**
 * @file playback_buttons.js
 * @author XYSRe
 * @created 2025-12-14
 * @updated 2025-12-16
 * @version 1.0.0
 * @description 播放控制按钮, 播放模式(Order)写死了几个模式！
 */

"use strict";

window.DefineScript("Playback Buttons", {
  author: "XYSRe",
  version: "v1.0.0",
  options: { grab_focus: false },
});

// Lodash 是一个流行的 JavaScript 工具库，提供了许多高效的函数（如数组操作、对象操作、函数节流/防抖等），用于简化编程。它是高度优化的。
include(fb.ComponentPath + "samples\\complete\\js\\lodash.min.js");
// 不使用作者完整的内容，改为下方自行精简移植的
// include(fb.ComponentPath + "samples\\complete\\js\\helpers.js");
// 该面板支持右键自定义背景颜色，基本用不到，直接代码中写死了, 代码中 const panel = new _panel(true); 相关内容取消注释即可恢复
// include(fb.ComponentPath + "samples\\complete\\js\\panel.js");
include(
  fb.ProfilePath +
    "\\user-theme-fb2k-medium-slate-blue\\foo_spider_monkey_panel_script\\_helpers.js"
);

const colors = {
  // 背景颜色 使用 全局系统设置背景色
  //bgColour: window.GetColourCUI(5),
  bg: _RGB(23, 23, 23),
};

// const panel = new _panel(true);

// 读取图片
// C:\XX\foobar2000-x64_v2.25.3\profile\\user-theme-fb2k-medium-slate-blue\imgs\png\
const imgs_folder = fb.ProfilePath + "\\user-theme-fb2k-medium-slate-blue\\imgs\\Lucide\\";
const imgs = {
  stop: gdi.Image(imgs_folder + "stop.png"),
  stop_after: gdi.Image(imgs_folder + "stop_after.png"),
  stop_hover: gdi.Image(imgs_folder + "stop_hover.png"),
  pause: gdi.Image(imgs_folder + "pause.png"),
  pause_hover: gdi.Image(imgs_folder + "pause_hover.png"),
  play: gdi.Image(imgs_folder + "play.png"),
  play_hover: gdi.Image(imgs_folder + "play_hover.png"),
  previous: gdi.Image(imgs_folder + "previous.png"),
  previous_hover: gdi.Image(imgs_folder + "previous_hover.png"),
  next: gdi.Image(imgs_folder + "next.png"),
  next_hover: gdi.Image(imgs_folder + "next_hover.png"),
  order_repeat_playlist: gdi.Image(imgs_folder + "order_repeat_playlist.png"),
  order_repeat_playlist_hover: gdi.Image(
    imgs_folder + "order_repeat_playlist_hover.png"
  ),
  order_repeat_track: gdi.Image(imgs_folder + "order_repeat_track.png"),
  order_repeat_track_hover: gdi.Image(
    imgs_folder + "order_repeat_track_hover.png"
  ),
  order_shuffle_tracks: gdi.Image(imgs_folder + "order_shuffle_tracks.png"),
  order_shuffle_tracks_hover: gdi.Image(
    imgs_folder + "order_shuffle_tracks_hover.png"
  ),
  order_other: gdi.Image(imgs_folder + "order_other.png"),
  order_other_hover: gdi.Image(imgs_folder + "order_other_hover.png"),
};

// 指定通用图标缩放后宽度，避免图片过大, 指定默认元素间距
const icon_w = _scale(18);
const icon_h = _scale(18);
const default_margin = _scale(10);

// 定义元素信息
// elements = {
//   device_btn: {
//     name: 元素名字,
//     x: 0, 元素渲染位置x坐标
//     y: 0, 元素渲染位置y坐标
//     w: icon_w, 元素渲染宽
//     h: icon_h, 元素渲染高
//     margin: _scale(4), 元素距离右侧间距;
//     img: { normal: imgs.stop, hover: imgs.stop_hover }, 元素显示图片, 一个是普通显示，一个是houver显示
//     func: false, 按钮点击触发函数
//     tiptext: "输出设备", 按钮hover文案
//   },
// }
const elements = {
  stop_btn: {
    name: "停止模式",
    x: 0,
    y: 0,
    w: icon_w,
    h: icon_h,
    margin: default_margin,
    img: { normal: imgs.stop, hover: imgs.stop_hover },
    func: null,
    tiptext: "Stop",
  },
  previous_btn: {
    name: "上一曲",
    x: 0,
    y: 0,
    w: icon_w,
    h: icon_h,
    margin: default_margin,
    img: { normal: imgs.previous, hover: imgs.previous_hover },
    func: (x, y) => {
      fb.Prev();
    },
    tiptext: "previous",
  },
  play_pause_btn: {
    name: "播放暂停",
    x: 0,
    y: 0,
    w: icon_w * 1.5,
    h: icon_h * 1.5,
    margin: default_margin,
    img: { normal: imgs.play, hover: imgs.play_hover },
    func: (x, y) => {
      fb.PlayOrPause();
    },
    tiptext: "Play",
  },
  next_btn: {
    name: "下一曲",
    x: 0,
    y: 0,
    w: icon_w,
    h: icon_h,
    margin: default_margin,
    img: { normal: imgs.next, hover: imgs.next_hover },
    func: (x, y) => {
      fb.Next();
    },
    tiptext: "next",
  },
  order_btn: {
    name: "播放模式",
    x: 0,
    y: 0,
    w: icon_w,
    h: icon_h,
    margin: default_margin,
    img: {
      normal: imgs.order_repeat_playlist,
      hover: imgs.order_repeat_playlist_hover,
    },
    func: __playback_order_change,
    tiptext: "开启单曲循环",
  },
};

// --- 3. 播放模式按钮 (Order Button) ---
// 使用 Map 集中管理 plman.PlaybackOrder 与按钮配置的映射关系，提高可维护性。
// PlaybackOrder 的含义：
// 1: 列表循环 (默认/其他)
// 2: 单曲循环
// 4: 随机播放
const orderConfigMap = new Map([
  [
    1,
    {
      img: {
        normal: imgs.order_repeat_playlist,
        hover: imgs.order_repeat_playlist_hover,
      },
      tiptext: "开启单曲循环",
    },
  ],
  [
    2,
    {
      img: {
        normal: imgs.order_repeat_track,
        hover: imgs.order_repeat_track_hover,
      },
      tiptext: "开启随机播放",
    },
  ],
  [
    4,
    {
      img: {
        normal: imgs.order_shuffle_tracks,
        hover: imgs.order_shuffle_tracks_hover,
      },
      tiptext: "开启列表循环",
    },
  ],
  // 默认模式 (如果 PlaybackOrder 不是 1 或 2  4，则使用这个配置)
  [
    0,
    {
      img: {
        normal: imgs.order_other,
        hover: imgs.order_other_hover,
      },
      tiptext: "开启列表循环",
    },
  ],
]);

// _buttons 定义看samples\\complete\\js\\helpers.js
const buttons = new _buttons();

// --- 1. 停止按钮 (Stop Button) 更新函数 ---
function update_stop_btn() {
  const stopButtonState = fb.StopAfterCurrent
    ? {
        // ... Stop After 状态配置 ...
        img: { normal: imgs.stop_after, hover: imgs.stop_hover },
        func: (x, y) => {
          fb.StopAfterCurrent = !fb.StopAfterCurrent;
          fb.Stop();
        },
        tiptext: "Stop",
      }
    : {
        // ... Stop 状态配置 ...
        img: { normal: imgs.stop, hover: imgs.stop_hover },
        func: (x, y) => {
          fb.StopAfterCurrent = !fb.StopAfterCurrent;
        },
        tiptext: "Stop After",
      };

  buttons.buttons.stop_btn = new _button(
    elements.stop_btn.x,
    elements.stop_btn.y,
    elements.stop_btn.w,
    elements.stop_btn.h,
    stopButtonState.img,
    stopButtonState.func,
    stopButtonState.tiptext
  );
}

// --- 2. 播放/暂停按钮 (Play/Pause Button) 更新函数 ---
function update_play_pause_btn() {
  const isReadyToPlay = !fb.IsPlaying || fb.IsPaused;
  const playPauseButtonState = isReadyToPlay
    ? {
        // ... Play 状态配置 ...
        img: { normal: imgs.play, hover: imgs.play_hover },
        tiptext: "Play",
      }
    : {
        // ... Pause 状态配置 ...
        img: { normal: imgs.pause, hover: imgs.pause_hover },
        tiptext: "Pause",
      };

  buttons.buttons.play_pause_btn = new _button(
    elements.play_pause_btn.x,
    elements.play_pause_btn.y,
    elements.play_pause_btn.w,
    elements.play_pause_btn.h,
    playPauseButtonState.img,
    elements.play_pause_btn.func,
    playPauseButtonState.tiptext
  );
}

// --- 3. 播放顺序 (Order Button) 更新函数 ---
// 假设 orderConfigMap 在全局/模块作用域定义
function update_order_btn() {
  const orderState =
    orderConfigMap.get(plman.PlaybackOrder) || orderConfigMap.get(0);

  buttons.buttons.order_btn = new _button(
    elements.order_btn.x,
    elements.order_btn.y,
    elements.order_btn.w,
    elements.order_btn.h,
    orderState.img,
    elements.order_btn.func,
    orderState.tiptext
  );
}

// 根据元素定义信息初始化按钮
function init_buttons() {
  for (const [key, element] of Object.entries(elements)) {
    // function _button(x, y, w, h, img_src, fn, tiptext)
    buttons.buttons[key] = new _button(
      element.x,
      element.y,
      element.w,
      element.h,
      element.img,
      element.func,
      element.tiptext
    );
  }
  update_stop_btn();
  update_play_pause_btn();
  update_order_btn();
}

init_buttons();

// 尺寸变化时候更新按钮位置信息
function update_buttons_position() {
  for (const [key, button] of Object.entries(buttons.buttons)) {
    // function _button(x, y, w, h, img_src, fn, tiptext)
    // console.log("key:" + key);
    // console.log("element:" + button.x);
    button.x = elements[key].x;
    button.y = elements[key].y;
  }
}

function on_size() {
  // panel.size();
  console.log("on_size() 重新计算");

  // console.log("Panel window width:" + ww);
  // 计算所有元素总宽度，元素 w + margin
  let total_width = 0;
  for (const element of Object.values(elements)) {
    // console.log("total_width t1:" + total_width);
    total_width += element.w + element.margin;
    // console.log("total_width t2:" + total_width);
  }
  // console.log("Elements total width:" + total_width);
  // 元素布局 x 起点 ，靠右布局 ww - total_width，居中布局: (ww - total_width)/2
  let startX = Math.round((window.Width - total_width) / 2);
  // 元素布局 y 中心
  let centerY = Math.round(window.Height / 2);

  // 计算每个元素的x、y
  for (const element of Object.values(elements)) {
    // console.log(element);
    element.x = startX;
    element.y = Math.round(centerY - element.h / 2);
    // 更新元素布局起点, 原起点 + 当前元素w + 当前元素margin
    startX += element.w + element.margin;
  }

  // 更新按钮位置信息
  update_buttons_position();
}

function on_paint(gr) {
  // console.log("-------\non_paint() 重新绘制");
  // 绘制最底层panel，用于定义颜色
  // panel.paint(gr);
  // FillSolidRect(x, y, w, h, colour)
  gr.FillSolidRect(0, 0, window.Width, window.Height, colors.bg);

  // 绘制按钮
  buttons.paint(gr);
  // console.log("----------");
}

function on_playback_stop() {
  update_play_pause_btn();
  update_stop_btn();
  window.RepaintRect(
    buttons.buttons.play_pause_btn.x,
    buttons.buttons.play_pause_btn.y,
    buttons.buttons.play_pause_btn.w,
    buttons.buttons.play_pause_btn.h
  );
  window.RepaintRect(
    buttons.buttons.stop_btn.x,
    buttons.buttons.stop_btn.y,
    buttons.buttons.stop_btn.w,
    buttons.buttons.stop_btn.h
  );
}

function on_playback_pause() {
  update_play_pause_btn();
  window.RepaintRect(
    buttons.buttons.play_pause_btn.x,
    buttons.buttons.play_pause_btn.y,
    buttons.buttons.play_pause_btn.w,
    buttons.buttons.play_pause_btn.h
  );
}

function on_playback_starting() {
  update_play_pause_btn();
  window.RepaintRect(
    buttons.buttons.play_pause_btn.x,
    buttons.buttons.play_pause_btn.y,
    buttons.buttons.play_pause_btn.w,
    buttons.buttons.play_pause_btn.h
  );
}

function on_mouse_move(x, y) {
  buttons.move(x, y);
}

function on_mouse_leave() {
  buttons.leave();
}

function on_mouse_lbtn_up(x, y, mask) {
  buttons.lbtn_up(x, y, mask);
  if (buttons.buttons.stop_btn.trace(x, y)) {
    update_stop_btn();
  } else if (buttons.buttons.play_pause_btn.trace(x, y)) {
    update_play_pause_btn();
  } else if (buttons.buttons.order_btn.trace(x, y)) {
    update_order_btn();
  }
  window.Repaint();
}

function on_mouse_rbtn_down(x, y) {
  if (buttons.buttons.order_btn.trace(x, y)) {
    __playback_order_menu(x, y);
  }
}

// @2025-12-17：鼠标左键双击显示当前播放歌曲所在列表位置。
function on_mouse_lbtn_dblclk(x, y) {
  // 排除按钮位置位置
  for (const button of Object.values(buttons.buttons)) {
    if (button.trace(x, y)) {
      return true;
    }
  }

  fb.RunMainMenuCommand("View/Show now playing in playlist");
}

// function on_mouse_rbtn_up(x, y) {
//   // panel.rbtn_up(x, y);
// }

// function on_colours_changed() {
//   panel.colours_changed();
//   window.Repaint();
// }

function on_playback_order_changed(new_order_index) {
  update_order_btn();
  window.RepaintRect(
    buttons.buttons.order_btn.x,
    buttons.buttons.order_btn.y,
    buttons.buttons.order_btn.w,
    buttons.buttons.order_btn.h
  );
}

function __playback_order_change(x, y) {
  /*
      0 - Default
      1 - Repeat (Playlist)
      2 - Repeat (Track)
      3 - Random
      4 - Shuffle (tracks)
      5 - Shuffle (albums)
      6 - Shuffle (folders)
  */
  // 定义需要循环切换的播放模式顺序
  const orderCycle = [1, 2, 4];

  // 1. 查找当前模式在循环数组中的索引
  let currentIndex = orderCycle.indexOf(plman.PlaybackOrder);

  // 2. 如果当前模式不在循环数组中（即currentIndex为-1，或者当前模式是0, 3, 5, 6等）
  // 则将起始模式设置为循环数组的第一个元素，即 1。
  if (currentIndex === -1) {
    plman.PlaybackOrder = orderCycle[0];
    // console.log(`PlaybackOrder reset to default cycle start: ${orderCycle[0]}`);
    return;
  }

  // 3. 计算下一个模式的索引：(当前索引 + 1) % 数组长度
  const nextIndex = (currentIndex + 1) % orderCycle.length;

  // 4. 设置新的播放模式
  plman.PlaybackOrder = orderCycle[nextIndex];
  // console.log(
  //   `PlaybackOrder changed from ${orderCycle[currentIndex]} to ${plman.PlaybackOrder}`
  // );
}

// 播放模式配置：数组索引 (0-based) 对应 plman.PlaybackOrder 的值
const PLAYBACK_MODES = [
  { text: "顺序播放", orderValue: 0 },
  { text: "列表循环", orderValue: 1 },
  { text: "单曲循环", orderValue: 2 },
  { text: "随机播放(Ramdom)", orderValue: 3 },
  { text: "随机播放(Shuffle)", orderValue: 4 },
  { text: "专辑随机播放(Shuffle)", orderValue: 5 },
  { text: "文件夹随机播放(Shuffle)", orderValue: 6 },
];

/**
 * 显示播放顺序选择的右键菜单，并处理模式切换。
 *
 * @param {number} x - 菜单显示位置的 x 坐标。
 * @param {number} y - 菜单显示位置的 y 坐标。
 * @returns {boolean} - 始终返回 true (与原函数保持一致)。
 */
function __playback_order_menu(x, y) {
  const playback_order_menu = window.CreatePopupMenu();

  // 菜单项的 ID 从 1 开始，与 plman.PlaybackOrder + 1 对应
  let menu_id = 1;

  // 1. 创建菜单项
  PLAYBACK_MODES.forEach((mode) => {
    // MF_STRING 是常量，表示普通菜单项
    playback_order_menu.AppendMenuItem(MF_STRING, menu_id, mode.text);
    menu_id++;
  });

  // 菜单项的总数，用于 CheckMenuRadioItem 的范围
  const menu_count = PLAYBACK_MODES.length;

  // 2. 标记当前选中的设备
  // plman.PlaybackOrder 是 0-based，菜单 ID 是 1-based (plman.PlaybackOrder + 1)
  if (plman.PlaybackOrder >= 0 && plman.PlaybackOrder < menu_count) {
    // 范围检查：从 ID 1 到 ID menu_count
    const checked_id = plman.PlaybackOrder + 1;
    playback_order_menu.CheckMenuRadioItem(1, menu_count, checked_id);
  }

  // 3. 追踪菜单并获取用户选择
  const idx = playback_order_menu.TrackPopupMenu(x, y);

  // 4. 处理选择结果
  if (idx > 0 && idx <= menu_count && idx - 1 !== plman.PlaybackOrder) {
    // idx 是菜单 ID (1-based)
    // plman.PlaybackOrder 是 0-based，因此设置为 idx - 1
    plman.PlaybackOrder = idx - 1;

    // console.log("Selected Playback Order:", plman.PlaybackOrder);
  }
  return true;
}
