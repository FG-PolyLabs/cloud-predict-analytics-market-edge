# cloud-predict-analytics-market-edge

## Multi-Repo Project: cloud-predict-analytics

This repo is **one of four** repositories that together form the cloud-predict-analytics system.

### Repository Layout

```
FutureGadgetLabs/
├── cloud-predict-analytics-frontend-admin/   ← admin frontend
├── cloud-predict-analytics/                  ← backend (API + scheduled jobs)
├── cloud-predict-analytics-data/             ← data repo + public frontend
└── cloud-predict-analytics-market-edge/      ← THIS REPO (market edge UI)
```

### Repository Roles

| Repo | Role |
|------|------|
| `cloud-predict-analytics-market-edge` | Auth-gated NBM vs Polymarket comparison UI |
| `cloud-predict-analytics-frontend-admin` | Admin-only UI; CRUD via backend API |
| `cloud-predict-analytics` | Cloud Run API (`weather-api`) + scheduled jobs |
| `cloud-predict-analytics-data` | JSONL data files + public frontend |

---

## This Repo: Market Edge UI

### Purpose

Decision-support tool for weather prediction markets. Pick a city → see the NBM ensemble
probability per temperature bracket side-by-side with Polymarket YES/NO prices → spot
mispricing and decide whether to bet.

### Architecture

- **Framework:** [Hugo](https://gohugo.io/) — static site generator with Go templates
- **Theme:** Custom theme (`themes/edge/`) — minimal Bootstrap 5 layout
- **Auth:** Firebase Authentication (Google sign-in). Same project as admin: `collection-showcase-auth`
- **Backend communication:** `api()` helper in `static/js/api.js` attaches Firebase ID token.
  Reads NBM forecasts from `weather-api /nbm-forecasts`.
- **Polymarket data:** Fetched client-side from `https://gamma-api.polymarket.com/events?slug=...`.
  This is a public CORS-enabled API — no backend proxy needed (unless CORS fails in practice).
- **Deployment:** GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).

### GCP Infrastructure

Same as admin frontend — see `cloud-predict-analytics-frontend-admin/CLAUDE.md` for details.

| Resource | Details |
|----------|---------|
| GCP Project | `fg-polylabs` |
| Cloud Run API | `weather-api` — `us-central1` |
| Firebase Project | `collection-showcase-auth` |

### Key Files

| Path | Purpose |
|------|---------|
| `hugo.toml` | Hugo config — title, description, params defaults |
| `themes/edge/layouts/_default/baseof.html` | Base HTML shell |
| `themes/edge/layouts/partials/` | head, navbar, footer, scripts partials |
| `themes/edge/layouts/index.html` | **Main page** — NBM vs Polymarket comparison UI |
| `static/js/firebase-init.js` | Firebase app init, `authSignOut()`, `isEmailAllowed()` |
| `static/js/api.js` | Authenticated `api(method, path, body)` + `qs()` helper |
| `static/js/app.js` | `showToast()` utility |
| `static/css/app.css` | Style overrides on top of Bootstrap 5 |
| `content/_index.md` | Homepage front matter |
| `.env.example` | Template for environment variables |

### Auth Flow

Same as admin frontend — Firebase Google sign-in, ID token attached to all backend requests,
`ALLOWED_EMAILS` whitelist enforced on both frontend and backend.

### City List

The city selector in `themes/edge/layouts/index.html` uses a hardcoded `CITIES` constant.
Slugs must match **both** BQ city slugs (as stored in `weather-api`) and the Polymarket event
slug format (`highest-temperature-in-{city}-on-{month}-{day}-{year}`).

Update the `CITIES` array when new cities are added to the `tracked_cities` BQ table.

### Polymarket / Gamma API

- **Endpoint:** `GET https://gamma-api.polymarket.com/events?slug=<slug>`
- **Slug format:** `highest-temperature-in-{city}-on-{month}-{day}-{year}`
  - e.g. `highest-temperature-in-miami-on-april-4-2026`
  - Month: full lowercase name ("april"), day: no leading zero
- **Response:** array of events; `event.markets` = array of bracket markets
- **Prices:** `market.outcomePrices` = `["0.75", "0.25"]` (YES, NO as decimal strings)
  - Sometimes serialized as a JSON string — parse with `JSON.parse` if needed
- **Bracket text:** `market.question` — parsed by `parseBracket()` to extract °C/°F range

### Bracket Parsing (JS)

`parseBracket(text)` in `index.html` handles:
- `"X-Y°C"` → `{ type: 'range', lo: X, hi: Y }` (members in [lo, hi))
- `"X-Y°F"` → same but converted to °C
- `"above X°C/F"` → `{ type: 'above', lo: X_c }` (members >= X_c)
- `"below X°C/F"` → `{ type: 'below', hi: X_c }` (members < X_c)

### Development Notes

- Hugo config lives in `hugo.toml`
- Firebase config goes in `.env` — **never commit this file**
- Environment variables injected as `HUGO_PARAMS_*` → `.Site.Params.*` in templates
- The `ALLOWED_EMAILS` var is comma-separated; `head.html` splits it into a JS array
- If Gamma API CORS fails in practice, add a proxy endpoint to `weather-api` in
  `../cloud-predict-analytics/`
