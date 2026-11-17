# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary (confirmed by the owner, 2026-11-17):** people who may buy a VIP Privilege Card and stay at AFhomes. Families and guests learning about the resort, the hotel and the restaurant before deciding.
- **Also on the public site (from the repository, not re-confirmed):** accredited AFhomes sales sellers who use Verify Accreditation and Sales Sign-In, and staff who use Staff Login.

## Product Purpose
The AFhomes public website presents AFhomes Group of Companies: a hospitality and resort developer and operator. Success on the Home page is a visitor who understands the three destinations and the VIP Privilege Card, and chooses to learn more or get in touch.

## Positioning
"The first largest homestyle hotspring." All-in-one destinations that feel like home (site copy: "Amazing & Fun, Your Home Away From Home").

## Operating Context
- Destinations: Hotspring & Ecofarm Resort (flagship, 60 hectares, built phase by phase), Smart Wellness Hotel (grand opening November 2026), ALM Japanese Restaurant (open now).
- VIP Privilege Card tiers: Bronze, Silver, Gold. Card figures come from `src/modules/public-site/content/vip.ts`.
- The app is frontend-first with mock data; the public site content is typed data in `src/modules/public-site/content/`.

## Capabilities and Constraints
- Stack is fixed by `AGENTS.md` section 8: shadcn/ui on Base UI, Tailwind CSS 4, namespaced custom CSS, Lucide. No Ant Design, no CSS Modules, no new component system.
- Design tokens live in `src/theme/tokens.css`. Public site CSS uses the `site-*` namespace.
- AFhomes does not offer real estate investments, timeshares, club shares or securities. The disclaimer must stay in the footer.
- Pictures that show architectural renderings keep the renderings note. The owner chose to keep villa pictures that have room rates printed inside them.
- Not decided: hot-spring count (the old site says "over 10" on About and "over 5" in the FAQ). Do not state a number.
- There is no public customer or card lookup.

## Brand Commitments
- Name: AFhomes (company-facing spelling). Group name: AFhomes Group of Companies.
- Slogan: "Amazing & Fun, Your Home Away From Home".
- Logo: `public/images/logo.png`, with the multicolor logo gradient (`--gradient-brand-logo`).
- Brand palette in `src/theme/tokens.css` is preserved until the owner approves a change.

## Evidence on Hand
- 64 shrunk WebP pictures in `public/images/site/` (resort masterplan, hotel rooms, restaurant, villa renderings, VIP cards, compliance documents).
- Four VIP card images (Bronze, Silver, Gold) with real tier data.
- No testimonials, awards, visitor counts or prices exist as content. Do not invent them.

## Product Principles
1. Honest hospitality: never imply an investment product; show renderings as renderings.
2. Content first: real photographs and the existing typed content carry the page.
3. One brand, used with restraint: the logo gradient and brand green lead; gold is an accent, not a second brand.
4. Everyone reaches their task fast: a visitor, a seller verifying an accreditation, and a staff member each find their link without hunting.

## Accessibility & Inclusion
Keyboard navigation, visible focus, labelled controls, enough contrast over photographs, reduced-motion support, and 44px touch targets (`AGENTS.md` section 8).
