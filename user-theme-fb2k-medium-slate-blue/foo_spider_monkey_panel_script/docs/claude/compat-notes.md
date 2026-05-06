# Compatibility and Migration Notes

## 1. Non-Negotiable Runtime Rules
- Never call `.toArray()` on SMP collections (`FbMetadbHandleList` etc.).
- Do not rely on manual dispose for modern SMP objects.
- Always pair `GdiBitmap.GetGraphics()` with `ReleaseGraphics()`.

## 2. `.Dispose()` Guidance
### 2.1 Modern SMP default
`gdi.Image`, `gdi.Font`, `GdiBitmap`, and standard objects are GC-managed; manual `.Dispose()` is not required.

### 2.2 Legacy compatibility boundary
If compatibility with js-panel3 is required, guarded dispose may be used for GDI objects:

```javascript
if (obj && typeof obj.Dispose === "function") obj.Dispose();
```

Guarded `.Dispose()` applies to GDI objects only, not `TitleFormat` or other standard objects.
Compatibility mode does not permit `.toArray()` anywhere.
Avoid applying this pattern broadly when modern SMP-only behavior is expected.

## 3. Paint-Cycle Safety
- `on_paint(gr)` must stay draw-only.
- Do not create fonts/images in `on_paint`; pre-create in setup or size/theme callbacks.

## 4. Migration Checklist
- Replace `.toArray()` usages with direct list access/iteration.
- Remove unneeded dispose calls in modern-only code.
- Add missing `ReleaseGraphics()` in every `GetGraphics()` path (`try/finally` recommended).
- Validate hover/repaint behavior with partial repaint (`RepaintRect`) after refactors.
- For controls that can shrink/move with anti-aliased edges, verify dirty region covers old/new union plus small DPI-aware bleed to prevent residual pixels.
