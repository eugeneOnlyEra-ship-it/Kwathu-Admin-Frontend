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
   immediately. The `PropertyStatus` enum/column is kept (old rows may
   still carry it), but nothing is ever created `PENDING` anymore and
   there is no approval queue to work through. *(Update 2026-10-21: the
   dormant `POST /properties/:id/approve` and `/reject` routes and their
   service methods were removed so nobody builds on them by mistake. To
   pull a bad listing, an admin uses Deactivate or Delete. Run
   `scripts/migrate-pivot.sql` once so any leftover `pending` rows
   become `approved`.)*
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

## Platform role, trust, messaging, receipts (decided 2026-10-21)

**Kwathu is a hosting platform, not a payments party.** Listers list;
customers find them. Deposits go straight to the lister (PayChangu
Connect or a manual account), so **Kwathu does not issue refunds and does
not settle payment disputes.** This is said plainly wherever a customer is
about to commit (bookings page, payment window, receipts, property page)
via `PlatformNotice`. Nothing in the code promises, tracks or processes
refunds. When a payment lands for a booking that has already closed, both
people are told what happened and that they must sort it out directly
(`PAYMENT_ROOM_TAKEN` notification) — no money is moved by the platform.

**Caution for "mysterious" listers.** Listers choose what to share in
Trust & ID. Kwathu checks none of it, so the UI never says "verified".
`listerTransparency()` (`kwathu-frontend/src/utils/listerTrust.js`) reads
only fields already public on the listing: ID on file, profile photo, a
real full name, business/agency name. ID on file → no warning. No ID and
at most one other detail → `limited` (clear caution + practical steps).
No ID but two or more details → `partial` (gentle note). Shown on the
listing page, in the payment window, and as a "Limited details" chip.
Wording is neutral on purpose: *has not shared*, never *is suspicious*.

**Booking lifecycle: unchanged**, except one rule made explicit.
Accepting a request does **not** reserve the room; a lister may accept
several customers for the same room. **The first deposit the lister
verifies (or PayChangu confirms) wins**, inside one transaction that
locks the room row (so two simultaneous verifications cannot both win):
- every other open request for that room — pending *and* accepted-unpaid
  — is closed (`EXPIRED`, `closedReason = room_taken`);
- their in-flight payment attempts are cancelled (`Payment.EXPIRED`);
- each of those customers gets an alert (their card flips live, an open
  payment window closes itself with an explanation) and the lister gets
  one summary notification.
Requests for *other rooms* of the same place are untouched. Deposits can
only be verified for room-based bookings, so "per room" is complete.
The UI says all of this up front: customers see "Accepted doesn't mean
reserved" and how many others are on the clock for the room
(`otherHoldsOnRoom`, a count only — never who); listers are warned before
accepting a second request for a room that already has an accepted hold.

