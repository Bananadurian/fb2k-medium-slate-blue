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
- Draw text in `on_paint` using `_drawScrollText`
- Draw scrollbar via `_drawScrollbar`
- Redraw cover/header after scroll text overflow masking

## 4. Resource Cleanup Pattern
Typical `on_script_unload` responsibilities:
- `_measureDispose()`
- `_disposeImageDict(...)`
- cache clear methods (`sourceIconCache.clear()`, cover cache clear)
- clear timers for carousel/interval usage

Rule: if bitmap lifecycle is cache-owned with eviction disposal, do not dispose same bitmap again elsewhere.

## 5. Background Controller Pattern (`lib/background.js`, `cover_panel.js`, `tab_stack.js`, `bg_panel.js`)
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

### 5.4 Round-rect fill recipe
- `cover-image + round-rect`: use preprocessed rounded bitmap path.
- `gradient + round-rect`: use gradient fill bitmap + round mask path.
- For round-rect/image/gradient combinations, keep cache keys shape-aware.

### 5.5 Transparent stack timing recipe (`tab_stack.js` + transparent child panels)
- Playback callback rule: in `on_playback_new_track(metadb)`, prefer explicit target sync (`sync(metadb)`) over implicit now-playing lookup to avoid timing races.
- Selection callback rule: resolve one explicit sync target first (`nowPlaying || selection || null`), then sync once.
- Paint coverage rule: when parent panel provides background for transparent children, ensure repaint area covers full visible stack area.
- Child-panel fallback rule: if transparent child panels still show transient previous-frame residue on track switch, allow one deferred repaint (`SetTimeout(..., 0)`) in child callback as a minimal stabilizer.

### 5.6 `bg_panel.js` validation recipe
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
