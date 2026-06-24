# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "pillow>=12.2.0",
# ]
# ///
"""
SVG → PNG 批量转换器
- resvg 等比缩放渲染
- Pillow 居中贴到固定尺寸透明画布

# 一次性设置
uv add --script svg_to_png.py pillow   # 写入依赖声明
uv lock --script svg_to_png.py         # 可选：锁定版本

# 日常使用（仅这一条）
uv run svg_to_png.py

created: 2026-05-15
updated: 2026-06-16
"""

import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from PIL import Image


# ================= 配置区域 =================
@dataclass
class Config:
    resvg_path:    str = r"C:\MySoftwarePortableLib\resvg-win64\resvg.exe"
    target_width:  int = 96  # 96×96px 覆盖 13-54px 显示场景，≥1.78× 超采样
    target_height: int = 96
    max_workers:   int = field(default_factory=os.cpu_count)  # 默认等于 CPU 核心数

CFG = Config()
# ============================================


# ── 结果数据类，避免用裸 tuple 传递状态 ────────────────────────────────────────
@dataclass
class ConvertResult:
    success:   bool
    filename:  str
    error_msg: str = ""


# ── 纯函数：计算居中偏移，职责单一，便于单独测试 ───────────────────────────────
def center_offset(canvas_w: int, canvas_h: int, img_w: int, img_h: int) -> tuple[int, int]:
    return (canvas_w - img_w) // 2, (canvas_h - img_h) // 2


# ── 核心渲染：resvg → 临时 PNG → Pillow 合成 ──────────────────────────────────
def render_and_pad(svg_path: Path, png_path: Path, cfg: Config) -> None:
    """
    ① resvg 等比缩放到「不超过目标尺寸」的临时 PNG
    ② Pillow 把临时 PNG 居中贴到 target_width × target_height 的全透明画布
    """
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        # ① resvg 渲染
        subprocess.run(
            [cfg.resvg_path,
             "--width",  str(cfg.target_width),
             "--height", str(cfg.target_height),
             str(svg_path), str(tmp_path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            check=True,
        )

        # ② 读取渲染结果（with 块内 load() 完整解码，避免文件句柄泄漏）
        with Image.open(tmp_path) as rendered:
            rendered.load()
            rendered = rendered.convert("RGBA")

        rw, rh = rendered.size

        # 尺寸已匹配 → 直接移动临时文件，省去一次 PNG 重编码
        if rw == cfg.target_width and rh == cfg.target_height:
            tmp_path.replace(png_path)
            return

        # 合成：居中贴到透明画布，第三参数保留原始 alpha
        canvas = Image.new("RGBA", (cfg.target_width, cfg.target_height), (0, 0, 0, 0))
        canvas.paste(rendered, center_offset(cfg.target_width, cfg.target_height, rw, rh), rendered)
        canvas.save(png_path, "PNG")

    finally:
        tmp_path.unlink(missing_ok=True)


# ── 单文件入口（须在模块顶层，ProcessPoolExecutor pickle 序列化要求）──────────
def convert_single_file(svg_path: Path, output_dir: Path, cfg: Config) -> ConvertResult:
    png_path = output_dir / f"{svg_path.stem}.png"
    try:
        render_and_pad(svg_path, png_path, cfg)
        return ConvertResult(success=True, filename=svg_path.name)
    except subprocess.CalledProcessError as e:
        msg = e.stderr.decode(errors="ignore").strip()
        return ConvertResult(success=False, filename=svg_path.name, error_msg=f"resvg 渲染失败: {msg}")
    except Exception as e:
        return ConvertResult(success=False, filename=svg_path.name, error_msg=f"系统错误: {e}")


# ── 批量处理主函数 ─────────────────────────────────────────────────────────────
def batch_processor(input_target: str, output_target: str, cfg: Config = CFG) -> None:
    input_path = Path(input_target)
    output_dir = Path(output_target)

    # 检查 resvg
    if not (Path(cfg.resvg_path).exists() or shutil.which(cfg.resvg_path)):
        print(f"【错误】未找到 resvg，请确认路径: {cfg.resvg_path}")
        return

    # 收集 SVG 文件
    if input_path.is_file() and input_path.suffix.lower() == ".svg":
        svg_files = [input_path]
    elif input_path.is_dir():
        svg_files = sorted(f for f in input_path.iterdir()
                           if f.is_file() and f.suffix.lower() == ".svg")
    else:
        print(f"【错误】输入路径不存在或不是 SVG 文件: {input_target}")
        return

    if not svg_files:
        print("【提示】未找到任何 .svg 文件。")
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    total = len(svg_files)
    print(f"开始转换 {total} 个文件 → 目标画布: {cfg.target_width}×{cfg.target_height}")
    print("-" * 60)

    # 单文件快速路径：跳过进程池创建开销
    if total == 1:
        result = convert_single_file(svg_files[0], output_dir, cfg)
        status = "【成功】" if result.success else f"【失败】— {result.error_msg}"
        print(f"[1/1] {status}{result.filename}")
        print("-" * 60)
        print(f"转换结束！成功: {1 if result.success else 0}/1，输出目录: {output_dir.resolve()}")
        return

    # ProcessPoolExecutor 规避 GIL，Pillow 合成真正多核并行
    success_count = 0
    completed = 0
    with ProcessPoolExecutor(max_workers=cfg.max_workers) as executor:
        future_map = {
            executor.submit(convert_single_file, svg, output_dir, cfg): svg
            for svg in svg_files
        }
        for future in as_completed(future_map):
            completed += 1
            result: ConvertResult = future.result()
            if result.success:
                success_count += 1
                print(f"[{completed}/{total}] 【成功】{result.filename}")
            else:
                print(f"[{completed}/{total}] 【失败】{result.filename} — {result.error_msg}")

    print("-" * 60)
    print(f"转换结束！成功: {success_count}/{total}，输出目录: {output_dir.resolve()}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # CLI 模式：按需处理指定文件/目录
        for target in sys.argv[1:]:
            target_path = Path(target)
            if target_path.is_file():
                batch_processor(str(target_path), str(target_path.parent))
            elif target_path.is_dir():
                batch_processor(str(target_path), str(target_path))
            else:
                print(f"【错误】路径不存在: {target}")
    else:
        # 默认模式：批量转换所有图标目录
        directories = [
            ("icons/brands", "icons/brands"),
            ("icons/player", "icons/player"),
            ("icons/ui", "icons/ui"),
            ("icons/flags/1x1", "icons/flags/1x1"),
            ("icons/flags/4x3", "icons/flags/4x3"),
        ]

        for input_dir, output_dir in directories:
            if Path(input_dir).exists():
                print(f"\n{'='*60}")
                print(f"处理目录: {input_dir}")
                print(f"{'='*60}")
                batch_processor(input_dir, output_dir)
            else:
                print(f"\n【跳过】目录不存在: {input_dir}")
