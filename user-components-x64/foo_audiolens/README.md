# Audio Lens Seekbar

A seekbar component for foobar2000 that shows the whole track as a picture you can click — a spectrogram,
waveform, live spectrum or loudness map — with standards-compliant measurements on top.

Works in Default UI and Columns UI. No external tools (no ffmpeg), no scripting.

Component page: https://www.foobar2000.org/components/view/foo_audiolens

## Requirements

- foobar2000 2.0 or newer, 64-bit or 32-bit
- Windows 10 or 11

## Installation

1. Double-click `foo_audiolens-<version>.fb2k-component`, or use *Preferences → Components → Install…*.
2. Restart foobar2000.
3. Add the panel:
   - **Default UI:** *View → Layout → Enable layout editing*, right-click an area, *Add New UI Element →
     Visualisation → Audio Lens Seekbar*.
   - **Columns UI:** *Preferences → Columns UI → Layout*, add the panel *Audio Lens Seekbar*
     (category *Visualisations*), or use it as a toolbar.

## Features

### Lenses (main view)

| Lens | Shows |
|---|---|
| Spectrogram | Frequency content over time, linear or logarithmic, mix / left / right / side / stereo |
| Waveform | Peak and RMS envelope, plain or three frequency bands, stereo or mono |
| Spectrum bars | Live bar spectrum at the playback position, with a waveform timeline |
| Loudness heatmap | Short-term and momentary loudness (EBU R128) |

The lens can be switched off to show only the metrics.

### Metrics

- **Curves** (up to four at a time): local dynamic range, crest factor, PSR, PLR, sample peak (total, left,
  right), true peak, RMS left/right, momentary and short-term loudness, stereo width, phase correlation,
  L/R balance, brightness (spectral centroid).
- **Values** in the corner: DR (TT DR Offline Meter algorithm, track and per channel), integrated loudness,
  loudness range, max. momentary / short-term loudness, sample and true peak, RMS, PLR, crest factor,
  ReplayGain, correlation, width, balance, bandwidth.
- Clipping and true-peak markers, phase correlation strip.
- **Quality report** (optional): upsampled or resampled files, possible lossy source, fake bit depth,
  clipping, DC offset, inter-sample peaks, mono compatibility.

### Everything else

- Every panel has its own settings and a name; 9 built-in presets plus your own.
- 19 color themes, including retro computer palettes and an adaptive theme from the album art.
- Zoom and pan the time axis; fullscreen across one or more monitors.
- Export the view or an analysis sheet with cover, measurements and legend as PNG or to the clipboard.
- Playlist context menu *Audio Lens → Analyze (add to cache) / Remove from cache*; optionally analyzes the
  next track during playback. Results are kept in a memory and a disk cache.
- Multichannel files (5.1, 7.1, Dolby Atmos channel beds and more): loudness is measured over all
  channels with the weights of ITU-R BS.1770; the display shows a stereo downmix.

## Usage

| Action | Effect |
|---|---|
| Click / drag | Seek (when stopped: start playback there) |
| Mouse wheel | Seek −/+ 5 s |
| Ctrl + wheel | Zoom at the mouse position |
| Shift + wheel, horizontal wheel, Ctrl + drag | Pan |
| Home | Reset zoom |
| Middle click | Fullscreen on/off (Esc or F11 to leave) |
| Right click | Menu: lens, metrics, color theme, display, zoom, presets, configure, export, fullscreen |

Panel settings: right-click → *Configure this panel…*. Defaults for new panels and global options (cache,
fullscreen, pre-analysis): *Preferences → Visualisations → Audio Lens Seekbar*.

## Measurement accuracy

Loudness, loudness range and true peak are checked against the EBU Loudness Test Set (EBU Tech 3341 and
3342) and the compliance material of ITU-R BS.2217 (mono up to 22.2 channels): all 122 checks pass within
the tolerances of the standards, typically within 0.03 LU. The track DR matches foo_dr_meter.

## License

Copyright (c) 2026 Audio Lens. All rights reserved. Free of charge; the unmodified package may be passed on.
See `LICENSE.txt`.

This component uses third-party software under their own licenses — the foobar2000 SDK, pfc and libPPUI,
the Columns UI SDK, WTL and PFFFT. See `THIRD-PARTY-NOTICES.txt`.
