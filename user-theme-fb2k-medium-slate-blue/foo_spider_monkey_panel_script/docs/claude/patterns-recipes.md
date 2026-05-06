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

## 5. Background Controller Pattern (`lib/background.js`, `cover_panel.js`, `tab_stack.js`)
- Integration entry: prefer `createPanelBackgroundAutoController(...)`; keep `createPanelBackgroundController(...)` as low-level primitive.
- Compatibility rule: `backgroundAuto.sync()` must remain usable for panels without pre-fetched cover bitmaps (e.g. `tab_stack.js`).
- Reuse rule: when panel already has `rawImg` (e.g. `cover_panel.js`), pass it to background sync to avoid duplicate `GetAlbumArtV2`.
- Resize rule (`cover-image`): prefer reusing last synced raw image before fallback fetching.
- Paint order: background first, then foreground cover/fallback text.
- Keep extraction, scaling, blur out of `on_paint`.

### 5.1 Cover-driven cache and fast-path recipe
- Keep negative-cache sentinel (`artMissing`) for no-cover tracks.
- For same-track repeated callbacks, allow fast-return when display state is already settled.
- If cache owns bitmap disposal via eviction/clear callback, do not add secondary dispose path.

### 5.2 Gradient span recipe (`_extractImageColors`)
- Shared function: `lib/utils.js::_extractImageColors(img, useGradient, fallbackColor, gradientSpan)`.
- Backward compatibility: omit `gradientSpan` == default span `2` (same behavior as previous first+second color).
- Span rule: `gradientSpan` minimum `2`; non-number/invalid values fallback to `2`.
- Selection rule (`useGradient=true`):
  - `c1` = first color
  - `c2` = color at index `span - 1` (e.g. span=5 => 1st + 5th)
  - if not enough colors, fallback to last available color
- Single-color rule (`useGradient=false`): `c2 = c1`.
- Config path: `lib/background.js` reads `gradient.span`; panel-level config can expose `background.gradient.span` (e.g. `cover_panel.js`).

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
