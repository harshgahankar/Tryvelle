# Screens and User Flows

| Screen | Route | Main content and actions |
|---|---|---|
| Home | / | Featured products, categories, try-on explanation |
| Catalog | /shop | Search, filters, sort, grid, pagination |
| Product | /products/:slug | Gallery, colors, sizes, price, stock, chart, try-on, cart |
| Try-on setup | /try-on/:productId | Preview explanation, camera consent, framing instructions, start |
| Live try-on | Same route after start | Camera canvas, status, colors, scale/offset, reset, switch camera, close |
| Cart | /cart | Variant rows, quantity, subtotal, remove, checkout |
| Login | /login | Email, password, reset link, return destination |
| Register | /register | Name, email, password, validation |
| Forgot password | /forgot-password | Generic request acknowledgment |
| Reset password | /reset-password | One-use token and new password |
| Wishlist | /wishlist | Saved products and removal |
| Profile | /account | Profile and saved addresses |
| Demo checkout | /checkout | Address, order review, explicit demo-order action |
| Order confirmation | /orders/:id/confirmation | Order ID, no-payment notice, summary |
| Orders | /account/orders | Own orders and status |
| Order details | /account/orders/:id | Snapshot items, address, totals, status |
| Admin dashboard | /admin | Catalog and stock summary, demo order count |
| Product management | /admin/products | Draft/published list, search, create/edit/archive |
| Product editor | /admin/products/new or /:id | Details, categories, variants, media and publishing |
| Try-on asset editor | /admin/products/:id/try-on | PNG preview, anchor placement, calibration and eligibility |
| Inventory | /admin/inventory | Variant-level stock updates |
| Demo order management | /admin/orders | Orders, detail and permitted status transitions |
| Camera and privacy explanation | /privacy/camera | Local processing, stopping camera and local snapshots |
| Help | /help | Framing, lighting, permission recovery and limitations |
| Not found | Unknown routes | Recovery links |

## Required states

Every API screen needs loading, empty, success and retryable error states. Product details handle archived product, unavailable variant and missing chart. Checkout handles price changes, stock conflicts and repeated submit.

Try-on needs idle, requesting permission, loading model, loading asset, waiting for pose, tracking, low confidence, camera denied, no camera, camera busy, unsupported browser, model failure and closed states. Start model and garment loading before or alongside permission handling, but request camera only after the user's start action. Distinguish failed camera access from failed model download.

## Main flows

Shopping: Home → catalog → product → choose color → try-on setup → live preview → close → choose size → cart → login if needed → demo checkout → order confirmation.

Administration: Login → admin product editor → add variants and photography → upload overlay → mark anchors → validate in live preview → publish eligible color → publish product.

Wishlist is available after login. Return the shopper to the initiating product after authentication. Validate any return URL as a local allowed route.

## Mobile layout

Use a full-height camera viewport with controls outside the body framing area. Keep exit and camera status visible. Respect safe-area insets. Do not assume the shopper can hold the phone and fit their whole torso in the frame; suggest a stand or stepping back. Landscape orientation is optional and should not break the preview.
