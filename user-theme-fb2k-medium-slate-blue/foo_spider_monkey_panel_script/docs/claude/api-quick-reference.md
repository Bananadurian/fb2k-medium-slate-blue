# SMP API Quick Reference

## 1. Environment
- Engine: SpiderMonkey ESR68 (ES2019 / ES10)
- Component: Spider Monkey Panel (not WSH/JScript Panel)
- No browser APIs (`XMLHttpRequest`, DOM)

## 2. Common Globals
### 2.1 `fb`
Playback, focused item, library query, titleformat, menu command, profiler, output device, ReplayGain mode.

### 2.2 `gdi`
- `gdi.CreateImage(w, h)`
- `gdi.Font(name, size, style)`
- `gdi.Image(path)`
- `gdi.LoadImageAsyncV2(window_id, path)`

### 2.3 `plman`
Playlist active/playing index, count, order, playlist item insertion/clear/find/create.

### 2.4 `utils`
File IO, component detection, album art sync/async, system color, duration formatting.

### 2.5 `window`
Repaint, color/font retrieval, cursor, popup menu, tooltip, script definition, timers.

- `window.GetProperty(name, default_val)` — 获取持久化属性值。若属性不存在且 `default_val` 非 `undefined`/`null`，则自动创建并写入默认值。属性名首尾空白会被裁剪。属性值按面板实例保存，跨 fb2k 重启保留。
- `window.SetProperty(name, val)` — 设置持久化属性值。若 `val` 为 `undefined` 或 `null`，则删除该属性。属性名首尾空白会被裁剪。属性值按面板实例保存，跨 fb2k 重启保留。

### 2.6 JSplitter extension
- Panel APIs: `GetPanel`, `GetPanelByIndex`
- Runtime button APIs: `CreateButton`, `RadioButtons`, `GetButton`, `RemoveButton`
- Track panel mouse callbacks require JSplitter tracking enabled.
- `window.IsTransparent` (boolean, read-only) — JSplitter 伪透明模式开关，由 `SupportPseudoTransparency` 配置项控制。为 true 时面板需跳过纯色背景填充（`FillSolidRect`），以透出下层内容。

## 3. Core Objects
- `FbMetadbHandle` / `FbMetadbHandleList`
- `FbTitleFormat`
- `GdiGraphics`
- `GdiBitmap`
- `MenuObject` / `ContextMenuManager`
- `FbTooltip`

## 4. Callback Catalog
### 4.1 Paint/Layout
`on_paint`, `on_size`, `on_colours_changed`, `on_font_changed`

### 4.2 Input
Mouse: move/leave/down/up/dblclk/wheel; keyboard: key down/up.

### 4.3 Playback & Playlist
Playback new track/stop/time/pause; playlist switch/items/selection/focus/change.

### 4.4 Other
Metadb changed, replaygain/output/volume/order changes, drag & drop callbacks.

## 5. Authoritative Links
- SMP docs: https://theqwertiest.github.io/foo_spider_monkey_panel/assets/generated_files/docs/html/index.html
- Project hard rules: `../../CLAUDE.md`
- Project patterns: `./patterns-recipes.md`
- Compatibility notes: `./compat-notes.md`
