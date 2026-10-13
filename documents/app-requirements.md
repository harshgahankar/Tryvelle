# Application Requirements

## Product goal

Help shoppers preview the appearance of selected clothing before deciding what to buy. The main journey is browse, view garment details, preview on camera, choose a size using the size chart, and add to cart.

## Release scope

| Area | First release | Later |
|---|---|---|
| Catalog | Search, category, price, color and size filters; sort; product details | Recommendations and seller storefronts |
| Try on | One front-facing top, local live camera, alignment adjustment, color switch | Better warping, arm occlusion, dresses and trousers |
| Accounts | Registration, login, logout, profile, password reset | Social login |
| Shopping | Guest cart, signed-in wishlist, demo checkout and order history | Verified payments, shipping and refunds |
| Admin | Products, variants, images, overlay calibration, stock, demo orders | Sellers, promotions, advanced analytics |
| Accessibility | Keyboard access, readable contrast, reduced motion, clear status | Expanded assistive-device testing |

Do not advertise the first release as accurate sizing, realistic 3D cloth simulation or an AI attractiveness judgment. Disable try-on for categories without a validated asset pipeline.

## Roles

Guest: browse, filter, preview and maintain a local cart.
Shopper: guest permissions plus wishlist, profile and own orders.
Administrator: manage catalog, inventory, try-on assets and demo order status. Administrator permissions must be enforced by the API.

## Functional acceptance criteria

| ID | Requirement | Acceptance |
|---|---|---|
| CAT01 | Browse catalog | Paginated products load with image, price, available colors and try-on badge |
| CAT02 | Search and filter | Query and filters combine; resetting them restores catalog; empty results offer reset |
| CAT03 | Product detail | Variant selection determines stock and price; size chart opens accessibly |
| TRY01 | Open preview | Eligible product opens setup screen before camera access is requested |
| TRY02 | Camera permission | Explicit start action requests video only; denied/unavailable states show recovery |
| TRY03 | Body alignment | Visible shoulder and hip landmarks drive position, scale and rotation |
| TRY04 | Tracking failure | Low confidence hides overlay and shows framing guidance; stale tracking never persists indefinitely |
| TRY05 | Change color | Loads the selected color asset without reopening camera; unavailable assets are identified |
| TRY06 | Stop camera | Close, navigation away and camera switch stop previous tracks and inference |
| TRY07 | Manual control | Reset, scale and offset controls improve alignment without implying sizing accuracy |
| CART01 | Cart | Only valid variant IDs and quantities accepted; server reprices at checkout |
| ACC01 | Authentication | Login errors are clear; logout revokes session; role is never trusted from client |
| WISH01 | Wishlist | Signed-in user can add/remove products; duplicates are prevented |
| ORD01 | Demo checkout | Address and stock validated; order states clearly say no payment collected |
| ADM01 | Catalog control | Admin can draft/publish products and calibrated assets; invalid asset cannot publish |
| ADM02 | Inventory | Changes cannot produce negative stock; concurrent orders cannot oversell |

## Nonfunctional targets

These are initial test targets, not measured guarantees. On a documented reference laptop and mid-range phone, aim for at least 15 rendered preview frames per second over a 60-second session. Record inference speed separately. Aim for visible overlay response within 200 ms of a landmark update; adjust target after the technical spike. Measure catalog loading on defined network conditions rather than claiming universal performance.

Use HTTPS for deployed camera access. Keep webcam pixels and pose results in browser memory. Do not request microphone access. Strip camera content from logs, analytics, recordings and error reports. Optional download of a snapshot is a user action and stays local.

Support current Chrome desktop/Android and Safari iOS as validation targets; record tested versions. If capabilities or model loading fail, catalog browsing must still work.

## Later enhancements

Saved outfit comparisons, personalized style preferences, photo-based generative previews, segmentation and mesh warping may follow. Treat photo upload as a separate consent and retention feature. Real checkout requires a separate payment and fulfillment milestone. A seller marketplace requires seller verification, moderation, commissions and payouts.
