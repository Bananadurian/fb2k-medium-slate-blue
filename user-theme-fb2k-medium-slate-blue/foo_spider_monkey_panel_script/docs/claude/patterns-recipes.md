# Patterns and Recipes

## 1. Hover State Machine
Use a single `activeElement` flow:
1) hit-test in priority order
2) if unchanged, early return
3) deactivate previous element + partial repaint
4) activate target + partial repaint + tooltip/cursor updates
5) clear in `on_mouse_leave`

Critical: use `_hitTest` and `_setCursor`; keep repaint scope minimal via `window.RepaintRect`.

For anti-aliased rounded fills or text-heavy controls, compute dirty area as old/new rect union and apply a small DPI-aware bleed (e.g. `Math.max(1, _scale(1))`) to avoid edge residue when controls shrink or move.

## 2. Tooltip Rules
- Standard panel-owned widgets: tooltip follows the hover state machine.
- JSplitter runtime buttons (`window.CreateButton`) may not always produce stable `on_mouse_move/on_mouse_leave` sequences; validate in runtime before relying on panel-level tooltip logic.
- For JSplitter runtime button flows, prefer localized repaint (`RepaintRect` or button-local repaint); avoid full `window.Repaint()` for hover-only updates.

## 3. Scroll Text Pattern
- Pre-measure text height with `_measureString`
- Compute `maxScrollY`
- Use `createScrollTextRenderer(font, color, flags, padding)` factory:
  - `ensure(text, panelW, fullTextH)` in `createTextBuffer` — creates pre-rendered bitmap
  - `draw(gr, scrollY, destX, destY, destW)` in section draw — explicit destination rect (signature v2, no longer computes from internal padding)
  - `contentW(panelW)` for layout measurement
  - `dispose()` in `on_script_unload`
- Share `SCROLL_TEXT_PADDING` between factory creation and SECTIONS scrollText section for consistent layout
- Draw scrollbar via `_drawScrollbar`
- Bitmap sub-rect clipping replaces `FillSolidRect` overflow masking (works in both transparent & non-transparent modes)

## 4. Resource Cleanup Pattern
Typical `on_script_unload` responsibilities:
- `_measureDispose()`
- `_disposeImageDict(...)`
- cache clear methods (`sourceIconCache.clear()`, cover cache clear)
- clear timers for carousel/interval usage

Rule: if bitmap lifecycle is cache-owned with eviction disposal, do not dispose same bitmap again elsewhere.

## 5. Background Controller Pattern (`lib/background.js`, `cover_panel.js`, `tab_container.js`, `bg_panel.js`)
- Integration entry: prefer `createPanelBackgroundLayer(...)`.
- Architecture layering:
  - `createPanelBackgroundController(...)` as low-level rendering/cache primitive
  - `createPanelBackgroundAutoController(...)` as source-hint + sync strategy adapter
  - `createPanelBackgroundLayer(...)` as panel-facing paint/sync wrapper
- Standard sync API:
  - `sync()` / `sync(metadb)` for default auto-fetch path
  - `syncWithRaw(metadb, rawImg)` to avoid duplicate fetch when caller already has art
  - `syncNoArt(metadb)` when caller explicitly confirms no art
- Compatibility rule: legacy `sync(metadb?, rawImg?)` remains callable during migration and internally bridges to the standard API.
- Keep panel-side config style aligned (`cover_panel.js` / `tab_container.js` / `bg_panel.js`) using flat fields (e.g. `gradientEnabled`, `imageScaleMode`, `shapeType`, `maskAlpha`), then map into `background.gradient/image/shape/mask` when calling `createPanelBackgroundLayer(...)`.
- This keeps panel configs readable while preserving the stable background controller input contract.
- Reuse rule: when panel already has `rawImg` (e.g. `cover_panel.js`), prefer `syncWithRaw(...)`.
- Paint order: background first, then foreground cover/fallback text.
- Keep extraction, scaling, blur out of `on_paint`.

