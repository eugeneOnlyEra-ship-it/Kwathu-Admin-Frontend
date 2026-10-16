# Kwathu — Product Direction

> Read this first in any new chat before touching the Kwathu codebase.
> It records the product pivot agreed on 2026-10-14 and supersedes any
> earlier framing (e.g. "student hostel booking platform with admin
> identity approval") found in old comments, audits, or chat summaries.
> Identical copies of this file live in `kwathu-backend/`,
> `kwathu-frontend/`, and `kwathu-admin/` so it travels with whichever
> repo gets opened or re-uploaded first.

## The pivot, in one paragraph

Kwathu is no longer specifically a student-hostel platform where the
platform/admin is responsible for entering location details and
approving landlord identities. It's now a general marketplace with two
sections: **Business Corner** and **Places & Locations**. Landlords and
Agents enter and own their own listing details, listings go live
immediately, and identity documents are optional, self-reported
"authenticity" signals shown to customers — **admin no longer approves
anyone's identity, and no longer approves listing content either.**

## The two sections

### Places & Locations — current focus
The renamed, reworked version of the existing hostel/property booking
feature. Listers are **Landlords** or **Agents**. Customers find and
book a place. This is where Property/Room/Booking/Payments already
live in the codebase — the rework generalizes and de-gates it; it does
not rebuild it from scratch (see "Decided" below on rename scope).

### Business Corner — not yet started
A second section for people with businesses to list them for customers
to find. Explicitly **not** the current focus. A minimal placeholder
(nav entry + "coming soon" page, no backend) may exist just so the
two-section site structure is visible — nothing functional. When this
is actually picked up, it needs its own scoping pass (its own decision
log should get added to this file at that point) — don't assume it
reuses Property/Room/Booking as-is.

## Roles

- **Landlord** — `UserRole.LANDLORD`, unchanged. Can now also be tagged
  as an **Agent** via `User.listerType` (`'landlord' | 'agent'`) — a
  display/sub-type flag, not a separate role or separate permission set.
  Both can submit Places & Locations listings identically.
- **Customer** — `UserRole.CUSTOMER` (renamed from `STUDENT`). Anyone
  browsing/booking a place, not specifically students. The old
  student-specific optional fields (`studentId`, `course`, `university`)
  still exist but are no longer role-gated — any account, including a
  landlord/agent, may optionally fill them in (someone can be a student
  *and* a landlord/agent).
- **Admin** — platform operations only. No identity approval, no
  listing content approval. Suspend/reactivate (for actual bad actors)
  is unrelated to either gate and is unchanged.

## Registration & "authenticity" (replaces identity verification)

Landlords/Agents can optionally submit, at registration or later:
- ID number + ID image
- Student ID number + student ID image (if applicable to them)

All optional, never gating. The only effect is on how the lister is
*displayed* to customers (a trust/"authenticity" signal — e.g. a badge
for "ID on file" / "Student ID on file"), never on access, listing
visibility, or approval.

## Decided (2026-10-14)

1. **Agent = sub-type flag**, not a new role. `User.listerType` enum
   (`landlord` | `agent`), meaningful only when `role === LANDLORD`.
   Every `@Roles(UserRole.LANDLORD)` guard already covers agents too —
   no guard changes needed for this.
2. **Listing content approval is removed too**, not just identity.
   `PropertiesService.create()` sets a listing live (`APPROVED`)
   immediately. The `PropertyStatus` enum/column and the `approve()`/
   `reject()` admin methods are kept in place as a dormant manual
   override an admin can still reach for (e.g. to pull a bad listing),
   but nothing is ever created `PENDING` anymore and there is no
   approval queue to work through.
3. **Rename is cosmetic only.** `Property`/`Room`/`Booking`/`Payment`
   stay as the internal entity, table, route, and DTO names — the
   payments module is built directly on top of these and a schema-level
   rename would be a needless, risky redo. Only user-facing copy,
   navigation, and page titles change to "Places & Locations."
4. **Customer role is renamed/broadened**: `UserRole.STUDENT` →
   `UserRole.CUSTOMER` (enum value `'customer'`). This does touch every
   `@Roles(UserRole.STUDENT)` guard and every `'student'` role check in
   both frontends — see the status log for what's been swept.
5. Same treatment as point 2 applies to the **identity** side: rather
   than ripping out `VerificationStatus`/`verifyUser()`/`rejectUser()`
   entirely, the gate reads were removed (new accounts are created
   already `APPROVED`, nothing blocks on this field anymore) but the
   enum/column/endpoints are left in place as a dormant tool. This was
   a judgment call to limit blast radius, not something the user asked
   for explicitly — worth flagging if a fully clean removal is wanted
   later.

## What is explicitly NOT changing

- Payments (reservation deposits, PayChangu) — same idea, but see the
  2026-10-16 change below: payout destinations are no longer admin-managed.
- The booking lifecycle (request → accept → pay deposit → confirm)
  stays, now generalized to "Places & Locations" in UI copy only.

## Payments direction (changed 2026-10-16 — supersedes "platform-as-merchant")

- **Listers control their own payment details.** Admins can no longer set
  or edit payout details (that feature and the "mark disbursed" marker were
  removed).
- **PayChangu moves the money, customer -> lister, directly.** Each landlord
  or agent links their own PayChangu account via *PayChangu Connect*
  (Payments tab -> "Connect PayChangu"). Deposits are charged on that
  account, so they settle into the lister's own PayChangu wallet; Kwathu
  never holds or forwards funds. Any platform commission is a *Connect fee*
  configured on the PayChangu Connect app (PayChangu splits it), outside
  this codebase.
- **No PayChangu account? Manual accounts.** A lister can instead (or as
  well) add up to 5 bank / mobile-money accounts (`/payments/accounts`).
  Once a booking is accepted, the customer sees them with copy buttons
  (`GET /payments/bookings/:id/pay-options` — not public), pays by hand, and
  the lister clicks "Mark deposit received" (`POST
  /payments/bookings/:id/manual-confirm`), which records a `manual` payment
  and confirms the booking like a PayChangu success. Nothing automatic
  verifies these payments — the lister is trusted to confirm only real ones.
- A lister must have **either** an active PayChangu connection **or** at
  least one manual account to **accept** a booking (accepting starts the
  customer's 48h payment window). Customers can still request.
- Admins keep read-only visibility: all payments and a "Connected accounts"
  list (never tokens).
- Tokens are stored encrypted (AES-256-GCM, `PAYCHANGU_TOKEN_ENCRYPTION_KEY`).
- Flow: `POST /payments/connect/start` -> PayChangu -> redirect to the
  frontend page `/payments/connect/callback?<token>` -> `POST
  /payments/connect/complete` (accepted only within 15 min of start, from
  the same user) -> status `GET /payments/connect/me`; `DELETE
  /payments/connect` disconnects.
- **Unverified against a live PayChangu account** (not in their public
  docs): the authorize-link response shape, the token's query-parameter name
  on the redirect, that charges/verification with a Connect token use
  `Authorization: Bearer <token>`, the revoke endpoint, and webhook
  delivery for connected-account charges. These are isolated in
  `paychangu.client.ts` and `PaychanguCallbackPage.jsx`. Also needs a
  PayChangu Connect app (client id + redirect URL) and the lister must have
  a PayChangu account.

## Implementation notes (what changed in code)

**Backend**
- `UserRole.STUDENT` → `UserRole.CUSTOMER` (`'customer'`); `User.listerType`
  (`ListerType` enum), `User.idNumber`, `User.studentIdImageUrl` added;
  `idDocumentUrl` = optional ID image; `studentId` no longer role-gated.
- `UsersService.create()` and Google sign-up create every account
  `APPROVED`; no admin notification. `POST /users/:id/verification-documents`
  was **replaced** by `POST /users/:id/authenticity` (multipart: `idImage`,
  `studentIdImage`, plus `idNumber`, `studentId`; everything optional).
- `PropertiesService.create()` has no verification check and creates
  listings `APPROVED`. The compulsory reservation deposit is still enforced
  at creation (`reservationDeposit` required → starter rooms carry it), so
  no listing can exist without a deposit.
- Public landlord summary now exposes `listerType`, `hasIdOnFile`,
  `hasStudentIdOnFile` (booleans only — ID numbers/images never go public)
  instead of `isVerified`.
- `dev-flags.ts` and the SKIP_*_VERIFICATION flags were removed (obsolete).
- Announcement/bulk-email audience `students` → `customers`; user stats key
  `students` → `customers`; Google OAuth `role=student` → `role=customer`.

**Consumer frontend**: customer rename; register page has Customer /
Landlord / Agent with optional ID fields; the blocking VerificationGate is
gone (landlords go straight to the dashboard; optional "Trust & ID" tab);
"Verified" badges replaced by `AuthenticityBadges`; copy relabelled to
Places & Locations; `/business-corner` is a "coming soon" placeholder.

**Admin frontend**: Customers tab; "Landlords & Agents" and "Places &
Locations" tabs; no Approve/Reject UI (people: Active/Suspended; listings
show legacy-pending rows only if any exist); admins can see supplied
ID details read-only.

## Database migration (existing databases)

New installs are fine. For an existing database run
`scripts/migrate-pivot.sql` (backend repo) **before** starting the new
backend: it renames the enum values, sets everyone approved, and drops the
obsolete `property_payout_details` table. (Columns here are camelCase, e.g.
`"verificationStatus"`.) A throwaway dev DB can simply be reset instead.

## Known open items

- Frontend `RoleSelectionPage` (Google sign-ups) calls
  `POST /users/:id/select-role`, which **does not exist** in the backend —
  pre-existing; Google users currently get their role from the `?role=`
  query on the Google login link.
- PayChangu operator ref IDs / Connect app are not configured; see the
  unverified items under "Payments direction".
- Earlier audit findings are still deferred.
- Business Corner: not scoped — needs its own decision log when started.

## Status log

- 2026-10-14 — Direction pivot agreed with the user; this document
  created. Open decisions above resolved the same day (see "Decided").
- 2026-10-15 — Backend, consumer frontend and admin frontend reworked per
  the above; all three build cleanly. Business Corner is a placeholder only.
- 2026-10-16 — Payments reworked to PayChangu Connect (lister-owned
  accounts, direct settlement); admin payout-details control removed.
- 2026-10-16 — Added manual bank/mobile-money accounts for listers without PayChangu.
