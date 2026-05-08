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
- `tab_stack.js`: JSplitter tab controller
- `bg_panel.js`: background controller validation panel

## 2. Directory Layout
- `lib/`: shared libs (`utils.js`, `data.js`, `interaction.js`, `theme.js`, `background.js`, `title_bar_shared.js`)
- `old/`, `simple/`: archived / examples
- `test1.js`, `test2.js`: local test copies

## 3. Library Dependency Chain
`lib/utils.js`
- consumed by: `theme.js`, `data.js`, `interaction.js`
- then reused by: `background.js`, `title_bar_shared.js`

## 4. Canonical Reuse Targets
- `lib/utils.js`: `_hitTest`, `_measureString`, `_measureDispose`, `_extractImageColors`
- `lib/interaction.js`: `_setCursor`, `_drawScrollbar`, `_drawScrollText`, `_disposeImageDict`, `TextTab.getPreferredSize`, `TextTab.repaint`
- `lib/background.js`: `createPanelBackgroundController`, `createPanelBackgroundAutoController`, `createPanelBackgroundLayer`
- `lib/title_bar_shared.js`: `createTitleBarController`

## 5. Behavior Constraints Snapshot
- Prefer existing library helpers over local reinvention.
- Keep expensive work out of `on_paint`.
- Use `window.RepaintRect` for localized updates.
- Respect cache ownership; avoid double-dispose patterns.
