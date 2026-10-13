# Starting Prompt for OPENCODE


Copy the instruction below after placing the starter files in your repository's docs directory.

---

Build a clothing-store website with live camera garment previews. Read all files in docs before implementing. Treat app-requirements.md, virtual-try-on-spec.md, database-models.md and api-plan.md as the project specification. Explain conflicts briefly and choose the smallest implementation consistent with the first release.

Use React, TypeScript and Vite for web; FastAPI and PostgreSQL for API and storage; browser MediaPipe Pose Landmarker and Canvas 2D for preview. Check official documentation for the selected current versions, verify package/model licenses, pin dependencies and commit lockfiles. Do not invent a garment asset or show a colored rectangle as a completed clothing preview.

Start with milestone 1: a standalone camera prototype for one front-facing T-shirt. Request camera only after Start camera; request no audio. Keep frames and landmarks on-device. Implement consistent video/canvas coordinate mapping, shoulder-anchor similarity transforms, confidence handling, smoothing, explicit errors and complete camera cleanup. Provide manual calibration and reset controls. Do not claim size/fit prediction or realistic cloth physics.

If a usable garment image is unavailable, add a clearly labeled missing-asset state and document the exact needed PNG and calibration metadata. Continue work that does not depend on it.

Run focused tests for coordinate transforms, tracking loss and cleanup. Give setup commands and a short physical-device test checklist. End the first milestone with the actual working prototype and documented remaining asset/device checks.

After this prototype passes its acceptance gate, continue through the roadmap with real catalog APIs, migrations, secure cookie sessions, CSRF protection, admin calibration, cart validation and demo checkout. Do not implement payments, multi-vendor sellers or cloud photo-generation in the first release. Enforce authorization server-side and protect checkout against duplicate requests and overselling.

Keep architecture modular. Add .env.example with placeholders, seed data clearly labeled sample, API documentation and README commands. Never expose backend secrets in frontend variables. Do not upload webcam frames, add camera analytics or hardcode reusable administrator credentials. Record material deviations in docs with their reason.

---

## What to attach

The complete docs directory; your chosen store name/logo if ready; at least one usable transparent garment PNG; product photographs and sample catalog information; any existing code; screenshots/Figma references if you have them. Tell Codex which device you will use for the first camera test.
