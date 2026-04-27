/**
 * @file cover_panel.js
 * @description 彻底解耦版：增加CUI背景色适配，支持按需阻断颜色提取的性能优化
 * @author SMP Scripting Expert
 * @version 3.2.0
 * @description 重构版：引入共享库，添加资源清理。
 */

"use strict";

// 共享库
include("lib/utils.js");

// ==========================================
// ## 1. 配置区域 (CONFIGURATION)
// ==========================================

const CONFIG = {
    CORNER_RADIUS: 20,               // 封面圆角半径
    MARGIN: 40,                      // 封面周围的全局边距 (Padding)
    
    // --- 颜色与背景选项 ---
    USE_COVER_COLOR: true,           // 【新增开关】true: 提取封面颜色, false: 强制使用 CUI 全局背景色
    USE_GRADIENT: true,              // (仅在 USE_COVER_COLOR 为 true 时有效) true: 渐变色, false: 单色
    GRADIENT_ANGLE: 90,              // 渐变角度 (90=从上到下, 0=从左到右)
    TEXT_COLOR: _RGB(200, 200, 200)   // 提示文字颜色
};

// ==========================================
// ## 2. 全局状态 (GLOBAL STATE)
// ==========================================

// 初始化 CUI 全局背景色 (3 = ColourType.background)
let g_theme_bg_color = window.GetColourCUI(3);

let g_img = null;           // 缓存原始封面图像 
let g_img_rounded = null;   // 缓存处理好带有透明圆角的最终图像
let g_bg_color1 = g_theme_bg_color; // 背景色 1 
let g_bg_color2 = g_theme_bg_color; // 背景色 2 
let g_font = null;          
let ww = 0, wh = 0;         

// ==========================================
// ## 3. 通用工具函数 (UTILITY FUNCTIONS)
// ==========================================

// _RGB 来自 lib/utils.js

/**
 * [纯函数] 将指定图片等比缩放、居中裁剪，并应用透明圆角遮罩 (支持长方形)
 */
function create_rounded_image(img, target_w, target_h, radius) {
    if (!img || target_w <= 0 || target_h <= 0) return null;
    
    let bmp = gdi.CreateImage(target_w, target_h);
    let gr = bmp.GetGraphics();
    
    let src_w = img.Width;
    let src_h = img.Height;
    
    let scale = Math.max(target_w / src_w, target_h / src_h);
    let draw_w = Math.round(src_w * scale);
    let draw_h = Math.round(src_h * scale);
    let draw_x = Math.round((target_w - draw_w) / 2);
    let draw_y = Math.round((target_h - draw_h) / 2);
    
    gr.SetInterpolationMode(7); 
    gr.DrawImage(img, draw_x, draw_y, draw_w, draw_h, 0, 0, src_w, src_h);
    bmp.ReleaseGraphics(gr);
    
    let mask = gdi.CreateImage(target_w, target_h);
    let gr_mask = mask.GetGraphics();
    gr_mask.SetSmoothingMode(2); 
    
    // 白色区域透明(裁切)，黑色区域保留(不透明)
    gr_mask.FillSolidRect(0, 0, target_w, target_h, _RGB(255, 255, 255));
    gr_mask.FillRoundRect(0, 0, target_w, target_h, radius, radius, _RGB(0, 0, 0));
    mask.ReleaseGraphics(gr_mask);
    
    bmp.ApplyMask(mask);
    return bmp;
}

/**
 * [纯函数] 从图像中提取主色调
 */
function extract_cover_colors(img, use_gradient, fallback_color) {
    let result = { c1: fallback_color, c2: fallback_color };
    if (!img) return result;
    
    try {
        let colors_json = img.GetColourSchemeJSON(5);
        let colors = JSON.parse(colors_json);
        
        if (colors && colors.length > 0) {
            result.c1 = colors[0].col; 
            if (use_gradient && colors.length >= 2) {
                result.c2 = colors[1].col; 
            } else {
                result.c2 = colors[0].col; 
            }
        }
    } catch (e) {
        console.log("SMP Extract Colors Error: " + e);
    }
    return result;
}

/**
 * [异步数据层] 获取封面图像对象及配套颜色数据
 * 包含阻断式性能优化：当 use_cover_color 为 false 时直接跳过颜色提取
 */
