# fb2k-medium-slate-blue

## 1. 简介

![](fb2k-medium-slate-blue/imgs/Screenshots/1.3.0-1.png)

> 更多截图见 [CHANGELOG](fb2k-medium-slate-blue/CHANGELOG.md)。

**fb2k-medium-slate-blue**（Medium Slate Blue）是一个基于 [**foobar2000-x64_v2.2.x**](https://www.foobar2000.org/download)、[**Columns UI**](https://github.com/reupen/columns_ui) 定制版本。

> 仅在 WIN11 测试。推荐字体：更纱黑体 [Sarasa-Gothic](https://github.com/be5invis/Sarasa-Gothic)。

## 2. 使用

1. 下载 **64bit** 的 [Foobar2000](https://www.foobar2000.org/download)，推荐**便携**方式安装
2. **不要启动** foobar2000，此时不会生成 `/profile` 目录
3. 下载或克隆仓库，将 `/fb2k-medium-slate-blue` 重命名为 `/profile`，复制到安装目录

> 安装目录参考：
> 便携版：`xx/foobar2000/profile`
> 非便携版：`C:\Users\用户名\AppData\Roaming\foobar2000\profile`

## 3. 电台封面

利用 [foo_external_tags](<https://wiki.hydrogenaud.io/index.php?title=Foobar2000:Components/External_Tags_(foo_external_tags)>) 插件把电台的名字、专辑、艺人信息等信息补全。

1. 下载电台封面到一个指定文件夹中（建议封面命名和电台名字一致，方便后续使用）；

2. 打开 `Foobar -> Preferences -> Display -> Album art -> Front cover`，添加电台封面所在路径，

   示例参数：

   利用电台Url标识设置路径：`$if($strstr(%path%,'://'),E:\Music\_Extras\Radio\%title%.*)`；

   固定路径：`E:\Music\_Extras\Radio\%title%.*`（优先级*最低*，不然会覆盖同名歌曲）。

3. 需要显示封面的地方选择 `Front cover` 即可显示（`Artist` 设置类似）。

> `fb2k-medium-slate-blue/imgs/RadioCover`：示例电台封面。

## 4. 版本记录

详见 [`fb2k-medium-slate-blue/CHANGELOG.md`](fb2k-medium-slate-blue/CHANGELOG.md)。版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## 5. 附录

### 5.1. 部分文件夹说明

- `eslyric-data`: ESlyric配置。

- `wispan`：[Spectrum Analyzer Visualisation](https://www.foobar2000.org/components/view/foo_vis_wispan)配置。

- `goom`: [What a GOOM! Visualisation](https://www.foobar2000.org/components/view/foo_vis_goom)配置。

- `milkdrop2`: [MilkDrop 2 Visualisation](https://www.foobar2000.org/components/view/foo_vis_milk2)配置。
