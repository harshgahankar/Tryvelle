# Clothing Store with Live Camera Try On

Project starter documentation | 13 October 2026

Build a responsive clothing store where shoppers select an eligible garment, open their camera, and see a moving garment overlay aligned to their torso. Start with front-facing T-shirts and tops. The initial product is a visual style preview; it does not measure fit, simulate cloth, or decide objectively whether an outfit suits someone.

## Decisions used in this pack

- Single-store website with shopper and administrator roles. Multi-vendor marketplace is a later project phase.
- React with TypeScript for the browser; FastAPI for the API; PostgreSQL for structured data; object storage for product assets.
- Browser pose tracking and Canvas rendering; no camera frames uploaded for live previews.
- Guest browsing, try-on and cart. Login is required for wishlist, account history and placing a demo order.
- Demo ordering first. Payment collection, fulfillment and refund automation are outside the first release.
- INR is the initial display currency. Currency and store branding remain configurable.
- No custom model training or paid AI service is required to prove the live overlay.

These are proposed implementation defaults, not existing project decisions. Package versions, hosting and model licensing must be checked and pinned during setup.

## Read in this order

| File | Purpose |
|---|---|
| app-requirements.md | Scope, roles, user stories and acceptance criteria |
| screen-list.md | Routes, page content and error states |
| technical-architecture.md | Stack, modules, repository layout and deployment |
| virtual-try-on-spec.md | Camera lifecycle, alignment, calibration and limitations |
| database-models.md | Tables, relationships and data integrity |
| api-plan.md | API contracts, authentication and authorization |
| design-system.md | Visual foundation and component rules |
| asset-and-data-plan.md | Catalog seed data and garment asset requirements |
| development-roadmap.md | Build sequence, tests and release gates |
| codex-start-prompt.md | Initial coding instruction to use with this pack |

## Begin here

Put these files in a docs directory inside your repository. Give Codex the complete directory and the starting prompt. First prove one camera-aligned garment on a laptop and a phone. Proceed with the store after confirming that the overlay is useful at the expected lighting, distance and camera angle.

You will need your store name, logo if available, product photographs, prepared transparent garment images, prices, sizes, stock and size charts. Use the sample data specification if these are not ready.

## Official references

Technical references were checked on 13 October 2026:

- MediaPipe Pose Landmarker for Web: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- Browser camera API and permission requirements: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

Only these camera and pose capabilities are sourced here. Architecture, scope, milestones and performance thresholds are proposed project choices.
