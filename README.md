# fb2k-medium-slate-blue [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![zh-CN](https://img.shields.io/badge/中文-zh--CN-red.svg)](README.zh-CN.md)

- [1. Introduction](#1-introduction)
- [2. Setup](#2-setup)
  - [2.1. Troubleshooting](#21-troubleshooting)
- [3. Features](#3-features)
- [4. Changelog](#4-changelog)
- [5. Appendix](#5-appendix)
  - [5.1. Common Data Folders](#51-common-data-folders)
- [6. License](#6-license)

## 1. Introduction

![screenshot](fb2k-medium-slate-blue/imgs/screenshots/1.3.0-1.png)

> More screenshots in [CHANGELOG.md](fb2k-medium-slate-blue/CHANGELOG.md).

**fb2k-medium-slate-blue** (Medium Slate Blue) is a theme for [**foobar2000 v2.25.x**](https://www.foobar2000.org/download) built on [**Columns UI**](https://github.com/reupen/columns_ui).

> Tested on Windows 11. Recommended font: [Sarasa Gothic](https://github.com/be5invis/Sarasa-Gothic).

## 2. Setup

1. Download **64-bit** [Foobar2000](https://www.foobar2000.org/download) — **portable** install recommended

   > All required plugins are bundled (`user-components-x64/`), no manual installation needed.

2. **Do not launch** foobar2000 yet (launching auto-creates a `profile` folder, which interferes with the next steps)
3. Grab the theme:
   - **ZIP download**: Code → Download ZIP on the repo page, extract the `fb2k-medium-slate-blue-main` folder
   - **git clone**: `git clone https://github.com/Bananadurian/fb2k-medium-slate-blue.git profile` (clone as `profile` directly)
4. **Copy** the `profile` folder into your foobar2000 installation directory

   > ⚠️ If a `profile` folder already exists, back it up first to avoid data loss.

   > Install paths:
   > Portable: `<your_install_dir>/profile` (e.g. `D:\foobar2000\profile`)
   > Standard: `%APPDATA%\foobar2000\profile` (i.e. `C:\Users\<user>\AppData\Roaming\foobar2000\profile`)

5. Launch foobar2000
6. ⚠️ **Fix proxy settings**: The config file (`config.sqlite`) contains the author's personal proxy — change it immediately:
   `Preferences → Networking → Proxy server → No proxy`

### 2.1. Troubleshooting

- **Panel layout broken**: JS panels may render incorrectly on first load — right-click the panel and Reload
- **Last.fm**: Configuration entries are at:
  `Preferences → Tools → Enhanced Playback Statistics`
  `Preferences → Tools → Last.fm Scrobbling`

## 3. Features

See [**FEATURES.md**](fb2k-medium-slate-blue/FEATURES.md) for full details.

- **Album Links**: Reads `URL_*` tags from audio files and displays clickable buttons for Spotify, Discogs, YouTube, and 18 other platforms
- **Artist Info**: Nationality + flag, discography, external link buttons
- **Radio Covers**: Matches local cover art to radio streams via [foo_external_tags](https://wiki.hydrogenaud.io/index.php?title=Foobar2000:Components/External_Tags_(foo_external_tags)) (setup → [FEATURES.md §3](fb2k-medium-slate-blue/FEATURES.md#3-电台封面配置))
- **Theme System**: Multiple background modes — cover color extraction, blur, pseudo-transparency, and more

## 4. Changelog

See [`fb2k-medium-slate-blue/CHANGELOG.md`](fb2k-medium-slate-blue/CHANGELOG.md). Versioning follows [SemVer](https://semver.org/).

## 5. Appendix

### 5.1. Common Data Folders

Depending on installed plugins, the following folders may appear under `profile/`:

| Folder | Plugin | Description |
|:---|:---|:---|
| `eslyric-data/` | [ESlyric](https://www.foobar2000.org/components/view/foo_uie_eslyric) | Lyric layouts & styles |
| `milkdrop2/` | [MilkDrop 2](https://www.foobar2000.org/components/view/foo_vis_milk2) | Visualization presets & shaders |
| `wispan/` | [Spectrum Analyzer Visualisation](https://www.foobar2000.org/components/view/foo_vis_wispan) | Spectrum visualizer config |
| `goom/` | [What a GOOM!](https://www.foobar2000.org/components/view/foo_vis_goom) | Visualizer config (not bundled) |
| `lyrics/` | ESlyric | Cached lyric files |
| `dsp-presets/` | DSP plugins | DSP effect presets |
| `component-updates/` | — | Plugin update cache |
| `radio-browser-cache/` | — | Radio browser cache |

## 6. License

This project is licensed under the [MIT License](LICENSE). See [THIRD_PARTY.md](THIRD_PARTY.md) for third-party attributions.
