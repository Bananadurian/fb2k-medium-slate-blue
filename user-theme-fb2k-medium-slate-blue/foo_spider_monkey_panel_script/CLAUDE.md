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

## 5. Project-Specific Conventions & Patterns

### 5.1. DPI Scaling

Every script uses a `_scale(size)` function for DPI-aware pixel values:
```javascript
const DPI = window.DPI;
function _scale(size) {
    return Math.round((size * DPI) / 72);
}
```
All layout constants (margins, line heights, icon sizes) must be passed through `_scale()`.

### 5.2. Color Utilities

```javascript
function _RGB(r, g, b) {     // Opaque RGB
    return 0xff000000 | (r << 16) | (g << 8) | b;
}
function _ARGB(a, r, g, b) {  // With alpha
    return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}
```

### 5.3. Image Loading

Safe image loading that returns null on missing files:
```javascript
function load_image(path) {
    return utils.IsFile(path) ? gdi.Image(path) : null;
}
```

### 5.4. GDI DrawText Flags

Standard flag constants are defined in each file that does text rendering:
- `DT_LEFT` (0x00), `DT_CENTER` (0x01), `DT_RIGHT` (0x02), `DT_VCENTER` (0x04)
- `DT_WORDBREAK` (0x10), `DT_SINGLELINE` (0x20), `DT_NOPREFIX` (0x800)
- `DT_END_ELLIPSIS` (0x8000), `DT_EDITCONTROL` (0x2000)

Common combinations defined as named constants:
- `MULTI_LINE_FLAGS` = `DT_LEFT | DT_WORDBREAK | DT_END_ELLIPSIS | DT_NOPREFIX`
- `ONE_LINE_FLAGS` = `DT_LEFT | DT_VCENTER | DT_END_ELLIPSIS | DT_NOPREFIX`
- `BTN_STYLE_FLAGS` = `DT_CENTER | DT_VCENTER | DT_NOPREFIX | DT_WORDBREAK`
- `BADGE_TEXT_ALIGN` = `DT_CENTER | DT_VCENTER | DT_SINGLELINE`

### 5.5. Text Measurement (Singleton Pattern)

All scripts use a lazy-initialized singleton for measuring text dimensions:
```javascript
let _measureImg = null;
let _measureGr = null;

function measure_string(text, font, maxWidth, text_style_flag) {
    if (!_measureImg) {
        _measureImg = gdi.CreateImage(1, 1);
        _measureGr = _measureImg.GetGraphics();
    }
    const result = _measureGr.MeasureString(text, font, 0, 0, maxWidth, MAX_BUFFER_H, text_style_flag || MULTI_LINE_FLAGS);
    return {
        Width: Math.ceil(result.Width),
        Height: Math.ceil(result.Height) - _scale(1)  // -1 corrects GDI/GDI+ measurement discrepancy
    };
}
```

### 5.6. UI State Machine Pattern (Critical)

Almost every panel uses a **single active element state machine** for hover interactions. This is the project's most important interaction pattern:

```javascript
let g_activeElement = null;  // Currently hovered/active UI element

function on_mouse_move(x, y) {
    let target = null;

    // 1. Hit-test all interactive elements in priority order
    if (_element_trace(x, y, element1)) target = element1;
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
        _tt(target.tooltip || "");
        window.SetCursor(32649); // Hand
    } else {
        _tt("");
        window.SetCursor(32512); // Arrow
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
    window.SetCursor(32512);
}
```

Key principles:
- Use `window.RepaintRect()` (partial repaint) instead of full `window.Repaint()` whenever possible.
- Use `_element_trace(x, y, element)` for hit-testing: `x >= ele.x && x <= ele.x + ele.w && y >= ele.y && y <= ele.y + ele.h`.
- Interactive elements must have `x, y, w, h, is_hover` properties at minimum.

### 5.7. Tooltip & Cursor Management

Standard tooltip wrapper with deduplication:
```javascript
const tooltip = window.CreateTooltip(CUI_GLOBAL_FONT, _scale(13));
tooltip.SetMaxWidth(1200);

function _tt(value) {
    if (tooltip.Text !== value) {
        tooltip.Text = value;
        tooltip.Activate();
    }
}
```

Cursor ID caching to avoid redundant `SetCursor` calls:
```javascript
let lastCursorId = 32512; // IDC_ARROW
function _setCursor(id) {
    if (lastCursorId === id) return;
    lastCursorId = id;
    window.SetCursor(id);
}
```

