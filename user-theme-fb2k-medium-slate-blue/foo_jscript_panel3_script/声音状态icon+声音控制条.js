// ==PREPROCESSOR==
// @name "声音状态icon+声音控制条"
// @author "Jin"
// @version "1.0.1"
// @import "%fb2k_component_path%helpers.txt"
// @import "%fb2k_component_path%samples\js\common.js"
// @import "%fb2k_component_path%samples\js\volume.js"
// ==/PREPROCESSOR==

// @created: 2024-04-03
// @updated: 2024-04-07

var colours = {
	// 声音指示背景
	slider_background: RGB(114, 117, 126),
	// 当前声音指示 使用全局选中的背景色
	slider_contrast: window.GetColourCUI(4),
	// 背景颜色 使用 全局系统设置背景色
	bgColour: window.GetColourCUI(3),
};

// svg路径
var svgFolderPath =
	fb.FoobarPath + "profile\\MSBlue-Custom\\foo_jscript_panel3_custom\\svg";

// icon默认宽高：volumeDefaultImg.Width = volumeDefaultImg.Height = 30
var volumeDefaultImg = utils.LoadSVG(svgFolderPath + "\\volume30x30.svg");
var volumeMuteImg = utils.LoadSVG(svgFolderPath + "\\volumeMute30x30.svg");

// icon上下居中 目标Y值：窗口高度 / 2 - 图片 / 2
var imgDstY = window.Height / 2 - volumeDefaultImg.Height / 2;

// function _volume(x, y, w, h) 参数说明 x：x坐标 y：y坐标 w：宽 h：高
var volume = new _volume(0, 0, 0, 0);
// 初始化声音条位置、尺寸 
volume.x = volumeDefaultImg.Width + _scale(6);
volume.h = _scale(20);
volume.y = window.Height / 2 - volume.h / 2;
volume.w = window.Width - volumeDefaultImg.Width - _scale(15);

// 显示的声音条填充颜色的矩形 h 高度
var displayVolumeH = _scale(3);
// 显示的声音条填充颜色的矩形 y 坐标， y坐标计算后整体是居中位置
var displayVolumeDstY = window.Height / 2 - displayVolumeH / 2;

function on_mouse_lbtn_up(x, y) {
	// 点击坐标
	// console.log("点击的 X y 坐标：");
	// console.log(x, y);
	// 图标尺寸是30，这里x是点击坐标，区分声音icon和音量条点击   
	if (x < volume.x) {
		// 静音和非静音状态切换
		fb.volumeMute();
	} else if (x >= volume.x) {
		volume.lbtn_up(x, y);
	}
}

function on_mouse_lbtn_down(x, y) {
	volume.lbtn_down(x, y);
}

function on_mouse_move(x, y) {
	volume.move(x, y);
}

function on_mouse_wheel(s) {
	volume.wheel(s);
}

function on_paint(gr) {
	// 填充一个矩形背景色
	gr.FillRectangle(0, 0, window.Width, window.Height, colours.bgColour);
	// 根据声音大小是否显示声音icon
	if (fb.Volume !== -100) {
		gr.DrawImage(
			volumeDefaultImg,
			_scale(4),
			imgDstY,
			volumeDefaultImg.Width,
			volumeDefaultImg.Height,
			0,
			0,
			volumeDefaultImg.Width,
			volumeDefaultImg.Height
		);
	} else {
		// console.log("显示静音icon");
		gr.DrawImage(
			volumeMuteImg,
			_scale(4),
			imgDstY,
			volumeMuteImg.Width,
			volumeMuteImg.Height,
			0,
			0,
			volumeMuteImg.Width,
			volumeMuteImg.Height
		);
	}
	// console.log("paint调用");
	// console.log(window.Width, window.Height);
	// console.log(volumeDefaultImg.Width, volumeMuteImg.Width);
	// console.log(volume.w, volume.h, volume.x, volume.y);
	// 绘制声音进度条
	gr.FillRoundedRectangle(
		volume.x,
		displayVolumeDstY,
		volume.w,
		displayVolumeH,
		5,
		5,
		colours.slider_background
	);
	gr.FillRoundedRectangle(
		volume.x,
		displayVolumeDstY,
		volume.pos(),
		displayVolumeH,
		5,
		5,
		colours.slider_contrast
	);
}

function on_size() {
	// 窗口尺寸变化重新计算位置和尺寸
	imgDstY = window.Height / 2 - volumeDefaultImg.Height / 2;
	displayVolumeDstY = window.Height / 2 - displayVolumeH / 2;
	volume.y = window.Height / 2 - volume.h / 2;
	volume.w = window.Width - volumeDefaultImg.Width - _scale(15);
}

function on_volume_change() {
	// console.log("声音出现变化");
	volume.volume_change();
	window.Repaint();
}