// ==PREPROCESSOR==
// @name "迷你播放进度条"
// @author "jin"
// @import "%fb2k_component_path%helpers.txt"
// @import "%fb2k_component_path%samples\js\lodash.min.js"
// @import "%fb2k_component_path%samples\js\common.js"
// @import "%fb2k_component_path%samples\js\seekbar.js"
// ==/PREPROCESSOR==
// @version "1.0.0"
// @created 2024-04-06
// @updated 2024-04-06

var bgColour = window.GetColourCUI(3);
var bgColour1 = window.GetColourCUI(4);

var seekbar = new _seekbar(0, 0, 0, 0);
var font = CreateFontString("Segoe UI", 12);
var is_dark = window.IsDark;

var tfo = {
	playback_time : fb.TitleFormat('[%playback_time%]'),
	length : fb.TitleFormat('$if2(%length%,LIVE)'),
};

var colours = {
	dark : RGB(30, 30, 30),
	light : RGB(240, 240, 240),
	slider_background : RGB(114, 117, 126),
	slider_contrast : bgColour1,
};

function on_mouse_lbtn_down(x, y) {
	seekbar.lbtn_down(x, y);
}

function on_mouse_lbtn_up(x, y) {
	seekbar.lbtn_up(x, y);
}

function on_mouse_move(x, y) {
	seekbar.move(x, y);
}

function on_mouse_wheel(s) {
	seekbar.wheel(s);
}

function on_paint(gr) {
	// 填充一个矩形背景色
    gr.FillRectangle(0, 0, window.Width, window.Height, bgColour);
	gr.FillRoundedRectangle(seekbar.x, seekbar.y, seekbar.w, seekbar.h-8, _scale(2), _scale(2), colours.slider_background);

	if (fb.IsPlaying) {
		var time_width = seekbar.x - _scale(12);
		gr.WriteText(tfo.playback_time.Eval(), font, is_dark ? colours.light : colours.dark, 0, 0, time_width, window.Height - 3, 1, 2);
		gr.WriteText(tfo.length.Eval(), font, is_dark ? colours.light : colours.dark, seekbar.x + seekbar.w + _scale(12), 0, time_width, window.Height - 3, 0, 2);

		if (fb.PlaybackLength > 0) {
			// gr.FillEllipse(seekbar.x + seekbar.pos(), seekbar.y + _scale(3), _scale(6), _scale(6), colours.slider_contrast);
			gr.FillRoundedRectangle(
			seekbar.x,
			seekbar.y,
			seekbar.pos(),
			3,
			5,
			5,
			colours.slider_contrast
				);
		}
	}
}

function on_playback_seek() {
	seekbar.playback_seek();
}

function on_playback_stop() {
	window.Repaint();
}

function on_playback_time() {
	window.Repaint();
}

function on_size() {
	seekbar.x = _scale(60);
	seekbar.y = (window.Height / 2) - _scale(3);
	seekbar.w = window.Width - (seekbar.x * 2);
	seekbar.h  = _scale(6);
}