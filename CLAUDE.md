# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**fb2k-medium-slate-blue** is a foobar2000 v2.25.x theme/configuration package based on Columns UI. The core scripting layer uses **JSplitter** running Spider Monkey Panel (SMP) JavaScript.

This is a **portable foobar2000 profile directory** (`profile/`) that contains:
- Configuration files (`.cfg`, `.sqlite`, `.db`)
- Spider Monkey Panel scripts (`fb2k-medium-slate-blue/js/`) — runs on JSplitter
- Theme assets (icons, flags, screenshots in `fb2k-medium-slate-blue/imgs/`)
- Plugin configurations for Columns UI, ESlyric, visualizations, etc.

**Target Environment:**
- foobar2000 v2.25.x (64-bit)
- Windows 11 (tested)
- Columns UI plugin required
- JSplitter (foo_uie_jsplitter) required

---

## Repository Structure

```
profile/
├── fb2k-medium-slate-blue/
│   ├── js/    # Core SMP scripts
│   │   ├── lib/                           # Shared libraries
│   │   │   ├── theme.js                   # Colors, fonts, layouts
│   │   │   ├── utils.js                   # DPI, colors, text measurement
│   │   │   ├── background.js              # Background controller
│   │   │   ├── interaction.js             # Mouse/hover handling
│   │   │   ├── data.js                    # Constants, flags
│   │   │   ├── flag.js                    # Country flag renderer
│   │   │   ├── icons.js                   # Unified icon manager
│   │   │   ├── title_bar_shared.js        # Title bar shared logic
│   │   │   ├── i18n.js                    # UI text i18n (EN/ZH)
│   │   │   └── json_schema_adapter.js     # JSON schema v3.0 adapter
│   │   ├── docs/                          # Documentation
│   │   │   ├── smp-copilot.md             # SMP coding rules & AI guide
│   │   │   ├── patterns-recipes.md        # Code patterns & recipes
│   │   │   ├── project-map.md             # Project structure map
│   │   │   └── api-reference.md           # API reference (links to JSDoc)
│   │   ├── *_panel.js                     # Panel scripts
│   │   ├── *_container*.js                # Container scripts
│   │   ├── *_buttons.js                   # Button panels
│   │   ├── *_info.js                      # Info panels
│   └── imgs/                              # Theme assets
│       ├── icons/                         # 图标资源（brands/player/ui/flags）
│       ├── covers/radio/                  # 电台封面
│       ├── screenshots/                   # 截图
│       ├── svg_to_png.py                  # SVG→PNG 批量转换工具
│       └── README.md                      # 图标来源、命名规范、工具使用说明
├── configuration/                         # Plugin configs
│   └── *.dll.cfg                          # Plugin-specific configs
├── theme.fth                              # Columns UI theme
├── config.sqlite                          # Main config database
├── README.md                              # User documentation (EN)
├── README.zh-CN.md                        # User documentation (中文)
├── THIRD_PARTY.md                         # Third-party license notices
└── LICENSE                                # MIT License

Excluded from indexing (.gitignore + .claudeignore):
- Large databases: metadb.sqlite (100MB), minibar.db (211MB)
- Runtime data: library-v2.0/, playlists-v2.0/, js_data/, *cache/
- Logs: crash reports/, library-error-log.txt
```

---

## Core Architecture

### Spider Monkey Panel Script System (via JSplitter)

**Runtime:** Mozilla SpiderMonkey ESR68 (ES2019/ES10) — hosted by JSplitter
- **Not** a browser environment — no DOM APIs or XMLHttpRequest
- All scripts must start with `"use strict";`

**Script Organization:**

脚本分为 Panel（`*_panel.js`）、Container（`*_container*.js`）、Shared libs（`lib/*.js`）三类。
完整清单与依赖链 → `docs/project-map.md`

**Key Patterns:**
- **SECTIONS 布局** | **THEME.TEXT 样式预设** | **resolveMetadbByMode()** | **Background 控制器** | **Transparent 模式**
  规则摘要 → `docs/smp-copilot.md` §5 | 完整配方 → `docs/patterns-recipes.md`

**Critical SMP Rules:**
不可协商：❌ `.toArray()`  ❌ `on_paint` 内创建 GDI 对象  ✅ `GetGraphics()`/`ReleaseGraphics()` 配对  ✅ `RepaintRect` 优先  ✅ `on_paint` 纯绘制
完整规则与 SMP 指南 → `docs/smp-copilot.md`

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
1. Edit `.js` files in `fb2k-medium-slate-blue/js/`
2. In foobar2000: Right-click panel → Configure panel → Edit script or Reload
3. Changes take effect immediately on reload