**Receipts.** Issued automatically when a deposit is verified (PayChangu
webhook or the lister's manual confirmation), one per booking, numbered
`KW-<year>-<6 digits>` from a database sequence. Everything on it is
copied in at issue time so it never changes. Visible to **both** the
customer and the lister (`GET /receipts`, `/receipts/:id`,
`/receipts/:id/pdf`, `/receipts/booking/:bookingId`); anyone else gets
404. A paid booking missing its receipt gets one on demand. The PDF
(pdfkit) states that Kwathu does not hold or refund the money.

**Receipt audit trail (admin).** Every receipt is recorded for the admin
in three ways: (1) a `receipt.issued` entry in the audit log — actor is the
lister when they marked a manual deposit as received, or "System" when
PayChangu confirmed it, with receipt number, amount, booking, customer,
lister and fingerprint in its metadata; written exactly once per receipt,
even under concurrent issues; (2) the admin app's **Receipts** tab
(`GET /receipts/admin`): every receipt on the platform, searchable by
receipt no./customer/lister/place/reference, filterable by who verified it
and by date, with totals for the current filter and the exact PDF copy
(`GET /receipts/:id/pdf` — byte-for-byte what the customer and lister
download, because the PDF dates are pinned to the issue time); (3) a
**tamper-evidence fingerprint** — SHA-256 over every field on the receipt,
stored at issue time (`receipts.content_hash`, also copied into the audit
entry). Each row is re-checked on read (`Intact` / `Altered` / `Not
signed`), and `GET /receipts/admin/verify` re-checks the whole table and
names any altered receipt. Nothing in the app edits or deletes a receipt
(no such routes exist); the fingerprint is what shows if someone edits the
database directly. Receipts issued before fingerprints existed show "Not
signed" rather than a false "Intact". The older admin dashboard inside
the consumer app (`/admin-dashboard`) has no Receipts tab (it also lacks
Payments); it only gained the readable audit-log labels.

**Messaging.** Customers message the lister of a place in-app
(`/messages`) — one thread per customer/lister pair, optional "About:
<place>" tag per message — or via WhatsApp if the lister listed a number
(`User.whatsappNumber`, set in Settings → Profile; normalised to
`+265…`; wiped when an account is deleted). Realtime is Server-Sent
Events (`GET /messages/stream?token=`), same approach as notifications;
a client that reconnects re-fetches what it missed. Only the two people in
a thread can read it; **admins cannot**. Listers reply but cannot start
chats. Messages render as plain text (never HTML). Single backend
instance assumed for the live push (see below).

**Production database.** Run `scripts/migrate-messaging-receipts.sql`
(idempotent) before deploying; development auto-syncs.

**Known limits.** Live push (messages, notifications, maintenance) is
in-memory, so it assumes one backend instance — several would need Redis
pub/sub. There is no report/block for chat yet. Cloudinary images of a
deleted account are not removed (no public ids stored).

## Status log

- 2026-10-14 — Direction pivot agreed with the user; this document
  created. Open decisions above resolved the same day (see "Decided").
- 2026-10-15 — Backend, consumer frontend and admin frontend reworked per
  the above; all three build cleanly. Business Corner is a placeholder only.
- 2026-10-16 — Payments reworked to PayChangu Connect (lister-owned
  accounts, direct settlement); admin payout-details control removed.
- 2026-10-16 — Added manual bank/mobile-money accounts for listers without PayChangu.
- 2026-10-21 — Removed property approve/reject routes; room-contest rule
  (first verified deposit wins, rivals closed + alerted); receipts;
  in-app realtime messaging + WhatsApp contact; lister-transparency
  caution; "no refunds" stance made explicit in the UI. Also fixed:
  system audit entries were silently dropped (actor id `'system'` is not
  a UUID); the Settings profile form wiped business name / lister type on
  save after a reload.

- 2026-10-23 — Admin receipt audit trail: `receipt.issued` audit entries,
  Receipts tab, PDF copy, tamper-evidence fingerprint + verify-all. Also
  fixed a pagination reset in the new panel (a search debounce timer sent
  the admin back to page 1).

## Profile & Settings (consumer app, `/settings`)
- One page for every signed-in user: profile (name, phone, email, photo, lister/customer fields), Trust & ID (landlords), change/set password, accessibility, data download, help, **sign out** and **delete account**. The header no longer has a Log out button — it links here.
- Accessibility options (text size, high contrast, reduce motion, underline links, readable font, spacing) are per-device (localStorage), applied before first paint by `utils/accessibility.js`.
- Self-service API: `PATCH /users/me`, `GET /users/me/security`, `POST /users/me/change-password`, `GET /users/me/export`, `DELETE /users/me` (body: `confirm: "DELETE"` + password if the account has one).
- Account deletion = anonymise, not erase: row kept with `account_deleted_at` set so other people's booking/payment history stays intact. Blocked while any booking is ACCEPTED; pending bookings are cancelled/declined and the other party notified; a lister's places are deactivated and payment accounts / PayChangu link removed. Admins can't self-delete.

## Registration (simplified)
- Sign-up asks only: account type (Customer / Business owner), name, email, phone, password (show/hide instead of a confirm field). No ID fields at sign-up — add them later in Settings → Trust & ID.
- Business owners (role `landlord`) then set up their Places & Locations agency inside the app (`PlacesSetup` on the dashboard → `POST /users/me/places-setup`: Landlord/Agent + optional business name). Sets `places_setup_at`; until then the dashboard shows the setup step. "Start a business" (Business Corner) is a disabled "coming soon" option.
- Existing landlords: run `scripts/migrate-places-setup.sql` once so they aren't asked to set up again.
