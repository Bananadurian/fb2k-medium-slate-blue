/**
 * @description 播放列表标题栏: 图标、播放列表名称、通过资料库新建播放列表按钮。
 */

"use strict";

include("lib/utils.js");
include("lib/interaction.js");
include("lib/theme.js");
include("lib/icons.js");
include("lib/title_bar_shared.js");
include("lib/i18n.js");

window.DefineScript("Title Playlist", {
  author: "Bananadurian",
  version: "2.1.0",
  options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

/** @type {TitleBarController} */
const controller = createTitleBarController({
  icon: "list-music.png",
  buttonIconFilename: "plus.png",
  buttonHoverIconFilename: "plus_hover.png",
  buttonTooltip: I18N.t("title_playlist.tooltip"),
  getDisplayText: () => I18N.t("title_playlist.title", { count: plman.PlaylistCount }),
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
  controller.on_playlists_changed();
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
