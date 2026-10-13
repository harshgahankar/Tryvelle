# Milestone 5 — Integrated preview (opencode-start-prompt)

## Delivered
- Shared `useTryOnSession` engine (camera lifecycle, pose inference, similarity renderer, garment-aware, calibration via refs so sliders never restart the camera). M1 `PrototypeTryOn` keeps its inline copy as the milestone reference.
- `LiveTryOn` on real API data: product detail + published assets per colorway; color switching loads the cached garment image with zero camera restart; colorways without assets are flagged (`!` badge + "guides only" note, never a fake garment).
- Asset cache (`assetCache.js`): in-memory URL-keyed image cache + pure anchor/selector helpers, 4 new tests.
- Failure fallback per screen-list: denied/busy/unsupported/model-failure states show retry + product photos + catalog links (photos as the camera alternative).
- Mobile: 44px+ targets, controls below the viewport, safe-area bottom padding, persistent exit + live status pill.
- Home New Arrivals served by `GET /products`, mock fallback if the API is down.
- Tests: 16/16 vitest; vite build green. No backend changes needed (asset endpoint already shipped in M3).

## Notes
1. Only everyday-cotton-tee Cream has a published SAMPLE asset, so other colorways correctly show the missing-asset state until real calibrated PNGs exist.
2. No push performed — commits stay local per your instruction.

## Next (Milestone 6 — Shopping flows)
Cart validation endpoint, idempotent demo orders with stock transactions, owner order history + cancel, admin order management, zero-shipping alignment in the storefront.
