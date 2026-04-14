/**
 * @file rating.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2025-12-16
 * @version 1.0.0
 * @description 一个基于SMP的评分控件，基于作者的示例代码改造
 */

"use strict";

window.DefineScript("Rating", {
  author: "XYSRe",
  version: "v1.0.0",
  options: { grab_focus: false },
});

// Lodash 是一个流行的 JavaScript 工具库，提供了许多高效的函数（如数组操作、对象操作、函数节流/防抖等），用于简化编程。它是高度优化的。
include(fb.ComponentPath + "samples\\complete\\js\\lodash.min.js");

// 不使用作者完整的内容，改为下方自行精简移植的
// include(fb.ComponentPath + "samples\\complete\\js\\helpers.js");
// include(fb.ComponentPath + "samples\\complete\\js\\panel.js");
// include(
//   fb.ProfilePath +
//     "\\user-theme-fb2k-medium-slate-blue\\foo_spider_monkey_panel_script\\_helpers.js"
// );
// include(
//   fb.ProfilePath +
//     "\\user-theme-fb2k-medium-slate-blue\\foo_spider_monkey_panel_script\\_panel.js"
// );


// 下方内容来自 samples\\complete\\js\\panel.js 
function _panel(custom_background = false) {
	this.item_focus_change = () => {
		if (this.metadb_func) {
			if (this.selection.value == 0) {
				this.metadb = fb.IsPlaying ? fb.GetNowPlaying() : fb.GetFocusItem();
			} else {
				this.metadb = fb.GetFocusItem();
			}
			on_metadb_changed();
			if (!this.metadb) {
				_tt('');
			}
		}
	}

	this.colours_changed = () => {
		if (window.InstanceType) {
			this.colours.background = window.GetColourDUI(1);
			this.colours.text = window.GetColourDUI(0);
			this.colours.highlight = window.GetColourDUI(2);
		} else {
			this.colours.background = window.GetColourCUI(3);
			this.colours.text = window.GetColourCUI(0);
			this.colours.highlight = _blendColours(this.colours.text, this.colours.background, 0.4);
		}
		this.colours.header = this.colours.highlight & 0x45FFFFFF;
	}

	this.font_changed = () => {
		let name;
		let font = window.InstanceType ? window.GetFontDUI(0) : window.GetFontCUI(0);
		if (font) {
			name = font.Name;
		} else {
			name = 'Segoe UI';
			console.log(N, 'Unable to use default font. Using', name, 'instead.');
		}
		this.fonts.title = _gdiFont(name, 12, 1);
		this.fonts.normal = _gdiFont(name, this.fonts.size.value);
		this.fonts.fixed = _gdiFont('Lucida Console', this.fonts.size.value);
		this.row_height = this.fonts.normal.Height;
		_.invokeMap(this.list_objects, 'size');
		_.invokeMap(this.list_objects, 'update');
		_.invokeMap(this.text_objects, 'size');
	}

	this.size = () => {
		this.w = window.Width;
		this.h = window.Height;
	}

	this.paint = (gr) => {
		let col;
		switch (true) {
		case window.IsTransparent:
			return;
		case !this.custom_background:
		case this.colours.mode.value == 0:
			col = this.colours.background;
			break;
		case this.colours.mode.value == 1:
			col = utils.GetSysColour(15);
			break;
		case this.colours.mode.value == 2:
			col = this.colours.custom_background.value;
			break;
		}
		gr.FillSolidRect(0, 0, this.w, this.h, col);
	}

	this.rbtn_up = (x, y, object) => {
		this.m = window.CreatePopupMenu();
		this.s1 = window.CreatePopupMenu();
		this.s2 = window.CreatePopupMenu();
		this.s3 = window.CreatePopupMenu();
		this.s10 = window.CreatePopupMenu();
		this.s11 = window.CreatePopupMenu();
		this.s12 = window.CreatePopupMenu();
		this.s13 = window.CreatePopupMenu();
		// panel 1-999
		// object 1000+
		if (object) {
			object.rbtn_up(x, y);
		}
		if (this.list_objects.length || this.text_objects.length) {
			_.forEach(this.fonts.sizes, (item) => {
				this.s1.AppendMenuItem(MF_STRING, item, item);
			});
			this.s1.CheckMenuRadioItem(_.first(this.fonts.sizes), _.last(this.fonts.sizes), this.fonts.size.value);
			this.s1.AppendTo(this.m, MF_STRING, 'Font size');
			this.m.AppendMenuSeparator();
		}
		if (this.custom_background) {
			this.s2.AppendMenuItem(MF_STRING, 100, window.InstanceType ? 'Use default UI setting' : 'Use columns UI setting');
			this.s2.AppendMenuItem(MF_STRING, 101, 'Splitter');
			this.s2.AppendMenuItem(MF_STRING, 102, 'Custom');
			this.s2.CheckMenuRadioItem(100, 102, this.colours.mode.value + 100);
			this.s2.AppendMenuSeparator();
			this.s2.AppendMenuItem(this.colours.mode.value == 2 ? MF_STRING : MF_GRAYED, 103, 'Set custom colour...');
			this.s2.AppendTo(this.m, window.IsTransparent ? MF_GRAYED : MF_STRING, 'Background');
			this.m.AppendMenuSeparator();
		}
		if (this.metadb_func) {
			this.s3.AppendMenuItem(MF_STRING, 110, 'Prefer now playing');
			this.s3.AppendMenuItem(MF_STRING, 111, 'Follow selected track (playlist)');
			this.s3.CheckMenuRadioItem(110, 111, this.selection.value + 110);
			this.s3.AppendTo(this.m, MF_STRING, 'Selection mode');
			this.m.AppendMenuSeparator();
		}
		this.m.AppendMenuItem(MF_STRING, 120, 'Configure...');
		const idx = this.m.TrackPopupMenu(x, y);
		switch (true) {
		case idx == 0:
			break;
		case idx <= 20:
			this.fonts.size.value = idx;
			this.font_changed();
			window.Repaint();
			break;
		case idx == 100:
		case idx == 101:
		case idx == 102:
			this.colours.mode.value = idx - 100;
			window.Repaint();
			break;
		case idx == 103:
			this.colours.custom_background.value = utils.ColourPicker(window.ID, this.colours.custom_background.value);
			window.Repaint();
			break;
		case idx == 110:
		case idx == 111:
			this.selection.value = idx - 110;
			this.item_focus_change();
			break;
		case idx == 120:
			window.ShowConfigureV2();
			break;
		case idx > 999:
			if (object) {
				object.rbtn_up_done(idx);
			}
			break;
		}
		return true;
	}

	this.tf = (t) => {
		if (!this.metadb) {
			return '';
		}
		if (!this.tfo[t]) {
			this.tfo[t] = fb.TitleFormat(t);
		}
		const path = this.tfo['$if2(%__@%,%path%)'].EvalWithMetadb(this.metadb);
		if (fb.IsPlaying && (path.startsWith('http') || path.startsWith('mms'))) {
			return this.tfo[t].Eval();
		} else {
			return this.tfo[t].EvalWithMetadb(this.metadb);
		}
	}

	window.DlgCode = DLGC_WANTALLKEYS;
	this.fonts = {};
	this.colours = {};
	this.w = 0;
	this.h = 0;
	this.metadb = fb.GetFocusItem();
	this.metadb_func = typeof on_metadb_changed == 'function';
	this.fonts.sizes = [10, 12, 14, 16];
	this.fonts.size = new _p('2K3.PANEL.FONTS.SIZE', 12);
	if (this.metadb_func) {
		this.selection = new _p('2K3.PANEL.SELECTION', 0);
	}
	if (custom_background) {
		this.custom_background = true;
		this.colours.mode = new _p('2K3.PANEL.COLOURS.MODE', 0);
		this.colours.custom_background = new _p('2K3.PANEL.COLOURS.CUSTOM.BACKGROUND', _RGB(0, 0, 0));
	} else {
		this.custom_background = false;
	}
	this.list_objects = [];
	this.text_objects = [];
	this.tfo = {
		'$if2(%__@%,%path%)' : fb.TitleFormat('$if2(%__@%,%path%)')
	};
	this.font_changed();
	this.colours_changed();
}