Common cursor IDs: `32512` (Arrow), `32649` (Hand).

### 5.8. CUI Color System

Scripts pull colors from Columns UI's global palette:
```javascript
const COLORS = {
    Bg:        window.GetColourCUI(3),  // Background
    Title:     window.GetColourCUI(1),  // Selected text / highlight
    Accent:    window.GetColourCUI(6),  // Active item
    Accent1:   window.GetColourCUI(4),  // Selected item background
    Body:      window.GetColourCUI(0),  // Normal item text
};
```

Some panels use a specific CUI element GUID for matching Item Details panel color:
- `"{4E20CEED-42F6-4743-8EB3-610454457E19}"` — CUI Item Details panel background

### 5.9. Font System

Fonts are derived from CUI configuration:
```javascript
const CUI_GLOBAL_FONT = window.GetFontCUI(0).Name;         // Default CUI font
const CUI_TEXT_FONT = window.GetFontCUI(0, "{19F8E0B3-E822-4F07-B200-D4A67E4872F9}").Name; // NG Playlist font
```

Font objects created once at init:
```javascript
const FONTS = {
    Title:  gdi.Font(CUI_GLOBAL_FONT, _scale(18), 1),  // 1 = Bold
    Body:   gdi.Font(CUI_TEXT_FONT, _scale(12), 0),    // 0 = Regular
};
```

### 5.10. Button Class Pattern

`playback_buttons_v2.js` and `control_buttons_v2.js` share a consistent Button class:
```javascript
class Button {
    constructor(config) {
        this.x = 0; this.y = 0; this.w = 0; this.h = 0;
        this.img_normal = config.img_normal || null;
        this.img_hover = config.img_hover || this.img_normal;
        this.img_current = this.img_normal;
        this.fn_click = config.func || null;
        this.fn_rclick = config.func_rclick || null;  // Optional right-click handler
        this.tiptext = config.tiptext || "";
        this.is_hover = false;
    }
    updateState(img_normal, img_hover, tiptext, func) { /* dynamic state update */ }
    paint(gr) { /* draws this.img_current */ }
    trace(x, y) { /* hit-test */ }
    activate() { this.is_hover = true; this.img_current = this.img_hover; this.repaint(); }
    deactivate() { this.is_hover = false; this.img_current = this.img_normal; this.repaint(); }
    on_mouse_lbtn_up(x, y) { /* click handler */ }
    on_mouse_rbtn_down(x, y) { /* right-click handler */ }
    repaint() { window.RepaintRect(this.x, this.y, this.w, this.h); }
}
```

### 5.11. LRU Cache Pattern

Both `album_info.js` and `biography.js` use a Map-based LRU cache:
```javascript
const CACHE = new Map();
const CACHE_MAX_SIZE = 50;

function get_cache_entry(key) {
    if (CACHE.has(key)) {
        const entry = CACHE.get(key);
        CACHE.delete(key);    // Remove from old position
        CACHE.set(key, entry); // Re-insert at end (most recent)
        return entry;
    }
    // ... load data ...
    if (CACHE.size >= CACHE_MAX_SIZE) {
        const oldestKey = CACHE.keys().next().value;
        CACHE.delete(oldestKey);
    }
    CACHE.set(key, newEntry);
    return newEntry;
}
```

### 5.12. Offscreen Text Buffer for Scrolling

For scrollable text content, render text once to an offscreen `GdiBitmap`, then blit the visible portion in `on_paint()`:
```javascript
function create_text_buffer() {
    if (textImg && typeof textImg.Dispose === "function") textImg.Dispose();
    textImg = null;

    const measured = measure_string(text, FONTS.Body, view_w, MULTI_LINE_FLAGS);
    let fullH = Math.max(1, Math.min(measured.Height, MAX_BUFFER_H));

    textImg = gdi.CreateImage(view_w, fullH);
    const gr = textImg.GetGraphics();
    gr.GdiDrawText(text, FONTS.Body, COLORS.Body, 0, 0, view_w, fullH, MULTI_LINE_FLAGS);
    textImg.ReleaseGraphics(gr);

    maxScrollY = Math.max(0, fullH - view_h);
}

// In on_paint:
if (textImg) {
    const sourceH = Math.min(view_h, textImg.Height - scrollY);
    gr.DrawImage(textImg, MARGIN, header_height, view_w, sourceH, 0, scrollY, view_w, sourceH);
}
```

### 5.13. Scrollbar Rendering

