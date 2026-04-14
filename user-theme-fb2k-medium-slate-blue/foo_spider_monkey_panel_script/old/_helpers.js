/**
 * @file helpers.js
 * @author XYSRe
 * @created 2025-12-15
 * @updated 2025-12-15
 * @version 1.0.0
 * @description 通用内容，从作者的 helpers.js 移植需要的函数，精简没有必要的内容。
 */

// 启用 JavaScript 的 严格模式（Strict Mode）
"use strict";

/* 
// Flags.js：https://github.com/TheQwertiest/foo_spider_monkey_panel/blob/master/component/docs/Flags.js

// Used in window.GetColourCUI()
const ColourTypeCUI = {
    text: 0,
    selection_text: 1,
    inactive_selection_text: 2,
    background: 3,
    selection_background: 4,
    inactive_selection_background: 5,
    active_item_frame: 6
};

// Used in window.GetFontCUI()
const FontTypeCUI = {
    items: 0,
    labels: 1
};

// Used in window.GetColourDUI()
const ColourTypeDUI = {
    text: 0,
    background: 1,
    highlight: 2,
    selection: 3
};

// Used in window.GetFontDUI()
const FontTypeDUI = {
    defaults: 0,
    tabs: 1,
    lists: 2,
    playlists: 3,
    statusbar: 4,
    console: 5
};
*/

/*
SupportColourFlagCUI = {
    text: 0x0,
    selection_text: 0x2,
    inactive_selection_text: 0x4,
    background: 0x8,
    selection_background: 0x10;
    inactive_selection_background: 0x20,
    active_item_frame: 0x40,
    group_foreground: 0x80,
    group_background: 0x100,
    colour_flag_all: 0x1ff
};

=== Colours ===
Used in GetColourCUI() as client_guid
NG Playlist: "{C882D3AC-C014-44DF-9C7E-2DADF37645A0}" Support Bits: 0x000001ff
Columns Playlist: "{0CF29D60-1262-4F55-A6E1-BC4AE6579D19}" Support Bits: 0x000001ff
Item Details: "{4E20CEED-42F6-4743-8EB3-610454457E19}" Support Bits: 0x00000009
Album List: "{DA66E8F3-D210-4AD2-89D4-9B2CC58D0235}" Support Bits: 0x00000049
Filter Panel: "{4D6774AF-C292-44AC-8A8F-3B0855DCBDF4}" Support Bits: 0x000001ff
Biography View: "{1CE33A5C-1D79-48F7-82EF-089EC49A9CA3}" Support Bits: 0x00000059
Artwork View: "{E32DCBA9-A2BF-4901-AB43-228628071410}" Support Bits: 0x00000008
Playlist Switcher: "{EB38A997-3B5F-4126-8746-262AA9C1F94B}" Support Bits: 0x000001ff
Item Properties: "{862F8A37-16E0-4A74-B27E-2B73DB567D0F}" Support Bits: 0x000001ff

=== Fonts ===
Used in GetFontCUI() as client_guid
Album List: "{06B856CC-86E7-4459-A75C-2DAB5B33B8BB}"
Item Properties: Group Titles: "{AF5A96A6-96ED-468F-8BA1-C22533C53491}"
Columns Playlist: Items: "{82196D79-69BC-4041-8E2A-E3B4406BB6FC}"
NG Playlist: Group Titles: "{FB127FFA-1B35-4572-9C1A-4B96A5C5D537}"
NG Playlist: Column Titles: "{30FBD64C-2031-4F0B-A937-F21671A2E195}"
Playlist Switcher: "{70A5C273-67AB-4BB6-B61C-F7975A6871FD}"
Filter Panel: Column Titles: "{FCA8752B-C064-41C4-9BE3-E125C7C7FC34}"
Columns Playlist: Column Titles: "{C0D3B76C-324D-46D3-BB3C-E81C7D3BCB85}"
Tab Stack: "{6F000FC4-3F86-4FC5-80EA-F7AA4D9551E6}"
Console: "{26059FEB-488B-4CE1-824E-4DF113B4558E}"
Biography View: "{F692FE36-D0CB-40A9-A53E-1492D6EFAC65}"
NG Playlist: Items: "{19F8E0B3-E822-4F07-B200-D4A67E4872F9}"
Playlist Tabs: "{942C36A4-4E28-4CEA-9644-F223C9A838EC}"
Status Bar: "{B9D5EA18-5827-40BE-A896-302A71BCAA9C}"
Item Details: "{77F3FA70-E39C-46F8-8E8A-6ECC64DDE234}"
Item Properties: Column Titles: "{7B9DF268-4ECC-4E10-A308-E145DA9692A5}"
Item Properties: Items: "{755FBB3D-A8D4-46F3-B0BA-005B0A10A01A}"
Filter Panel: Items: "{D93F1EF3-4AEE-4632-B5BF-0220CEC76DED}"
*/

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