// 下方内容来自 samples\\complete\\js\\helpers.js
const MF_STRING = 0x00000000;
const MF_GRAYED = 0x00000001;
const DLGC_WANTALLKEYS = 0x0004;
const SF_CENTRE = 285212672;

const DPI = window.DPI;

let tooltip = window.CreateTooltip("Segoe UI", _scale(12));
tooltip.SetMaxWidth(1200);

let fontawesome = gdi.Font("FontAwesome", 48);
let chars = {
  up: "\uF077",
  down: "\uF078",
  close: "\uF00D",
  rating_on: "\uF005",
  rating_off: "\uF006",
  heart_on: "\uF004",
  heart_off: "\uF08A",
  prev: "\uF049",
  next: "\uF050",
  play: "\uF04B",
  pause: "\uF04C",
  stop: "\uF04D",
  preferences: "\uF013",
  search: "\uF002",
  console: "\uF120",
  info: "\uF05A",
  audioscrobbler: "\uF202",
  minus: "\uF068",
  music: "\uF001",
  menu: "\uF0C9",
};

let image = {
  crop: 0,
  crop_top: 1,
  stretch: 2,
  centre: 3,
};

function _button(x, y, w, h, img_src, fn, tiptext) {
  this.paint = (gr) => {
    if (this.img) {
      _drawImage(gr, this.img, this.x, this.y, this.w, this.h);
    }
  };

  this.trace = (x, y) => {
    return (
      x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h
    );
  };

  this.lbtn_up = (x, y, mask) => {
    if (this.fn) {
      this.fn(x, y, mask);
    }
  };

  this.cs = (s) => {
    if (s == "hover") {
      this.img = this.img_hover;
      _tt(this.tiptext);
    } else {
      this.img = this.img_normal;
    }
    window.RepaintRect(this.x, this.y, this.w, this.h);
  };

  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
  this.fn = fn;
  this.tiptext = tiptext;
  this.img_normal =
    typeof img_src.normal == "string" ? _img(img_src.normal) : img_src.normal;
  this.img_hover = img_src.hover
    ? typeof img_src.hover == "string"
      ? _img(img_src.hover)
      : img_src.hover
    : this.img_normal;
  this.img = this.img_normal;
}