function get_album_art_data(metadb, art_id, use_cover_color, use_gradient, fallback_color) {
    return new Promise((resolve) => {
        if (!metadb) {
            resolve({ image: null, colors: { c1: fallback_color, c2: fallback_color } });
            return;
        }
        
        utils.GetAlbumArtAsyncV2(window.ID, metadb, art_id)
            .then(result => {
                let img = result.image;
                let colors;
                
                // 【性能优化核心】仅在允许提取颜色，且有封面的情况下才去跑分析算法
                if (use_cover_color && img) {
                    colors = extract_cover_colors(img, use_gradient, fallback_color);
                } else {
                    colors = { c1: fallback_color, c2: fallback_color };
                }
                
                resolve({
                    image: img,
                    colors: colors
                });
            })
            .catch(err => {
                resolve({ image: null, colors: { c1: fallback_color, c2: fallback_color } });
            });
    });
}

// ==========================================
// ## 4. 表现层与面板业务逻辑 (VIEW LAYER)
// ==========================================

/**
 * [视图更新] 重新计算封面圆角图的尺寸排版 (Aspect-Fit)
 */
function update_cover_ui() {
    if (!g_img || ww === 0 || wh === 0) {
        g_img_rounded = null;
        return;
    }
    
    let max_w = Math.max(10, ww - CONFIG.MARGIN);
    let max_h = Math.max(10, wh - CONFIG.MARGIN);
    
    let scale = Math.min(max_w / g_img.Width, max_h / g_img.Height);
    
    let target_w = Math.floor(g_img.Width * scale);
    let target_h = Math.floor(g_img.Height * scale);
    
    g_img_rounded = create_rounded_image(g_img, target_w, target_h, CONFIG.CORNER_RADIUS);
}

/**
 * [业务总控] 加载指定音轨的数据并刷新面板
 */
function update_panel_data(metadb) {
    // 传入控制开关和 CUI 全局背景色
    get_album_art_data(metadb, 0, CONFIG.USE_COVER_COLOR, CONFIG.USE_GRADIENT, g_theme_bg_color)
        .then(data => {
            g_img = data.image;
            g_bg_color1 = data.colors.c1;
            g_bg_color2 = data.colors.c2;
            
            update_cover_ui();
            window.Repaint();
        });
}

// ==========================================
// ## 5. 系统回调事件 (SYSTEM CALLBACKS)
// ==========================================

function on_size() {
    ww = window.Width;
    wh = window.Height;
    
    if (!g_font) {
        g_font = gdi.Font("Segoe UI", 16, 0); 
    }
    
    update_cover_ui();
}

function on_paint(gr) {
    gr.FillGradRect(0, 0, ww, wh, CONFIG.GRADIENT_ANGLE, g_bg_color1, g_bg_color2, 1.0);
    
    if (g_img_rounded) {
        let x = Math.round((ww - g_img_rounded.Width) / 2);
        let y = Math.round((wh - g_img_rounded.Height) / 2);
        gr.DrawImage(g_img_rounded, x, y, g_img_rounded.Width, g_img_rounded.Height, 0, 0, g_img_rounded.Width, g_img_rounded.Height);
    } else {
        let text = fb.IsPlaying ? "No Cover Found" : "Stopped";
        if (g_font) {
            gr.GdiDrawText(text, g_font, CONFIG.TEXT_COLOR, 0, 0, ww, wh, 37);
        }
    }
}

function on_playback_new_track(metadb) {
    update_panel_data(metadb);
}

function on_playback_stop(reason) {
    if (reason !== 2) { 
        update_panel_data(null);
    }
}

// 动态响应 CUI 颜色设置变化
function on_colours_changed() {
    g_theme_bg_color = window.GetColourCUI(3); // 重新获取 CUI 背景色
    
    // 强制刷新当前界面的数据 (使得背景色变更立刻生效)
    update_panel_data(fb.GetNowPlaying());
}

// ==========================================
// ## 6. 启动初始化 (INITIALIZATION)
// ==========================================

function on_script_unload() {
    if (g_img && typeof g_img.Dispose === "function") g_img.Dispose();
    if (g_img_rounded && typeof g_img_rounded.Dispose === "function") g_img_rounded.Dispose();
}

let current_track = fb.GetNowPlaying();
if (current_track) {
    update_panel_data(current_track);
}