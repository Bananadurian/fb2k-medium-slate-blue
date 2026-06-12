# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**fb2k-medium-slate-blue** is a foobar2000 v2.25.9 theme/configuration package based on Columns UI. The core scripting layer uses **Spider Monkey Panel (SMP)** with custom JavaScript panels.

This is a **portable foobar2000 profile directory** (`profile/`) that contains:
- Configuration files (`.cfg`, `.sqlite`, `.db`)
- Spider Monkey Panel scripts (`user-theme-fb2k-medium-slate-blue/foo_spider_monkey_panel_script/`)
- Theme assets (icons, flags, screenshots in `user-theme-fb2k-medium-slate-blue/imgs/`)
- Plugin configurations for Columns UI, ESlyric, visualizations, etc.

**Target Environment:**
- foobar2000 v2.25.9 (64-bit)
- Windows 11 (tested)
- Columns UI plugin required
- Spider Monkey Panel (foo_spider_monkey_panel) required

---

## Repository Structure

```
profile/
├── user-theme-fb2k-medium-slate-blue/
│   ├── foo_spider_monkey_panel_script/    # Core SMP scripts
│   │   ├── lib/                           # Shared libraries
│   │   │   ├── theme.js                   # Colors, fonts, layouts
│   │   │   ├── utils.js                   # DPI, colors, text measurement
│   │   │   ├── background.js              # Background controller
│   │   │   ├── interaction.js             # Mouse/hover handling
│   │   │   ├── data.js                    # Constants, flags
│   │   │   ├── flag.js                    # Country flag renderer
│   │   │   ├── title_bar_shared.js        # Title bar shared logic
│   │   │   └── json_schema_adapter.js     # JSON schema mapping template
│   │   ├── docs/                          # Documentation
│   │   │   ├── api/                       # API reference
│   │   │   └── claude/                    # Claude-specific docs
│   │   ├── *_panel.js                     # Panel scripts
│   │   ├── *_container*.js                # Container scripts
│   │   ├── *_buttons.js                   # Button panels
│   │   ├── *_info.js                      # Info panels
│   │   └── CLAUDE.md                      # SMP scripting guidelines
│   └── imgs/                              # Theme assets
│       ├── Flags/, js_panel3/, Links/, Lucide/, RadioCover/, Screenshots/
├── configuration/                         # Plugin configs
│   └── *.dll.cfg                          # Plugin-specific configs
├── theme.fth                              # Columns UI theme
├── config.sqlite                          # Main config database
└── README.md                              # User documentation

Excluded from indexing (.gitignore + .claudeignore):
- Large databases: metadb.sqlite (100MB), minibar.db (211MB)
- Runtime data: library-v2.0/, playlists-v2.0/, js_data/, *cache/
- Logs: crash reports/, library-error-log.txt
```

---

## Core Architecture

### Spider Monkey Panel Script System

**Runtime:** Mozilla SpiderMonkey ESR68 (ES2019/ES10)
- **Not** a browser environment — no DOM APIs or XMLHttpRequest
- All scripts must start with `"use strict";`

**Script Organization:**

1. **Panel scripts** (`*.js`) — Standalone UI panels
   - `track_info.js`, `album_info.js`, `biography.js` — Info panels
   - `playback_buttons.js`, `control_buttons.js` — Control panels
   - `cover_panel.js` — Album art panel
   - `bg_panel.js` — Background decoration panel

2. **Container scripts** (`*_container*.js`) — Manage sub-panel layout/visibility
   - `_tab_container.js` — Tab-switching template
   - `tab_container_detail.js` — Album/Biography/ESlyric tabs
   - `tab_container_playlist.js` — Playlist tabs
   - `bg_panel_container_control.js` — Background with playback controls
   - `bg_panel_container_playlistview.js` — Background with playlist view

3. **Shared libraries** (`lib/*.js`) — Must be included before panel scripts
   - `theme.js` — THEME object (colors, fonts, layouts, text presets)
   - `utils.js` — Utilities (DPI scaling, colors, text measurement, metadb resolution)
   - `background.js` — Background controller system (album art blur/gradient)
   - `interaction.js` — Mouse interaction helpers (hover, click, tooltip)
   - `data.js` — Constants (text flags, notify types, metadb modes)
   - `flag.js` — Country flag rendering
   - `title_bar_shared.js` — Title bar utilities

**Key Patterns:**

- **SECTIONS layout** (`album_info.js`, `biography.js`, `track_info.js`)
  - Single `SECTIONS` array with `{name, padding, rect, content, visible, getContentHeight(), draw(gr)}`
  - `layoutSections(sections, panelW, panelH)` from `lib/utils.js` handles vertical stacking
  - Name lookup via `const SEC = {}` map, not magic indices

- **Text style presets** (`THEME.TEXT` in `lib/theme.js`)
  - Use `const TS = THEME.TEXT` alias
  - Presets: `body`, `bodyLine`, `title`, `titleLine`, `tab`, `boldCenter`, `label`, `empty`
  - Helpers: `_drawText(gr, style, text, x, y, w, h)`, `_measureText(text, style, maxW)`

