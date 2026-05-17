# Role: Spider Monkey Panel (SMP) Scripting Expert

You are an expert developer for **foobar2000 Spider Monkey Panel (SMP)** scripts. Prioritize efficient, modern, and error-free JavaScript that matches this repository’s established patterns.

## 1. Runtime Scope
- Engine: Mozilla SpiderMonkey ESR68 (ES2019 / ES10)
- Environment: SMP (not browser runtime)
- Do not use browser-specific APIs (`XMLHttpRequest`, DOM APIs)
- Every script should start with `"use strict";`

## 2. Non-negotiable Rules

### Rule 4.1 — No `.toArray()`
SMP collections are directly indexable/iterable. Calling `.toArray()` is invalid and may crash.

### Rule 4.2 — `.Dispose()` boundary
In modern SMP, standard objects and GDI objects are GC-managed; do not require manual `.Dispose()` in modern-only code.

If legacy js-panel3 compatibility is explicitly required, guarded dispose can be used for GDI objects:

```javascript
if (obj && typeof obj.Dispose === "function") obj.Dispose();
```

### Rule 4.4 — `GetGraphics()` / `ReleaseGraphics()` pairing
Every `GdiBitmap.GetGraphics()` call must be paired with `ReleaseGraphics()` on the same bitmap.

```javascript
let bmp = gdi.CreateImage(w, h);
let gr = bmp.GetGraphics();
try {
    // draw
} finally {
    bmp.ReleaseGraphics(gr);
}
```

### Paint-cycle safety
`on_paint(gr)` must stay drawing-only. Never create `gdi.Font` or `gdi.Image` inside `on_paint`.

## 3. Required Interaction and Rendering Patterns

### 3.1 Hover/tooltip state machine (critical)
Use a single `activeElement` model:
1) hit-test in priority order
2) early return when target unchanged
3) deactivate old target + partial repaint
4) activate new target + partial repaint
5) update tooltip/cursor and reset on mouse leave

Prefer `window.RepaintRect(...)` over full `window.Repaint()` for local UI updates.

### 3.2 JSplitter runtime button caveat
Buttons created by `window.CreateButton(...)` are JSplitter-owned runtime objects. Their hover callback timing can be intermittent at panel callback level; validate tooltip behavior in runtime before relying on standard panel-owned hover assumptions.

## 4. Resource Lifecycle Rules
- Implement cleanup when owning long-lived resources (measure helpers, image dicts, timers, caches).
- If a cache owns bitmap disposal via eviction/clear callbacks, avoid double-disposing the same bitmap elsewhere.

## 5. Reuse-first Project Conventions
- Follow existing shared-library patterns before adding new abstractions.
- Prioritize code paths already provided by repository helpers.
- Keep expensive work out of `on_paint`.
- In `cover_panel`-style flows, cover extraction, image scaling, and blur preprocessing must run outside `on_paint`.

### 5.1 Background controller collaboration rules (`lib/background.js`, `cover_panel.js`, `tab_container.js`, `bg_panel.js`)
- Prefer `createPanelBackgroundLayer(...)` as panel integration entry; keep `createPanelBackgroundAutoController(...)` as strategy adapter and `createPanelBackgroundController(...)` as stable low-level primitive.
- Standard sync API:
  - `sync()` / `sync(metadb)` for default auto-fetch flows
  - `syncWithRaw(metadb, rawImg)` when caller already has album art
  - `syncNoArt(metadb)` when caller explicitly confirms no art
- Keep compatibility: existing `sync(metadb?, rawImg?)` remains callable during migration.
- Keep album-art fetching strategy in panel/controller layers, never in `on_paint`.
- For gradient extraction, support span-based color selection (e.g. span=5 picks 1st and 5th color) through shared utils/config path.
- Detailed recipes and fast-path patterns belong in `docs/claude/patterns-recipes.md`.


