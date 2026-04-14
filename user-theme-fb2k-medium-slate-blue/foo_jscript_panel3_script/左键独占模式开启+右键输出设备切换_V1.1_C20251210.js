// ==PREPROCESSOR==
// @import "%fb2k_component_path%helpers.txt"
// ==/PREPROCESSOR==
// @name "左键独占模式开启+右键输出设备切换"
// @author "Jin"
// @version "1.0.2"
// @created: 2024-12-07
// @updated: 2024-12-29


var colours = {
	// 声音指示背景
	slider_background: RGB(133, 136, 145),
	// 当前声音指示 使用全局选中的背景色
	// slider_contrast: window.GetColourCUI(4),
	slider_contrast: RGB(147, 115, 242),
	// 背景颜色 使用 全局系统设置背景色
	//bgColour: window.GetColourCUI(5),
	bgColour: RGB(23, 23, 23),
};

// svg路径
var svgFolderPath =
	fb.FoobarPath + "profile\\MSBlue-Custom\\foo_jscript_panel3_custom\\svg";
// icon默认宽高：ouputDeviceExclusiveONImg.Width = ouputDeviceExclusiveONImg.Height = 30
var ouputDeviceExclusiveONImg = utils.LoadSVG(svgFolderPath + "\\ouputDeviceExclusiveON.30x30.svg");
var ouputDeviceExclusiveOFFImg = utils.LoadSVG(svgFolderPath + "\\ouputDeviceExclusiveOFF.30x30.svg");

// 显示的图片
var displayImg = ouputDeviceExclusiveOFFImg;

// 独占设备 非独占设备 对应的输出通道 命令, 修改命令对应的设备名字即可修改开启和关闭对应的设备
var ouputDeviceExclusiveONCommand = "Playback/Device/Default : Primary Sound Driver [exclusive]";
var ouputDeviceExclusiveOFFCommand = "Playback/Device/WASAPI (shared) : Default Sound Device";

// 是否是独占模式 后面执行 changeOuputDeviceExclusiveInfo() 初始化、修改状态
var ouputDeviceExclusiveStatus = false;

// icon上下居中 目标Y值：窗口高度 / 2 - 图片 / 2
var imgDstX = window.Width / 2 - ouputDeviceExclusiveONImg.Width / 2;
var imgDstY = window.Height / 2 - ouputDeviceExclusiveONImg.Height / 2;
// 点击响应区域是图片的位置
var clickAreaX2 = imgDstX + ouputDeviceExclusiveONImg.Width;
var clickAreaY2 = imgDstY + ouputDeviceExclusiveONImg.Height;


function on_paint(gr) {
	// 填充一个矩形背景色
	gr.FillRectangle(0, 0, window.Width, window.Height, colours.bgColour);
	// 显示图片  _scale(4)
	gr.DrawImage(
		displayImg,
		imgDstX,
		imgDstY,
		ouputDeviceExclusiveONImg.Width,
		ouputDeviceExclusiveONImg.Height,
		0,
		0,
		ouputDeviceExclusiveONImg.Width,
		ouputDeviceExclusiveONImg.Height
	);
};


function on_size() {
	// 窗口尺寸变化重新计算位置和尺寸
	imgDstX = window.Width / 2 - ouputDeviceExclusiveONImg.Width / 2;
	imgDstY = window.Height / 2 - ouputDeviceExclusiveONImg.Height / 2;
	clickAreaX2 = imgDstX + ouputDeviceExclusiveONImg.Width;
	clickAreaY2 = imgDstY + ouputDeviceExclusiveONImg.Height;
};


// 左键点击切换 独占 非独占 模式
function on_mouse_lbtn_up(x, y) {
	if (x > imgDstX && x < clickAreaX2 && y > imgDstY && y < clickAreaY2) {
		if (ouputDeviceExclusiveStatus){
			fb.RunMainMenuCommand(ouputDeviceExclusiveOFFCommand);
		}else{
			fb.RunMainMenuCommand(ouputDeviceExclusiveONCommand);
		};
		//console.log(get_output_device_name());
	};
};


// 右键点击显示输出设备切换菜单
function on_mouse_rbtn_up(x, y) {
	if (x > imgDstX && x < clickAreaX2 && y > imgDstY && y < clickAreaY2) {
		menu(x, y);
	}
}

// 右键点击显示输出设备切换菜单
function menu(x, y) {
	var menu = window.CreatePopupMenu();
	var str = fb.GetOutputDevices();
	var arr = JSON.parse(str);
	var active = -1;
	for (var i = 0; i < arr.length; i++) {
		menu.AppendMenuItem(MF_STRING, i + 1, arr[i].name);
		if (arr[i].active) active = i;
	}
	// 标记当前选择的设备
	if (active > -1) menu.CheckMenuRadioItem(1, arr.length + 1, active + 1);

	var idx = menu.TrackPopupMenu(x, y);
	
	if (idx > 0) fb.RunMainMenuCommand('Playback/Device/' + arr[idx - 1].name);
	menu.Dispose();
};

/*
=====================
鼠标hover的时候显独占状tip
=====================
*/

// 独占状态显示的tooltip
// var g_tooltip = window.CreateTooltip();
// var g_oldX, g_oldY;
// 输出设备信息
var deviceArr;


// 获取当前选择的播放设备名字
function get_output_device_name(){
	var activity_device_name = "Not Found";
	deviceArr = JSON.parse(fb.GetOutputDevices());
	for (var i = 0; i < deviceArr.length; i++) {
		if (deviceArr[i].active) {
			activity_device_name = deviceArr[i].name;
			break;
		};
	};
	console.log(activity_device_name);
	return activity_device_name;
};


// 鼠标移动hover的时候显示当前独占状态tip 202401229文案显示有bug,鼠标快速移动的时候文案有概率不消失，暂时取消文案显示
/*
function on_mouse_move(x, y) {
	if (x > imgDstX && x < clickAreaX2 && y > imgDstY && y < clickAreaY2) {
		// 显示tip
		g_tooltip.Activate();
		g_tooltip.TrackActivate = true;
	}else {
		// 隐藏tip
		g_tooltip.Deactivate();
		g_tooltip.TrackActivate = false;	
	};
	// Make sure the position is changed
	if (g_oldX != x || g_oldY != y) {
		// add offsets here
		g_tooltip.TrackPosition(x + 30, y + 30);
		g_oldX = x;
		g_oldY = y;
	};
	
};
*/

// 修改输出设备状态信息
function changeOuputDeviceExclusiveInfo(){
	// 根据设备名字是否包含 exclusive 判断独占模式
	if (get_output_device_name().indexOf("[exclusive]") >= 0){
		ouputDeviceExclusiveStatus = true;
		displayImg = ouputDeviceExclusiveONImg;
		// g_tooltip.Text = "独占开启";
	}else{
		ouputDeviceExclusiveStatus = false;
		displayImg = ouputDeviceExclusiveOFFImg;
		// g_tooltip.Text = "独占关闭";
	};
};


// 播放设备切换的时候修改显示 独占状态 文本
function on_output_device_changed(){
	changeOuputDeviceExclusiveInfo();
	window.Repaint();
};

// 初始化状态
changeOuputDeviceExclusiveInfo();
