# fb2k-medium-slate-blue [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![EN](https://img.shields.io/badge/English-EN-blue.svg)](README.md)

- [1. 简介](#1-简介)
- [2. 使用](#2-使用)
  - [2.1. 故障排查](#21-故障排查)
- [3. 功能特性](#3-功能特性)
- [4. 版本记录](#4-版本记录)
- [5. 附录](#5-附录)
  - [5.1. 常见数据文件夹](#51-常见数据文件夹)
- [6. 许可](#6-许可)

## 1. 简介

![screenshot](fb2k-medium-slate-blue/imgs/screenshots/1.3.0-1.png)

> 更多截图见 [CHANGELOG.md](fb2k-medium-slate-blue/CHANGELOG.md)。

**fb2k-medium-slate-blue**（Medium Slate Blue）是一个基于 [**foobar2000 v2.25.x**](https://www.foobar2000.org/download)、[**Columns UI**](https://github.com/reupen/columns_ui) 定制的主题。

> 仅在 Windows 11 测试。推荐字体：更纱黑体 [Sarasa-Gothic](https://github.com/be5invis/Sarasa-Gothic)。

## 2. 使用

1. 下载 **64bit** 的 [Foobar2000](https://www.foobar2000.org/download)，推荐**便携**方式安装

> 本主题已捆绑全部必要插件（`user-components-x64/`），无需手动安装。

2. **不要启动** foobar2000（启动后会自动生成 `profile` 目录，影响后续替换）
3. 获取本主题：
   - **下载 ZIP**：点击仓库页面的 Code → Download ZIP，解压得到 `fb2k-medium-slate-blue-main` 目录
   - **git clone**：`git clone https://github.com/Bananadurian/fb2k-medium-slate-blue.git`
4. 将获取到的目录**重命名**为 `profile`，**复制**到 foobar2000 安装目录

> ⚠️ 如已有 `profile` 目录请先备份，避免覆盖个人数据。

> 安装目录参考：
> 便携版：`<你的安装目录>/profile`（如 `D:\foobar2000\profile`）
> 非便携版：`%APPDATA%\foobar2000\profile`（即 `C:\Users\<用户名>\AppData\Roaming\foobar2000\profile`）

5. 启动 foobar2000
6. ⚠️ **修改网络代理**：配置文件（`config.sqlite`）含作者个人代理设置，启动后务必修改：
   `Preferences → Networking → Proxy server → No proxy`

### 2.1. 故障排查

- **面板布局错乱**：JS 脚本首次加载可能布局异常，右键面板 → Reload 即可恢复
- **Last.fm 相关**：配置入口位于：
  `Preferences → Tools → Enhanced Playback Statistics`
  `Preferences → Tools → Last.fm Scrobbling`

## 3. 功能特性

完整说明参见 [**FEATURES.md**](fb2k-medium-slate-blue/FEATURES.md)。

- **专辑链接**：从音频标签读取 `URL_*` 字段，自动展示 Spotify、Discogs、YouTube 等 21 个平台的可点击图标按钮
- **艺人信息**：国籍 + 国旗、作品集（Discography）、外部链接一键跳转
- **电台封面**：利用 [foo_external_tags](https://wiki.hydrogenaud.io/index.php?title=Foobar2000:Components/External_Tags_(foo_external_tags)) 为电台流匹配本地封面（配置步骤 → [FEATURES.md §3](fb2k-medium-slate-blue/FEATURES.md#3-电台封面配置)）
- **主题系统**：支持封面取色、模糊背景、伪透明等多种背景渲染模式

## 4. 版本记录

详见 [`fb2k-medium-slate-blue/CHANGELOG.md`](fb2k-medium-slate-blue/CHANGELOG.md)。版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## 5. 附录

### 5.1. 常见数据文件夹

根据安装的插件，`profile/` 下可能出现以下文件夹：

| 文件夹 | 对应插件 | 说明 |
|:---|:---|:---|
| `eslyric-data/` | [ESlyric](https://www.foobar2000.org/components/view/foo_uie_eslyric) | 歌词布局与样式 |
| `milkdrop2/` | [MilkDrop 2](https://www.foobar2000.org/components/view/foo_vis_milk2) | 可视化预设与着色器 |
| `wispan/` | [Spectrum Analyzer](https://www.foobar2000.org/components/view/foo_vis_wispan) | 频谱可视化配置 |
| `goom/` | [What a GOOM!](https://www.foobar2000.org/components/view/foo_vis_goom) | 可视化配置（未捆绑） |
| `lyrics/` | ESlyric | 缓存的歌词文件 |
| `dsp-presets/` | DSP 插件 | DSP 效果预设 |
| `component-updates/` | — | 插件更新缓存 |
| `radio-browser-cache/` | — | 电台浏览器缓存 |

## 6. 许可

本项目采用 [MIT License](LICENSE)。第三方资源许可详见 [THIRD_PARTY.md](THIRD_PARTY.md)。
