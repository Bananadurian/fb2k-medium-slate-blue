# TODO

## biography_v2.js

- [ ] 添加更多图标适配更多链接（spotify, apple music, tidal, genius 等）
- [ ] 链接区域根据链接数量动态适配行数，最多 2 行（当前只显示 1 行，多余被截断）
- [ ] 国家信息考虑是否使用详细地址（`data.origin.birth_place.details_zh`）
- [ ] 性能检查：V2 图片 LRU 缓存是否正常工作
- [ ] 选中的 TAB 使用白色而非主题色？视觉效果评估
- [ ] 无艺人数据时显示按钮，点击调用 music-meta 自动获取
- [ ] 添加右键菜单：调用 music-meta 更新数据、下载封面等
- [ ] 封面查找后缀优化：当前 `_X_` 写死，考虑更通用的匹配方案

## biography.js

- [ ] 点击查看大图
- [ ] 伪透明模式：选中非当前播放歌曲并停止播放时，背景渲染异常

## album_info.js

- [ ] 添加链接显示区域（对齐 biography_v2.js 的 external_urls 展示）
- [ ] 点击查看大图
- [ ] 伪透明模式：选中非当前播放歌曲并停止播放时，背景渲染异常

## cover_panel.js

- [ ] 点击查看大图

## bg_panel_container_control.js

- [ ] 播放控制栏使用封面颜色（当前通知同步方案卡顿）

## lib/background.js

- [ ] 支持定制图片

## 通用

- [ ] 移除代码文件头部的版本号声明（`@version`），统一由 git 管理
- [ ] 代码进一步规范化（命名、结构一致性）
- [ ] 版本号规范统一（如 `alpha`），替代当前各文件杂乱的版本号
- [ ] 删除冗余内容（未引用的代码、空文件、废弃注释）
- [x] 优化 CLAUDE.md / 文档重构（精简内容、消除重复，详见 docs/ 重构）
- [x] 文档路径优化（`docs/` 目录结构梳理，已完成重构）
- [ ] 引入配置模块（全局透明模式开关、D2D 渲染模式开关）
- [ ] 脚本 README.md 文档
- [ ] 面板底部阴影遮罩（让显示更自然，避免生硬切割）
- [ ] 添加 panel/container 布局对象
- [ ] 检查控制器内存泄露（createTitleBarController、createPanelBackgroundController）
- [ ] window.DrawMode 优化卡顿面板

---

## 历史归档

以下为已完成的 ROADMAP 任务，保留作为历史记录。

### playback_button.js
- [x] 重构元素布局计算方案，支持 padding 模式，icon 尺寸支持定义

### control_buttons.js
- [x] 重构元素布局计算方案，支持 padding 模式，icon 尺寸支持定义
- [x] 搜索添加右键功能菜单（搜索歌曲/专辑/歌手、新增智能列表）

### biography.js
- [x] 硬编码本地路径改为可定义 GetProperty()
- [x] 艺人中文名 icon
- [x] 艺人中文名独立一行布局
- [x] 图标和文字对齐修复
- [x] 艺人国旗（维护映射表，规范国家名 → 国旗）
- [x] 封面支持定义四周 padding
- [x] 伪透明离屏渲染 ClearType 异常：恢复位图方案（需 DrawMode=1 + SetSmoothingMode）
- [x] 重新设计布局（原有太复杂）
- [x] LINE_H、MARGIN 遗留修复
- [x] 移除 json 解析异常代码
- [x] UTF-8 BOM 编码 / 英文输出解决中文乱码

### album_info.js
- [x] badgeElement 放到 elements 中管理
- [x] 优化音质徽章计算逻辑，支持四周 padding
- [x] 语言支持解析 mp3tag 标准 // 分割数组
- [x] album 根据专辑语言添加国旗
- [x] 图标和文字对齐修复
- [x] 音质来源和标签合并，tooltip 合并
- [x] 版本类型缺失时不隐藏前置徽标
- [x] 离屏渲染 ClearType 修复（位图方案 + DrawMode=1 + SetSmoothingMode）
- [x] 封面支持定义四周 padding
- [x] 重新设计布局
- [x] LINE_H、MARGIN 遗留修复

### info+rating
- [x] 优化音质徽章计算逻辑，支持四周 padding
- [x] 星星右键取消评分（点击相同评分即取消）
- [x] 面板宽度计算修复（来源图标右偏问题）
- [x] 点击艺人/专辑发送通知给 tab 面板切换资料
- [x] 重构优化布局，接入新主题设置
- [x] 音质来源和标签合并，tooltip 合并
- [x] 布局细节优化
- [x] JSPlitter 编码处理：UTF-8 with BOM
- [x] 注释移除点击打开面板功能

### tab_container*
- [x] 动态 mask 颜色支持 on_colours_changed()
- [x] tab 切换面板闪烁解决（CUI 窗口标题名隐藏）
- [x] 自定义按钮替代 JSPlitter 按钮（解决 tooltip 问题）
- [x] tab 样式优化 + 文字样式 + 下划线样式
- [x] tab 区域 padding 定制四周
- [x] tab 子 panel 定制四周

### bg_panel*
- [x] 动态 mask 颜色支持 on_colours_changed()
- [x] 接入所有 panel，无需伪透明模式穿透

### lib/background.js
- [x] 支持定制子 panel 四周 padding
- [x] 默认主题背景
- [x] 渐变色背景（封面取色 + 透明图层遮罩）
- [x] 封面背景模糊（GdiBitmap.StackBlur）
- [x] 通用背景 panel
- [x] 背景颜色自定义模式 + 透明度设置

### cover_panel.js
- [x] 动态 mask 颜色支持 on_colours_changed()
- [x] 停止播放时显示封面
- [x] 默认艺人图片 → 专辑封面优先级
- [x] 圆角封面（专辑 + 艺人）
- [x] 封面索引指示颜色跟随主题
- [x] 添加缓存和去除异步加载逻辑

### 全局
- [x] 统一版本号推送
- [x] panelW/panelH 替代 window.Width/Height（control/rating/playback 面板）
- [x] 通知标准检查
- [x] 全局常量：DT_LEFT 等标记位优化
- [x] 全局常量：字体颜色统一管理（THEME.TEXT.* 覆盖所有面板）
- [x] 全局常量：移除重复定义，集中在 THEME.CFG / PANEL_CFG
- [x] tooltip 及默认文案改为英文（album/biography）
- [x] 文件命名优化
- [x] 全局主题切换：on_font_changed() / on_colours_changed()
- [x] 移除 SMP 改为 JSPlitter
- [x] panel_title.js 分拆为 title_playlist.js / title_library.js
- [x] Pseudo Transparent: window.IsTransparent 伪透明模式（艺人/专辑面板）
- [x] 统一歌曲数据源：resolveMetadbByMode()
- [x] background padding 计算函数抽取到 lib/utils.js
