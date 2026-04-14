// ==PREPROCESSOR==
// @name "黑胶专辑图显示"
// @author "Jin"
// @import "%fb2k_component_path%helpers.txt"
// ==/PREPROCESSOR==
// Created: 2023-08-01


var bgColor = window.GetColourCUI(3);
var DefaultAlbumArtImg = utils.LoadImage(fb.ComponentPath + 'samples\\images\\Cover.png');
var AlbumArtImg = null;
var DefaultAlbumArtImgW = window.Height * 1.491616364;



function on_paint(gr){
	gr.FillRectangle(0, 0, window.Width, window.Height, bgColor);
	// 默认的图片长宽比是 1.491616364 通过长宽比计算后避免图片被压缩！
	DefaultAlbumArtImg.Resize(DefaultAlbumArtImgW, window.Height);
	gr.DrawImage(DefaultAlbumArtImg, 0, 0, DefaultAlbumArtImg.Width, DefaultAlbumArtImg.Height, 0, 0, DefaultAlbumArtImg.Width, DefaultAlbumArtImg.Height, 1, 0);
	if (AlbumArtImg){
		AlbumArtImg.Resize(window.Height-2, window.Height-2);
		console.log("AlbumArtImg!!!!!");
		gr.DrawImage(AlbumArtImg, 2, 2, AlbumArtImg.Width, AlbumArtImg.Height, 2, 2, AlbumArtImg.Width, AlbumArtImg.Height, 1, 0);
		}
	}


function on_playback_new_track(handle){
	// 播放歌曲的时候的时候获取封面对象
	// handle 
	// 有封面的时： 是一个 IJSimage 对象 https://jscript-panel.github.io/docs/interfaces/IJSImage
	// 没有图片时： null
	if (handle) {
		console.log("获取封面成功！");
		//GetAlbumArt可以传入不同参数获取不同封面图片 https://jscript-panel.github.io/docs/flags/#albumartid
		AlbumArtImg = handle.GetAlbumArt();
		window.Repaint();
		}
	}


function on_size(){
	//DefaultAlbumArtImg.Resize(window.Height * 1.491616364, window.Height);
	// AlbumArtImg.Resize(window.Height-2, window.Height-2);
	// window.Repaint();
	DefaultAlbumArtImgW = window.Height * 1.491616364;
	}