function _buttons() {
  this.paint = (gr) => {
    _.invokeMap(this.buttons, "paint", gr);
  };

  this.move = (x, y) => {
    let temp_btn = null;
    _.forEach(this.buttons, (item, i) => {
      if (item.trace(x, y)) {
        temp_btn = i;
      }
    });
    if (this.btn == temp_btn) {
      return this.btn;
    }
    if (this.btn) {
      this.buttons[this.btn].cs("normal");
    }
    if (temp_btn) {
      this.buttons[temp_btn].cs("hover");
    } else {
      _tt("");
    }
    this.btn = temp_btn;
    return this.btn;
  };

  this.leave = () => {
    if (this.btn) {
      _tt("");
      this.buttons[this.btn].cs("normal");
    }
    this.btn = null;
  };

  this.lbtn_up = (x, y, mask) => {
    if (this.btn) {
      this.buttons[this.btn].lbtn_up(x, y, mask);
      return true;
    } else {
      return false;
    }
  };

  this.buttons = {};
  this.btn = null;
}

function _tt(value) {
  if (tooltip.Text != value) {
    tooltip.Text = value;
    tooltip.Activate();
  }
}

function _cc(name) {
  return utils.CheckComponent(name, true);
}

function _p(a, b) {
  Object.defineProperty(this, _.isBoolean(b) ? "enabled" : "value", {
    get() {
      return this.b;
    },
    set(value) {
      this.b = value;
      window.SetProperty(this.a, this.b);
    },
  });

  this.toggle = () => {
    this.b = !this.b;
    window.SetProperty(this.a, this.b);
  };

  this.a = a;
  this.b = window.GetProperty(a, b);
}

function _blendColours(c1, c2, f) {
  c1 = _toRGB(c1);
  c2 = _toRGB(c2);
  const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
  const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
  const b = Math.round(c1[2] + f * (c2[2] - c1[2]));
  return _RGB(r, g, b);
}

