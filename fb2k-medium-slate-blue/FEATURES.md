# 功能说明

本文档介绍 fb2k-medium-slate-blue 主题的核心功能及使用方法。

---

## 1. Album Info 面板

### 1.1 专辑链接（Album Links）

**功能**: 在 Album Info 面板显示专辑在各平台的可点击图标按钮，点击即可跳转到对应页面。

**使用方法**:
1. 使用 [Mp3tag](https://www.mp3tag.de/) 等标签编辑器为音频文件添加 `URL_*` 标签
2. 标签格式：`URL_平台名 = 完整URL`

**标签示例**:
```
URL_SPOTIFY      = https://open.spotify.com/album/5ZX4m5aVSmWQ5iHAPQpT71
URL_DISCOGS      = https://www.discogs.com/release/1234567
URL_YOUTUBE      = https://www.youtube.com/playlist?list=PLxxx
URL_MUSICBRAINZ  = https://musicbrainz.org/release/xxxxx
```

**支持的平台**（21 个）:

| 类别 | 平台 | 标签名 |
|------|------|--------|
| 音乐流媒体 | Spotify | `URL_SPOTIFY` |
| | Apple Music | `URL_APPLEMUSIC` |
| | Amazon Music | `URL_AMAZONMUSIC` |
| | Tidal | `URL_TIDAL` |
| | Qobuz | `URL_QOBUZ` |
| | Deezer | `URL_DEEZER` |
| | YouTube Music | `URL_YOUTUBE` |
| | Bandcamp | `URL_BANDCAMP` |
| | SoundCloud | `URL_SOUNDCLOUD` |
| 音乐数据库 | MusicBrainz | `URL_MUSICBRAINZ` |
| | Discogs | `URL_DISCOGS` |
| | AllMusic | `URL_ALLMUSIC` |
| | Last.fm | `URL_LASTFM` |
| 评分/评论 | RateYourMusic | `URL_RYM` |
| | Album of the Year | `URL_AOTY` |
| | Pitchfork | `URL_PITCHFORK` |
| | Metacritic | `URL_METACRITIC` |
| 百科/歌词 | Wikipedia | `URL_WIKIPEDIA` |
| | Wikidata | `URL_WIKIDATA` |
| | Genius | `URL_GENIUS` |
| | Fandom | `URL_FANDOM` |

**显示效果**:
- 有链接的专辑：显示对应平台的图标按钮（最多 2 行）
- 无链接的专辑：自动隐藏链接区域，不占空间
- 鼠标悬停：显示平台名称 tooltip，切换手型光标
- 点击按钮：浏览器打开对应 URL

**技术细节**: 参见开发文档 [patterns-recipes.md §9.2](js/docs/patterns-recipes.md#92-data-source-pattern-audio-tag-extraction)

### 1.2 专辑信息展示

- **封面轮播**: 支持显示多张封面，点击切换
- **音质标识**: 自动识别音频格式（HiRes/CD/Lossy）并显示徽章
- **来源标识**: 显示音频来源（CD/WEB/Vinyl 等）
- **语言标识**: 显示专辑语言并配国旗图标
- **描述/曲目切换**: Tab 切换查看专辑介绍或曲目列表

---

## 2. Biography 面板

### 2.1 艺人信息展示

- **艺人封面轮播**: 支持多张艺人图片自动切换
- **基本信息**: 艺人名、别名、国籍（配国旗）、出生日期
- **风格标签**: 显示艺人音乐风格
- **外部链接**: 点击图标跳转到 Spotify、Last.fm 等平台

### 2.2 Discography（作品集）

**数据源可配置**（右键 → Configure panel → Properties）:
- `biography.discoDataSource = "library"`: 从 foobar2000 音乐库查询
- `biography.discoDataSource = "json"`: 从 JSON 文件读取

### 2.3 艺人数据管理

**数据格式**: JSON 文件（存放于配置路径 `biography.jsonDir`）

**文件命名**: `{MUSICBRAINZ_ARTISTID}.json`

**JSON Schema 参考**: 见开发文档 [patterns-recipes.md](js/docs/patterns-recipes.md)

---

## 3. 电台封面配置

利用 [foo_external_tags](https://wiki.hydrogenaud.io/index.php?title=Foobar2000:Components/External_Tags_(foo_external_tags)) 插件为电台流添加封面。

**配置步骤**:
1. 下载电台封面到指定文件夹（建议封面名与电台名一致）
2. 打开 `Preferences → Display → Album art → Front cover`
3. 添加路径模式：`$if($strstr(%path%,'://'),<你的电台封面目录>\%title%.*)`
4. 选择 `Front cover` 作为封面来源

**示例封面**: 见 `fb2k-medium-slate-blue/imgs/covers/radio/`

---

## 4. 主题系统

### 4.1 背景模式

支持多种背景渲染模式（通过 `lib/background.js`）:
- **主题色背景**: 使用预设主题颜色
- **封面取色**: 从专辑封面提取主色调
- **封面模糊**: 模糊封面作为背景
- **自定义颜色**: 手动指定颜色 + 透明度

### 4.2 伪透明模式

部分面板支持伪透明模式，背景与主背景同步（需启用 `window.IsTransparent`）。

---

## 5. 其他功能

### 5.1 播放控制栏

- 播放/暂停、上一曲/下一曲、停止
- 进度条拖拽
- 音量控制

### 5.2 评分系统

- 点击星星评分（1-5 星）
- 再次点击相同评分可取消
- 评分数据存储在音频标签

### 5.3 智能播放列表

搜索按钮支持右键菜单：
- 搜索歌曲/专辑/艺人
- 创建智能播放列表

---

## 6. 常见问题

### Q: 为什么有些平台图标不显示？
**A**: 确保标签名正确（大小写敏感），完整列表见上方表格。图标资源位于 `imgs/icons/brands/`。

### Q: 如何批量为专辑添加链接？
**A**: 推荐使用 Mp3tag 的 "Actions" 功能批量填充 `URL_*` 标签。

### Q: 艺人数据从哪里获取？
**A**: 需手动创建 JSON 文件放置于 `biography.jsonDir` 目录，或使用外部工具（如 [music-meta](https://github.com/your-repo)）自动生成。

### Q: 如何切换背景模式？
**A**: 修改 `bg_panel.js` 中的 `PANEL_CFG.mode` 配置（需重启面板）。

---

## 7. 开发文档

面向开发者的技术文档位于 `js/docs/`:
- [patterns-recipes.md](js/docs/patterns-recipes.md) — 开发模式与配方
- [smp-copilot.md](js/docs/smp-copilot.md) — SMP 编码规范
- [project-map.md](js/docs/project-map.md) — 项目结构图
- [api-reference.md](js/docs/api-reference.md) — API 参考

---

**版本**: 参见 [CHANGELOG.md](CHANGELOG.md)  
**任务追踪**: 参见 [TODO.md](TODO.md)
