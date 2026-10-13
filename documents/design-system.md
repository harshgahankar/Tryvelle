# Design System

## Visual direction

A clean fashion storefront with large garment photographs, quiet neutral surfaces and a prominent Try on button. Keep camera controls legible over changing backgrounds. Working brand text is Clothing Studio until a name is chosen.

## Tokens

| Token | Value | Use |
|---|---|---|
| background | #FAF8F5 | Page background |
| surface | #FFFFFF | Cards, dialogs |
| text | #181818 | Main text |
| muted | #595959 | Secondary text |
| accent | #AF2424 | Primary action |
| border | #DEDAD4 | Containers |
| success | #166534 | Available/ready |
| warning | #92400E | Framing guidance |
| error | #B91C1C | Errors |

Validate actual component text/background combinations for WCAG AA; tokens alone do not guarantee compliance.

Use a system sans-serif stack initially. Body 16px with 1.5 line height, captions 14px, section headings 24–32px, hero heading 40–56px desktop and 32–40px mobile. Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px. Radius 8px for inputs/buttons and 12px for cards. Use soft, restrained shadows.

## Responsive rules

Design mobile first. Suggested breakpoints: 640, 768, 1024 and 1280px. Catalog uses two columns on ordinary phones when readable and up to four on wide screens; use one column where needed for narrow devices. Use a slide-out mobile filter panel with focus management.

## Components

Header, search field, filter panel, product card, price, color swatch, size selector, stock indicator, primary/secondary button, dialog, toast, skeleton, empty state, form field and camera status badge.

Buttons expose disabled/loading states. Color swatches have labels and selected marks; never rely on color alone. Size selectors distinguish unavailable stock from unselected choices. The try-on button carries an eligibility label when necessary.

## Camera workspace

Use a dark control surface with white text and contrast-checked status badges. Show a torso guide before tracking begins. Keep close button and camera-active label visible. Controls: color, scale, vertical/horizontal adjustment, reset, switch camera and optional download. Avoid controls covering shoulders or torso.

Copy: “Preview how this looks on you. This view does not measure size or guarantee fit.” Permission copy: “Your camera is processed on this device for live preview. It is not uploaded.”

## Accessibility

Use semantic HTML, visible focus, keyboard-operable dialogs and at least 44px interactive targets. Announce meaningful status changes with a polite live region without reading every frame. Respect prefers-reduced-motion. Provide catalog/photos as an alternative when camera access is unavailable. Mirror control labels and displayed directions consistently.