### 5.1 Source hint and fetch behavior (`lib/background.js`)
- Internal source hints:
  - `BG_SOURCE_AUTO_FETCH`
  - `BG_SOURCE_PROVIDED_RAW`
  - `BG_SOURCE_EXPLICIT_NO_ART`
- Fetch behavior contract:
  - Auto path may call `getAlbumArt(...)` when needed.
  - Provided-raw path never fallback-fetches.
  - Explicit-no-art path never fallback-fetches.

### 5.2 Cover-driven cache and fast-path recipe
- Keep negative-cache sentinel (`artMissing`) for no-cover tracks in caller-owned caches when applicable.
- For same-track repeated callbacks, allow fast-return when display state is already settled.
- In `cover-color` mode, prefer color cache hit before fetching art.
- If cache owns bitmap disposal via eviction/clear callback, do not add secondary dispose path.

### 5.3 Resize rule (`cover-image`)
- On resize, prefer reusing last synced raw image.
- If no reusable image exists, only auto-fetch when last sync strategy was auto-fetch.
- Skip rebuild when target size is unchanged.
- Keep a render signature fast-path (track/size/source/raw-state) to skip repeated same-input rebuilds.
- Keep auto-fetch miss suppression for no-art tracks to avoid repeated fetch attempts during continuous resize.

### 5.4 Round-rect fill recipe
- `cover-image + round-rect`: use preprocessed rounded bitmap path.
- `gradient + round-rect`: use gradient fill bitmap + round mask path.
- For round-rect/image/gradient combinations, keep cache keys shape-aware.

### 5.5 Metadb resolve strategy recipe (`lib/utils.js`)
- Shared API:
  - `METADB_RESOLVE_MODE.PLAYING_FIRST`
  - `METADB_RESOLVE_MODE.SELECTION_FIRST`
  - `METADB_RESOLVE_MODE.PLAYING_ONLY`
  - `METADB_RESOLVE_MODE.SELECTION_ONLY`
  - `resolveMetadbByMode(mode, opts?)`
- Recommended mapping:
  - background owners (`bg_panel.js`, `tab_container.js`) -> `PLAYING_FIRST`
  - selection-driven content panels (`cover_panel.js`, `album_info.js`, `biography.js`) -> `SELECTION_FIRST`
  - startup/init now-playing probe -> `PLAYING_ONLY`
- Optional `opts` shape: `{ now?: FbMetadbHandle|null, selection?: FbMetadbHandle|null }`.
  - Use `opts` when caller already has resolved values to avoid duplicate state reads.
- Migration rule:
  - Replace duplicated `if (selection) ... else if (fb.IsPlaying) ...` branches with a single resolver call.
  - Keep panel empty-state behavior unchanged (only replace target resolve step).

### 5.6 Transparent panel background gate recipe (`window.IsTransparent`)
- Goal: avoid child panels painting full opaque background over parent-provided background.
- Rule:
  - in `on_paint(gr)`, clear full panel background only when `!window.IsTransparent`
  - transparent mode should skip full-panel `FillSolidRect(..., COL.BG)`
- Keep foreground/component drawing unchanged (buttons/text/icons/volume/cover/labels).

#### 5.6.1 Typical code pattern
```javascript
function on_paint(gr) {
    if (!window.IsTransparent) {
        gr.FillSolidRect(0, 0, window.Width, window.Height, COL.BG);
    }
    // draw foreground components
}
```

#### 5.6.2 Local clear-patch gate (rating/progress areas)
- If panel contains local clear patches (e.g. rating area), gate them with the same condition:
  - `if (!window.IsTransparent) { gr.FillSolidRect(localRect...) }`
- Prevents transparent mode from showing rectangular color blocks while keeping non-transparent behavior unchanged.

