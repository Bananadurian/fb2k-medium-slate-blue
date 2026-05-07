/**
 * @file title_bar_shared.js
 * @author XYSRe
 * @created 2026-05-04
 * @updated 2026-05-04
 * @version 1.0.0
 * @description 标题栏共享控制器: 统一标题渲染、布局、交互与回调透传
 * @requires lib/utils.js
 * @requires lib/interaction.js
 * @requires lib/theme.js
 */

"use strict";

/**
 * @typedef {Object} TitleBarController
 * @property {function(): void} on_size
 * @property {function(GdiGraphics): void} on_paint
 * @property {function(): void} on_playlists_changed
 * @property {function(): void} on_colours_changed
 * @property {function(): void} on_font_changed
 * @property {function(): void} on_script_unload
 * @property {function(number, number): void} on_mouse_move
 * @property {function(): void} on_mouse_leave
 * @property {function(number, number): void} on_mouse_lbtn_up
 */

/**
 * @typedef {Object} TitleBarControllerConfig
 * @property {string} buttonIconFilename
 * @property {string} buttonHoverIconFilename
 * @property {string} buttonTooltip
 * @property {function(): string} getDisplayText
 * @property {function(): void} [onButtonClick]
 */

/**
 * 创建标题栏控制器
 * @param {TitleBarControllerConfig} cfg
 * @returns {TitleBarController}
 */
function createTitleBarController(cfg) {
    const COL = THEME.COL;
    const tooltip = _initTooltip(THEME.FONT.BODY, _scale(13), 1200);

    const images = {
        icon: _loadImage(IMGS_LUCIDE_DIR + cfg.icon),
        // chevron: _loadImage(IMGS_LUCIDE_DIR + "chevron-down.png"),
        button: _loadImage(IMGS_LUCIDE_DIR + cfg.buttonIconFilename),
        button_hover: _loadImage(IMGS_LUCIDE_DIR + cfg.buttonHoverIconFilename),
    };

    const layout = {
        sliderW: 0,
        startX: 0,
        textW: 0,
        textH: 0,
        contentY: 0,
        isMetricsReady: false,
    };

    const button = {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        img: images.button,
        imgHover: images.button_hover,
        tooltip: cfg.buttonTooltip,
        isHover: false,
        func: cfg.onButtonClick,
    };

    let displayText = "";
    let activeElement = null;

    function updateText() {
        displayText = cfg.getDisplayText();
    }

    function updateLayoutMetrics() {
        if (!_measure.img) {
            _measure.img = gdi.CreateImage(1, 1);
            _measure.gr = _measure.img.GetGraphics();
        }

        layout.sliderW = _scale(14);
        layout.startX = _scale(8);

        layout.textH = _measure.gr.CalcTextHeight("Test", THEME.FONT.LABEL);
        layout.textW = _measure.gr.CalcTextWidth(displayText, THEME.FONT.LABEL);

        layout.contentY = window.Height - layout.textH - _scale(4);

        button.w = layout.textH;
        button.h = layout.textH;
        button.x = window.Width - layout.sliderW - button.w - _scale(4);
        button.y = layout.contentY;

        layout.isMetricsReady = true;
    }

    updateText();

    function on_size() {
        if (window.Width <= 0 || window.Height <= 0) return;
        updateLayoutMetrics();
    }

    function on_paint(gr) {
        gr.FillSolidRect(0, 0, window.Width, window.Height, COL.BG);

        if (!layout.isMetricsReady) return;

        gr.SetTextRenderingHint(5);

        if (images.icon) {
            gr.DrawImage(
                images.icon,
                layout.startX,
                layout.contentY,
                layout.textH,
                layout.textH,
                0,
                0,
                images.icon.Width,
                images.icon.Height,
            );
        }

        gr.GdiDrawText(
            displayText,
            THEME.FONT.LABEL,
            COL.SEL_FG,
            layout.startX + layout.textH + _scale(5),
            layout.contentY,
            layout.textW,
            layout.textH,
            0,
        );
        // 文字傍边那个展开符号，由于无法操作，取消该指示图标
        // if (images.chevron) {
        //     gr.DrawImage(
        //         images.chevron,
        //         layout.startX + layout.textH + layout.textW + _scale(6),
        //         layout.contentY,
        //         layout.textH,
        //         layout.textH,
        //         0,
        //         0,
        //         images.chevron.Width,
        //         images.chevron.Height,
        //     );
        // }

        const current_btn_img = button.isHover ? button.imgHover : button.img;
        if (current_btn_img) {
            gr.DrawImage(
                current_btn_img,
                button.x,
                button.y,
                button.w,
                button.h,
                0,
                0,
                current_btn_img.Width,
                current_btn_img.Height,
            );
        }
    }

    function on_playlists_changed() {
        updateText();
        if (window.Width > 0) {
            updateLayoutMetrics();
            window.Repaint();
        }
    }

    function on_colours_changed() {
        _refreshThemeColors();
        window.Repaint();
    }

    function on_font_changed() {
        _refreshThemeFonts();
        window.Repaint();
    }

    function on_script_unload() {
        _measureDispose();
        _disposeImageDict(images);
    }

    function on_mouse_move(x, y) {
        let target = null;

        if (_hitTest(x, y, button)) {
            target = button;
        }

        if (activeElement === target) return;

        if (activeElement) {
            activeElement.isHover = false;
            window.RepaintRect(
                activeElement.x,
                activeElement.y,
                activeElement.w,
                activeElement.h,
            );
        }

        if (target) {
            target.isHover = true;
            window.RepaintRect(target.x, target.y, target.w, target.h);
            tooltip(target.tooltip || "");
            _setCursor(CURSOR_HAND);
        } else {
            tooltip("");
            _setCursor(CURSOR_ARROW);
        }

        activeElement = target;
    }

    function on_mouse_leave() {
        if (activeElement) {
            activeElement.isHover = false;
            window.RepaintRect(
                activeElement.x,
                activeElement.y,
                activeElement.w,
                activeElement.h,
            );
            activeElement = null;
        }
        tooltip("");
        _setCursor(CURSOR_ARROW);
    }

    function on_mouse_lbtn_up(x, y) {
        if (_hitTest(x, y, button)) {
            if (typeof button.func === "function") {
                button.func();
            }
        }
    }

    return {
        on_size,
        on_paint,
        on_playlists_changed,
        on_colours_changed,
        on_font_changed,
        on_script_unload,
        on_mouse_move,
        on_mouse_leave,
        on_mouse_lbtn_up,
    };
}