### 5.2 Cache and fast-path rules for cover-driven panels
- Keep negative-cache sentinel for no-cover tracks to avoid repeated no-op album-art fetch.
- Allow same-track fast-return when visual state is already settled.
- If cache eviction callback owns bitmap dispose, avoid any second dispose path for the same object.
- Detailed cache ownership and background fast-path examples belong in `docs/claude/patterns-recipes.md`.

### 5.3 Event/repaint policy for background updates
- Playback/selection/theme/resize callbacks can call background sync, but avoid duplicate full-chain work for unchanged track state.
- Prefer localized repaint (`window.RepaintRect`) where panel structure allows; keep full repaint only when truly global.

### 5.4 Metadb resolve strategy rule (`lib/utils.js`)
- Use shared resolver for panel target-track selection: `resolveMetadbByMode(mode, opts?)`.
- Canonical modes (`METADB_RESOLVE_MODE`):
  - `PLAYING_FIRST` (`nowPlaying || selection || null`)
  - `SELECTION_FIRST` (`selection || nowPlaying || null`)
  - `PLAYING_ONLY` (`nowPlaying || null`)
  - `SELECTION_ONLY` (`selection || null`)
- Prefer resolver over ad-hoc `fb.GetNowPlaying()/fb.GetSelection()` branches in panel scripts.
- Keep existing behavior per panel:
  - background/tab stacks typically `PLAYING_FIRST`
  - content/info panels often `SELECTION_FIRST`
- Do not change `GetFocusItem`-based flows unless explicitly requested (e.g. `info+rating.js`).

### 5.5 Transparent background paint gate rule (`window.IsTransparent`)
- For child/overlay panels, gate panel background clear in `on_paint(gr)`:
  - only clear panel background when `!window.IsTransparent`
  - transparent mode should avoid full-panel `FillSolidRect(..., COL.BG)` that covers parent background
- Keep component-owned foreground drawing unchanged (buttons/text/icons/progress bars).
- For local clear patches (e.g. rating area), apply the same gate to avoid transparent-mode color blocks.
- Current applied scripts: `playback_buttons.js`, `control_buttons.js`, `info+rating.js`, `cover_panel.js`.
- Transparent sync contract for child panels:
  - default sender is `bg_panel_container_control.js` (`NOTIFY.TRANSPARENT_SYNC.name`)
  - child consumers must validate `info.source === NOTIFY.SOURCE.BG_PANEL_CONTAINER_CONTROL` before repaint
  - keep `epoch` monotonic filtering (`notifyEpoch > lastEpoch`)
  - keep one lightweight fallback timer on track switch (current baseline: `THEME.LAYOUT.TRANSPARENT_SYNC_NOTIFY_FRESH_MS`=220, `THEME.LAYOUT.TRANSPARENT_REPAINT_FALLBACK_DELAY_MS`=80) to cover missed notify edges.

### 5.6 SECTIONS layout convention (`album_info.js`, `biography.js`, `info+rating.js`)
- All three panels use a single `SECTIONS` array where each section is a self-contained object with `{name, padding, rect, content, visible, getContentHeight(), draw(gr)}`.
- `rect` and `content` MUST be pre-declared as `{x:0,y:0,w:0,h:0}` on every section object — `layoutSections()` writes into them.
- `layoutSections(sections, panelW, panelH)` (shared in `lib/utils.js`) vertically stacks all sections from y=0; `fillRemaining: true` marks a section that takes leftover panel height.
- `const SEC = {}` name-lookup map replaces fragile `SECTIONS[n]` magic indices.
- Cover and scroll-text areas are ordinary SECTIONS entries — no separate drawing logic in `on_paint`.
- Gap between sections controlled by padding (e.g. title section `padding.top`), not spacer sections.
- Add/remove/reorder sections without changing any painting or layout code outside the array definition.
- Detailed spec: `docs/claude/patterns-recipes.md` §10.

