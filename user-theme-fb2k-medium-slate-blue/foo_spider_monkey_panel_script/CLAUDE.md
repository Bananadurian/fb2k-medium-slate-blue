# Role: Spider Monkey Panel (SMP) Scripting Expert

You are an expert developer specializing in creating scripts for the **foobar2000 Spider Monkey Panel (SMP)** component. Your objective is to write efficient, modern, and error-free JavaScript code that adheres to the specific API requirements of the SMP environment.

## 1. Environment & API Reference

- **Engine:** Mozilla SpiderMonkey ESR68 (Supports ECMAScript 2019 / ES10).
- **Component:** Spider Monkey Panel (Distinct from legacy JScript Panel or WSH Panel Mod).
- **Reference:** [Spider Monkey Panel API Docs](https://theqwertiest.github.io/foo_spider_monkey_panel/assets/generated_files/docs/html/index.html)
- **Syntax:** `let`/`const`, arrow functions, `Promise`, `async/await` are fully supported. No browser-specific objects (`XMLHttpRequest`, `DOM API`).

### 1.1. Memory Management

Modern SMP engine manages garbage collection automatically.

- **No manual Dispose:** Do NOT call `.Dispose()` on GDI objects (`gdi.Image`, `gdi.Font`, `GdiBitmap`) or standard objects (`TitleFormat`). The engine handles cleanup.
- **Compatibility note:** If the script must also run on legacy js-panel3, GDI objects may use the guarded pattern: `if (obj && typeof obj.Dispose === "function") obj.Dispose();`. Pure modern SMP does not require this.
- **No `.toArray()`:** Collections (`FbMetadbHandleList` etc.) are directly indexable and support `for...of`. Calling `.toArray()` will crash.
- **Strict Mode:** Every file starts with `"use strict";`.

### 1.2. Global Timers & Functions

- `setTimeout(func, delay)` / `clearTimeout(timerID)` — one-shot timer.
- `setInterval(func, delay)` / `clearInterval(timerID)` — repeating timer.
- `include(path)` — include external JS scripts.

### 1.3. ActiveXObject

COM components are available on Windows:

- `new ActiveXObject("Scripting.FileSystemObject")` — advanced file system operations.
- `new ActiveXObject("WScript.Shell")` — run external commands / open URLs.
- `new ActiveXObject("Microsoft.XMLHTTP")` — HTTP requests (replaces browser `XMLHttpRequest`).

### 1.4. Global Namespaces

#### 1.4.1. `fb` — foobar2000 Core

Playback control, track handles, global state.

- **Properties:** `fb.IsPlaying`, `fb.IsPaused`, `fb.Volume`, `fb.PlaybackLength`, `fb.PlaybackTime`, `fb.AlwaysOnTop`, `fb.StopAfterCurrent`.
- **Methods:**
  - `fb.GetNowPlaying()` → `FbMetadbHandle` — current playing track.
  - `fb.GetFocusItem()` — focused playlist item (true or UI selection).
  - `fb.GetSelection()` — selected tracks (null if nothing selected).
  - `fb.GetLibraryItems()` → `FbMetadbHandleList` — all library tracks.
  - `fb.GetQueryItems(handleList, query)` → `FbMetadbHandleList` — filter handles by TF query.
  - `fb.Play()`, `fb.Pause()`, `fb.Stop()`, `fb.Next()`, `fb.Prev()`, `fb.Random()` — transport controls.
  - `fb.PlayOrPause()` — toggle play/pause.
  - `fb.VolumeUp()`, `fb.VolumeDown()`, `fb.VolumeMute()` — volume control.
  - `fb.TitleFormat(expression)` — create `FbTitleFormat` object.
  - `fb.RunMainMenuCommand(command)` — execute foobar2000 main menu item.
  - `fb.RunContextCommandWithMetadb(command, handle, flags)` — execute context menu command on track.
  - `fb.ShowPopupMessage(msg, title)` — popup message box.
  - `fb.CreateMainMenuManager()` → `ContextMenuManager`.
  - `fb.CreateProfiler(name)` — performance profiler.
  - `fb.GetOutputDevices()` → JSON string of output devices.
  - `fb.ReplaygainMode` — 0=None, 1=Track, 2=Album, 3=Smart.
  - `fb.ProfilePath` — foobar2000 profile directory path.

#### 1.4.2. `gdi` — Graphics Device Interface

Image and font creation.

- `gdi.CreateImage(w, h)` → `GdiBitmap` — create blank image.
- `gdi.Font(name, size, style)` → `GdiFont` — style: 0=normal, 1=bold, 2=italic, 4=underline, 8=strikethrough.
- `gdi.Image(path)` → `GdiBitmap` — synchronous local image load.
- `gdi.LoadImageAsyncV2(window_id, path)` → `Promise<GdiBitmap>` — async image load.

#### 1.4.3. `plman` — Playlist Manager

- **Properties:** `plman.ActivePlaylist`, `plman.PlayingPlaylist`, `plman.PlaylistCount`, `plman.PlaybackOrder`.
- **Methods:**
  - `plman.GetPlaylistItems(playlistIndex)` → `FbMetadbHandleList`.
  - `plman.FindOrCreatePlaylist(name, unlocked)` → playlist index.
  - `plman.ClearPlaylist(index)`, `plman.RemovePlaylist(index)`.
  - `plman.InsertPlaylistItems(index, pos, handleList, select)`.
  - `plman.ExecutePlaylistDefaultAction(playlistIndex, itemIndex)`.

#### 1.4.4. `utils` — Utilities

File IO and async resources.

- `utils.IsFile(path)`, `utils.ReadTextFile(path)`, `utils.WriteTextFile(path, content)`.
- `utils.CheckComponent(name, is_dll)` — check if foobar2000 component is installed.
- `utils.GetAlbumArtV2(metadb, art_id)` → `GdiBitmap` — synchronous cover art fetch.
- `utils.GetAlbumArtAsyncV2(window_id, metadb, art_id)` → `Promise<{image, color_scheme}>` — async cover art.
- `utils.GetSysColour(index)` — Windows system color.
- `utils.FormatDuration(seconds)` — format to `MM:SS`.

#### 1.4.5. `window` — Panel Window

- **Properties:** `window.ID`, `window.Width`, `window.Height`, `window.DPI`, `window.InstanceType`.
- **Methods:**
  - `window.Repaint()` — full panel repaint.
  - `window.RepaintRect(x, y, w, h)` — partial repaint.
  - `window.GetColourCUI(type, client_guid?)` — CUI theme color.
  - `window.GetFontCUI(type, client_guid?)` — CUI theme font.
  - `window.SetCursor(id)` — set mouse cursor.
  - `window.CreatePopupMenu()` → `MenuObject`.
  - `window.CreateTooltip(fontName, fontSize)` → `FbTooltip`.
  - `window.DefineScript(name, config)` — register panel.
  - `window.SetInterval(func, delay)` / `window.ClearInterval(timerID)` — timers (also available globally).

#### 1.4.6. `console`

- `console.log(message)` — log to foobar2000 Console.

## 2. Core Classes & Objects

### 2.1. `FbMetadbHandle` / `FbMetadbHandleList`

- **FbMetadbHandle** — single track handle.
  - Properties: `Path`, `FileSize`, `Length`, `SubSong`.
  - Methods: `Compare(handle)`, `GetFileInfo()`.
- **FbMetadbHandleList** — track list (indexable, iterable via `for...of`).
  - Properties: `Count`.
  - Methods: `Add(handle)`, `RemoveAll()`, `Sort()`, `OrderByFormat(tf, direction)`, `RemoveRange(from, count)`, `UpdateFileInfoFromJSON(json)`.

### 2.2. `FbTitleFormat`

Parse foobar2000 title formatting expressions (e.g. `%artist%`).

- `Eval()` — evaluate against current context.
- `EvalWithMetadb(handle)` → `string` — evaluate against a specific track.
- `EvalWithMetadbs(handleList)` → `string[]` — batch evaluate, returns native JS string array (no `.toArray()` needed).

### 2.3. `GdiGraphics`

Drawing context (valid ONLY in `on_paint(gr)`, or obtained via `GdiBitmap.GetGraphics()`).

- **Fill/Draw:** `FillSolidRect()`, `FillGradRect()`, `DrawRect()`, `DrawRoundRect()`, `FillRoundRect()`, `FillEllipse()`.
- **Image & Text:** `DrawImage()`, `GdiDrawText()`, `MeasureString()`, `CalcTextHeight()`, `CalcTextWidth()`, `DrawLine()`.
- **Render Control:** `SetInterpolationMode(mode)` (7=HighQualityBicubic), `SetSmoothingMode(mode)` (4=AntiAlias, 0=None), `SetTextRenderingHint(hint)` (5=ClearType).
- `ReleaseGraphics(gr)` must be called on the parent `GdiBitmap` after use.

### 2.4. `GdiBitmap`

Bitmap image object.

- **Properties:** `Width`, `Height`.
- **Methods:**
  - `GetGraphics()` → `GdiGraphics` — obtain drawing context. MUST later call `ReleaseGraphics(gr)`.
  - `ApplyMask(maskImage)` — apply alpha mask (white=transparent, black=opaque).
  - `GetColourSchemeJSON(max_count)` → JSON string — extract dominant colors.
  - `StackBlur(radius)` — apply Gaussian blur.

### 2.5. Menu Objects

- **MenuObject** (`window.CreatePopupMenu()`):
  - `AppendMenuItem(flags, item_id, text)`, `AppendMenuSeparator()`, `AppendTo(parent_menu, flags, text)`.
  - `CheckMenuRadioItem(first_id, last_id, checked_id)`.
  - `TrackPopupMenu(x, y, flags)` → `int` — show menu and return selected item ID.
- **ContextMenuManager** (`fb.CreateMainMenuManager()`):
  - `Init(name)`, `BuildMenu(menu, base_id, max_id)`, `ExecuteByID(id)`.

### 2.6. `FbTooltip`

Tooltip object (`window.CreateTooltip(fontName, fontSize)`).

- **Properties:** `Text`.
- **Methods:** `Activate()`, `Deactivate()`, `SetMaxWidth(max)`, `TrackPosition(x, y)`.

## 3. System Callbacks

### 3.1. Render & Size

- `on_paint(gr)` — panel needs repaint. **CRITICAL: Never create `gdi.Font` or `gdi.Image` inside this callback.** Pre-create GDI objects globally or in `on_size()`.
- `on_size()` — panel resized. Recalculate layout dimensions.
- `on_colours_changed()` — foobar2000 theme colors changed.
- `on_font_changed()` — foobar2000 theme fonts changed.

### 3.2. Mouse & Keyboard

- **Mouse move:** `on_mouse_move(x, y, mask)`, `on_mouse_leave()`.
- **Mouse click:** `on_mouse_lbtn_down(x, y)`, `on_mouse_lbtn_up(x, y)`, `on_mouse_rbtn_up(x, y)`, `on_mouse_rbtn_down(x, y)`.
- **Double-click & wheel:** `on_mouse_lbtn_dblclk(x, y)`, `on_mouse_wheel(step)`.
- **Keyboard:** `on_key_down(vkey)`, `on_key_up(vkey)`.

### 3.3. Playback State

- `on_playback_new_track(metadb)` — new track started.
- `on_playback_stop(reason)` — playback stopped. `reason == 2` means switching to next track; guard with `if (reason !== 2)` to avoid redundant UI updates.
- `on_playback_time(time)` — playback position changed (per second).
- `on_playback_starting()` — playback about to start.
- `on_playback_pause(state)` — pause state changed.

### 3.4. Playlist State

- `on_playlist_switch()` — active playlist changed.
- `on_playlist_items_selection_change()` — selection changed.
- `on_playlist_items_added(playlistIndex)`, `on_playlist_items_removed()`.
- `on_playlists_changed()` — playlist list changed (add/remove/rename).
- `on_item_focus_change(playlistIndex, from, to)` — keyboard focus changed.

### 3.5. Other Events

- `on_metadb_changed()` — track metadata tags edited.
- `on_playback_order_changed()` — playback order changed.
- `on_volume_change(val)` — volume changed.
- `on_output_device_changed()` — output device changed.
- `on_replaygain_mode_changed()` — ReplayGain mode changed.

### 3.6. Drag & Drop

- `on_drag_enter()`, `on_drag_over()`, `on_drag_leave()`, `on_drag_drop()`.
- Modify `action.Effect` to control allowed drop types.

## 4. Critical API Rules

### 4.1. Removal of `.toArray()`

Collections are directly indexable. `.toArray()` is deprecated and will crash.

- **Deprecated:** `var list = obj.Method().toArray();`
- **Correct:** `let list = obj.Method();`

### 4.2. Removal of `.Dispose()`

Manual memory management for standard objects (`TitleFormat`, etc.) is no longer needed. The engine handles garbage collection.

- **Deprecated:** `tfo.Dispose();`
- **Correct:** Let the object go out of scope.

**Modern SMP:** GDI objects (`gdi.Image`, `gdi.Font`, `GdiBitmap`) also do NOT need `.Dispose()`. GC handles everything.

**js-panel3 compatibility:** If backward compatibility is required, use guarded Dispose for GDI objects only:
```javascript
if (obj && typeof obj.Dispose === "function") obj.Dispose();
```

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

### 4.4. `GdiBitmap.GetGraphics()` / `GdiBitmap.ReleaseGraphics()` Pairing

When using `gdi.CreateImage(w, h)` and calling `GetGraphics()` to obtain a drawing context, you MUST always call `ReleaseGraphics()` on the bitmap afterwards. Forgetting this causes GDI context leaks.

**Correct pattern:**
```javascript
let bmp = gdi.CreateImage(w, h);
let gr = bmp.GetGraphics();
try {
    // ... draw operations using gr ...
} finally {
    bmp.ReleaseGraphics(gr);  // MUST be called
}
```

**Wrong (leaks GDI context):**
```javascript
let bmp = gdi.CreateImage(w, h);
let gr = bmp.GetGraphics();
gr.DrawImage(...);
// ❌ Missing bmp.ReleaseGraphics(gr)
```

## 5. Development Best Practices

### 5.1. Graphic Computation

- All coordinates and dimensions passed to `GdiGraphics` methods must use `Math.round()` or `Math.floor()` to integers. Floating-point values cause GDI+ rendering misalignment.
- Always include an opaque alpha channel when generating colors: `0xff000000 | (r << 16) | (g << 8) | b`.

### 5.2. Performance

- `on_paint(gr)` must contain ONLY pure drawing instructions. Logic, image cropping, and font instantiation belong in external callbacks or `on_size()`.
- For hover effects, use `window.RepaintRect(x, y, w, h)` (partial repaint) instead of `window.Repaint()` (full panel).
- NEVER create `gdi.Font` or `gdi.Image` inside `on_paint()`.

### 5.3. Async

- All `xxxAsyncV2` methods return `Promise`. Always use `.then().catch()`. Do not use legacy global callbacks.

## 6. Project Structure & File Map

This project contains 7 SMP panel scripts for a foobar2000 theme ("medium-slate-blue"). Each script is a self-contained panel that registers via `window.DefineScript()`.

### 6.1. Active Scripts

| File | Panel Name | Purpose |
|------|-----------|---------|
| `info+rating.js` | Info And Rating | Track info (title/artist/album/year), star rating, audio quality badge, source icon. |
| `album_info.js` | Album Info | Album detail: cover carousel, edition/source/AQ badge, artist, genres, date, language, tab-switchable description/tracklist. |
| `biography.js` | Biography | Artist biography: cover carousel, genres, born/country, external links, tab-switchable profile/discography. |
| `playback_buttons.js` | Playback Buttons | Transport controls: play/pause, stop, prev/next, seek, playback order, random. Uses Button class. |
| `control_buttons.js` | Control Buttons | Utility buttons: recent tracks, favorites, search, queue, replaygain, output device, volume slider+mute, main menu. Uses Button + VolumeControl classes. |
| `panel_title.js` | Panel Title | Playlist name display with icon, chevron, and action button. |
| `cover_panel.js` | Cover Panel | Cover art display: rounded corners, color extraction for gradient background, sync loading + LRU cache (5 entries). |

### 6.2. Directory Layout

- `lib/` — Shared libraries: `utils.js`, `data.js`, `interaction.js`, `theme.js`
- `old/` — Deprecated/archived scripts (gitignored)
- `simple/` — Simple example scripts (gitignored)
- `test1.js`, `test2.js` — Test/dev copies (gitignored)
- `.claudeignore` — Excludes `old/`, `simple/`, `test*.js`

### 6.3. File Header

Every script uses the JSDoc header format:

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

## 7. Shared Library System & Panel Patterns

All 7 SMP panels share code through the `include()` mechanism. The 4 library files form a dependency chain; each panel includes only what it needs.

```
lib/utils.js  (独立 — 无 lib 依赖)
  ├── lib/theme.js       — 依赖 _scale(), _rgb()
  ├── lib/data.js        — 依赖 _rgb(), _getDimColor()
  └── lib/interaction.js — 依赖 _scale(), _measureString()
```

### 7.1. Library Reference

#### 7.1.1. `lib/utils.js` — Core Utilities

**No dependencies.** Included by all 7 panels.

| Export | Signature | Description |
|--------|-----------|-------------|
| `_scale(size)` | `(number) → number` | DPI-aware pixel scaling: `Math.round((size * window.DPI) / 72)` |
| `_rgb(r, g, b)` | `(int, int, int) → number` | Opaque ARGB color: `0xff000000 \| (r<<16) \| (g<<8) \| b` |
| `_argb(a, r, g, b)` | `(int, int, int, int) → number` | ARGB color with alpha: `(a<<24) \| (r<<16) \| (g<<8) \| b` |
| `_getDimColor(color)` | `(number) → number` | Darkens a color (brightness * 0.2). Pure white (#FFFFFF) → cool gray (#393940) |
| `_loadImage(path)` | `(string) → GdiBitmap\|null` | Loads image if file exists, else returns null |
| `_hitTest(x, y, ele)` | `(number, number, {x,y,w,h}) → boolean` | Hit-test: `x >= ele.x && x <= ele.x + ele.w && y >= ele.y && y <= ele.y + ele.h`. Returns false if ele is null. |
| `_measure` | `{ img: GdiBitmap, gr: GdiGraphics }` | Lazy singleton for text measurement (initially `{ img: null, gr: null }`) |
| `_measureString(text, font, maxWidth, flags?)` | `(string, GdiFont, number, number?) → {Width, Height}` | Measures rendered text size. Height is `ceil() - 1` to correct GDI/GDI+ discrepancy |
| `_measureDispose()` | `() → void` | Releases the `_measure` singleton. Call in `on_script_unload()` |
| `_drawImageFit(gr, img, x, y, w, h)` | `(GdiGraphics, GdiBitmap, ...) → void` | Aspect-fit: scales image to fully fit target, centered with letterboxing |
| `_drawImageCover(gr, img, x, y, w, h)` | `(GdiGraphics, GdiBitmap, ...) → void` | Aspect-cover: scales image to fill target, crops overflow |
| `_createRoundedImage(img, targetW, targetH, radius, mode?)` | `(GdiBitmap, number, number, number, string?) → GdiBitmap\|null` | Scales by mode (`"cover"`/`"fit"`) then applies optional rounded corner mask. Used by cover/album panels. |
| `_extractImageColors(img, useGradient, fallbackColor)` | `(GdiBitmap, boolean, number) → {c1, c2}` | Extracts dominant colors via `GetColourSchemeJSON`. `c2===c1` when `useGradient=false` |

#### 7.1.2. `lib/data.js` — Data Constants & Systems

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

- `AQ_COLORS` — 10 named colors (silver, teal, green, amber, gold, titanium, purple, fallback, dolbyLossy, dolbyHd)
- `AQBadgeStyle` class — properties: `label` (string), `color` (number), `bgColor` (dimmed via `_getDimColor()`), `desc` (string)
- `AQ_BADGES` — 11 predefined badges: CD, CD_PLUS, ST, HR, HR_PLUS, UHR, DSD, LOSSY, DD, DD_PLUS, TRUEHD
- `_classifyAudioQuality(codec, sampleRate, bitDepth)` → `AQBadgeStyle` — classifies audio: DSD > Dolby (TrueHD/E-AC3/AC3) > Hi-Res PCM (by sample rate) > CD > Lossy. `codec` should be uppercased.
- `_resolveBadge(codec, sampleRate, bitDepth)` → `AQBadgeStyle` — convenience wrapper: applies `toUpperCase()` and `parseInt` conversions before calling `_classifyAudioQuality`.

**Source Icon System:**

- `SOURCE_ICON_MAP` — Object mapping 19 uppercase source names to icon filenames (e.g. `"OFFICIAL DIGITAL"` → `"shopping-bag.png"`)
- `DEFAULT_SOURCE_ICON_FILENAME` = `"cloud.png"` — fallback when source is unknown
- `_resolveSourceIconFilename(sourceText)` → `string` — resolves uppercase source text to icon filename, falls back to `DEFAULT_SOURCE_ICON_FILENAME`
- `SourceIconCache` class — caches loaded `gdi.Image` objects by filename
  - `constructor(iconsDir)` — pass the icon directory path (typically `IMGS_LINKS_DIR`)
  - `get(filename)` → `GdiBitmap|null` — returns cached or newly loaded image
  - `clear()` — disposes all cached images

**LRU Cache:**

- `LRUCache` class — Map-based LRU cache with max-size limit
  - `constructor(maxSize)`, `get(key)`, `set(key, value)`, `clear()`, `get size()`

**Misc:**
- `MF_STRING` = `0x00000000` — popup menu item flag

#### 7.1.3. `lib/interaction.js` — UI Interaction Components

**Requires `lib/utils.js`.** Included by 6 of 7 panels (all except `cover_panel.js`).

| Export | Signature | Description |
|--------|-----------|-------------|
| `CURSOR_ARROW` | `32512` | Win32 IDC_ARROW |
| `CURSOR_HAND` | `32649` | Win32 IDC_HAND |
| `_setCursor(id)` | `(number) → void` | Set cursor with dedup (skips redundant calls) |

**`Button` class** — Interactive icon button with hover state and optional right-click:

```javascript
class Button {
    constructor(config)  // { imgNormal, imgHover?, func?, fnRightClick?, tipText? }
    updateState(imgNormal, imgHover, tipText, func)  // dynamic state change
    paint(gr)             // draws imgCurrent at (x, y, w, h)
    containsPoint(x, y)           // hit-test using inclusive boundaries
    activate()            // isHover=true, switches to imgHover, repaints
    deactivate()          // isHover=false, switches to imgNormal, repaints
    onLbtnUp(x, y)     // calls fnClick if hit, returns boolean
    onRbtnDown(x, y)   // calls fnRightClick if hit, returns boolean
    repaint()             // window.RepaintRect(this.x, this.y, this.w, this.h)
}
```

**Other interaction utilities:**

| Export | Signature | Description |
|--------|-----------|-------------|
| `_initTooltip(gdiFont, fontSize, maxWidth?)` | `(GdiFont, number, number?) → function(string)` | Factory: creates a tooltip once, returns a `tooltip(value)` setter with text dedup. Usage: `let tooltip = _initTooltip(THEME.FONT.BODY, _scale(13), 1200);` |
| `_drawScrollbar(gr, viewH, contentH, scrollY, maxScrollY, panelW, headerH, color)` | `(GdiGraphics, ...) → void` | Draws a rounded vertical scrollbar at the right edge of the panel |
| `_manageCarousel(carouselState, coverH, cycleMs?, panelW?)` | `({images,index,timer}, number, number?, number?) → void` | Creates/destroys a SetInterval timer for cover image cycling. Only active when `carouselState.images.length > 1` |
| `_carouselNext(carouselState, coverH, cycleMs?, panelW?)` | `(...) → void` | Advances carousel to next image and repaints |
| `_drawTabIndicator(gr, activeBtn, headerH, panelW, margin, accentColor, dimColor)` | `(GdiGraphics, ...) → void` | Draws a 2px accent line under the active tab button plus a 1px divider |
| `_drawEmptyState(gr, text, font, color, panelW, panelH)` | `(GdiGraphics, ...) → void` | Draws centered placeholder/error text using `BTN_STYLE_FLAGS` |
| `_drawPageIndicator(gr, currentIndex, totalCount, x, y, w, h, font, fgColor?, bgColor?)` | `(GdiGraphics, number, number, number, number, number, number, GdiFont, number?, number?) → void` | Draws a semi-transparent rounded page counter (e.g. "2 / 5") on cover carousels. `fgColor` defaults to `0xFFFFFFFF`, `bgColor` defaults to `0x99000000` |
| `_drawScrollText(gr, text, font, color, x, y, w, h, flags, bgColor, panelW, headerH)` | `(GdiGraphics, string, GdiFont, number, number, number, number, number, number, number, number, number) → void` | Directly renders scrollable text via `GdiDrawText` for native ClearType, then covers overflow above `headerH` with `FillSolidRect`. Caller must redraw cover/header after. Max height capped at `_scale(2000)` |
| `_disposeImageDict(dict)` | `(Object<string, GdiBitmap>) → void` | Iterates all values in a dict and calls `.Dispose()` on each GDI image |

#### 7.1.4. `lib/theme.js` — Theme Configuration

**Requires `lib/utils.js`.** Included by 6 of 7 panels (all except `cover_panel.js`). Centralizes all CUI color/font/path lookups.

**`THEME` object:**

```javascript
const THEME = {
    COL: {
        FG:             window.GetColourCUI(0),   // Item Foreground
        SEL_FG:         window.GetColourCUI(1),   // Selected Item Foreground
        BG:             window.GetColourCUI(3),   // Background
        SEL_BG:         window.GetColourCUI(4),   // Selected Item Background
        FRAME:          window.GetColourCUI(6),   // Active Item Frame
        SCROLLBAR:      _rgb(149, 149, 149),      // Hardcoded scrollbar color
    },
    FONT: {
        TITLE:       gdi.Font(..., _scale(18), 1),  // Large heading (album/artist)
        BODY:  gdi.Font(FONT_ITEMS.Name, _scale(12), 0),  // Body / button / compact text
        BOLD:  gdi.Font(FONT_ITEMS.Name, _scale(12), 1),  // Body bold / selected button
        LABEL: FONT_LABELS,                                // Label / badge / panel title
    },
    LAYOUT: {
        MARGIN:       _scale(10),
        LINE_H:       _scale(16),
        LINE_SPACE:   _scale(8),
        ICON_SIZE:    _scale(10),
        SCROLL_STEP:  _scale(30),
        IMG_CYCLE_MS: 8000,
    },
    CFG: {
        GRAB_FOCUS:       false,         // DefineScript default
        CACHE_SIZE:       50,            // LRU cache max entries
        SOURCE_ICON_SIZE: _scale(10),    // Source icon dimensions
        AQ_BADGE: {                      // Audio quality badge layout
            PADDING_X: _scale(4),
            PADDING_Y: _scale(4),
            RADIUS:   _scale(4),
            BORDER_W:  _scale(1),
        },
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

**Panel-specific config (`PANEL_CFG`):** Each panel declares a `PANEL_CFG` object for its own boolean/numeric switches. Examples:

```javascript
// album_info.js
const PANEL_CFG = { showCover: true, coverAspectRatio: 1/1, showArtistCover: false, coverMode: "cover", cornerRadius: _scale(20), coverMargin: _scale(20) };
// biography.js
const PANEL_CFG = { dataPath: "D:\\...", coverScale: 3/4, isCoverFit: true };
// cover_panel.js
const PANEL_CFG = { cornerRadius: _scale(20), margin: _scale(40), useCoverColor: true, useGradient: false, gradientAngle: 90, coverMode: "cover" };
```

### 7.2. UI State Machine Pattern (Critical)

Almost every panel uses a **single active element state machine** for hover interactions.

The supporting utilities (`_hitTest`, `_setCursor`) come from the shared libraries, but the state machine logic is implemented per-panel:

```javascript
let activeElement = null;  // Currently hovered/active UI element

function on_mouse_move(x, y) {
    let target = null;

    // 1. Hit-test all interactive elements in priority order
    if (_hitTest(x, y, element1)) target = element1;
    else if (_hitTest(x, y, element2)) target = element2;

    // 2. No change? Exit early
    if (activeElement === target) return;

    // 3. Deactivate old element
    if (activeElement) {
        activeElement.isHover = false;
        window.RepaintRect(activeElement.x, activeElement.y, activeElement.w, activeElement.h);
    }

    // 4. Activate new element
    if (target) {
        target.isHover = true;
        window.RepaintRect(target.x, target.y, target.w, target.h);
        tooltip(target.tooltip || "");
        _setCursor(CURSOR_HAND);
    } else {
        tooltip("");
        _setCursor(CURSOR_ARROW);
    }

    activeElement = target;
}

function on_mouse_leave() {
    if (activeElement) {
        activeElement.isHover = false;
        window.RepaintRect(activeElement.x, activeElement.y, activeElement.w, activeElement.h);
        activeElement = null;
    }
    tooltip("");
    _setCursor(CURSOR_ARROW);
}
```

Key principles:
- Use `window.RepaintRect()` (partial repaint) instead of full `window.Repaint()` whenever possible.
- Interactive elements must have `x, y, w, h, isHover` properties at minimum.
- Star rating panels (info+rating.js) need special handling: `activeElement instanceof StarElement` checks for transitioning between stars within the rating area without resetting `hoverRating`.

### 7.3. Scroll Text Rendering

Scroll text is rendered directly in `on_paint()` via `_drawScrollText()` for native ClearType quality:

```javascript
// Measure full text height (in createTextBuffer):
const measured = _measureString(currentText, THEME.FONT.BODY, viewW, MULTI_LINE_FLAGS);
fullTextH = Math.max(1, Math.min(Math.ceil(measured.Height), _scale(2000)));
maxScrollY = Math.max(0, fullTextH - viewH);

// In on_paint — draw text then cover overflow above header:
_drawScrollText(gr, currentText, THEME.FONT.BODY, COL.FG, MARGIN,
    headerHeight - scrollY, viewW, fullTextH, MULTI_LINE_FLAGS,
    COL.BG, window.Width, headerHeight);
// Cover/header are redrawn AFTER _drawScrollText (the function covers overflow with FillSolidRect)

// Scrollbar:
_drawScrollbar(gr, viewH, fullTextH, scrollY, maxScrollY, window.Width, headerHeight, COL.SCROLLBAR);
```

### 7.4. Scrollbar Rendering

Standard scrollbar via shared `_drawScrollbar()`:

```javascript
_drawScrollbar(gr, viewH, contentH, scrollY, maxScrollY, panelW, headerH, color);
```

Internally uses: `barH = Math.max(_scale(20), (viewH / contentH) * viewH)`, `barY = headerH + (scrollY / maxScrollY) * (viewH - barH)`, then draws via `gr.FillRoundRect()`.

### 7.5. Resource Cleanup

Every script MUST implement `on_script_unload()`:

```javascript
function on_script_unload() {
    _measureDispose();                                    // lib/utils.js
    _disposeImageDict(images);                             // lib/interaction.js
    sourceIconCache.clear();                               // lib/data.js
    if (carousel.timer) { window.ClearInterval(carousel.timer); carousel.timer = null; }
    // cover_panel.js: dispose cached images + clear LRU cache
    for (let entry of coverCache._map.values()) {
        if (entry && entry.imgRounded && typeof entry.imgRounded.Dispose === "function")
            entry.imgRounded.Dispose();
    }
    coverCache.clear();
}
```

**Which panels use which cleanup:**

| Panel | `_measureDispose` | `_disposeImageDict` | `SourceIconCache.clear` | Timer clear |
|-------|--------------------|-----------------------|-------------------------|-------------|
| info+rating.js | Yes | Yes (STAR_ICONS) | Yes | — |
| album_info.js | Yes | Yes (LINK_ICONS) | Yes | Yes |
| biography.js | Yes | Yes (LINK_ICONS) | — | Yes |
| panel_title.js | Yes | Yes (images) | — | — |
| playback_buttons.js | — | Yes (images) | — | — |
| control_buttons.js | — | Yes (images) | — | — |
| cover_panel.js | — | — | — | — |

### 7.6. Data Initialization Pattern

Scripts check both selection and now-playing on load:

```javascript
let initSelection = fb.GetSelection();
if (initSelection) {
    reloadData(initSelection);
} else if (fb.IsPlaying) {
    reloadData(fb.GetNowPlaying());
}
```

### 7.7. ActiveX for External Links

`biography.js` uses ActiveX to open URLs (lazily instantiated only on click):

```javascript
const WshShell = new ActiveXObject("WScript.Shell");
WshShell.Run(btn.url);
```

### 7.8. Popup Menu Pattern

```javascript
const menu = window.CreatePopupMenu();
menu.AppendMenuItem(MF_STRING, id, "Menu Item");
const idx = menu.TrackPopupMenu(x, y);
if (idx > 0) { /* handle selection */ }
```

Use `MF_STRING` (from `lib/data.js`) as the default menu item flag. No `.Dispose()` on menus.

### 7.9. Playcount Component Dependency

`info+rating.js` checks for optional component:

```javascript
const HAS_PLAYCOUNT = utils.CheckComponent("foo_playcount", true);
```
Rating stars are only interactive when this component is present.

## 8. Interaction Guidelines

- When asked for code, provide the full, ready-to-run snippet or the specific function requested.
- Prioritize code efficiency (minimizing `window.Repaint()` calls, using `RepaintRect` when possible).
- Follow existing patterns in the project — do not introduce new abstractions or patterns unless necessary.
- Match the Chinese/English mixed comment style used throughout the project.
