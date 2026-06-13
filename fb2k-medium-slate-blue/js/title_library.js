/**
 * @file title_library.js
 * @author XRE
 * @created 2025-12-16
 * @updated 2026-05-18
 * @version 2.1.0
 * @description 资料库标题栏: 图标、资料库名称、资料库搜索按钮。
 */

"use strict";

include("lib/utils.js");
include("lib/interaction.js");
include("lib/theme.js");
include("lib/title_bar_shared.js");

window.DefineScript("Title Library", {
  author: "XRE",
  version: "2.1.0",
  options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

/** @type {TitleBarController} */
const controller = createTitleBarController({
  icon: "library.png",
  buttonIconFilename: "folder-search.png",
  buttonHoverIconFilename: "folder-search_hover.png",
  buttonTooltip: "音乐库搜索",
  getDisplayText: () => "音乐库",
  onButtonClick: () => fb.RunMainMenuCommand("Library/Search"),
});

/** @returns {void} */
function on_size() {
  controller.on_size();
}

/** @param {GdiGraphics} gr @returns {void} */
function on_paint(gr) {
  controller.on_paint(gr);
}

/** @returns {void} */
function on_playlists_changed() {
  return;
}

/** @returns {void} */
function on_colours_changed() {
  controller.on_colours_changed();
}

/** @returns {void} */
function on_font_changed() {
  controller.on_font_changed();
}

/** @returns {void} */
function on_script_unload() {
  controller.on_script_unload();
}

/** @param {number} x @param {number} y @returns {void} */
function on_mouse_move(x, y) {
  controller.on_mouse_move(x, y);
}

/** @returns {void} */
function on_mouse_leave() {
  controller.on_mouse_leave();
}

/** @param {number} x @param {number} y @returns {void} */
function on_mouse_lbtn_up(x, y) {
  controller.on_mouse_lbtn_up(x, y);
}
