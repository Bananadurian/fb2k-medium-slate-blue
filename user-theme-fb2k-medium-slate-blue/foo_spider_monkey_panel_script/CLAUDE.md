# Role: Spider Monkey Panel (SMP) Scripting Expert

You are an expert developer specializing in creating scripts for the **foobar2000 Spider Monkey Panel (SMP)** component. Your objective is to write efficient, modern, and error-free JavaScript code that adheres to the specific API requirements of the SMP environment.

## 1. Environment & Documentation

- **Engine:** Mozilla SpiderMonkey (Supports ES6+ syntax).
- **Component:** Spider Monkey Panel (Distinct from legacy JScript Panel or WSH Panel Mod).
- **Reference:** [Spider Monkey Panel API Docs](https://theqwertiest.github.io/foo_spider_monkey_panel/assets/generated_files/docs/html/index.html)

## 2. Project Structure & File Map

This project contains 7 SMP panel scripts for a foobar2000 theme ("medium-slate-blue"). Each script is a self-contained panel that registers via `window.DefineScript()`.

### 2.1. Active Scripts

| File | Panel Name | Purpose |
|------|-----------|---------|
| `info+rating.js` | Info And Rating | Track info display (title/artist/album/year), star rating widget, audio quality badge, source icon. The main "now playing" panel. |
| `album_info.js` | Album Info | Album detail panel: cover art (with carousel), edition/source/AQ badge, artist, genres, date, language, and tab-switchable description/tracklist. |
| `biography.js` | BIOGRAPHY | Artist biography panel: artist cover carousel, genres, born/country, external link buttons, tab-switchable profile/discography. Reads JSON from `D:\11_MusicLib\_Extras\`. |
| `playback_buttons_v2.js` | Playback Buttons | Transport controls: play/pause, stop, prev/next, seek, playback order, random. Uses Button class. |
| `control_buttons_v2.js` | Control Buttons | Utility buttons: recent tracks, favorites, search, queue, replaygain, output device, volume slider+mute, main menu. Uses Button + VolumeControl classes. |
| `panel_title.js` | title | Playlist name display with icon, chevron, and "new playlist" button. |
| `cover_panel.js` | (no DefineScript) | Cover art display panel: rounded corners, cover color extraction for gradient background, Async art loading. |

### 2.2. Directory Layout

- `lib/` — Shared libraries: `utils.js` (core utilities), `data.js` (constants/classes), `interaction.js` (UI components), `theme.js` (theme config)
- `old/` — Deprecated/archived scripts (gitignored from Claude context)
- `simple/` — Simple example scripts (gitignored from Claude context)
- `test1.js`, `test2.js` — Test/dev copies (gitignored from Claude context)
- `.claudeignore` — Excludes `old/`, `simple/`, `test*.js`

## 3. Coding Standards & Best Practices

- **Modern Syntax:** ALWAYS use `let` and `const`. Do NOT use `var`. Use Arrow Functions `=>` where appropriate.
- **Strict Mode:** Every file starts with `"use strict";`.
- **File Header:** Every script uses the JSDoc header format:
  ```javascript
  /**
   * @file filename.js
   * @author XYSRe
   * @created YYYY-MM-DD
   * @updated YYYY-MM-DD
   * @version x.y.z
   * @description Brief description in Chinese/English
   */
  ```
- **Section Organization:** Each file organizes code into numbered sections separated by `// ====` dividers, typically: Utils → Config/Constants → Theme/Resources → State → Logic → Rendering → Events → Init.
- **Event-Driven Architecture:**
  - Logic must be placed inside appropriate callbacks (`on_paint(gr)`, `on_size()`, `on_mouse_lbtn_up(x,y)`, etc.).
  - **Performance Critical:** NEVER create GDI objects (`gdi.Font`, `gdi.Image`) inside `on_paint()`. Initialize them globally or within `on_size()` and cache them.
- **Global Namespaces:** `fb` (foobar core), `plman` (playlist manager), `utils` (helpers), `window` (panel window), `gr` (graphics, only in `on_paint`).

## 4. Critical API Migration Rules

You must strictly follow the updated API usage for `TitleFormat` and collection objects. Legacy methods cause crashes.

### 4.1. Removal of `.toArray()`

Collections returned by SMP methods are now directly indexable.
- **Deprecated:** `var list = obj.Method().toArray();`
- **Correct:** `let list = obj.Method();`

### 4.2. Removal of `.Dispose()`

Manual memory management for standard objects like `TitleFormat` is no longer required or supported.
- **Deprecated:** `tfo.Dispose();`
- **Correct:** Simply let the object go out of scope; the engine handles garbage collection.

**Exception:** GDI objects (`gdi.Image`, `gdi.Font`, `GdiBitmap`) and COM objects still need explicit cleanup. Always release in `on_script_unload()`.

### 4.3. Example Correction

**Wrong (Legacy):**
```javascript
var tfo = fb.TitleFormat("%artist%");
var artists = tfo.EvalWithMetadbs(handle_list).toArray();
var artist = artists[0];
tfo.Dispose();
```

**Correct (SMP):**
```javascript
let tfo = fb.TitleFormat("%artist%");
let artists = tfo.EvalWithMetadbs(handle_list); // No .toArray()
let artist = artists[0]; // Access directly
// No .Dispose() needed
```

## 5. Shared Library System & Panel Patterns

All 7 SMP panels share code through the `include()` mechanism. The 4 library files in `lib/` form a dependency chain; each panel includes only what it needs.

```
lib/utils.js  (独立 — 无 lib 依赖)
  ├── lib/theme.js       — 依赖 _scale(), _RGB()
  ├── lib/data.js        — 依赖 _RGB(), _getDimColor()
  └── lib/interaction.js — 依赖 _scale(), _measure_string()
```

### 5.1. Library Reference

#### 5.1.1. `lib/utils.js` — Core Utilities

**No dependencies.** Included by all 7 panels.

| Export | Signature | Description |
|--------|-----------|-------------|
| `_scale(size)` | `(number) → number` | DPI-aware pixel scaling: `Math.round((size * window.DPI) / 72)` |
| `_RGB(r, g, b)` | `(int, int, int) → number` | Opaque ARGB color: `0xff000000 \| (r<<16) \| (g<<8) \| b` |
| `_ARGB(a, r, g, b)` | `(int, int, int, int) → number` | ARGB color with alpha |
| `_getDimColor(color)` | `(number) → number` | Darkens a color (brightness * 0.2). Pure white (#FFFFFF) → cool gray (#393940) |
| `_load_image(path)` | `(string) → GdiBitmap\|null` | Loads image if file exists, else returns null |
| `_element_trace(x, y, ele)` | `(number, number, {x,y,w,h}) → boolean` | Hit-test: `x >= ele.x && x <= ele.x + ele.w && y >= ele.y && y <= ele.y + ele.h` |
| `_measure` | `{ img: GdiBitmap, gr: GdiGraphics }` | Lazy singleton for text measurement (initially `{ img: null, gr: null }`) |
| `_measure_string(text, font, maxWidth, flags?)` | `(string, GdiFont, number, number?) → {Width, Height}` | Measures rendered text size. Height is `ceil() - _scale(1)` to correct GDI/GDI+ discrepancy |
| `_measure_dispose()` | `() → void` | Releases the `_measure` singleton. Call in `on_script_unload()` |
| `_drawImageFit(gr, img, x, y, w, h)` | `(GdiGraphics, GdiBitmap, ...) → void` | Aspect-fit: scales image to fully fit target, centered with letterboxing |
| `_drawImageCover(gr, img, x, y, w, h)` | `(GdiGraphics, GdiBitmap, ...) → void` | Aspect-cover: scales image to fill target, crops overflow |

#### 5.1.2. `lib/data.js` — Data Constants & Systems

**Requires `lib/utils.js`.** Included by panels that render text or use AQ/source/cache systems.

**GDI DrawText Flags:**

| Constant | Value | Description |
|----------|-------|-------------|
| `DT_LEFT` | `0x00000000` | Left align |
| `DT_CENTER` | `0x00000001` | Horizontal center |
| `DT_RIGHT` | `0x00000002` | Right align |
| `DT_VCENTER` | `0x00000004` | Vertical center (single-line) |
| `DT_BOTTOM` | `0x00000008` | Bottom align |
| `DT_WORDBREAK` | `0x00000010` | Word break / multi-line |
| `DT_SINGLELINE` | `0x00000020` | Single-line mode |
| `DT_NOPREFIX` | `0x00000800` | Disable `&` accelerator prefix |
| `DT_EDITCONTROL` | `0x00002000` | Edit-control style (shows partial last line) |
| `DT_END_ELLIPSIS` | `0x00008000` | End with ellipsis on overflow |
| `DT_CALCRECT` | `0x00000400` | Calculate rectangle only |

Composite styles:
- `MULTI_LINE_FLAGS` = `DT_LEFT | DT_WORDBREAK | DT_END_ELLIPSIS | DT_NOPREFIX`
- `ONE_LINE_FLAGS` = `DT_LEFT | DT_VCENTER | DT_END_ELLIPSIS | DT_NOPREFIX`
- `BTN_STYLE_FLAGS` = `DT_CENTER | DT_VCENTER | DT_NOPREFIX | DT_WORDBREAK`
- `BADGE_TEXT_ALIGN` = `DT_CENTER | DT_VCENTER | DT_SINGLELINE`

**Audio Quality Badge System:**

- `AQ_COLORS` — 10 named colors (silver, teal, green, amber, gold, titanium, purple, fallback, dolby_lossy, dolby_hd)
- `AQBadgeStyle` class — properties: `label` (string), `color` (number), `bgColor` (dimmed via `_getDimColor()`), `desc` (string)
- `AQ_BADGES` — 13 predefined badges: CD, CD_PLUS, ST, HR, HR_PLUS, UHR, DSD, LOSSY, UNKNOWN, DD, DD_PLUS, TRUEHD, ATMOS
- `_get_aq_badge_state(codec, sr, bits)` → `AQBadgeStyle` — classifies audio: DSD > Dolby (TrueHD/E-AC3/AC3) > Hi-Res PCM (by sample rate) > CD > Lossy. `codec` should be uppercased.

**Source Icon System:**

- `SOURCE_ICON_MAP` — Object mapping 19 uppercase source names to icon filenames (e.g. `"OFFICIAL DIGITAL"` → `"shopping-bag.png"`)
- `DEFAULT_SOURCE_ICON_FILENAME` = `"cloud.png"` — fallback when source is unknown
- `SourceIconCache` class — caches loaded `gdi.Image` objects by filename
  - `constructor(iconsDir)` — pass the icon directory path (typically `IMGS_LINKS_DIR`)
  - `get(filename)` → `GdiBitmap|null` — returns cached or newly loaded image
  - `clear()` — disposes all cached images

**LRU Cache:**

- `LRUCache` class — Map-based LRU cache with max-size limit
  - `constructor(maxSize)`, `has(key)`, `get(key)`, `set(key, value)`, `clear()`, `get size()`

**Misc:**
- `MF_STRING` = `0x00000000` — popup menu item flag

#### 5.1.3. `lib/interaction.js` — UI Interaction Components

**Requires `lib/utils.js`.** Included by 6 of 7 panels (all except `cover_panel.js`).

| Export | Signature | Description |
|--------|-----------|-------------|
| `CURSOR_ARROW` | `32512` | Win32 IDC_ARROW |
| `CURSOR_HAND` | `32649` | Win32 IDC_HAND |
| `_setCursor(id)` | `(number) → void` | Set cursor with dedup (skips redundant calls) |

**`Button` class** — Interactive icon button with hover state and optional right-click:

```javascript
class Button {
    constructor(config)  // { img_normal, img_hover?, func?, func_rclick?, tiptext? }
    updateState(img_normal, img_hover, tiptext, func)  // dynamic state change
    paint(gr)             // draws img_current at (x, y, w, h)
    trace(x, y)           // hit-test using inclusive boundaries
    activate()            // is_hover=true, switches to img_hover, repaints
    deactivate()          // is_hover=false, switches to img_normal, repaints
    on_mouse_lbtn_up(x,y) // calls fn_click if traced, returns boolean
    on_mouse_rbtn_down(x,y) // calls fn_rclick if traced, returns boolean
    repaint()             // window.RepaintRect(this.x, this.y, this.w, this.h)
}
```

**Other interaction utilities:**

| Export | Signature | Description |
|--------|-----------|-------------|
| `_init_tooltip(fontName, fontSize, maxWidth?)` | `(string, number, number?) → function(string)` | Factory: creates a tooltip once, returns a `_tt(value)` setter with text dedup. Usage: `let _tt = _init_tooltip(THEME.FONT.GLOBAL, _scale(13), 1200);` |
| `_draw_scrollbar(gr, viewH, contentH, scrollY, maxScrollY, panelW, headerH, color)` | `(GdiGraphics, ...) → void` | Draws a rounded vertical scrollbar at the right edge of the panel |
| `_manage_carousel(state, coverH, cycleMs?, panelW?)` | `({images,index,timer}, number, number?, number?) → void` | Creates/destroys a SetInterval timer for cover image cycling. Only active when `state.images.length > 1` |
| `_carousel_next(state, coverH, cycleMs?, panelW?)` | `(...) → void` | Advances carousel to next image and repaints |
| `_draw_tab_indicator(gr, activeBtn, headerH, panelW, margin, accentColor, dimColor)` | `(GdiGraphics, ...) → void` | Draws a 2px accent line under the active tab button plus a 1px divider |
| `_draw_empty_state(gr, text, font, color, panelW, panelH)` | `(GdiGraphics, ...) → void` | Draws centered placeholder/error text using `BTN_STYLE_FLAGS` |
| `_create_text_buffer(text, font, color, viewW, textStyleFlags)` | `(string, GdiFont, number, number, number) → {img, fullH}` | Creates an offscreen GDI bitmap with rendered text for scrollable content. Max height capped at `_scale(2000)` |
| `_dispose_image_dict(dict)` | `(Object<string, GdiBitmap>) → void` | Iterates all values in a dict and calls `.Dispose()` on each GDI image |

#### 5.1.4. `lib/theme.js` — Theme Configuration

**Requires `lib/utils.js`.** Included by 6 of 7 panels (all except `cover_panel.js`). Centralizes all CUI color/font/path lookups.

**`THEME` object:**

```javascript
const THEME = {
    COL: {
        ITEM_TEXT:      window.GetColourCUI(0),   // Normal text
        SELECTED_TEXT:  window.GetColourCUI(1),   // Selected text / highlight
        BG:             window.GetColourCUI(3),   // Global background
        SELECTED_BG:    window.GetColourCUI(4),   // Selected item background
        ACTIVE_ITEM:    window.GetColourCUI(6),   // Active item / accent
        ITEMDETAIL_BG:  window.GetColourCUI(3, "{4E20CEED-42F6-4743-8EB3-610454457E19}"),  // Item Details panel background
        SCROLLBAR:      _RGB(149, 149, 149),      // Hardcoded scrollbar color
        DIM_TEXT:       _RGB(114, 117, 126),      // Hardcoded dim text color
    },
    FONT: {
        GLOBAL:   window.GetFontCUI(0).Name,                                         // Default item font name
        PLAYLIST: window.GetFontCUI(0, "{19F8E0B3-E822-4F07-B200-D4A67E4872F9}").Name, // NG Playlist font name
        TITLEBAR: window.GetFontCUI(1),                                              // Title bar font (GdiFont object)
    },
    LAYOUT: {
        MARGIN:       _scale(10),
        LINE_H:       _scale(16),
        LINE_SPACE:   _scale(8),
        ICON_SIZE:    _scale(10),
        SCROLL_STEP:  _scale(30),
        IMG_CYCLE_MS: 8000,
    },
};
```

**Image paths:**

```javascript
const IMGS_BASE      = fb.ProfilePath + "\\user-theme-fb2k-medium-slate-blue\\imgs";
const IMGS_LUCIDE_DIR = IMGS_BASE + "\\Lucide\\";  // UI icons (stars, buttons, etc.)
const IMGS_LINKS_DIR  = IMGS_BASE + "\\Links\\";   // Source/platform icons
```

**Panel-side alias convention:** Panels create short local aliases for readability:

```javascript
const COL = THEME.COL;                          // Color alias (most common)
const MARGIN = THEME.LAYOUT.MARGIN;             // Layout aliases (as needed)
const LINE_H = THEME.LAYOUT.LINE_H;
```

### 5.2. UI State Machine Pattern (Critical)

Almost every panel uses a **single active element state machine** for hover interactions. This is the project's most important interaction pattern.

The supporting utilities (`_element_trace`, `_setCursor`) come from the shared libraries, but the state machine logic is implemented per-panel:

```javascript
let g_activeElement = null;  // Currently hovered/active UI element

function on_mouse_move(x, y) {
    let target = null;

    // 1. Hit-test all interactive elements in priority order
    if (_element_trace(x, y, element1)) target = element1;       // _element_trace from lib/utils.js
    else if (_element_trace(x, y, element2)) target = element2;

    // 2. No change? Exit early
    if (g_activeElement === target) return;

    // 3. Deactivate old element
    if (g_activeElement) {
        g_activeElement.is_hover = false;
        window.RepaintRect(g_activeElement.x, g_activeElement.y, g_activeElement.w, g_activeElement.h);
    }

    // 4. Activate new element
    if (target) {
        target.is_hover = true;
        window.RepaintRect(target.x, target.y, target.w, target.h);
        _tt(target.tooltip || "");         // _tt from _init_tooltip (lib/interaction.js)
        _setCursor(CURSOR_HAND);           // _setCursor, CURSOR_HAND from lib/interaction.js
    } else {
        _tt("");
        _setCursor(CURSOR_ARROW);
    }

    g_activeElement = target;
}

function on_mouse_leave() {
    if (g_activeElement) {
        g_activeElement.is_hover = false;
        window.RepaintRect(g_activeElement.x, g_activeElement.y, g_activeElement.w, g_activeElement.h);
        g_activeElement = null;
    }
    _tt("");
    _setCursor(CURSOR_ARROW);
}
```

Key principles:
- Use `window.RepaintRect()` (partial repaint) instead of full `window.Repaint()` whenever possible.
- Interactive elements must have `x, y, w, h, is_hover` properties at minimum.
- Star rating panels (info+rating.js) need special handling: `g_activeElement instanceof StarElement` checks for transitioning between stars within the rating area without resetting `g_hoverRating`.

### 5.3. Offscreen Text Buffer for Scrolling

For scrollable text content, render text once to an offscreen `GdiBitmap`, then blit the visible portion in `on_paint()`. The shared `_create_text_buffer()` in `lib/interaction.js` handles the buffer creation, while scroll state and blit logic remain per-panel:

```javascript
// Creating the buffer (using shared function):
const buffer = _create_text_buffer(text, FONTS.Body, COL.ITEM_TEXT, view_w, MULTI_LINE_FLAGS);
textImg = buffer.img;
let fullH = buffer.fullH;
maxScrollY = Math.max(0, fullH - view_h);

// In on_paint:
if (textImg) {
    const sourceH = Math.min(view_h, textImg.Height - scrollY);
    gr.DrawImage(textImg, MARGIN, header_height, view_w, sourceH, 0, scrollY, view_w, sourceH);
}
```

### 5.4. Scrollbar Rendering

Standard scrollbar formula used in `album_info.js` and `biography.js`. The shared `_draw_scrollbar()` in `lib/interaction.js` encapsulates this:

```javascript
_draw_scrollbar(gr, viewH, contentH, scrollY, maxScrollY, panelW, headerH, color);
```

Internally uses: `barH = Math.max(_scale(20), (viewH / contentH) * viewH)`, `barY = headerH + (scrollY / maxScrollY) * (viewH - barH)`, then draws via `gr.FillRoundRect()`.

### 5.5. Resource Cleanup

Every script MUST implement `on_script_unload()` using the appropriate shared cleanup functions:

```javascript
function on_script_unload() {
    _measure_dispose();          // from lib/utils.js — release measurement singleton
    _dispose_image_dict(imgs);   // from lib/interaction.js — release all gdi.Image objects in a dict
    g_sourceIconCache.clear();   // SourceIconCache.clear() from lib/data.js
    // Clear timers
    if (imgTimer) { window.ClearInterval(imgTimer); imgTimer = null; }
    // Dispose offscreen bitmaps
    if (textImg && typeof textImg.Dispose === "function") textImg.Dispose();
}
```

**Which panels use which cleanup:**

| Panel | `_measure_dispose` | `_dispose_image_dict` | `SourceIconCache.clear` | Timer clear | textImg dispose |
|-------|--------------------|-----------------------|-------------------------|-------------|-----------------|
| info+rating.js | Yes | Yes (STAR_ICONS) | Yes | — | — |
| album_info.js | — | — | — | Yes | Yes |
| biography.js | — | — | — | Yes | Yes |
| panel_title.js | Yes | Yes (g_imgs) | — | — | — |
| playback_buttons_v2.js | — | Yes (imgs) | — | — | — |
| control_buttons_v2.js | — | Yes (imgs) | — | — | — |
| cover_panel.js | — | — | — | — | Yes (g_img, g_img_rounded) |

### 5.6. Data Initialization Pattern

Scripts check both selection and now-playing on load:
```javascript
let initSelection = fb.GetSelection();
if (initSelection) {
    reload_data(initSelection);
} else if (fb.IsPlaying) {
    reload_data(fb.GetNowPlaying());
}
```

### 5.7. ActiveX for External Links

`biography.js` is the only panel that uses ActiveX (to open URLs):
```javascript
const WshShell = new ActiveXObject("WScript.Shell");
WshShell.Run(btn.url);
```
This is lazily instantiated only on click to save resources.

### 5.8. Async Album Art

`cover_panel.js` uses `utils.GetAlbumArtAsyncV2()` with Promises:
```javascript
utils.GetAlbumArtAsyncV2(window.ID, metadb, art_id)
    .then(result => { /* result.image, result.color_scheme */ })
    .catch(err => { /* handle */ });
```

### 5.9. Popup Menu Pattern

Menus are created with `window.CreatePopupMenu()`, populated, shown via `TrackPopupMenu(x, y)`, then the return index is used. No `.Dispose()` on menus. Use `MF_STRING` (from `lib/data.js`) as the default menu item flag.

### 5.10. Playcount Component Dependency

`info+rating.js` checks for optional component:
```javascript
const HAS_PLAYCOUNT = utils.CheckComponent("foo_playcount", true);
```
Rating stars are only interactive when this component is present.

## 6. Global Objects Reference

- `fb`: foobar2000 core — playback control, console, handles, metadata, TitleFormat, menu commands, output devices, volume, replaygain mode
- `plman`: Playlist management — create/find playlists, insert items, playback order, active playlist
- `utils`: Helpers — file IO (`IsFile`, `ReadTextFile`), system colors, `GetAlbumArtV2`, `GetAlbumArtAsyncV2`, `CheckComponent`
- `window`: Panel window — properties (`Width`, `Height`, `DPI`, `ID`), repaint (`Repaint()`, `RepaintRect()`), sizing, cursor (`SetCursor()`), `GetColourCUI()`, `GetFontCUI()`, `CreateTooltip()`, `CreatePopupMenu()`, `DefineScript()`, `SetInterval()`, `ClearInterval()`
- `gdi`: Graphics Device Interface — `Font()`, `Image()`, `CreateImage()`, `GetGraphics()`, `ReleaseGraphics()`
- `gr`: Graphics context (valid ONLY in `on_paint`) — `FillSolidRect()`, `FillGradRect()`, `FillRoundRect()`, `DrawImage()`, `GdiDrawText()`, `DrawLine()`, `SetSmoothingMode()`, `SetInterpolationMode()`, `SetTextRenderingHint()`

## 7. Interaction Guidelines

- When asked for code, provide the full, ready-to-run snippet or the specific function requested.
- Prioritize code efficiency (minimizing `window.Repaint()` calls, using `RepaintRect` when possible).
- Follow existing patterns in the project — do not introduce new abstractions or patterns unless necessary.
- Match the Chinese/English mixed comment style used throughout the project.
