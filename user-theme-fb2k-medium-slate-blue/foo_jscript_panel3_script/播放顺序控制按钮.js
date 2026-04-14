// ==PREPROCESSOR==
// @name "播放顺序控制"
// @author "Jin"
// @version 1.0.1
// @import "%fb2k_component_path%helpers.txt"
// ==/PREPROCESSOR==

// Created: 20230728
// Updated: 20240406

// 获取当前主题背景色
var bgColour = window.GetColourCUI(3);
// 定义默认播放状态相关信息 https://jscript-panel.github.io/docs/flags/#playbackorder
// svg路径  图片默认大小30x30
var svgFolderPath = fb.FoobarPath + 'profile\\MSBlue-Custom\\foo_jscript_panel3_custom\\svg';
var playBackOrderInfo = {
    0: {
        "chName": "顺序播放",
        "enName": "Default",
        "svgIconObj": utils.LoadSVG(svgFolderPath + '\\Default.svg')
    },
    1: {
        "chName": "列表重复",
        "enName": "Repeat_Playlist",
        "svgIconObj": utils.LoadSVG(svgFolderPath + '\\Repeat_Playlist.svg')
    },
    2: {
        "chName": "单曲循环",
        "enName": "Repeat_Track",
        "svgIconObj": utils.LoadSVG(svgFolderPath + '\\Repeat_Track.svg')
    },
    3: {
        "chName": "随机播放",
        "enName": "Random",
        "svgIconObj": utils.LoadSVG(svgFolderPath + '\\Random.svg')
    },
    4: {
        "chName": "随机播放(Shuffle)",
        "enName": "Shuffle_tracks",
        "svgIconObj": utils.LoadSVG(svgFolderPath + '\\Shuffle_tracks.svg')
    },
    5: {
        "chName": "专辑随机播放",
        "enName": "Shuffle_albums",
        "svgIconObj": utils.LoadSVG(svgFolderPath + '\\Shuffle_albums.svg')
    },
    6: {
        "chName": "文件夹随机播放",
        "enName": "Shuffle_folders",
        "svgIconObj": utils.LoadSVG(svgFolderPath + '\\Shuffle_folders.svg')
    },
};


// 计算Y轴中心坐标，窗口高度一半 减去 图片高度一半
var svgIconW = playBackOrderInfo[0]["svgIconObj"].Width;
var svgIconH = playBackOrderInfo[0]["svgIconObj"].Height;
var imgDstY = window.Height / 2 - svgIconH / 2;
// 获取当前播放状态
var playbackOrderStatus = plman.PlaybackOrder;

// 鼠标左键按下循环修改播放顺序
function on_mouse_lbtn_up(x, y) {
    // 点击图标区域外不做处理
    if (x > svgIconW || y > (imgDstY + svgIconH) || y < imgDstY) {
        return;
    }
    // 通过自增修改当前播放顺序值
    playbackOrderStatus++;
    if (playbackOrderStatus == 7) {
        playbackOrderStatus = 0;
    };
    // 设置播放顺序
    plman.PlaybackOrder = playbackOrderStatus;
}

// 鼠标右键按下的弹出菜单设置播放顺序
function on_mouse_rbtn_down(x, y) {
    // 点击图标区域外不做处理
    if (x > svgIconW || y > (imgDstY + svgIconH) || y < imgDstY) {
        return;
    }
    var menu = window.CreatePopupMenu();

    // start at 1, not 0
    menu.AppendMenuItem(MF_STRING, 1, '顺序播放');
    menu.AppendMenuItem(MF_STRING, 2, '列表循环');
    menu.AppendMenuItem(MF_STRING, 3, '单曲循环');
    menu.AppendMenuItem(MF_STRING, 4, '随机播放(Ramdom)');
    menu.AppendMenuItem(MF_STRING, 5, '随机播放(Shuffle)');
    menu.AppendMenuItem(MF_STRING, 6, '专辑随机播放(Shuffle)');
    menu.AppendMenuItem(MF_STRING, 7, '文件夹随机播放(Shuffle)');
    menu.AppendMenuItem(MF_STRING, 8, 'Configure');

    // 当前选中的使用无需符号标记
    menu.CheckMenuRadioItem(1, 8, plman.PlaybackOrder + 1);
    var idx = menu.TrackPopupMenu(x, y);
    // console.log(idx);
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
    menu.Dispose();
}

function on_paint(gr) {
    // 填充一个矩形背景色
    gr.FillRectangle(0, 0, window.Width, window.Height, bgColour);
    // 通过当前播放顺序获取对应的图像对象
    var svgIconObj = playBackOrderInfo[playbackOrderStatus]["svgIconObj"];
    gr.DrawImage(svgIconObj, 0, imgDstY, svgIconObj.Width, svgIconObj.Height, 0, 0, svgIconObj.Width, svgIconObj.Height);
}

function on_size() {
    imgDstY = window.Height / 2 - svgIconH / 2
}

function on_playback_order_changed(new_order_index) {
    // console.log(new_order_index);
    // 重新绘制图层，更改显示icon
    playbackOrderStatus = plman.PlaybackOrder;
    window.Repaint();
}

