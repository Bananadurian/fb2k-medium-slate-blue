# 图标与素材

## 目录结构

```
imgs/
├── icons/
│   ├── flags/                  # 国旗
│   │   ├── 1x1/                # 正方形 (1:1)
│   │   └── 4x3/                # 横向 (4:3)
│   ├── brands/                 # 外部链接品牌图标
│   ├── player/                 # 播放控制图标
│   └── ui/                     # 通用 UI 图标
├── covers/radio/               # 电台封面
├── screenshots/                # 截图
└── _legacy/                    # 历史废弃文件，确认后删除
```

- SVG/PNG 均可，同目录下同用途图标仅扩展名区分（`play.svg` / `play.png`）
- 加载统一使用 `iconMgr.get(category, name)`，底层 `_loadImage` 按扩展名自动选择 `gdi.LoadSVG` 或 `gdi.Image`
- 源图推荐 **96×96 px**：覆盖当前所有显示场景（13px 行内图标 ~54px 大按钮 144DPI）≥1.78× 超采样，比 128px 省 44% 内存

## 图标来源

| 目录 | 来源 | 许可证 |
|:---|:---|:---|
| `icons/brands/` | 各品牌官方资源 | 各品牌自有 |
| `icons/flags/` | [flag-icons](https://github.com/lipis/flag-icons) / [flagicons.lipis.dev](https://flagicons.lipis.dev/) | MIT |
| `icons/player/` | Lucide | ISC |
| `icons/ui/` | Lucide | ISC |

> Lucide 参数：Stroke width `1.5px`，导出尺寸 `96px`（显示场景 13-54px，≥1.78× 超采样）。

## 命名规范

- 小写字母 + 短横线：`shuffle-tracks.svg`、`apple-music.svg`
- 国旗使用 ISO 3166-1 alpha-2 代码：`cn.svg`、`jp.svg`
- 状态变体用下划线后缀：`play_hover.svg`、`star_activate.svg`

## 加载约定

推荐使用 `iconMgr.get(category, name)`（`lib/icons.js` IconManager 单例），按类别延迟加载 + 自动缓存。

- 图标键名 → 注册表（`IconManager.BRANDS` / `PLAYER` / `UI` / `FLAGS`）→ 文件名 → `_loadImage(path, maxWidth)`
- 查表失败或文件不存在时自动 fallback 到各类注册表的 `"default"` 键
- 面板脚本：添加 `include("lib/icons.js")`，调用 `iconMgr.get('brands', 'apple_music')`

底层使用 `_loadImage(path, maxWidth)`（`lib/utils.js`），扩展名 `.svg` 自动走 `gdi.LoadSVG`，其他走 `gdi.Image`。

> SVG 通过注册表扩展名自动识别，切换 SVG/PNG 只需修改注册表值（如 `"play": "circle-play.svg"` → `"circle-play.png"`），无需改代码。国旗只提供 SVG，PNG 可使用 [linebender/resvg](https://github.com/linebender/resvg) 转换。

## PNG 生成工具

项目包含 `svg_to_png.py` 脚本用于批量转换 SVG → PNG（96×96px）。

### 前置条件

1. 下载 [resvg](https://github.com/linebender/resvg) 并配置路径（脚本中 `Config.resvg_path`）
2. 安装 [uv](https://github.com/astral-sh/uv)：`winget install --id=astral-sh.uv -e`

### 使用方法

```bash
# 进入 imgs 目录
cd fb2k-medium-slate-blue/imgs

# 转换单个目录（同目录输出，SVG/PNG 混放）
uv run svg_to_png.py  # 默认转换 icons/brands

# 自定义输入输出（修改脚本末尾 INPUT/OUTPUT 变量）
# INPUT  = r"icons/player"
# OUTPUT = r"icons/player"
```

### 配置说明

- **输出尺寸**：96×96px（覆盖 13-54px 显示场景，≥1.78× 超采样，比 128px 省 44% 内存）
- **居中模式**：小图标居中贴到固定画布，保持长宽比
- **透明背景**：RGBA 模式，alpha 通道保留
- **并发处理**：默认使用所有 CPU 核心

### 切换 SVG/PNG

修改 `lib/icons.js` 注册表扩展名即可，无需改代码：

```javascript
// 从 SVG 切换到 PNG
IconManager.BRANDS = {
  "apple_music": "apple-music.png",  // 原 "apple-music.svg"
  "spotify": "spotify.png",
  // ...
}
```

## 备注

- 图标绘制路径（`Button.paint` / `_drawIcon`）已内置 `SetInterpolationMode(7)` → `0` 恢复，确保高分辨率位图缩放时无锯齿。