**Testing:**
- Use foobar2000 Console (View → Console) for debug output via `console.log()`
- Use `fb.ShowPopupMessage()` for user-facing dialogs
- Monitor panel errors in Console

**Shared library changes:**
- When editing `lib/*.js`, reload all dependent panels
- Check `docs/smp-copilot.md` for dependency rules

### Version Control

**Committed:**
- All `.js` panel scripts and libraries
- Theme assets (`imgs/`)
- `config.sqlite` (auto-sanitized via pre-commit hook)
- `theme.fth`, `README.md`, `README.zh-CN.md`, `THIRD_PARTY.md`, `version.txt`, `LICENSE`

**Ignored (`.gitignore`):**
- Large databases: `metadb.sqlite`, `minibar.db`
- User data: `library-v2.0/`, `playlists-v2.0/`, `lyrics/`
- Runtime: `js_data/`, `*cache/`, `crash reports/`, `component-updates/`
- Logs: `library-error-log.txt`, `config.sqlite.bad`
- Sanitize backups: `/config.sqlite.bak`

### Config Sanitization

`config.sqlite` is tracked in Git but privacy-sanitized before every commit via a pre-commit hook (`fb2k-medium-slate-blue/tools/pre-commit` → `.git/hooks/pre-commit`).

**How it works:**
1. Pre-commit hook detects `config.sqlite` in staging area
2. Backs up real config → runs `sanitize_config.py` → stages sanitized version
3. After commit (success or fail), restores real config to working copy

**Sanitize rules** (`fb2k-medium-slate-blue/tools/sanitize_config.py`):
- Deletes `UPnP.renderer.name`, `UPnP.renderer.USN`, `milk2.szPresetDir` from `configStrings`
- Deletes rows with local proxy values (`127.0.0.1:`, `localhost:`, `::1:`) from `configStrings`
- Runs `VACUUM` to physically erase deleted data
- `core.totalTimePlayed` rule is present but disabled (`enabled: False`)

**One-time setup**: `cp fb2k-medium-slate-blue/tools/pre-commit .git/hooks/pre-commit`

**Current version:** foobar2000 v2.25.x (see `version.txt`)

---

## Radio Cover Setup

Uses `foo_external_tags` plugin to assign covers to radio streams:

1. Place radio cover images in a folder (name files after station names)
2. Open Preferences → Display → Album art → Front cover
3. Add path pattern: `$if($strstr(%path%,'://'),<你的电台封面目录>\%title%.*)`
4. Select "Front cover" source where covers should display

Example covers: `fb2k-medium-slate-blue/imgs/covers/radio/`

---

## Key Technologies

- **foobar2000** v2.25.x — Audio player
- **Columns UI** — Advanced UI framework
- **JSplitter** — Panel host & scripting (Mozilla SpiderMonkey ESR68)
- **ESlyric** — Lyrics display plugin
- **foo_enhanced_playcount** — Play statistics
- **foo_vis_*** — Visualization plugins (wispan, milkdrop2)
- **Sarasa Gothic** font family — UI typography
- **IconManager** (`lib/icons.js`) — 统一图标资源管理，4 类注册表懒加载 + 缓存（PNG 96×96px）
- 主题版本：`fb2k-medium-slate-blue/VERSION`、`fb2k-medium-slate-blue/CHANGELOG.md`
- 依赖组件版本：`fb2k-medium-slate-blue/COMPONENT_VERSIONS.md`

---

## Important Notes

### For SMP Script Development

- **Always read** `docs/smp-copilot.md` before modifying scripts
- 遵循 `lib/*.js` 已有模式，中英混合注释，JSDoc，`RepaintRect` 优先

### File Naming Convention
命名规范 `{type}_{role}[_{variant}]` → `docs/smp-copilot.md` §6.1

### External Documentation

- Official SMP API: https://theqwertiest.github.io/foo_spider_monkey_panel/
- Project docs: `fb2k-medium-slate-blue/js/docs/`
  - `smp-copilot.md` — SMP 编码规则与模式（AI 编程指南）
  - `patterns-recipes.md` — 项目专属代码模式与配方
  - `project-map.md` — 项目结构与依赖图
  - `api-reference.md` — SMP/JSplitter API 参考（链接到权威 JSDoc）
- 任务追踪：`fb2k-medium-slate-blue/TODO.md`
- JSDoc API 源码：`user-components-x64/foo_uie_jsplitter/docs/html/index.html`
