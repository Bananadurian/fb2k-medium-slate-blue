为了让你更高效地压榨 foobar2000 的性能，我将 Spider Monkey Panel (SMP) 中与性能相关的参数和方法整理成了下表。

这些参数能帮你从“能跑就行”进化到“丝滑流畅”。

### SMP 性能优化核心参数表

| 维度 | 参数 / 方法 | 推荐设置 / 逻辑 | 性能提升原理 |
| :--- | :--- | :--- | :--- |
| **渲染引擎** | `window.DrawMode` | **1 (Direct2D)** | 开启硬件加速，将绘图压力从 CPU 转移到 GPU。 |
| **刷新范围** | `window.RepaintRect(x, y, w, h)` | 仅刷新变化的区域 | 避免全屏重绘，在大分辨率界面下可减少 80% 以上的计算量。 |
| **后台优化** | `window.IsVisible` | `if (!window.IsVisible) return;` | 面板隐藏（最小化）时停止所有动画计时器和绘图逻辑。 |
| **资源管理** | **静态预加载** | 在 `on_paint` 外部创建对象 | 避免每秒 60 次重复创建 `gdi.Font` 或 `gdi.Image` 导致的内存抖动。 |
| **图片质量** | `gr.SetInterpolationMode(mode)` | `InterpolationMode.LowQuality` | 降低缩放算法复杂度，处理海量封面预览图时速度极快。 |
| **文字质量** | `gr.SetTextRenderingHint(mode)` | `TextRenderingHint.AntiAlias` | 减少复杂的 ClearType 边缘计算，提升文本密集型界面的刷新率。 |
| **内存清理** | `collectGarbage()` | 切换大图库后手动调用 | 强制触发 JavaScript 垃圾回收，防止内存占用持续走高。 |
| **频率控制** | `window.SetInterval(..., ms)` | 动画间隔建议 `> 16ms` | 匹配 60FPS 刷新率（1000ms/60），过快的计时器只会浪费资源。 |

---

### 进阶优化建议

1.  **关于 `window.DrawMode = 1`：**
    虽然 Direct2D 很快，但如果你在脚本里频繁进行复杂的数学运算（而非绘图），瓶颈可能在于 JS 引擎本身。此时 `performance.now()` 就能派上用场，帮你找出到底是哪行代码在拖后腿。

2.  **减少 `on_paint` 中的逻辑判断：**
    尽量不要在 `on_paint` 里写复杂的 `if-else` 或者字符串处理。
    *   **Bad:** `gr.GdiDrawText(fb.TitleFormat("%artist%").Eval(), ...)` (每次刷新都解析占位符)
    *   **Good:** 在 `on_item_focus_change` 中预先解析好字符串，`on_paint` 只负责画。

3.  **合理利用 `window.Repaint()`：**
    除非你的整个面板都是动态背景，否则永远优先考虑 `window.RepaintRect()`。比如做一个进度条，你只需要每秒刷新进度条那一小块矩形即可。

这些参数里，`RepaintRect` 和 `IsVisible` 通常是解决“播放器卡顿”和“CPU 占用高”最立竿见影的手段。你现在的脚本是在写那种炫酷的频谱动效吗？如果是的话，Direct2D 几乎是必选项。