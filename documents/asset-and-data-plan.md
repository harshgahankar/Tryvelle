# Asset and Data Plan

## Data needed before coding the catalog

You do not need to collect a large training dataset for the first live overlay. Use a pretrained pose model and manually prepared product assets. You do need a small, well-curated clothing catalog and device tests.

| Item | Minimum starter set | Validation |
|---|---|---|
| Products | 6–10 licensed/sample tops | Title, category, description and status |
| Variants | 2 colors and 3 sizes where available | SKU, price, stock and valid combinations |
| Photography | Front image plus optional detail/back | Usage rights, useful alt text |
| Overlay | One transparent front-view image per eligible color | Alpha channel, anchors, calibration and resolution |
| Size chart | Actual supplier chart when available | Unit and garment/body measurement definition |
| Test devices | One laptop and one phone | Browser/version, camera resolution, tracking results |

Sample catalog data must be marked as sample in the seed file. Never invent supplier measurements and present them as verified.

## Garment asset preparation

Use an isolated, straight front-view garment with sleeves visible and little perspective distortion. Remove background and mannequin/person residue. Preserve transparent padding intentionally. Starting image target is about 1024px on the longest edge, preferably below 2 MB; tune after visual tests.

The alpha image should not contain a model's face, skin or hands. Align left/right shoulder anchor names consistently with source garment orientation; document whether labels refer to wearer anatomy. The asset editor should visualize both anchors, hem center and the resulting transform.

Sample metadata:

{"schema_version":1,"width":1024,"height":1024,"anchors":{"left_shoulder":{"x":0.28,"y":0.18},"right_shoulder":{"x":0.72,"y":0.18},"hem_center":{"x":0.50,"y":0.88}},"calibration":{"scale_multiplier":1.0,"offset_x":0.0,"offset_y":0.0}}

These coordinates are illustrative and must be replaced for every asset. Define offset units as shoulder-span fractions in the implementation. Enforce finite normalized anchors, nonzero shoulder span and positive scale multiplier.

## Seed records

Use sample IDs or stable seed keys, not real user information. Seed categories, products, colors, variants, size charts and asset metadata. Create a development admin through an explicit setup command using an environment-supplied password; never commit a reusable admin password.

## Data ownership

Use your own photographs, supplier-authorized assets or assets with an appropriate license. Keep a source/license note for each asset and model. Permission to view an image online does not automatically grant permission to redistribute it.

## Later photo-based AI

A generative photo preview needs a separate assessment of model/service licensing, garment preservation, hosting, GPU cost, image retention and failure modes. It is not a drop-in replacement for the live camera loop. Do not scrape shopper photos or collect biometric identity data to build the first release.