Standard scrollbar formula used in `album_info.js` and `biography.js`:
```javascript
const barH = Math.max(_scale(20), (view_h / textImg.Height) * view_h);
const barY = header_height + (scrollY / maxScrollY) * (view_h - barH);
gr.FillRoundRect(window.Width - _scale(3), barY, _scale(2.5), barH, _scale(1), _scale(1), COLORS.Scroll);
```

### 5.14. Image Drawing Utilities

Two standard image fitting modes:
```javascript
// Aspect-Fit: entire image visible, letterboxed
function drawImageFit(gr, img, x, y, w, h) {
    const ratio = Math.min(w / img.Width, h / img.Height);
    const newW = img.Width * ratio, newH = img.Height * ratio;
    gr.DrawImage(img, x + (w - newW) / 2, y + (h - newH) / 2, newW, newH, 0, 0, img.Width, img.Height);
}

// Aspect-Cover: fills area, cropped
function drawImageCover(gr, img, x, y, w, h) {
    const ratio = Math.max(w / img.Width, h / img.Height);
    const srcW = w / ratio, srcH = h / ratio;
    gr.DrawImage(img, x, y, w, h, (img.Width - srcW) / 2, (img.Height - srcH) / 2, srcW, srcH);
}
```

### 5.15. Image Carousel Pattern

Both `album_info.js` and `biography.js` implement cover art carousels:
```javascript
let imgList = [];
let curImgIndex = 0;
let imgTimer = null;
const IMG_CYCLE_MS = 8000;

function manage_cycle_timer() {
    if (imgTimer) { window.ClearInterval(imgTimer); imgTimer = null; }
    if (imgList.length > 1) {
        imgTimer = window.SetInterval(() => {
            curImgIndex = (curImgIndex + 1) % imgList.length;
            window.RepaintRect(0, 0, window.Width, cover_h);
        }, IMG_CYCLE_MS);
    }
}
```

### 5.16. Resource Cleanup

Every script MUST implement `on_script_unload()` to release:
- GDI images (`gdi.Image`) via `.Dispose()`
- Offscreen bitmaps (`textImg`)
- Measurement singleton (`_measureImg.ReleaseGraphics()` + `.Dispose()`)
- Timers (`window.ClearInterval()`)
- Caches (`.clear()`)

### 5.17. Data Initialization Pattern

Scripts check both selection and now-playing on load:
```javascript
let initSelection = fb.GetSelection();
if (initSelection) {
    reload_data(initSelection);
} else if (fb.IsPlaying) {
    reload_data(fb.GetNowPlaying());
}
```

### 5.18. Audio Quality Badge System

Both `album_info.js` and `info+rating.js` share an identical AQ badge system:
- `AQBadgeStyle` class with `label`, `color`, `bgColor` (auto-dimmed), `desc`
- `getDimColor(color)` — darkens a color (multiplies RGB by 0.2, special case for pure white → #393940)
- `get_aq_badge_state(metadb)` — classifies audio: DSD > Dolby (TrueHD/E-AC3/AC3) > PCM (by sample rate + bit depth) > Lossy
- Badge layout: `paddingX`, `paddingY`, `radius`, `borderW` all DPI-scaled

### 5.19. Source Icon System

Both `album_info.js` and `info+rating.js` share an identical source icon system:
- `SOURCE_ICON_MAP` — maps uppercase source names to icon filenames
- `SOURCE_IMG_CACHE` — caches loaded `gdi.Image` objects
- `update_source_icon(metadb)` — reads `$meta(SOURCE)` and resolves icon
- Icons located at `fb.ProfilePath + "\\user-theme-fb2k-medium-slate-blue\\imgs\\Links\\"`

### 5.20. ActiveX for External Links

`biography.js` is the only panel that uses ActiveX (to open URLs):
```javascript
const WshShell = new ActiveXObject("WScript.Shell");
WshShell.Run(btn.url);
```
This is lazily instantiated only on click to save resources.

### 5.21. Async Album Art

`cover_panel.js` uses `utils.GetAlbumArtAsyncV2()` with Promises:
```javascript
utils.GetAlbumArtAsyncV2(window.ID, metadb, art_id)
    .then(result => { /* result.image, result.color_scheme */ })
    .catch(err => { /* handle */ });
```

### 5.22. Popup Menu Pattern

Menus are created with `window.CreatePopupMenu()`, populated, shown via `TrackPopupMenu(x, y)`, then the return index is used. No `.Dispose()` on menus.

### 5.23. Playcount Component Dependency

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