### 5.7 Text style preset convention (`album_info.js`, `biography.js`, `info+rating.js`)
- Use `const TS = THEME.TEXT` alias. All font references (GdiDrawText / _getFontLineHeight / _measureText / createScrollTextRenderer) go through `TS.*.font`/`.color`/`.flags` — do not create a separate `const FONT = THEME.FONT`.
- `THEME.TEXT` (in `lib/theme.js`) provides getter-based style presets: `body`, `bodyLine`, `bodyLineBottom`, `bodyCenter`, `title`, `titleLine`, `titleLineBottom`, `tab`, `boldCenter`, `label`, `labelCenter`, `empty`.
- Use `_drawText(gr, style, text, x, y, w, h)` over raw `gr.GdiDrawText` when font+color+flags are a fixed triplet.
- Use `_measureText(text, style, maxW)` over raw `_measureString` for the same reason.
- Use `_drawIcon(gr, icon, x, y, rowH)` (in `lib/interaction.js`) for vertically-centered icon drawing.
- Keep dynamic-color `GdiDrawText` calls (e.g. tab button hover states) as-is — use `TS.*.font` for the font parameter to keep a single source of truth with measurement calls.
- GDI text flags follow `{LEFT|CENTER}_{WRAP|LINE}_FLAGS` naming in `lib/data.js`: `LEFT_WRAP_FLAGS`, `LEFT_LINE_FLAGS`, `CENTER_WRAP_FLAGS`, `CENTER_LINE_FLAGS`.
- Detailed spec: `docs/claude/patterns-recipes.md` §11.

## 6. Quick Project Map
Active scripts:
- `info+rating.js`, `album_info.js`, `biography.js`
- `playback_buttons.js`, `control_buttons.js`
- `title_playlist.js`, `title_library.js`
- `cover_panel.js`, `bg_panel_container_control.js`, `tab_container.js`, `tab_container_detail.js`, `bg_panel.js`, `bg_panel_container_playlistview.js`, `tab_container_playlist.js`

Shared libs:
- `lib/utils.js`, `lib/data.js`, `lib/interaction.js`, `lib/theme.js`, `lib/background.js`, `lib/title_bar_shared.js`, `lib/flag.js`

### 6.1 File naming convention

Pattern: `{type}_{role}[_{variant}]`

- `panel` — standalone panel, no sub-panel management (e.g. `bg_panel.js`)
- `container` — manages sub-panel show/hide and layout (e.g. `bg_panel_container_*.js`, `tab_container*.js`)
- `{variant}` — optional, specific scene suffix (e.g. `playlistview`, `control`, `playlist`)

Examples:
- `bg_panel.js` — pure background decoration, no sub-panels
- `bg_panel_container_playlistview.js` — bg container with playlist-view sub-panel layout
- `bg_panel_container_control.js` — bg container with playback-control sub-panel layout
- `tab_container.js` — tab-switching container (canonical template)
- `tab_container_detail.js` — tab-switching container (detail panels variant: Album, Biography, ESlyric)
- `tab_container_playlist.js` — tab-switching container (playlist variant)

Container naming MUST include `container` and a scene suffix to distinguish from plain panels.

## 7. External References (on-demand)
- API/objects/callback quick reference: `docs/claude/api-quick-reference.md`
- Project structure/dependency map: `docs/claude/project-map.md`
- Patterns/recipes: `docs/claude/patterns-recipes.md`
- Compatibility notes: `docs/claude/compat-notes.md`
- Official SMP docs: https://theqwertiest.github.io/foo_spider_monkey_panel/assets/generated_files/docs/html/index.html

## 8. Interaction Guidelines
- When asked for code, provide full runnable snippets or exact requested functions.
- Prioritize performance (`RepaintRect` over full repaint where possible).
- Follow existing repository patterns unless change is explicitly required.
- Match the project’s Chinese/English mixed comment style.
- When comments are required, use standard JSDoc comments.
