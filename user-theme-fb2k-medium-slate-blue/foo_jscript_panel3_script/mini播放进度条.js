// ==PREPROCESSOR==
// @name "mini播放进度条"
// @author "jin"
// @version "1.0.0"
// @import "%fb2k_component_path%helpers.txt"
// @import "%fb2k_component_path%samples\js\lodash.min.js"
// @import "%fb2k_component_path%samples\js\common.js"
// @import "%fb2k_component_path%samples\js\seekbar.js"
// ==/PREPROCESSOR==

// @created 2024-04-07
// @updated 2024-04-07
// @desc 基于作者的 "Minimal Seekbar"制作！

var seekbar = new _seekbar(0, 0, 0, 0);
// 初始化位置尺寸信息
seekbar.x = _scale(50);
seekbar.h  = _scale(2);
// y轴位置
seekbar.y = (window.Height / 2) - (seekbar.h / 2);
// seekbar.x * 2 是左右 时间的宽度
seekbar.w = window.Width - (seekbar.x * 2);
// 单个时间 的宽度是 进度条位置 再偏移一定距离
var time_width = seekbar.x - _scale(12);

var font = CreateFontString("Segoe UI", 12);
var colours = {
	font : RGB(240, 240, 240),
	slider_background : RGB(114, 117, 126),
	// 当前进度 使用全局选中的背景色
	slider_contrast : window.GetColourCUI(4),
	// 背景颜色 使用 全局系统设置背景色
	bgColour: window.GetColourCUI(3),
};

var tfo = {
	playback_time : fb.TitleFormat('[%playback_time%]'),
	length : fb.TitleFormat('$if2(%length%,LIVE)'),
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
	console.log("绘制");
	// 填充一个矩形背景色
    gr.FillRectangle(0, 0, window.Width, window.Height, colours.bgColour);
	// 进度条背景
	gr.FillRoundedRectangle(seekbar.x, seekbar.y, seekbar.w, seekbar.h, 5, 5, colours.slider_background);

	if (fb.IsPlaying) {
		gr.WriteText(tfo.playback_time.Eval(), font, colours.font, 0, 0, time_width, window.Height - 3, 1, 2);
		gr.WriteText(tfo.length.Eval(), font, colours.font, seekbar.x + seekbar.w + _scale(12), 0, time_width, window.Height - 3, 0, 2);

		if (fb.PlaybackLength > 0) {
			gr.FillRoundedRectangle(
			seekbar.x,
			seekbar.y,
			seekbar.pos(),
			seekbar.h,
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
	// 窗口尺寸变化，重新计算位置
	seekbar.x = _scale(50);
	seekbar.h  = _scale(2);
	seekbar.y = (window.Height / 2) - (seekbar.h / 2);
	seekbar.w = window.Width - (seekbar.x * 2);
	time_width = seekbar.x - _scale(12);
}