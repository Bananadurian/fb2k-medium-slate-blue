# Project Map

## 1. Script Inventory
- `info+rating.js`: metadata, rating, AQ badge, source icon
- `album_info.js`: album view + cover carousel + tabs
- `biography.js`: artist profile/discography + links
- `playback_buttons.js`: transport controls
- `control_buttons.js`: utility controls + volume
- `title_playlist.js`: playlist title bar
- `title_library.js`: library title bar
- `cover_panel.js`: cover display + background controller
- `tab_container.js`: JSplitter tab container (canonical template)
- `tab_container_detail.js`: JSplitter tab container (detail panels variant)
- `tab_container_playlist.js`: JSplitter tab container (playlist variant)
- `bg_panel.js`: background controller validation panel
- `bg_panel_container_playlistview.js`: background container with playlist sub-panel layout
- `bg_panel_container_control.js`: background container with control sub-panel layout

## 2. Directory Layout
- `lib/`: shared libs (`utils.js`, `data.js`, `interaction.js`, `theme.js`, `background.js`, `title_bar_shared.js`, `flag.js`)
- `old/`, `simple/`: archived / examples
- `test1.js`, `test2.js`: local test copies

## 3. Library Dependency Chain
`lib/utils.js`
- consumed by: `theme.js`, `data.js`, `interaction.js`, `flag.js`
- then reused by: `background.js`, `title_bar_shared.js`
`lib/flag.js`
- depends on: `lib/theme.js` (IMGS_FLAGS_DIR), `lib/utils.js` (_loadImage)

## 4. Canonical Reuse Targets
- `lib/utils.js`: `_hitTest`, `_measureString`, `_measureText`, `_measureDispose`, `_extractImageColors`, `resolveMetadbByMode`, `normalizePadding`, `calcContentRect`, `_getFontLineHeight`, `layoutSections`
- `lib/interaction.js`: `CURSOR_ARROW`, `CURSOR_HAND`, `Button`, `TextTab`, `_setCursor`, `_drawScrollbar`, `_manageCarousel`, `_carouselNext`, `_drawTabIndicator`, `_drawText`, `_drawIcon`, `_drawEmptyState`, `_drawPageIndicator`, `_disposeImageDict`, `_initTooltip`, `_createDefaultTooltip`, `createScrollTextRenderer`
- `lib/background.js`: `createPanelBackgroundController`, `createPanelBackgroundAutoController`, `createPanelBackgroundLayer`
- `lib/title_bar_shared.js`: `createTitleBarController`
- `lib/flag.js`: `COUNTRY_RULES`, `LANGUAGE_MAP`, `resolveCountryCode`, `resolveLanguageCode`, `loadFlagImage`

## 5. Behavior Constraints Snapshot
- Prefer existing library helpers over local reinvention.
- Keep expensive work out of `on_paint`.
- Use `window.RepaintRect` for localized updates.
- Respect cache ownership; avoid double-dispose patterns.