#### 5.6.3 Applied examples in this repo
- `playback_buttons.js`: panel background clear is gated.
- `control_buttons.js`: panel background clear is gated.
- `info+rating.js`: panel background clear + rating-area clear patch are gated.
- `cover_panel.js`: `backgroundAuto.paint(gr)` is gated to non-transparent mode.

### 5.7 Transparent stack timing recipe (`bg_panel_container_control.js` + transparent child panels)
- Playback callback rule: in parent background owner, prefer explicit target sync (`sync(metadb)` equivalent path) to avoid timing races.
- Selection callback rule: resolve one explicit sync target first (`nowPlaying || selection || null`), then sync once.
- Paint coverage rule: when parent panel provides background for transparent children, ensure repaint area covers full visible stack area.
- Child-panel fallback rule: keep one deferred repaint fallback in child callback as a missed-notify guard; avoid multi-stage retry chains.
- Notify-driven rule (recommended for rapid switching): parent background owner publishes via `window.NotifyOthers(NOTIFY.TRANSPARENT_SYNC.name, payload)` after sync+repaint, transparent children consume in `on_notify_data` and repaint only their own rect.
- **Shared constants** in `lib/data.js`: `NOTIFY.TRANSPARENT_SYNC` (channel name + version), `NOTIFY.SOURCE` (unique sender identifiers). Do not redefine `TRANSPARENT_SYNC_NOTIFY` / `BG_TRANSPARENT_SYNC_NOTIFY` locally.
- Baseline sender/consumer split (current project):
  - sender: `bg_panel_container_control.js`
  - consumers: `playback_buttons.js`, `control_buttons.js`, `cover_panel.js`, `info+rating.js`
  - consumers filter `source === NOTIFY.SOURCE.BG_PANEL_CONTAINER_CONTROL`.

#### 5.7.1 Notify contract (`NOTIFY.TRANSPARENT_SYNC`)
- Channel: `NOTIFY.TRANSPARENT_SYNC.name` (`"fb2k.theme.transparent_sync"`), version `NOTIFY.TRANSPARENT_SYNC.version` (`1`).
- Payload fields: `{ v, source, event, epoch, ts, trackKey?, targetPanel? }`.
- `epoch` must be monotonic per source; consumer should ignore stale/duplicate epochs.
- `targetPanel` is optional — use when notification targets a specific panel.
- If multiple senders share a notify name, consumer must check `source` before processing.

#### 5.7.2 SMP `NotifyOthers/on_notify_data` safety
- After `window.NotifyOthers(name, info)`, sender must not reuse or mutate `info`.
- `info` is only valid inside `on_notify_data`; do not store raw `info` reference.
- If persistence is needed, copy primitive fields (or deep-copy serializable data) inside callback.
- `info` is shared across panels; receivers must treat it as read-only.

#### 5.7.3 Known limitation: nested JSplitter transparent sync
- 已知现象：`JSplitter -> JSplitter -> 普通组件` 的伪透明链路在重启/快速切歌时，仍可能出现瞬时背景不同步。
- 结论：这更接近 SMP/JSplitter 内部时序限制，不是业务脚本逻辑可完全消除的问题。
- 范围对比：`JSplitter -> 普通组件`（单层）通常可稳定工作；问题主要集中在双层 JSplitter 嵌套场景。
- 当前策略：保留 notify + epoch + 单次局部兜底重绘，不再继续叠加激进 timer/重试补丁。

#### 5.7.4 Current fallback baseline (`bg_panel_container_control` consumers)
- `THEME.LAYOUT.TRANSPARENT_SYNC_NOTIFY_FRESH_MS = 220`
- `THEME.LAYOUT.TRANSPARENT_REPAINT_FALLBACK_DELAY_MS = 80`
- 目的：优先走 notify，fallback 仅在短窗内未收到新 notify 时触发。