- **Metadb resolution** (`lib/utils.js`)
  - `resolveMetadbByMode(mode, opts)` for consistent track selection
  - Modes: `PLAYING_FIRST`, `SELECTION_FIRST`, `PLAYING_ONLY`, `SELECTION_ONLY`

- **Background controller** (`lib/background.js`)
  - Entry: `createPanelBackgroundLayer(...)`
  - Sync API: `sync()`, `syncWithRaw(metadb, rawImg)`, `syncNoArt(metadb)`
  - Supports album art blur/gradient extraction

- **Transparent mode** (`window.IsTransparent`)
  - Child panels gate background clear: `if (!window.IsTransparent) { gr.FillSolidRect(...); }`
  - Sync via `NOTIFY.TRANSPARENT_SYNC` from container

**Critical SMP Rules:**

- ❌ Never call `.toArray()` on SMP collections (they're directly iterable)
- ❌ Never create `gdi.Font` or `gdi.Image` inside `on_paint(gr)`
- ✅ Pair `GdiBitmap.GetGraphics()` with `ReleaseGraphics()` in try/finally
- ✅ Use `window.RepaintRect(...)` for localized updates (avoid full `window.Repaint()`)
- ✅ Keep paint-cycle drawing-only (no state changes, no resource creation)

**Full SMP guidelines:** See `user-theme-fb2k-medium-slate-blue/foo_spider_monkey_panel_script/CLAUDE.md`

---

## Configuration Files

**Main configuration:** `config.sqlite` (binary SQLite database)
- Contains panel layouts, plugin settings, UI state
- Modified by foobar2000 runtime — not hand-editable

**Plugin configs:** `configuration/*.dll.cfg`
- Binary `.cfg` files per plugin (Columns UI, ESlyric, ASIO, etc.)
- Modified via foobar2000 Preferences UI

**Theme file:** `theme.fth` (Columns UI theme)

**Ignored/Generated:**
- `metadb.sqlite` (100MB media library cache)
- `minibar.db` (211MB minibar plugin cache)
- `library-v2.0/`, `playlists-v2.0/` (user data)

---

## Development Workflow

### Working with SMP Scripts

**Editing scripts:**
1. Edit `.js` files in `user-theme-fb2k-medium-slate-blue/foo_spider_monkey_panel_script/`
2. In foobar2000: Right-click panel → Configure panel → Edit script or Reload
3. Changes take effect immediately on reload

**Testing:**
- Use foobar2000 Console (View → Console) for debug output via `console.log()`
- Use `fb.ShowPopupMessage()` for user-facing dialogs
- Monitor panel errors in Console

**Shared library changes:**
- When editing `lib/*.js`, reload all dependent panels
- Check `CLAUDE.md` in script directory for dependency rules

### Version Control

**Committed:**
- All `.js` panel scripts and libraries
- Theme assets (`imgs/`)
- `theme.fth`, `README.md`, `version.txt`, `LICENSE`

**Ignored (`.gitignore`):**
- Large databases: `metadb.sqlite`, `minibar.db`
- User data: `library-v2.0/`, `playlists-v2.0/`, `lyrics/`
- Runtime: `js_data/`, `*cache/`, `crash reports/`, `component-updates/`
- Logs: `library-error-log.txt`, `config.sqlite.bad`

**Current version:** foobar2000 v2.25.9 (see `version.txt`)

---

## Radio Cover Setup

Uses `foo_external_tags` plugin to assign covers to radio streams:

1. Place radio cover images in a folder (name files after station names)
2. Open Preferences → Display → Album art → Front cover
3. Add path pattern: `$if($strstr(%path%,'://'),E:\Music\_Extras\Radio\%title%.*)`
4. Select "Front cover" source where covers should display

Example covers: `user-theme-fb2k-medium-slate-blue/imgs/RadioCover/`

---

## Key Technologies

- **foobar2000** v2.25.9 — Audio player
- **Columns UI** — Advanced UI framework
- **Spider Monkey Panel** — JavaScript scripting (Mozilla SpiderMonkey ESR68)
- **ESlyric** — Lyrics display plugin
- **foo_enhanced_playcount** — Play statistics
- **foo_vis_*** — Visualization plugins (wispan, milkdrop2)
- **Sarasa Gothic** font family — UI typography

---

## Important Notes

### For SMP Script Development

- **Always read** `user-theme-fb2k-medium-slate-blue/foo_spider_monkey_panel_script/CLAUDE.md` before modifying scripts
- Follow existing patterns in `lib/*.js` libraries
- Maintain Chinese/English mixed comment style
- Use JSDoc comments for functions
- Prefer performance (`RepaintRect` over full `Repaint`)

### File Naming Convention

- `panel_*` — Standalone panel
- `container_*` — Manages sub-panels
- `*_buttons` — Button controls
- `*_info` — Information display
- Pattern: `{type}_{role}[_{variant}]`

### External Documentation

- Official SMP API: https://theqwertiest.github.io/foo_spider_monkey_panel/
- Project docs: `user-theme-fb2k-medium-slate-blue/foo_spider_monkey_panel_script/docs/`
  - `claude/api-quick-reference.md` — Quick API reference
  - `claude/patterns-recipes.md` — Code patterns
  - `claude/project-map.md` — Project structure
  - `claude/compat-notes.md` — Compatibility notes
