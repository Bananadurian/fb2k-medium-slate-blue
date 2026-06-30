# Changelog

> 版本号遵循 [SemVer](https://semver.org/lang/zh-CN/) (MAJOR.MINOR.PATCH-prerelease)。

## [Unreleased]

## 1.3.0-alpha.2 — 2026-06-30

### Added
- Album Info 面板：新增专辑链接 section，支持从 `URL_*` 标签读取并显示 21 个平台的可点击图标按钮（Spotify、Discogs、YouTube、MusicBrainz 等）
- Biography 面板：Discography 数据源可配置（`biography.discoDataSource`），支持从本地音乐库查询或 JSON 文件读取
- UI 文案国际化：新增 `lib/i18n.js`，支持中英文切换（52 条 tooltip/hover/菜单）
- `config.sqlite` 隐私脱敏：新增 `sanitize_config.py` + pre-commit hook，提交时自动清除主机名/代理/UUID/路径等隐私数据
- 文档全面重构：README 英文默认版 + `README.zh-CN.md` + `THIRD_PARTY.md` + TOC / License badge

### Changed
- 作者标识统一：`XRE` → `Bananadurian`（13 个面板 + 19 个 ESlyric 布局）
- 文档路径替换为通用占位符（`FEATURES.md`、`TODO.md`、`CLAUDE.md`）
- 空状态样式统一：`album_info` / `biography_v2` 使用 `TS.empty` 预设
- README: git clone 可直接命名为 `profile`，简化安装流程
- Album Info 面板：优化 hover 检测性能（按 Y 坐标分层，减少无效命中测试）
- Album Info 面板：Links section 动态可见性计算（空链接时自动隐藏，不占空间）

### Fixed
- `track_info` spacerH 累加漂移：`on_size` 排除 spacer 自身高度
- `track_info` 布局偏移：stars.visible 动态切换导致 section 位置错位，改为固定计入高度
- 截图路径大小写修复（`Screenshots` → `screenshots`），解决 GitHub 图片 404
- LICENSE: Apache 2.0 → MIT

## 1.3.0-alpha.1 — 2026-05-18

- JSplitter代替SMP
- JSplitter脚本全部重构并新增背景色等功能
- ESlyric新增多项自定义布局
- 其它...

![](imgs/screenshots/1.3.0-1.png)
![](imgs/screenshots/1.3.0-2.png)
![](imgs/screenshots/1.3.0-3.png)
![](imgs/screenshots/1.3.0-4.png)

## 1.2.1 — 2026-01-14

- 调整布局：
  - 歌词面板独立
  - 频谱插件更换为Winamp Spectrum Analyzer visualization
  - 其它细节
- 配色优化
- 脚本优化

![](imgs/screenshots/1.2.1.png)

## 1.2.0 — 2026-01-01

- `JSpanel3`脚本全部使用`SMP`脚本重构替换，优化性能
- 新增基于`SMP`的艺人、专辑面板，艺人数据来自本地创建的艺人`Json`数据，未引入`last.fm`，专辑数据来自标签
- 引入Coverflow面板

![](imgs/screenshots/1.2.0.png)

## 1.1.0

![](imgs/screenshots/1.1.0.png)

## 1.0.0

![](imgs/screenshots/1.0.0.png)
