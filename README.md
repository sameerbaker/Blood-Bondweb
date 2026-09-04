# Blood Bond — Frontend (React + Bootstrap)

Single-page application that consumes the Blood Bond .NET API deployed on
MonsterASP. Authentication is JWT-based, all requests go through a single
axios client that injects the bearer token.

> **Backend:** `https://blood-bond.runasp.net` (see `BloodBond_Postman_Collection.json`)
> **Frontend stack:** Vite + React 18 + React Router v6 + React Bootstrap 5 + Axios

---

## 1. Project structure

```
BloodBond.Web/
├── api/                  # Typed wrappers around every endpoint in the Postman collection
│   ├── client.js         # Axios instance + auth interceptor + 401 redirect
│   ├── auth.js           # /api/Account/*
│   ├── bloodBanks.js     # /api/bloodbanks/*
│   ├── bloodRequests.js  # /api/bloodrequests/*
│   ├── donations.js      # /api/eligibility + /api/donations/*
│   ├── admin.js          # /api/admin/*
│   ├── badges.js         # /api/badges/*
│   ├── ratings.js        # /api/ratings/*
│   ├── monetary.js       # /api/monetarydonations/*
│   └── index.js
├── components/           # AppLayout, AppNavbar, ProtectedRoute, PageHeader, Loading, EmptyState
├── context/              # AuthContext + shared enums (blood types, urgency, roles)
├── pages/                # Login, Register, Forgot, Dashboard, BloodBanks,
│                         # BloodRequests, Donations, Badges, Profile, Eligibility,
│                         # AdminUsers, Home, 404, 403
├── utils/                # apiErrorMessage helper
├── App.jsx               # Routes
├── main.jsx              # Vite entry — wires up Router + AuthProvider + Bootstrap
├── config.js             # Reads VITE_API_BASE_URL
├── index.html
├── vite.config.js        # /api proxy for local dev
└── vercel.json           # SPA fallback rewrite
```

Every endpoint from the Postman collection has a matching function in `src/api/*`.
To call a new one, add a function to the relevant module and use it from a page.

---

## 2. Local development

Requirements: **Node 18+** (tested on Node 24).

```bash
cd BloodBond.Web
npm install
npm run dev          # opens http://localhost:5173
```

The dev server proxies `/api/*` to the deployed backend, so you can also just
hit the API directly using `VITE_API_BASE_URL` (configured in `.env`).

### Environment variables

`.env` (already created for local dev) — copy `.env.example` for production:

```
VITE_API_BASE_URL=https://blood-bond.runasp.net
```

The value is read once at build time by `src/config.js` and used as the axios
`baseURL`. No trailing slash.

---

## 3. How auth works

1. `POST /api/Account/login` → backend returns a token (string or in
   `data.token` / `data.accessToken` / `data.jwt`). The login screen is liberal
   about the response shape — see `AuthContext.jsx`.
2. The token is stored in `localStorage.bb_token` and added as
   `Authorization: Bearer <token>` on every request by the axios interceptor.
3. `GET /api/Account/me` is called once on app boot to hydrate the user.
4. Any `401` response clears the stored token and bounces the user to
   `/login`.
5. The Navbar renders different items per role (`User` / `BloodBankManager` /
   `Admin`). The admin page is wrapped in
   `<ProtectedRoute roles={['Admin']}>`, which redirects non-admins to `/forbidden`.

---

## 4. Pages and endpoints they touch

| Page              | Endpoints                                                                    |
|-------------------|------------------------------------------------------------------------------|
| Login             | `POST /api/Account/login`                                                    |
| Register          | `POST /api/Account/Register`                                                 |
| Forgot password   | `POST /api/Account/forgot-password`                                          |
| Dashboard         | `GET /api/bloodbanks/verified`, `GET /api/bloodrequests/mine`, `GET /api/donations/mine`, `GET /api/badges/me/rank` |
| Blood Banks       | `GET / POST / PUT /api/bloodbanks*`, `PUT /api/bloodbanks/{id}/inventory`    |
| Blood Requests    | `GET / POST / PATCH /api/bloodrequests*`, `POST /api/bloodrequests/{id}/notify` |
| Donations         | `GET / POST / PATCH /api/donations*`                                         |
| Eligibility       | `POST /api/eligibility`                                                      |
| Badges            | `GET /api/badges`, `/mine`, `/me/rank`, `/leaderboard`                       |
| Profile           | `GET /api/Account/me`, `POST /api/admin/change-password`                     |
| Admin / Users     | `GET /api/admin/users`, `POST /api/admin/create`, `PATCH /api/admin/users/{id}/{block|unblock|role}`, `GET /api/admin/analytics` |

All API errors surface through `apiErrorMessage(err)` and toasts.

---

## 5. Deploying to Vercel (recommended)

The repo already includes `vercel.json` with an SPA rewrite so React Router
works on hard refresh.

### Option A — Vercel dashboard (fastest, no CLI)

1. Push the project to a Git repo (GitHub/GitLab/Bitbucket).
2. Go to <https://vercel.com/new> and import the repo.
3. Set **Root Directory** to `BloodBond.Web`.
4. Framework preset: **Vite** (auto-detected).
5. **Environment variables**:
   - `VITE_API_BASE_URL` = `https://blood-bond.runasp.net`
6. Click **Deploy**. Future pushes auto-deploy.

### Option B — Vercel CLI

```bash
npm i -g vercel
cd BloodBond.Web
vercel
# answer the prompts; when asked for env vars, add VITE_API_BASE_URL
vercel --prod
```

### Why CORS just works

The frontend talks to the API **directly** with CORS — there is no proxy. The
backend hosted on MonsterASP already returns the right `Access-Control-Allow-*`
headers. If you later move the API to a different host, make sure the new host
also sends the CORS headers for `https://<your-vercel-domain>` (or `*`).

If you ever want a proxy instead (extra security / to hide the API origin),
add a Vercel rewrite in `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://blood-bond.runasp.net/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

…and point the frontend at `/` instead of the absolute API URL.

---

## 6. Deploying somewhere else (Netlify, GitHub Pages, static host)

Build first:

```bash
npm run build       # outputs to dist/
```

Upload the contents of `dist/` to any static host. The only required env var
at build time is `VITE_API_BASE_URL` (see `.env.example`).

For **Netlify** add a `_redirects` file in `public/`:

```
/*  /index.html  200
```

For **GitHub Pages** the SPA fallback needs a `404.html` that copies
`index.html` (a well-known GH Pages trick).

---

## 7. CORS troubleshooting

If the deployed site shows network errors in the browser console:

1. Open DevTools → Network → click the failing request → look at the response
   headers for `Access-Control-Allow-Origin`. If it is missing, the API is
   blocking your origin.
2. On the .NET API side, allow the Vercel origin in `Program.cs`
   (`builder.Services.AddCors(...)`) and add `app.UseCors(...)` **before**
   `app.UseAuthentication()`.
3. As a quick test, run the frontend locally and watch the browser console —
   if it works locally with `VITE_API_BASE_URL=https://blood-bond.runasp.net`,
   CORS is fine and the issue is the Vercel origin specifically.

---

## 8. Common scripts

| Command         | What it does                                |
|-----------------|---------------------------------------------|
| `npm run dev`   | Vite dev server with HMR                    |
| `npm run build` | Production build into `dist/`               |
| `npm run preview` | Serve `dist/` locally for smoke testing  |
