# cda-store

## Overview
- Static storefront for Cathy’s Dreamy Attire with Bootstrap UI.
- Products are sourced from a published Google Sheets CSV (PapaParse).
- Cart is client-side with WhatsApp-based checkout.

## Code Architecture
- `index.html`: Page structure.
	- Fixed navbar with brand and links.
	- Hero banner with scrolling background.
	- `#products` placeholder where categories and product cards are injected by `store.js`.
	- Info cards and footer with socials and policy links.
	- Scripts: `bootstrap.min.js`, `store.js`, `zoom.js` (deferred), plus a small navbar UX script.
- `css/style.css`: Styling.
	- Navbar positioning and mobile menu styles.
	- Hero banner visuals.
	- Product media sizing (desktop width-first, mobile height-first), carousel indicators.
	- Footer icon colors and gallery overlay styling.
- `js/store.js`: Application logic.
	- Fetches CSV via PapaParse and builds a PRODUCTS map.
	- Renders category navigation (pills + mobile dropdown) and product cards.
	- Lazy-loads product images and opens gallery overlay on image click.
	- Cart management (localStorage), modal UI, and WhatsApp checkout.
	- Back-to-top button behavior.
- `js/zoom.js`: Image zoom.
	- Desktop magnifier panel beside hovered gallery image.
	- Mobile fullscreen pinch/drag zoom overlay.

## Working Notes
- Policy pages (`policies/*.html`) include Bootstrap only; product logic is not loaded.
- External links that open in new tabs include `rel="noopener noreferrer"`.

## Development
- Edit content in `index.html` and `policies/`.
- Update product data in the linked Google Sheet; no deployment changes required.