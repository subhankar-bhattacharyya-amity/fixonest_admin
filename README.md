# Fixonest Admin Panel

One panel shared by three roles — **Super Admin**, **Admin** and **Provider**
(shown as "Technician" in the UI). Everyone logs in on the same screen; the
role decides which dashboard and sidebar items they see. It follows the same
feature-based structure as `fixonest_frontend` (the customer app).

## Application flow

```text
index.html
  -> src/main.jsx             starts React, mounts AppProviders
     -> src/app/AppProviders  composes Redux, Router, AuthBootstrap, Sonner <Toaster />
        -> src/app/App.jsx    one <Suspense> (PageLoader) around the route system
           -> src/routes      chooses a guard, layout, and page
              -> layouts      DashboardLayout = Sidebar + Topbar + page Outlet
                 -> pages     compose features and reusable components
```

## What belongs where

| Folder | Purpose |
| --- | --- |
| `app` | App bootstrap: `App.jsx`, provider composition, the Redux store |
| `assets` | Images and other imported static files |
| `components/common` | Small reusable, dumb UI (e.g. `loader/PageLoader`) |
| `features` | Self-contained domain modules (components, hooks, Redux slice, definitions), exposed through one `index.js` |
| `layouts` | Page shells: `dashboard/`, `sidebar/` (menu in `sidebar.data.js`), `topbar/` |
| `lib` | `config.js` (all app settings) and `httpClient.js` (the one axios instance + `getJson`/`postJson`/... helpers) |
| `pages` | Route-level screens: `<Name>Page.jsx`, `<name>.routes.jsx`, page-only `components/` and `definitions/` |
| `routes` | URL constants (`constants.js`), route config, and guards |
| `styles` | Global stylesheets |

## Roles and routing

- Role names mirror the backend: `super_admin`, `admin`, `provider`
  (`features/auth/definitions/roles.js`). Each role has its own backend auth
  base path (`/super-admin/api`, `/admin/api`, `/provider/api`).
- URLs keep the panel's slugs: `/dashboard/super-admin`, `/dashboard/admin`,
  `/dashboard/technician`. Build them with `getDashboardPath(role)` /
  `getSettingsPath(role)` from `routes/constants.js` — never hard-code them.
- `routes/config/private.routes.jsx` puts every logged-in page behind
  `AuthGuard` inside `DashboardLayout`. A page only one role may open wraps
  its route in `<RoleGuard allowedRoles={[...]} />` inside its own
  `<name>.routes.jsx` (see `pages/dashboard/dashboard.routes.jsx`).
- The whole sidebar is one tree in `layouts/sidebar/sidebar.data.js`. Add a
  node with a unique `id`, a lucide `icon`, and either a `path` (a link) or
  `children` (an accordion, nestable to any depth). `roles` sets who sees it;
  a nested node without `roles` inherits its parent's, and an accordion with
  no visible children for a role is hidden. Rendering is automatic — no
  changes to `Sidebar.jsx` are needed. Give the page's route a `RoleGuard`
  with the same roles. The backend still enforces every permission — guards
  and menus only decide what the UI shows.

## State and API calls

Redux Toolkit only. Every API call is a `createAsyncThunk` in the owning
feature's slice (`features/<name>/store/<name>Slice.js`), using the
`lib/httpClient.js` helpers, and its reducer is added in `app/store.js`.
Components dispatch the thunk and `.unwrap()` it:

```js
try {
  const result = await dispatch(someThunk(values)).unwrap();
  toast.success(result.message);
} catch {
  // Already toasted globally by lib/httpClient.js's response interceptor.
}
```

Errors are toasted once, globally, by `httpClient` (Sonner). Pass
`{ skipGlobalErrorHandler: true }` to a helper only when the caller expects
the failure and handles it itself (see `loginUser` in `authSlice.js`).

Login has no role picker: `loginUser` tries Super Admin → Admin → Provider
and the first role that accepts the credentials becomes the session's role
(stored alongside user/token under `appConfig.authRoleKey`).

## Forms and validation

react-hook-form + Zod (`@hookform/resolvers/zod`). Schemas live in
`definitions/` — the owning feature's when it's domain knowledge (e.g.
`features/auth/definitions/loginValidation.js`), otherwise the page's — and
mirror the backend's Joi rules.

## Packages

Same libraries as `fixonest_frontend`, added only when a feature needs one:
Redux Toolkit, react-router-dom, axios, react-hook-form, Zod, Sonner,
lucide-react, plus Recharts for dashboard charts. Don't add TanStack Query or
another toast library.

## Imports

The `@` alias points at `src` (`vite.config.js`, mirrored in `jsconfig.json`).
Import from a folder's `index.js` barrel, never a feature's internal file:
`import { useAuth } from "@/features/auth/index.js"`.

## Start

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.development` to the backend (e.g. `http://localhost:7055`).
Lint with `npm run lint` (ESLint).