function _drawImage(
  gr,
  img,
  src_x,
  src_y,
  src_w,
  src_h,
  aspect,
  border,
  alpha
) {
  if (!img) {
    return [];
  }
  gr.SetInterpolationMode(7);
  let dst_x, dst_y, dst_w, dst_h;
  switch (aspect) {
    case image.crop:
    case image.crop_top:
      if (img.Width / img.Height < src_w / src_h) {
        dst_w = img.Width;
        dst_h = Math.round((src_h * img.Width) / src_w);
        dst_x = 0;
        dst_y = Math.round(
          (img.Height - dst_h) / (aspect == image.crop_top ? 4 : 2)
        );
      } else {
        dst_w = Math.round((src_w * img.Height) / src_h);
        dst_h = img.Height;
        dst_x = Math.round((img.Width - dst_w) / 2);
        dst_y = 0;
      }
      gr.DrawImage(
        img,
        src_x,
        src_y,
        src_w,
        src_h,
        dst_x + 3,
        dst_y + 3,
        dst_w - 6,
        dst_h - 6,
        0,
        alpha || 255
      );
      break;
    case image.stretch:
      gr.DrawImage(
        img,
        src_x,
        src_y,
        src_w,
        src_h,
        0,
        0,
        img.Width,
        img.Height,
        0,
        alpha || 255
      );
      break;
    case image.centre:
    default:
      const s = Math.min(src_w / img.Width, src_h / img.Height);
      const w = Math.floor(img.Width * s);
      const h = Math.floor(img.Height * s);
      src_x += Math.round((src_w - w) / 2);
      src_y += Math.round((src_h - h) / 2);
      src_w = w;
      src_h = h;
      dst_x = 0;
      dst_y = 0;
      dst_w = img.Width;
      dst_h = img.Height;
      gr.DrawImage(
        img,
        src_x,
        src_y,
        src_w,
        src_h,
        dst_x,
        dst_y,
        dst_w,
        dst_h,
        0,
        alpha || 255
      );
      break;
  }
  if (border) {
    gr.DrawRect(src_x, src_y, src_w - 1, src_h - 1, 1, border);
  }
  return [src_x, src_y, src_w, src_h];
}

function _img(value) {
  if (_isFile(value)) {
    return gdi.Image(value);
  } else {
    return gdi.Image(folders.images + value);
  }
}

function _menu(x, y, flags) {
  let menu = window.CreatePopupMenu();
  let file = new _main_menu_helper("File", 1000, menu);
  let edit = new _main_menu_helper("Edit", 2000, menu);
  let view = new _main_menu_helper("View", 3000, menu);
  let playback = new _main_menu_helper("Playback", 4000, menu);
  let library = new _main_menu_helper("Library", 5000, menu);
  let help = new _main_menu_helper("Help", 6000, menu);

  let idx = menu.TrackPopupMenu(x, y, flags);
  switch (true) {
    case idx == 0:
      break;
    case idx < 2000:
      file.mm.ExecuteByID(idx - 1000);
      break;
    case idx < 3000:
      edit.mm.ExecuteByID(idx - 2000);
      break;
    case idx < 4000:
      view.mm.ExecuteByID(idx - 3000);
      break;
    case idx < 5000:
      playback.mm.ExecuteByID(idx - 4000);
      break;
    case idx < 6000:
      library.mm.ExecuteByID(idx - 5000);
      break;
    case idx < 7000:
      help.mm.ExecuteByID(idx - 6000);
      break;
  }
}

function _main_menu_helper(name, base_id, main_menu) {
  this.popup = window.CreatePopupMenu();
  this.mm = fb.CreateMainMenuManager();
  this.mm.Init(name);
  this.mm.BuildMenu(this.popup, base_id, -1);
  this.popup.AppendTo(main_menu, MF_STRING, name);
}

function _RGB(r, g, b) {
  return 0xff000000 | (r << 16) | (g << 8) | b;
}

function _toRGB(a) {
  const b = a - 0xff000000;
  return [b >> 16, (b >> 8) & 0xff, b & 0xff];
}

function _scale(size) {
  return Math.round((size * DPI) / 72);
}

function _gdiFont(name, size, style) {
  return gdi.Font(name, _scale(size), style);
}



/*
Now supports 3 modes:
1) foo_playcount, limited to 5 stars, access via %rating%
2) file tags, configurable max limit, access via custom tag. Use right click menu to set.
3) Spider Monkey Panel 'Playback stats' database, configurable max limit, access via %smp_rating%. Bound to '%artist% - %title%' so common tracks across different albums will share the rating.
*/

