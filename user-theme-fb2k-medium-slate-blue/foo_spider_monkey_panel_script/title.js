/**
 * @file title.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-04-14
 * @version 1.2.3
 * @description 优化版：单例测量工具 + 布局逻辑统一 + 资源释放
 */

"use strict";

window.DefineScript("title", {
  author: "XYSRe",
  version: "1.2.3",
  options: { grab_focus: false },
});

// ============================================================================
// 1. 工具函数与常量
// ============================================================================

function _RGB(r, g, b) {
  return 0xff000000 | (r << 16) | (g << 8) | b;
}
function _scale(size) {
  return Math.round((size * window.DPI) / 72);
}

function _load_image(path) {
  if (utils.IsFile(path)) {
    return gdi.Image(path);
  }
  console.log("Image not found: " + path);
  return null;
}

const IMGS_FOLDER =
  fb.ProfilePath + "\\user-theme-fb2k-medium-slate-blue\\imgs\\Lucide\\";

const colors = {
  fg: window.GetColourCUI(1), // CUI 全局 选中文案 颜色
  bg: window.GetColourCUI(3), // CUI 全局 背景 颜色
  bg_slider: window.GetColourCUI(3, "{4E20CEED-42F6-4743-8EB3-610454457E19}"), // CUI Item Details 背景色
};

const CUI_GLOBAL_FONT = window.GetFontCUI(0).Name; // CUI Item字体名字
const tooltip = window.CreateTooltip(CUI_GLOBAL_FONT, _scale(13));
tooltip.SetMaxWidth(1200);

// Tooltip 封装
function _tt(value) {
  if (tooltip.Text !== value) {
    tooltip.Text = value;
    tooltip.Activate();
  }
}

const g_font = window.GetFontCUI(1);
// 播放列表icon
const g_imgs = {
  icon: _load_image(IMGS_FOLDER + "list-music.png"),
  chevron: _load_image(IMGS_FOLDER + "chevron-down.png"),
  button: _load_image(IMGS_FOLDER + "plus.png"),
  button_hover: _load_image(IMGS_FOLDER + "plus_hover.png"),
};

// 资料库icon
// const g_imgs = {
//     icon: _load_image(IMGS_FOLDER + "list-music.png"),
//     chevron: _load_image(IMGS_FOLDER + "chevron-down.png"),
//     button: _load_image(IMGS_FOLDER + "folder-search.png"),
//     button_hover: _load_image(IMGS_FOLDER + "folder-search_hover.png"),
// };

// [优化] 全局单例测量工具
let _measureImg = null;
let _measureGr = null;

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
  gr.FillSolidRect(0, 0, window.Width, window.Height, colors.bg);

  gr.FillSolidRect(
    window.Width - layout.slider_w + _scale(0.8),
    0,
    layout.slider_w,
    window.Height,
    colors.bg_slider,
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
    colors.fg,
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
  // 释放测量工具
  if (_measureImg) {
    _measureImg.ReleaseGraphics(_measureGr);
    if (typeof _measureImg.Dispose === "function") _measureImg.Dispose();
    _measureImg = null;
    _measureGr = null;
  }
  // 释放图片 (可选，SMP会自动回收，但手动更严谨)
  for (let key in g_imgs) {
    if (g_imgs[key] && typeof g_imgs[key].Dispose === "function") {
      g_imgs[key].Dispose();
    }
  }
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
    window.SetCursor(32649); // Hand
  } else {
    _tt("");
    window.SetCursor(32512); // Arrow
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
  window.SetCursor(32512);
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
  // 1. 初始化测量工具 (单例)
  if (!_measureImg) {
    _measureImg = gdi.CreateImage(1, 1);
    _measureGr = _measureImg.GetGraphics();
  }

  // 2. 更新固定参数
  layout.slider_w = _scale(14);
  layout.start_x = _scale(8);

  // 3. 测量文字
  // 注意：CalcTextHeight 第一个参数无所谓，主要是测字体高度
  layout.text_h = _measureGr.CalcTextHeight("Test", g_font);
  layout.text_w = _measureGr.CalcTextWidth(display_text, g_font);

  // 4. 计算垂直位置
  layout.content_y = window.Height - layout.text_h - _scale(4);

  // 5. 更新按钮位置
  button.w = layout.text_h;
  button.h = layout.text_h;
  button.x = window.Width - layout.slider_w - button.w - _scale(4);
  button.y = layout.content_y;

  layout.is_metrics_ready = true;
}

function _element_trace(x, y, ele) {
  return x >= ele.x && x <= ele.x + ele.w && y >= ele.y && y <= ele.y + ele.h;
}