#### 5.7.5 Plugin-restart first-frame background failure recipe (`bg_panel.js`)
- 适用症状：重启 SMP 或重载脚本后，透明子组件（如 waveform）首帧/短时间显示灰底或旧底图。
- 根因判断：初始化阶段背景同步与原生组件伪透明重捕获时序错位。
- 固定方案（当前基线）：
  - 启动即执行一次背景同步：`init() -> scheduleBackgroundSync()`。
  - 启动即触发双阶段 native re-capture kick：`init() -> triggerStartupChildRefreshKick()`。
  - 在 `on_playback_starting(cmd===1)` 重置并重放 kick，覆盖“停止后重新开始”路径。
  - 所有延迟同步使用 `epoch` 废弃旧请求，避免重启瞬间旧 timer 回写新状态。
- 参数建议：主延迟 `THEME.LAYOUT.BG_TRANSPARENT_SYNC_DELAY_MS`(75ms)，补偿延迟 `THEME.LAYOUT.BG_TRANSPARENT_SYNC_LATE_DELAY_MS`(180ms)，启动 kick 额外偏移约 `+160ms / +200ms`。
- 收敛原则：优先这套固定时序；仅在可复现证据充分时微调延迟，不新增多层重试链。

### 5.8 `bg_panel.js` validation recipe
- `bg_panel.js` is the dedicated validation panel for new background APIs.
- Right-click menu is intentionally removed; change `PANEL_CFG` manually for deterministic testing.
- Recommended manual matrix:
  - mode: `theme` / `cover-color` / `cover-image`
  - shape: `rect` / `round-rect`
  - fill: gradient on/off
  - sync mode: `SYNC_MODE_AUTO` / `SYNC_MODE_WITH_RAW` / `SYNC_MODE_NO_ART`
- Expected behavior:
  - `SYNC_MODE_NO_ART` with `cover-image` should not show cover image (falls back to theme/base color).


## 6. Performance Tuning Checklist
- Repaint scope: prefer `window.RepaintRect(x, y, w, h)` over full `window.Repaint()`.
- Paint-cycle rule: keep `on_paint(gr)` draw-only; precompute data/text/images in non-paint callbacks.
- Visibility guard: for timer/animation-heavy panels, skip update loops when `!window.IsVisible`.
- Timer cadence: avoid unnecessary high-frequency timers; ~16ms is 60 FPS ceiling, use slower intervals when animation smoothness allows.
- Resource lifecycle: create/reuse long-lived fonts/images outside `on_paint`; clear timers/caches in `on_script_unload`.
- Profiling first: use `performance.now()` around suspicious hot paths before changing rendering quality knobs.

### 6.1 Optional rendering/perf knobs (keep as opt-in)
- `window.DrawMode = 1` (Direct2D) can be used as an optional acceleration experiment for draw-heavy panels.
- Lower interpolation quality can be used in image-heavy views when frame rate is more important than sharpness.
- Simpler text rendering modes can be used in text-dense panels when readability remains acceptable.

### 6.2 Optional memory pressure control
- `collectGarbage()` may be used as a targeted/manual relief step after large dataset or artwork churn.
- Do not treat manual GC as a routine per-frame/per-event operation.

### 6.3 Project-specific defaults and caveats
- This project’s first-line optimization remains partial repaint + cache reuse; quality downgrades are secondary.
- Do not force global rendering switches in script docs as mandatory defaults; treat them as optional experiments per panel.
- Keep compatibility guidance aligned with `docs/claude/compat-notes.md` and avoid recommending broad manual GC/dispose patterns as routine steps.

## 7. Title Bar Shared Controller Pattern
`title_playlist.js` and `title_library.js` should remain thin wrappers over `createTitleBarController(cfg)`:
- script-local config only
- callback delegation one-line pass-through
- injected `onButtonClick` behavior from caller

## 8. Data Init Pattern
On load, prefer selection first; fallback to now playing if available.

## 9. Menu/ActiveX Recipes
- Popup menu: `window.CreatePopupMenu()` + `AppendMenuItem` + `TrackPopupMenu`
- External links (biography): `new ActiveXObject("WScript.Shell")` created lazily on click

