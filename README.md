# kwathu-admin

Standalone admin console for Kwathu, split out of `kwathu-frontend` so it can
be run, deployed, and iterated on independently. Talks to the same
`kwathu-backend` API as the consumer frontend — there's still only one
backend, just two separate frontends now.

## Run it

```bash
npm install
npm run dev
```

Runs on **http://localhost:5174** by default (pinned in `vite.config.js` so
it never collides with `kwathu-frontend`'s default `5173` — run both at once
with `npm run dev` in each folder).

Set `VITE_API_URL` in `.env` if your backend isn't on `http://localhost:3000/api`
(see `.env.example`).

## What's here

- `/login` — admin sign-in (`POST /auth/admin-login`; the backend rejects
  anything but an admin account, so a successful login here is always an
  admin session)
- `/dashboard` — the admin console itself: landlord/student verification
  queue, listing moderation, announcements, audit log, system health,
  reports, data export, roles, security center, search analytics

Everything not `/login` requires an authenticated admin session
(`routes/PrivateRoutes.jsx` + `routes/RoleRoute.jsx`); anyone else is bounced
back to `/login`.

## Relationship to kwathu-frontend

This was extracted from `kwathu-frontend`'s existing admin routes/pages/hooks
— same design tokens (`src/styles/Theme.css`), same auth/token handling
(`src/utils/apiClient.js`, `tokenStorage.js`), same panel components. The
admin dashboard didn't depend on anything else in that app (notifications,
the public marketing pages, student/landlord flows), so the split was a
straight lift with import paths adjusted for the new folder layout.

`kwathu-frontend` still has its own copy of the admin routes/pages for now —
they weren't removed as part of this split. If you want this project to be
the *only* place the admin dashboard lives, that's a separate follow-up
(strip `/admin/login`, `/admin-dashboard`, and the related admin-only
files out of `kwathu-frontend`).
# Kwathu-Admin-Frontend