const panel = new _panel(true);
const rating = new _rating(0, 0, 18, _RGB(254, 121, 85)); // x, y, size, colour

panel.item_focus_change();

function on_size() {
  panel.size();
  rating.x = Math.round((window.Width - rating.w) / 2);
  rating.y = Math.round((window.Height - rating.h) / 2) - _scale(3);
}
function on_paint(gr) {
  panel.paint(gr);
  rating.paint(gr);
}

function on_metadb_changed() {
  rating.metadb_changed();
}

function on_mouse_move(x, y) {
  rating.move(x, y);
}
function on_mouse_leave() {
  rating.leave();
}

function on_mouse_lbtn_up(x, y) {
  rating.lbtn_up(x, y);
}

function on_mouse_rbtn_up(x, y) {
  return panel.rbtn_up(x, y, rating);
}

function on_colours_changed() {
  panel.colours_changed();
  window.Repaint();
}

function on_item_focus_change() {
  panel.item_focus_change();
}

function on_playback_dynamic_info_track() {
  panel.item_focus_change();
}

function on_playback_new_track() {
  panel.item_focus_change();
}

function on_playback_stop(reason) {
  if (reason != 2) {
    panel.item_focus_change();
  }
}

function on_playlist_switch() {
  panel.item_focus_change();
}

// @2025-12-12：鼠标左键双击显示当前播放歌曲所在列表位置。
function on_mouse_lbtn_dblclk(x, y) {
  // 排除星星位置
  if (!rating.trace(x, y)) {
    fb.RunMainMenuCommand("View/Show now playing in playlist");
  }
}