## 10. SECTIONS Layout Pattern (`album_info.js`, `biography.js`)

Define self-contained area objects in a `SECTIONS` array. Each section owns its own `padding`, `getContentHeight()`, and `draw(gr)`. A shared `layoutSections(panelW, panelH)` vertically stacks them from y=0.

### 10.1 Section object shape
```js
{
    name: "sectionName",           // unique name, used for SEC lookup
    padding: { top, right, bottom, left },  // box-model padding
    rect:    { x:0, y:0, w:0, h:0 },        // computed by layoutSections
    content: { x:0, y:0, w:0, h:0 },        // rect inset by padding
    visible: true,                 // false → rect.h=0, skip drawing
    fillRemaining: false,          // if true, takes remaining panelH
    getContentHeight() { ... },    // returns content height (unpadded)
    draw(gr) { ... },              // uses this.content.* coordinates
}
```

### 10.2 layoutSections(sections, panelW, panelH) — in `lib/utils.js`

Shared function (single copy, all panels). Stacks all visible sections from y=0.

Each section object MUST pre-declare `rect: {x:0,y:0,w:0,h:0}` and `content: {x:0,y:0,w:0,h:0}` — these are written by layoutSections, not auto-created.

- `fillRemaining` section gets `rect.h = panelH - currentY`
- Non-fill sections use `rect.h = getContentHeight() + padding.top + padding.bottom`
- Invisible sections (`visible === false`): `rect.h = 0`, content zeroed
- No return value — dimensions readable via `SEC.*.rect` / `SEC.*.content`
- **CRITICAL: `rect` and `content` are write-once by `layoutSections()`. Never mutate them in `syncLayout()` or any per-track path.** Computing tight-fit hit-test bounds from the stable base rect is fine; use a separate state variable (e.g. `elements.badgeGroup` in `album_info.js`, `trackText.*` in `info+rating.js`). Mutating `content.x` and re-reading it on the next call causes cumulative drift.

Full JSDoc with section shape spec: `lib/utils.js` `layoutSections()`.

### 10.3 SEC lookup map
```js
const SEC = {};
SECTIONS.forEach(function(sec) { SEC[sec.name] = sec; });
```
Replace fragile `SECTIONS[n]` magic indices with `SEC.title`, `SEC.cover`, `SEC.tab`, `SEC.scrollText`, etc.

### 10.4 Cover section recipe
- `padding: PANEL_CFG.coverPadding` (four-sided)
- `getContentHeight()` returns `rawH - padding.top - padding.bottom` where `rawH = panelW * aspectRatio`
- `draw()` draws carousel image into `this.content` + page indicator positioned via `_getFontLineHeight` + content rect

### 10.5 Scroll text section recipe
- `fillRemaining: true`, takes leftover panel height
- `padding` shared with `createScrollTextRenderer` via `SCROLL_TEXT_PADDING` constant
- `draw()` calls `scrollText.draw(gr, scrollY, this.content.x, this.content.y, this.content.w)` + `_drawScrollbar`
- `createTextBuffer()` reads `SEC.scrollText.content.w/h` for measurement and scroll limits

### 10.6 Gap control via padding
No spacer sections — gaps between adjacent sections controlled by neighboring sections' `padding.top`/`padding.bottom`. E.g. cover→title gap: title section's `padding.top: _scale(10)`.

### 10.7 Applied examples
- `album_info.js`: 8 sections (cover, title, badge, artist, genres, dateLang, tab, scrollText)
- `biography.js`: 8 sections (cover, title, aliases, genres, born, links, tab, scrollText)
- `info+rating.js`: 6 sections (spacer, title, artist, album, stars, badge) — centered compact layout via getter-based `visible`

## 11. Text Style Preset Pattern (`lib/theme.js`, `lib/interaction.js`, `lib/utils.js`)

Replace scattered `(font, COL.FG, flags)` triplets with named style presets plus thin wrapper functions. A single change to a preset propagates to all call sites.

