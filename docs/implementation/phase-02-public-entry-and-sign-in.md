# FP2: Public Entry and Sign-In

- Atlas journey: J01 Public entry, sign-in, recovery and sign-out (module: Public and authentication)
- Objective: the public entry points, sign-in for Admin, Staff and Sales, sign-out, and the real-authentication work behind them.
- Business rules: `docs/business-rules/01-roles-and-permissions.md` sections 3 to 9. Security: `docs/development/security.md` sections 10 and 11.
- Depends on: FP1 (roles and scopes).
- Open decisions: G01 (public link placement), G11 (CMS).

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/` | homepage |
| `/login` | linked from home |
| `/login/sales` | direct |
| `/admin` | protected (gate and landing; the dashboard is in FP11) |

Reminder: the mock login is temporary. It must be removed when real authentication lands (memory `mock-login-removal.md`).

## F2.1 Approved homepage entry choices

| Field | Value |
|---|---|
| Journey | J01, TO-BE "Approved homepage entry choices" |
| Current | The homepage provides Home and Login only. Sales sign-in and AA verification work by direct address (U02). |
| Target | Expose approved role portals and public services. Label direct entries clearly until links are approved. |
| Layer | Owner decision, then Frontend (mock) |
| Blocked by | G01, U02 |
| Acceptance | Every public link leads to the intended page. Lookup, registration and account access stay distinct. |
| Status | Blocked |

## F2.2 Admin/Staff and Sales sign-in

| Field | Value |
|---|---|
| Journey | J01 |
| Current | `/login` has an Admin or Staff toggle and `/login/sales` is separate. Email and password get inline validation. The mock checks credentials, the selected portal and an active identity. Success clears permission-scoped queries and goes to `/admin`. The selector does not grant a role. |
| Target | Same behavior, with real identity and role check (F2.5). |
| Layer | Frontend (mock) |
| Blocked by | none (the sales identifier may later become the AA number per doc 03) |
| Acceptance | Wrong credentials, portal mismatch and inactive identity each stop sign-in with a message. Mock credentials are never shown on the page. |
| Status | Exists (mock) |

## F2.3 Sign-out and restricted landing

| Field | Value |
|---|---|
| Journey | J01 |
| Current | Log out asks for confirmation, clears query data and the mock identity, then replaces navigation with `/login`. A direct `/admin` visit shows a skeleton while the identity hydrates, then redirects to `/login` if signed out. The atlas found no return to the originally requested URL after login. |
| Target | Route to the approved destination. Decide whether to return to the requested URL. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | After logout no data from the previous identity is visible. Cancel keeps the session. |
| Status | Exists (mock). Return-to-URL: Missing. |

## F2.4 Account recovery

| Field | Value |
|---|---|
| Journey | J01 |
| Current | Forgot password is a form state in each login route. A valid email shows "Email recovery not available yet." and no reset link is sent (U03). |
| Target | A real recovery endpoint with an approved retry path. |
| Layer | Backend (real authentication) |
| Blocked by | G01, U03 |
| Acceptance | Reset links expire and are single-use. The response does not reveal whether an email exists. |
| Status | Missing |

## F2.5 Real identity and role check

| Field | Value |
|---|---|
| Journey | J01, TO-BE "Real identity and role check" |
| Current | Mock credentials and a localStorage identity pointer, an owner-approved exception. |
| Target | Verify identity and record scope before access. Better Auth with MongoDB, subject to the compatibility check in `AGENTS.md` section 5. |
| Layer | Backend |
| Blocked by | Owner authorization for backend and real authentication |
| Acceptance | Server-side authorization with record-level filtering. All mock auth removed (see the memory note for the grep patterns). |
| Status | Missing |

## F2.6 CMS

| Field | Value |
|---|---|
| Journey | J01 |
| Current | No AFHomes CMS page exists (U09). |
| Target | Pending. Content roles and publishing rules are not decided. |
| Layer | Owner decision |
| Blocked by | G11, U09 |
| Acceptance | To be defined after the decision. |
| Status | Missing |

## Out of scope

Customer Portal and mobile app (future capabilities in `AGENTS.md` section 3).
