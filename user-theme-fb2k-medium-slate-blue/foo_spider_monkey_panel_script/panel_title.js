/**
 * @file panel_title.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-04-27
 * @version 1.4.0
 * @description 播放列表标题栏: 图标、播放列表名称、新建按钮。
 */

"use strict";

include("lib/utils.js");
include("lib/interaction.js");
include("lib/theme.js");

window.DefineScript("Panel Title", {
  author: "XYSRe",
  version: "1.4.0",
  options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// ============================================================================
// 1. 资源与常量
// ============================================================================

const COL = THEME.COL;
let tooltip = _initTooltip(THEME.FONT.TEXT_SM, _scale(13), 1200);
const font = THEME.FONT.TITLE_PANEL;

// 播放列表模式图标: list-music + chevron + plus
// 资料库模式图标: list-music + chevron + folder-search (替换 plus/plus_hover)
const images = {
  icon: _loadImage(IMGS_LUCIDE_DIR + "list-music.png"),
  chevron: _loadImage(IMGS_LUCIDE_DIR + "chevron-down.png"),
  button: _loadImage(IMGS_LUCIDE_DIR + "plus.png"),
  button_hover: _loadImage(IMGS_LUCIDE_DIR + "plus_hover.png"),
};

// ============================================================================
// 2. 状态与布局 (State & Layout)
// ============================================================================

const layout = {
  sliderW: 0,
  startX: 0,
  textW: 0,
  textH: 0,
  contentY: 0,
  isMetricsReady: false,
};

const button = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  img: images.button,
  imgHover: images.button_hover,
  tooltip: "新增播放列表",
  isHover: false,
  func: () => fb.RunMainMenuCommand("Library/Search"),
};

let displayText = "";
let activeElement = null; // [状态机] 当前激活的 UI 元素

// ============================================================================
// 3. 核心回调 (Callbacks)
// ============================================================================

// 初始化
updateText();

function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;

  // 统一调用布局更新
  updateLayoutMetrics();
}

function on_paint(gr) {
  gr.FillSolidRect(0, 0, window.Width, window.Height, COL.BG);

  gr.FillSolidRect(
    window.Width - layout.sliderW + _scale(0.8),
    0,
    layout.sliderW,
    window.Height,
    COL.ITEM_DETAIL_BG,
  );

  if (!layout.isMetricsReady) return;

  gr.SetTextRenderingHint(5);

  if (images.icon) {
    gr.DrawImage(
      images.icon,
      layout.startX,
      layout.contentY,
      layout.textH,
      layout.textH,
      0,
      0,
      images.icon.Width,
      images.icon.Height,
    );
  }

  gr.GdiDrawText(
    displayText,
    font,
    COL.SELECTED_TEXT,
    layout.startX + layout.textH + _scale(5),
    layout.contentY,
    layout.textW,
    layout.textH,
    0,
  );

  if (images.chevron) {
    gr.DrawImage(
      images.chevron,
      layout.startX + layout.textH + layout.textW + _scale(6),
      layout.contentY,
      layout.textH,
      layout.textH,
      0,
      0,
      images.chevron.Width,
      images.chevron.Height,
    );
  }

  const current_btn_img = button.isHover ? button.imgHover : button.img;
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
  updateText();
  // 文本变了，尺寸和布局都会变，重新计算布局
  if (window.Width > 0) {
    updateLayoutMetrics();
    window.Repaint();
  }
}

// 资源清理
function on_script_unload() {
  _measureDispose();
  _disposeImageDict(images);
}

// ============================================================================
// 4. 交互处理 (Interaction)
// ============================================================================

// 状态机：on_mouse_move
function on_mouse_move(x, y) {
  let target = null;

  // 1. 检测 Tab 按钮
  if (_hitTest(x, y, button)) {
    target = button;
  }

  // 2. 状态切换
  if (activeElement === target) return; // 没变，退出

  // 旧元素复位
  if (activeElement) {
    activeElement.isHover = false;
    window.RepaintRect(
      activeElement.x,
      activeElement.y,
      activeElement.w,
      activeElement.h,
    );
  }

  // 新元素激活
  if (target) {
    target.isHover = true;
    window.RepaintRect(target.x, target.y, target.w, target.h);
    tooltip(target.tooltip || "");
    _setCursor(CURSOR_HAND); // Hand
  } else {
    tooltip("");
    _setCursor(CURSOR_ARROW); // Arrow
  }

  activeElement = target;
}

function on_mouse_leave() {
  if (activeElement) {
    activeElement.isHover = false;
    window.RepaintRect(
      activeElement.x,
      activeElement.y,
      activeElement.w,
      activeElement.h,
    );
    activeElement = null;
  }
  tooltip("");
  _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_up(x, y) {
  if (_hitTest(x, y, button)) {
    button.func();
  }
}

// ============================================================================
// 5. 辅助函数
// ============================================================================

function updateText() {
  displayText = `播放列表 (${plman.PlaylistCount})`;
}

// 统一布局计算函数
function updateLayoutMetrics() {
  // 1. 初始化测量工具 (单例，_measure 来自 lib/utils.js)
  if (!_measure.img) {
    _measure.img = gdi.CreateImage(1, 1);
    _measure.gr = _measure.img.GetGraphics();
  }

  // 2. 更新固定参数
  layout.sliderW = _scale(14);
  layout.startX = _scale(8);

  // 3. 测量文字
  // 注意：CalcTextHeight 第一个参数无所谓，主要是测字体高度
  layout.textH = _measure.gr.CalcTextHeight("Test", font);
  layout.textW = _measure.gr.CalcTextWidth(displayText, font);

  // 4. 计算垂直位置
  layout.contentY = window.Height - layout.textH - _scale(4);

  // 5. 更新按钮位置
  button.w = layout.textH;
  button.h = layout.textH;
  button.x = window.Width - layout.sliderW - button.w - _scale(4);
  button.y = layout.contentY;

  layout.isMetricsReady = true;
}