### 11.1 Style presets (`THEME.TEXT` in `lib/theme.js`)

Getter-based objects ensure fresh font/color references after theme changes:

```js
THEME.TEXT = {
    get body()            { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: LEFT_WRAP_FLAGS }; },
    get bodyLine()        { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: LEFT_LINE_FLAGS }; },
    get bodyLineBottom()  { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: BOTTOM_LINE_FLAGS }; },
    get bodyCenter()      { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: CENTER_LINE_FLAGS }; },
    get title()           { return { font: THEME.FONT.TITLE, color: THEME.COL.SEL_FG, flags: LEFT_WRAP_FLAGS }; },
    get titleLine()       { return { font: THEME.FONT.TITLE, color: THEME.COL.SEL_FG, flags: LEFT_LINE_FLAGS }; },
    get titleLineBottom() { return { font: THEME.FONT.TITLE, color: THEME.COL.SEL_FG, flags: BOTTOM_LINE_FLAGS }; },
    get tab()             { return { font: THEME.FONT.BOLD,  color: THEME.COL.FG, flags: CENTER_WRAP_FLAGS }; },
    get boldCenter()      { return { font: THEME.FONT.BOLD,  color: THEME.COL.FG, flags: CENTER_LINE_FLAGS }; },
    get label()           { return { font: THEME.FONT.LABEL, color: THEME.COL.FG, flags: LEFT_LINE_FLAGS }; },
    get labelCenter()     { return { font: THEME.FONT.LABEL, color: THEME.COL.FG, flags: CENTER_LINE_FLAGS }; },
    get empty()           { return { font: THEME.FONT.BODY,  color: THEME.COL.FG, flags: CENTER_LINE_FLAGS }; },
};
```

### 11.2 Panel aliases

```js
const COL = THEME.COL;       // used when color-only access is needed (BG, FRAME, etc.)
const TS = THEME.TEXT;       // TextStyle shorthand — primary font+color+flags source
```
All font references (GdiDrawText / _getFontLineHeight / _measureText / createScrollTextRenderer) go through `TS.*.font`/`.color`/`.flags`. This keeps draw and measurement locked to the same TS preset — changing a font only requires updating one preset name.

### 11.3 Wrapper functions

- `_drawText(gr, style, text, x, y, w, h)` — in `lib/interaction.js`. Calls `gr.GdiDrawText(text, style.font, style.color, x, y, w, h, style.flags)`.
- `_measureText(text, style, maxW)` — in `lib/utils.js`. Calls `_measureString(text, style.font, maxW, style.flags)`.
- `_drawIcon(gr, icon, x, y, rowH)` — in `lib/interaction.js`. Vertically centers an icon of `THEME.LAYOUT.ICON_SIZE` within `rowH`.

### 11.4 Before/after

```js
// Before:
gr.GdiDrawText(text, THEME.FONT.BODY, COL.FG, x, y, w, h, LEFT_WRAP_FLAGS);
const m = _measureString(text, THEME.FONT.BODY, maxW, LEFT_WRAP_FLAGS);
gr.DrawImage(icon, x, y + Math.ceil((h - ICON_SIZE) / 2), ICON_SIZE, ICON_SIZE, 0, 0, icon.Width, icon.Height);

// After:
_drawText(gr, TS.body, text, x, y, w, h);
const m = _measureText(text, TS.body, maxW);
_drawIcon(gr, icon, x, y, h);
```

### 11.5 When NOT to use style presets

- Dynamic colors: tab button hover states, AQ badge colors — keep raw `GdiDrawText` with `TS.*.font` as the font source, aligning with `_getFontLineHeight` and `_measureText` calls that reference the same TS preset.
- Variable font/flags: `drawIconTextSection(gr, sec, text, font, flags)` — font and flags are call-time parameters.
- Non-text drawing: `_drawPageIndicator`, `_drawScrollbar`, `_drawEmptyState` — these have their own signatures.
