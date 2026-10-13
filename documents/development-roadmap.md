# Development Roadmap and Validation

Work through milestones in order. These are planning estimates for one developer, not deadlines; expand them based on experience and asset readiness.

| Milestone | Indicative effort | Deliverable and release gate |
|---|---|---|
| 1 Technical spike | 2–4 days | One garment tracks shoulders on laptop and phone; permission and cleanup pass |
| 2 Foundation | 1–2 days | Repository, environments, database migrations and seed command |
| 3 Catalog | 3–5 days | Responsive list/detail/filter with actual API |
| 4 Accounts and admin | 4–6 days | Auth, ownership checks, variants, asset calibration and publishing |
| 5 Integrated preview | 3–5 days | Product colors, errors, fallback, mobile controls and asset caching |
| 6 Shopping flows | 3–5 days | Wishlist, cart validation and idempotent demo orders |
| 7 Quality and deployment | 2–4 days | HTTPS staging, device checks, documented setup and release checklist |

## First coding session

Create a standalone try-on route with a single licensed garment. Implement explicit camera start/stop, pose adapter and similarity-transform renderer. Use mock catalog metadata only here. Test alignment at several distances before adding store functionality. If preview quality is poor, revise garment assets and supported poses before expanding scope.

## Meaningful automated tests

- Coordinate mapping with crop/letterbox, mirror and device pixel ratio.
- Known shoulder anchor pairs produce expected similarity transforms.
- Tracking loss hides stale overlay and resume resets smoothing.
- Component unmount/navigation stops tracks and cancels inference.
- Admin routes reject shoppers; owner endpoints reject other users.
- Cart ignores client prices; checkout reports stock/price changes.
- Two concurrent orders cannot oversell a variant.
- Same idempotency key cannot create duplicate orders or change payload.
- Cancellation restores stock exactly once.
- Upload validation rejects invalid, oversized and uncalibrated images.

Use fake streams and prerecorded licensed fixtures for automated camera tests. Physical-device camera checks remain necessary.

## Manual acceptance matrix

Test denied permission, no camera, busy camera, model download failure, missing asset, no body, partial shoulders, movement, bright/dim light, front/back camera, portrait/landscape, route exit and background/resume. Record device, OS, browser, viewport, FPS, inference interval, alignment observations and pass/fail.

For shopping, test guest cart persistence, login return path, unavailable sizes, product archive, price changes, empty wishlist, duplicate submit, stock conflict and cancellation.

## Deployment gate

HTTPS camera works; tested asset/model licenses are recorded; no secrets in frontend build; no camera data in requests/logs; cookie, CSRF and role checks pass; migrations and database restore are documented; admin credentials are controlled; no real payment UI is enabled; all order screens state demo mode.

## Unresolved decisions to settle during setup

Store name and logo; actual garment supplier; target devices; hosting/storage choice; actual sizes/charts; whether real checkout is needed after the prototype. Resolve these before expanding relevant scope. A single developer can start the technical spike without them.
