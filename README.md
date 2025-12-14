# cda-store

## Overview
- Static storefront for Cathy’s Dreamy Attire with Bootstrap UI.
- Products are sourced from a published Google Sheets CSV (PapaParse).
- Cart is client-side with WhatsApp-based checkout.

## Data Source
- Products are loaded from a published Google Sheet CSV defined in `js/store.js` (`CSV_URL`).
- Sheet columns used: `id`, `name`, `price`, `category`; optional: `offer_price`, `sizes`, `image_ids`, `description`, `priority` fields.

## Shareable Product URLs
- Each product card has a share button that generates `?product=<ID>` links.
- Opening such a link scrolls to and highlights the product.
- Example: `index.html?product=ABC123`.

## Navbar Behavior (Centralized)
- Mobile auto-close and solid background toggle handled in `js/nav.js`.
- Included by `index.html` and policy pages.

## Fonts
- The site uses Google Font "Lato". The font link is included in all pages.
- Base `font-family` is applied site-wide via `css/style.css` to `html, body`.

## Code Architecture
- `index.html`: Page structure.
	- Fixed navbar with brand and links.
	- Hero banner with scrolling background.
	- `#products` placeholder where categories and product cards are injected by `store.js`.
	- Info cards and footer with socials and policy links.
	- Scripts: `bootstrap.min.js`, `store.js`, `zoom.js` (deferred), `nav.js`.
- `css/style.css`: Styling.
	- Navbar positioning and mobile menu styles.
	- Hero banner visuals.
	- Product media sizing (desktop width-first, mobile height-first), carousel indicators.
	- Footer icon colors and gallery overlay styling.
	- Modern category pills and policy back-to-home button styles.
- `js/store.js`: Application logic.
	- Fetches CSV via PapaParse and builds a PRODUCTS map.
	- Renders category navigation (pills + mobile dropdown) and product cards.
	- Lazy-loads product images and opens gallery overlay on image click.
	- Cart management (localStorage), modal UI, and WhatsApp checkout.
	- Back-to-top button behavior.
- `js/nav.js`: Shared navbar behavior (auto-close + solid background).
- `js/zoom.js`: Image zoom (desktop magnifier, mobile fullscreen).

## Working Notes
- Policy pages (`policies/*.html`) include Bootstrap, site styles, Font Awesome, and `js/nav.js`.
- External links that open in new tabs include `rel="noopener noreferrer"`.

## Development
- Edit content in `index.html` and `policies/`.
- Update product data in the Google Sheet; no deployment changes required.