# JSplitter 扩展 API 开发手册

基础 API 始终取决于当前 JSplitter 版本所基于的 Spider Monkey Panel 插件。Spider Monkey Panel 插件文档已附带。此外，`window` 对象还提供了以下补充功能：

## 1. 窗口对象 (window) 扩展方法

### 1.1. 面板访问

- **`window.GetPanel(caption)`** - 根据标题文本获取面板访问对象。返回第一个标题与参数匹配的面板。面板文本在标题栏中指定。默认值为面板插件名称，但可以直接在窗口标题栏中修改（Show coords -> 点击标题文本），或在 Columns UI 布局管理器（Use custom title）中修改。
- **`window.GetPanelByIndex(index)`** - 根据索引获取面板访问对象。初始顺序通常是面板添加的顺序，但也可以在 Columns UI 布局管理器中查看并更改该顺序。

### 1.2. 按钮创建与管理

- **`window.CreateButton(x, y, images, hover_images)`** - 在分栏器中创建按钮。按钮创建在窗口根部并按坐标 $(x, y)$ 放置。函数接收图像参数以定义按钮外观。按钮可以拥有的状态数量取决于传递给 `images` 的图像数量。`hover_images` 是鼠标悬停时显示的图像。该函数在创建各种按钮时非常灵活，例如：

	```javascript
    var path = fb.FoobarPath + "themes\\lur\\black\\bio.png";
    var hpath = fb.FoobarPath + "themes\\lur\\black\\bio_on.png";

    // 创建普通按钮，平时显示 bio.png，悬停显示 bio_on.png
    var a = window.CreateButton(0, 0, path, hpath); 

    // 创建复选框按钮。状态0为 bio.png，状态1（选中）为 bio_on.png。无悬停图。
    var b = window.CreateButton(0, 0, [path, hpath], null); 

    // 创建具有三个或更多状态的按钮，点击时循环切换。状态可通过 State 属性获取。
    var c = window.CreateButton(0, 0, [path1, path2, path3], [path1_on, path2_on, path3_on]);
    ```

- **`window.RadioButtons(buttons)`** - 创建一组互斥的单选按钮。接收按钮数组作为参数。每个按钮必须至少有两个状态，否则函数会执行失败。示例：

	```javascript
    var a = window.CreateButton(0, 0, [path, hpath], null);
    var b = window.CreateButton(30, 0, [path, hpath], null);
    window.RadioButtons([a, b]); // 按下一个，另一个将自动切换到状态0
    ```

- **`window.GetButton(id)`** - 通过其标识符值 (`Button.ID`) 获取按钮。
- **`window.RemoveButton(button)`** - 删除按钮。
- **`window.HandOnButtons`** - 将所有按钮的鼠标指针切换为“手型”或“箭头”。此属性也适用于后续创建的所有按钮。每个按钮的该属性也可以单独更改。

### 1.3. 播放器主窗口控制

- **`window.FoobarWindowX`** - 获取并设置 foobar2000 主窗口的 X 轴位置。
- **`window.FoobarWindowY`** - 获取并设置 foobar2000 主窗口的 Y 轴位置。
- **`window.FoobarWindowWidth`** - 获取并设置 foobar2000 主窗口的宽度。
- **`window.FoobarWindowHeight`** - 获取并设置 foobar2000 主窗口的高度。

---

## 2. 面板事件监听

由于 JSplitter 默认不接收面板上方的鼠标移动信息，因此引入了专用 API。使用前必须在 JSplitter 设置中显式启用“Track mouse over panels (for on_panel_mouse_*)”（跟踪面板上方的鼠标）。

- **`window.TrackMouseEnterLeaveOnPanels = true;`** - 启用鼠标进入/离开面板区域的跟踪。默认 `false`。回调函数：
	- `on_panel_mouse_enter(name)` - 鼠标进入面板事件，`name` 为面板名称。
	- `on_panel_mouse_leave(name)` - 鼠标离开面板事件，`name` 为面板名称。
- **`window.TrackMouseMoveOnPanels = true;`** - 启用面板区域内鼠标位置的跟踪。默认 `false`。回调函数：
	- `on_panel_mouse_move(name, x, y, mask)` - 鼠标移动事件，`x, y` 为面板上的坐标。

---

## 3. 对象属性与方法参考

### 3.1. 面板 (Panels)

由 `GetPanel`, `GetPanelByIndex` 返回。

| 属性 | 读写属性 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| **Name** | 只读 | String | 面板内部名称 |
| **Text** | 读/写 | String | 面板标题文本 |
| **Hidden** | 读/写 | boolean | 是否隐藏 |
| **Locked** | 读/写 | boolean | 是否锁定布局 |
| **ShowCaption** | 读/写 | boolean | 是否显示标题 |
| **SupportPseudoTransparency** | 读/写 | boolean | 是否支持伪透明 |
| **X / Y / Width / Height** | 读/写 | int | 坐标与尺寸 |
| **TopMost** | 读/写 | boolean | 是否置顶 |
| **EraseBackground** | 读/写 | boolean | 是否擦除背景 |

**方法：**
- `void Show(show = true);`
- `void Move(x, y, width, height, repaintParent = false);`

### 3.2. 按钮 (Buttons)

由 `CreateButton`, `GetButton` 返回。

| 属性 | 读写属性 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| **ID** | 只读 | ushort | 按钮唯一标识符 |
| **X / Y / Width / Height** | 读/写 | int | 坐标与尺寸 |
| **Hidden** | 读/写 | boolean | 是否隐藏 |
| **HandOnHover** | 读/写 | boolean | 悬停时是否显示手型指针 |
| **Click** | 读/写 | Function | 点击事件回调函数 |
| **State** | 读/写 | uint | 当前按钮状态索引 |

**方法：**
- `void Show(show = true);`
- `void Move(x, y);`
- `void Resize(width, height);`

---

## 4. 按钮交互逻辑

### 4.1. 尺寸计算

当将按钮的宽度或高度设置为 0 时，系统会根据图像序列中最大的一张图自动计算尺寸。

### 4.2. 点击处理

处理点击有两种方式：
1. **直接分配回调函数：**

	```javascript
    var a = window.CreateButton(0, 0, [path, hpath], null);
    a.Click = function() { do_something(); }
    ```

2. **使用全局回调：**
	当使用 `window.CreateButton` 创建的**任何**按钮被按下时，都会调用此函数：

	```javascript
    function on_button_click(id) {
        switch(id) {
            case a.ID:
                do_something();
                break;
        }
    }
    ```

**注意：** 面板的生命周期独立于脚本。而按钮完全由脚本通过编程方式创建，且在脚本卸载时始终会被销毁。