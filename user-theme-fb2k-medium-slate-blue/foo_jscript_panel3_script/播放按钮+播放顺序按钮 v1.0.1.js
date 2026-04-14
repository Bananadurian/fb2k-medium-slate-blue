// ==PREPROCESSOR==
// @name "播放按钮+播放顺序按钮"
// @author "jin"
// @version "1.0.1"
// @import "%fb2k_component_path%helpers.txt"
// @import "%fb2k_component_path%samples\js\lodash.min.js"
// @import "%fb2k_component_path%samples\js\common.js"
// @import "%fb2k_component_path%samples\js\panel.js"
// ==/PREPROCESSOR==

// @created 2024-04-06
// @updated 2024-04-11

var colours = {
	buttons: RGB(255, 255, 254),
	background: window.GetColourCUI(3),
	contrast: window.GetColourCUI(4),

};

var panel = new _panel();
var buttons = new _buttons();
var bs = _scale(24);

var pbo_chars = [chars.repeat_off, chars.repeat_all, chars.repeat_one, chars.random, chars.shuffle, chars.album, chars.folder];
var pbo_names = plman.GetPlaybackOrders().toArray();

buttons.update = function () {
	var x = ((panel.w - bs * 5) / 2) - 2;
	var y = Math.round((panel.h - bs) / 2);

	this.buttons.stop = new _button(x, y, bs, bs, { char: chars.stop, colour: fb.StopAfterCurrent ? colours.contrast : colours.buttons }, null, function () { fb.Stop(); }, 'Stop');
	this.buttons.previous = new _button(x + bs, y, bs, bs, { char: chars.prev, colour: colours.buttons }, null, function () { fb.Prev(); }, 'Previous');
	this.buttons.play = new _button(x + (bs * 2), y, bs, bs, { char: !fb.IsPlaying || fb.IsPaused ? chars.play : chars.pause, colour: colours.buttons }, null, function () { fb.PlayOrPause(); }, !fb.IsPlaying || fb.IsPaused ? 'Play' : 'Pause');
	this.buttons.next = new _button(x + (bs * 3), y, bs, bs, { char: chars.next, colour: colours.buttons }, null, function () { fb.Next(); }, 'Next');

	var pbo = plman.PlaybackOrder;
	this.buttons.pbo = new _button(x + (bs * 4), y, bs, bs, { char: pbo_chars[pbo], colour: pbo == 0 ? setAlpha(colours.buttons, 60) : colours.buttons }, null, function () { pbo >= pbo_chars.length - 1 ? plman.PlaybackOrder = 0 : plman.PlaybackOrder++ }, 'Playback Order: ' + pbo_names[pbo]);

}

function on_mouse_lbtn_up(x, y) {
	buttons.lbtn_up(x, y);
}

function on_mouse_leave() {
	buttons.leave();
}

function on_mouse_move(x, y) {
	buttons.move(x, y);
}

function on_mouse_rbtn_up(x, y) {
	// 右键点击 停止按钮 设置 Stop after current
	if (buttons.buttons.stop.containsXY(x, y)) {
		fb.StopAfterCurrent = !fb.StopAfterCurrent;
		return true;
	} else if (buttons.buttons.pbo.containsXY(x, y)) {
		// 初始化播放顺序右键菜单
		var pboMenu = window.CreatePopupMenu();
		// start at 1, not 0
		pboMenu.AppendMenuItem(MF_STRING, 1, '顺序播放');
		pboMenu.AppendMenuItem(MF_STRING, 2, '列表循环');
		pboMenu.AppendMenuItem(MF_STRING, 3, '单曲循环');
		pboMenu.AppendMenuItem(MF_STRING, 4, '随机播放(Ramdom)');
		pboMenu.AppendMenuItem(MF_STRING, 5, '随机播放(Shuffle)');
		pboMenu.AppendMenuItem(MF_STRING, 6, '专辑随机播放(Shuffle)');
		pboMenu.AppendMenuItem(MF_STRING, 7, '文件夹随机播放(Shuffle)');
		pboMenu.AppendMenuItem(MF_STRING, 8, 'Configure');
		// 当前选中的使用无序符号标记
		// console.log(plman.PlaybackOrder + 1);
		pboMenu.CheckMenuRadioItem(1, 8, plman.PlaybackOrder + 1);
		var idx = pboMenu.TrackPopupMenu(x, y);
		switch (idx) {
			case 0: {
				// 0 点击其它地方的时候关闭菜单
				break;
			}
			case 8: {
				window.ShowConfigure();
				break;
			}
			default: {
				// console.log("case3");
				// console.log(idx);
				// 根据选项设置 播放模式 注意 idx 要减一
				plman.PlaybackOrder = idx - 1;
				break;
			}
		}
		// 关闭菜单，销毁菜单对象！
		pboMenu.Dispose();
		return true;
	}

	return panel.rbtn_up(x, y);
}

function on_paint(gr) {
	gr.Clear(colours.background);
	buttons.paint(gr);
}

function on_playback_order_changed() {
	buttons.update();
	window.Repaint();
}

function on_playback_pause() {
	buttons.update();
	window.Repaint();
}

function on_playback_starting() {
	buttons.update();
	window.Repaint();
}

function on_playback_stop() {
	buttons.update();
	window.Repaint();
}

function on_playlist_stop_after_current_changed() {
	buttons.update();
	window.Repaint();
}

function on_size() {
	panel.size();
	buttons.update();
}