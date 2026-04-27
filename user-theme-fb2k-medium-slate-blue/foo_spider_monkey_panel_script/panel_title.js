/**
 * @file panel_title.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-04-14
 * @version 1.3.0
 * @description 重构版：引入共享库，消除重复代码。
 */

"use strict";

// 共享库
include("lib/utils.js");
include("lib/interaction.js");
include("lib/theme.js");

window.DefineScript("title", {
  author: "XYSRe",
  version: "1.3.0",
  options: { grab_focus: false },
});

// ============================================================================
// 1. 工具函数与常量
// ============================================================================

const COL = THEME.COL;
// _init_tooltip 来自 lib/interaction.js
let _tt = _init_tooltip(THEME.FONT.GLOBAL, _scale(13), 1200);

const g_font = THEME.FONT.TITLEBAR;
// 播放列表icon
const g_imgs = {
  icon: _load_image(IMGS_LUCIDE_DIR + "list-music.png"),
  chevron: _load_image(IMGS_LUCIDE_DIR + "chevron-down.png"),
  button: _load_image(IMGS_LUCIDE_DIR + "plus.png"),
  button_hover: _load_image(IMGS_LUCIDE_DIR + "plus_hover.png"),
};

// 资料库icon
// const g_imgs = {
//     icon: _load_image(IMGS_LUCIDE_DIR + "list-music.png"),
//     chevron: _load_image(IMGS_LUCIDE_DIR + "chevron-down.png"),
//     button: _load_image(IMGS_LUCIDE_DIR + "folder-search.png"),
//     button_hover: _load_image(IMGS_LUCIDE_DIR + "folder-search_hover.png"),
// };

// [优化] 文本测量工具 _measure 对象来自 lib/utils.js (_measure.img, _measure.gr)

// ============================================================================
// 2. 状态与布局 (State & Layout)
// ============================================================================

const layout = {
  slider_w: 0,
  start_x: 0,
  text_w: 0,
  text_h: 0,
  content_y: 0,
  is_metrics_ready: false,
};

const button = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  img: g_imgs.button,
  img_hover: g_imgs.button_hover,
  tooltip: "新增播放列表",
  is_hover: false,
  func: () => fb.RunMainMenuCommand("Library/Search"),
};

let display_text = "";
let g_activeElement = null; // [状态机] 当前激活的 UI 元素

// ============================================================================
// 3. 核心回调 (Callbacks)
// ============================================================================

// 初始化
update_text();

function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;

  // 统一调用布局更新
  update_layout_metrics();
}

function on_paint(gr) {
  gr.FillSolidRect(0, 0, window.Width, window.Height, COL.BG);

  gr.FillSolidRect(
    window.Width - layout.slider_w + _scale(0.8),
    0,
    layout.slider_w,
    window.Height,
    COL.ITEMDETAIL_BG,
  );

  if (!layout.is_metrics_ready) return;

  gr.SetTextRenderingHint(5);

  if (g_imgs.icon) {
    gr.DrawImage(
      g_imgs.icon,
      layout.start_x,
      layout.content_y,
      layout.text_h,
      layout.text_h,
      0,
      0,
      g_imgs.icon.Width,
      g_imgs.icon.Height,
    );
  }

  gr.GdiDrawText(
    display_text,
    g_font,
    COL.SELECTED_TEXT,
    layout.start_x + layout.text_h + _scale(5),
    layout.content_y,
    layout.text_w,
    layout.text_h,
    0,
  );

  if (g_imgs.chevron) {
    gr.DrawImage(
      g_imgs.chevron,
      layout.start_x + layout.text_h + layout.text_w + _scale(6),
      layout.content_y,
      layout.text_h,
      layout.text_h,
      0,
      0,
      g_imgs.chevron.Width,
      g_imgs.chevron.Height,
    );
  }

  const current_btn_img = button.is_hover ? button.img_hover : button.img;
  if (current_btn_img) {
    gr.DrawImage(
      current_btn_img,
      button.x,
      button.y,
      button.w,
      button.h,
      0,
      0,
      current_btn_img.Width,
      current_btn_img.Height,
    );
  }
}

function on_playlists_changed() {
  update_text();
  // [优化] 文本变了，尺寸和布局都会变，重新计算布局
  if (window.Width > 0) {
    update_layout_metrics();
    window.Repaint();
  }
}

// [新增] 资源清理
function on_script_unload() {
  _measure_dispose();
  _dispose_image_dict(g_imgs);
}

// ============================================================================
// 4. 交互处理 (Interaction)
// ============================================================================

// [核心] 状态机：on_mouse_move
function on_mouse_move(x, y) {
  let target = null;

  // 1. 检测 Tab 按钮
  if (_element_trace(x, y, button)) {
    target = button;
  }

  // 3. 状态切换
  if (g_activeElement === target) return; // 没变，退出

  // 旧元素复位
  if (g_activeElement) {
    g_activeElement.is_hover = false;
    window.RepaintRect(
      g_activeElement.x,
      g_activeElement.y,
      g_activeElement.w,
      g_activeElement.h,
    );
  }

  // 新元素激活
  if (target) {
    target.is_hover = true;
    window.RepaintRect(target.x, target.y, target.w, target.h);
    // _tt(target.name || target.tooltip || "");
    _tt(target.tooltip || "");
    _setCursor(CURSOR_HAND); // Hand
  } else {
    _tt("");
    _setCursor(CURSOR_ARROW); // Arrow
  }

  g_activeElement = target;
}

function on_mouse_leave() {
  if (g_activeElement) {
    g_activeElement.is_hover = false;
    window.RepaintRect(
      g_activeElement.x,
      g_activeElement.y,
      g_activeElement.w,
      g_activeElement.h,
    );
    g_activeElement = null;
  }
  _tt("");
  _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_up(x, y) {
  if (_element_trace(x, y, button)) {
    button.func();
  }
}

// ============================================================================
// 5. 辅助函数
// ============================================================================

function update_text() {
  display_text = `播放列表 (${plman.PlaylistCount})`;
}

// [新增] 统一布局计算函数
function update_layout_metrics() {
  // 1. 初始化测量工具 (单例，_measure 来自 lib/utils.js)
  if (!_measure.img) {
    _measure.img = gdi.CreateImage(1, 1);
    _measure.gr = _measure.img.GetGraphics();
  }

  // 2. 更新固定参数
  layout.slider_w = _scale(14);
  layout.start_x = _scale(8);

  // 3. 测量文字
  // 注意：CalcTextHeight 第一个参数无所谓，主要是测字体高度
  layout.text_h = _measure.gr.CalcTextHeight("Test", g_font);
  layout.text_w = _measure.gr.CalcTextWidth(display_text, g_font);

  // 4. 计算垂直位置
  layout.content_y = window.Height - layout.text_h - _scale(4);

  // 5. 更新按钮位置
  button.w = layout.text_h;
  button.h = layout.text_h;
  button.x = window.Width - layout.slider_w - button.w - _scale(4);
  button.y = layout.content_y;

  layout.is_metrics_ready = true;
}

// _element_trace 来自 lib/utils.js
