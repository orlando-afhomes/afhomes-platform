# Button group and status badge audit

This inventory covers the route files and registered admin area tabs in the working tree. The source scan follows feature and component imports from each route, including lazy imports. A source match means a component is reachable in code. Visibility still depends on role, tab, and record state.

Action scope includes headers, detail footers, row menus, dialogs, document previews, and public action groups. Tabs, filters, pagination, role labels, product labels, and counts use their existing selection or classification styles.

## Admin area tabs

- customers — Customers, Export
- sales — Sales, Contracts, Property Sales (IGP), Payment Plan Guide
- finance — Receipts, Payment Status, Cancellations, Close the Month, Monthly Check
- commissions — Commissions, Commission Paybacks, Rates, Leader Allowances
- membership — Memberships, Ready to Activate
- stay-points — Annual Points, Bills to Review, Special Cases, Promotions, Promo History
- redemption — Stay Bookings, Points Balance
- vip-products — Products, Payment Plans, Card Levels, Points per Night, Holidays, Venues, Programs, IDs & Banks, Receipt History Export, Property Projects (IGP), Experiences
- sales-network — Members, Team Tree, Seller Applications
- organization — Staff, Departments, Roles
- reports — Summary, Sales, Customers, Payments Received, Commissions, Membership, Stay Points, Promo Points

## Route source inventory

| Route | Action component | Badge component |
|---|---|---|
| `/` | Found | Found |
| `/about` | Found | None found |
| `/admin` | Found | Found |
| `/admin/account` | Found | Found |
| `/admin/accounts` | None found | None found |
| `/admin/audit-logs` | Found | None found |
| `/admin/commissions` | Found | Found |
| `/admin/commissions/allowances` | Route forwards | Route forwards |
| `/admin/commissions/assignment` | Route forwards | Route forwards |
| `/admin/commissions/payouts` | Route forwards | Route forwards |
| `/admin/customer-lookup` | Found | Found |
| `/admin/customers` | Found | Found |
| `/admin/customers/[id]` | Route forwards | Route forwards |
| `/admin/customers/[id]/edit` | Route forwards | Route forwards |
| `/admin/customers/import-export` | Route forwards | Route forwards |
| `/admin/customers/new` | Found | None found |
| `/admin/experiences` | Route forwards | Route forwards |
| `/admin/finance` | Found | Found |
| `/admin/finance/cancellations` | Route forwards | Route forwards |
| `/admin/finance/cancellations/[id]` | Route forwards | Route forwards |
| `/admin/finance/collections` | Route forwards | Route forwards |
| `/admin/finance/collections/[id]` | Route forwards | Route forwards |
| `/admin/finance/contracts/[id]` | Route forwards | Route forwards |
| `/admin/finance/holds` | Route forwards | Route forwards |
| `/admin/finance/payments` | Route forwards | Route forwards |
| `/admin/membership` | Found | Found |
| `/admin/membership/activation` | Route forwards | Route forwards |
| `/admin/organization` | Found | Found |
| `/admin/organization/departments` | Route forwards | Route forwards |
| `/admin/organization/roles` | Route forwards | Route forwards |
| `/admin/organization/staff` | Route forwards | Route forwards |
| `/admin/promos` | Route forwards | Route forwards |
| `/admin/promos/points` | Route forwards | Route forwards |
| `/admin/redemption` | Found | Found |
| `/admin/redemption/points-table` | Route forwards | Route forwards |
| `/admin/reports` | Found | Found |
| `/admin/reports/collections` | Route forwards | Route forwards |
| `/admin/reports/commissions` | Route forwards | Route forwards |
| `/admin/reports/customer-growth` | Route forwards | Route forwards |
| `/admin/reports/historical-import` | Route forwards | Route forwards |
| `/admin/reports/membership` | Route forwards | Route forwards |
| `/admin/reports/period-close` | Route forwards | Route forwards |
| `/admin/reports/promo-points` | Route forwards | Route forwards |
| `/admin/reports/reconciliation` | Route forwards | Route forwards |
| `/admin/reports/sales-performance` | Route forwards | Route forwards |
| `/admin/reports/stay-points` | Route forwards | Route forwards |
| `/admin/sales` | Route forwards | Route forwards |
| `/admin/sales-network` | Found | Found |
| `/admin/sales-network/genealogy` | Route forwards | Route forwards |
| `/admin/sales-network/members` | Route forwards | Route forwards |
| `/admin/sales-network/members/[id]` | Route forwards | Route forwards |
| `/admin/sales-network/registrations` | Route forwards | Route forwards |
| `/admin/sales/contract-review` | Route forwards | Route forwards |
| `/admin/sales/contract-review/[id]` | Route forwards | Route forwards |
| `/admin/sales/contracts` | Route forwards | Route forwards |
| `/admin/sales/contracts/[id]` | Route forwards | Route forwards |
| `/admin/sales/igp` | Route forwards | Route forwards |
| `/admin/settings/lists` | Route forwards | Route forwards |
| `/admin/stay-points` | Found | Found |
| `/admin/vip-products` | Found | Found |
| `/admin/vip-products/contracts` | Route forwards | Route forwards |
| `/admin/vip-products/contracts/[id]` | Route forwards | Route forwards |
| `/admin/vip-products/scheme-guide` | Route forwards | Route forwards |
| `/admin/vip-products/schemes` | Route forwards | Route forwards |
| `/admin/vip-products/tier-codes` | Route forwards | Route forwards |
| `/blog` | Found | None found |
| `/blog/[slug]` | Route forwards | Route forwards |
| `/compliance` | Found | None found |
| `/contact` | Found | None found |
| `/experiences/[slug]` | Route forwards | Route forwards |
| `/experiences/alm-japanese-restaurant` | Found | Found |
| `/experiences/hotspring-ecofarm-resort` | Found | Found |
| `/experiences/smart-wellness-hotel` | Found | Found |
| `/faq` | Found | None found |
| `/login` | Found | None found |
| `/login/sales` | Found | None found |
| `/offers` | Found | None found |
| `/portal` | Found | None found |
| `/privacy` | None found | None found |
| `/register/ost` | Found | Found |
| `/register/ost/correct/[token]` | Route forwards | Route forwards |
| `/status/[code]` | Route forwards | Route forwards |
| `/verify` | Found | Found |
| `/vip-privilege` | Found | None found |

## Verification scope

The route inventory is a source check. Browser and test results cover the named sample workflows. Role-restricted and data-dependent combinations require their own fixtures.

- Browser checked with sample data — Property Sales list and details at 1,163 px and 320 px, the detail footer and its overflow menu, customer status pills under light and dark theme classes, and public home availability labels.
- Focused tests checked action and status mappings, admin and public shared components, Property Sales permissions and actions, contract details, and Redemption. The final Property Sales and shared action/status retest passed 22 tests. The added overflow color test passed in a two-test run.
- Light-theme token check — the 12 sampled status colors measured 4.92:1 to 7.70:1 on the canvas with a 10% tint. The browser checks were representative. They did not cover every role, record status, or dark-theme contrast ratio.