// 下方内容来自作者的 samples\\complete\\js\\rating.js
function _rating(x, y, size, colour) {
  this.paint = (gr) => {
    if (panel.metadb) {
      gr.SetTextRenderingHint(4);
      for (let i = 0; i < this.get_max(); i++) {
        gr.DrawString(
          i + 1 > (this.hover ? this.hrating : this.rating)
            ? chars.rating_off
            : chars.rating_on,
          this.font,
          this.colour,
          this.x + i * this.h,
          this.y,
          this.h,
          this.h,
          SF_CENTRE
        );
      }
    }
  };

  this.metadb_changed = () => {
    if (panel.metadb) {
      this.hover = false;
      this.rating = this.get_rating();
      this.hrating = this.rating;
      this.tiptext =
        this.properties.mode.value == 0
          ? "Choose a mode first."
          : panel.tf('Rate "%title%" by "%artist%".');
    }
    window.Repaint();
  };

  this.trace = (x, y) => {
    return (
      x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h
    );
  };

  this.move = (x, y) => {
    if (this.trace(x, y)) {
      if (panel.metadb) {
        _tt(this.tiptext);
        this.hover = true;
        this.hrating = Math.ceil((x - this.x) / this.h);
        window.RepaintRect(this.x, this.y, this.w, this.h);
      }
      return true;
    } else {
      this.leave();
      return false;
    }
  };

  this.leave = () => {
    if (this.hover) {
      _tt("");
      this.hover = false;
      window.RepaintRect(this.x, this.y, this.w, this.h);
    }
  };

  this.lbtn_up = (x, y) => {
    if (this.trace(x, y)) {
      if (panel.metadb) {
        this.set_rating();
      }
      return true;
    } else {
      return false;
    }
  };

  this.rbtn_up = (x, y) => {
    _.forEach(this.modes, (item, i) => {
      panel.s10.AppendMenuItem(
        i == 1 && !this.foo_playcount ? MF_GRAYED : MF_STRING,
        i + 1000,
        item
      );
    });
    panel.s10.CheckMenuRadioItem(1000, 1003, this.properties.mode.value + 1000);
    panel.s10.AppendTo(panel.m, MF_STRING, "Mode");
    panel.m.AppendMenuItem(
      this.properties.mode.value == 2 ? MF_STRING : MF_GRAYED,
      1004,
      "Tag name"
    );
    panel.m.AppendMenuItem(
      this.properties.mode.value > 1 ? MF_STRING : MF_GRAYED,
      1005,
      "Max value..."
    );
    panel.m.AppendMenuSeparator();
  };

  this.rbtn_up_done = (idx) => {
    let tmp;
    switch (true) {
      case idx <= 1003:
        this.properties.mode.value = idx - 1000;
        break;
      case idx == 1004:
        tmp = utils.InputBox(
          window.ID,
          'Enter a custom tag name. Do not use %%. Defaults to "rating" if left blank.',
          window.ScriptInfo.Name,
          this.properties.tag.value
        );
        this.properties.tag.value = tmp || this.properties.tag.default_;
        break;
      case idx == 1005:
        tmp = utils.InputBox(
          window.ID,
          'Enter a maximum value. Defaults to "5" if left blank.',
          window.ScriptInfo.Name,
          this.properties.max.value
        );
        this.properties.max.value = tmp || this.properties.max.default_;
        break;
    }
    this.w = this.h * this.get_max();
    panel.item_focus_change();
  };

  this.get_rating = () => {
    switch (this.properties.mode.value) {
      case 1: // foo_playcount
        return panel.tf("$if2(%rating%,0)");
      case 2: // file tag
        let f = panel.metadb.GetFileInfo();
        const idx = f.MetaFind(this.properties.tag.value);
        const ret = idx > -1 ? f.MetaValue(idx, 0) : 0;
        return ret;
      case 3: // Spider Monkey Panel DB
        return panel.tf("$if2(%smp_rating%,0)");
      default:
        return 0;
    }
  };

  this.set_rating = () => {
    switch (this.properties.mode.value) {
      case 1: // foo_playcount
        fb.RunContextCommandWithMetadb(
          "Playback Statistics/Rating/" +
            (this.hrating == this.rating ? "<not set>" : this.hrating),
          panel.metadb,
          8
        );
        break;
      case 2: // file tag
        const tmp = this.hrating == this.rating ? "" : this.hrating;
        let obj = {};
        obj[this.properties.tag.value] = tmp;
        let handles = new FbMetadbHandleList(panel.metadb);
        handles.UpdateFileInfoFromJSON(JSON.stringify(obj));
        break;
      case 3: // Spider Monkey Panel DB
        panel.metadb.SetRating(this.hrating == this.rating ? 0 : this.hrating);
        panel.metadb.RefreshStats();
        break;
    }
  };

  this.get_max = () => {
    return this.properties.mode.value < 2 ? 5 : this.properties.max.value;
  };

  this.properties = {
    mode: new _p("2K3.RATING.MODE", 0), // 0 not set 1 foo_playcount 2 file tag 3 Spider Monkey Panel DB
    max: new _p("2K3.RATING.MAX", 5), // only use for file tag/Spider Monkey Panel DB
    tag: new _p("2K3.RATING.TAG", "rating"),
  };
  this.x = x;
  this.y = y;
  this.h = _scale(size);
  this.w = this.h * this.get_max();
  this.colour = colour;
  this.hover = false;
  this.rating = 0;
  this.hrating = 0;
  this.font = gdi.Font("FontAwesome", this.h - 2);
  this.modes = [
    "Not Set",
    "foo_playcount",
    "File Tag",
    "Spider Monkey Panel DB",
  ];
  this.foo_playcount = _cc("foo_playcount");
  window.SetTimeout(() => {
    if (this.properties.mode.value == 1 && !this.foo_playcount) {
      // if mode is set to 1 (foo_playcount) but component is missing, reset to 0.
      this.properties.mode.value = 0;
    }
    if (this.properties.mode.value == 0) {
      fb.ShowPopupMessage(
        'This script has now been updated and supports 3 different modes.\n\nAs before, you can use foo_playcount which is limited to 5 stars.\n\nThe 2nd option is writing to your file tags. You can choose the tag name and a max value via the right click menu.\n\nLastly, a new "Playback Stats" database has been built into Spider Monkey Panel. It is bound to just "%artist% - %title%". This uses %smp_rating% which can be accessed via title formatting in all other components/search dialogs. This also supports a custom max value.\n\nAll options are available on the right click menu. If you do not see the new options when right clicking, make sure you have the latest "rating.txt" imported from the "samples\\complete" folder.',
        window.ScriptInfo.Name
      );
    }
  }, 500);
}


