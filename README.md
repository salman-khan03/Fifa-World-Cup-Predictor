# 🏆 World Cup Predictor — FIFA World Cup 2026

> A full-stack AI-powered prediction platform for the FIFA World Cup 2026. Real-time match data, probabilistic match forecasting, AI-generated tactical analysis, community reviews, and generative stadium art — all in a single responsive React app.

---

## ✨ Features

The app is organised into seven tabs — **Matches · Predictor · Title Race · Accuracy · Groups · Final Path · Reviews** — all scoped to the FIFA World Cup 2026.

| Category | Details |
|---|---|
| **Prediction Engine** | Rating-driven bivariate Poisson model + live Elo rating updates after every result; per-match Win / Draw / Loss donut gauge |
| **Live Match Data** | Four-tier live data pipeline: local API → football-data.org → api-football → worldcup26.ir |
| **Kalshi Market Odds** | Live implied **tournament-winner** probabilities for the two selected teams, pulled from the Kalshi prediction market (`/api/kalshi`, no auth). *Note: these are title-to-win odds, not per-match head-to-head odds* |
| **Predict the Champion** | Free, no-money community pick for who wins it all — stored in Supabase, shown against live Kalshi odds and a community-consensus chart, with a deep-link to trade the real market on kalshi.com |
| **AI Tactical Breakdown** | Groq (Llama 3.3 70B) streams pundit-style match previews in real time; falls back to Pollinations.ai |
| **AI Match Commentary** | ElevenLabs text-to-speech reads a "Hear the call" summary line for finished matches (`/api/commentary`) |
| **Possession Data** | Per-match possession split for completed & live games (`/api/possession`, fbref.com) |
| **Generative Stadium Art** | Pollinations.ai FLUX model generates a unique stadium hero image per session |
| **AI Team Art** | Dynamic Pollinations.ai images rendered per team in the Predictor tab |
| **Community Reviews** | Supabase Postgres with RLS — submit star ratings & reviews (name optional); live realtime sync |
| **Title Race** | Championship probability chart with gold/silver/bronze podium |
| **Model Accuracy** | Accuracy tab scoring the engine's forecasts against actual results |
| **Group Standings** | Live standings for all groups with promotion zone highlighting |
| **Final Path (Bracket)** | Knockout-stage projection through to the projected final |
| **Light / Dark Theme** | Instant theme toggle via a single `[data-theme]` swap |
| **Mobile-First UI** | Bottom tab bar on iOS/Android, glassmorphism cards, safe-area insets, 48px touch targets |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5 |
| **Charts** | Recharts (BarChart, RadarChart) |
| **Auth & Database** | Supabase (Auth + Postgres + Realtime) |
| **AI — Text** | Groq API (Llama 3.3 70B, streaming SSE) |
| **AI — Images** | Pollinations.ai (FLUX model) · Gemini (optional fallback) |
| **AI — Audio** | ElevenLabs (text-to-speech commentary) |
| **Market Odds** | Kalshi public prediction-market API |
| **Sports Data** | football-data.org · api-football (api-sports.io) · worldcup26.ir · fbref.com (possession) |
| **Prediction Model** | Bivariate Poisson + Elo rating system (custom, client-side) |
| **Styling** | CSS-in-JS inline styles + injected keyframe/media-query `<style>` block |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/your-username/world-cup-predictor.git
cd world-cup-predictor
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# ---- Sports data APIs ----
FOOTBALL_DATA_API_TOKEN=your_token        # football-data.org (free)
API_FOOTBALL_KEY=your_key                 # api-sports.io (free)

# ---- Groq — AI text streaming ----
VITE_GROQ_API_KEY=gsk_...                 # console.groq.com (free tier)

# ---- Pollinations.ai — image & text generation ----
VITE_POLLINATIONS_KEY=sk_...              # enter.pollinations.ai (free without key too)

# ---- Gemini — optional image fallback ----
VITE_GEMINI_API_KEY=AIza...
VITE_GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp

# ---- Supabase ----
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# ---- ElevenLabs — AI match commentary (server-side, /api/commentary) ----
ELEVENLABS_API_KEY=

# ---- Hugging Face (optional) ----
VITE_HF_TOKEN=hf_...
```

> **Kalshi** requires no key — `/api/kalshi` proxies the public prediction-market API.
> All keys are optional: with none set, the app runs fully offline on seeded WC2026 data and its own prediction engine.

### 3. Set up Supabase

**Database** — in your Supabase SQL Editor, run each migration in `supabase/`:

- `supabase/reviews.sql` — powers the Reviews tab
- `supabase/champion_picks.sql` — powers the "Predict the Champion" community pick

Both are anonymous, session-key-scoped tables (no login required) with RLS policies for public read + owner-only write.

### 4. Run locally

```bash
npm run dev
# → http://localhost:5173
```

---

## 📁 Project Structure

```
world-cup-predictor/
├── src/
│   ├── App.jsx          # Entire app — UI, prediction engine, AI integrations, auth
│   └── supabase.js      # Supabase client initialisation
├── api/                 # Optional serverless API routes
├── index.html           # Vite entry (viewport meta included for mobile)
├── vite.config.js
├── .env                 # Local secrets — never commit
└── README.md
```

---

## 🧠 Prediction Engine

The forecasting model runs entirely client-side — no server or ML framework required.

1. **Base ratings** — each of the 48 teams has a hand-tuned Elo-style rating (range 62–91)
2. **Live Elo update** — every finished match adjusts both teams' ratings; K-factor scales with goal difference
3. **Expected goals** — `xG = base × exp(Δrating / 100)` with an optional host-nation boost for USA, Canada, Mexico
4. **Bivariate Poisson** — scoreline probabilities over an 8×8 grid; summed to Win/Draw/Loss
5. **Title probability** — softmax over all 48 adjusted ratings; updates live as results come in

---

## 🤖 AI Integrations

### ⚡ Tactical Breakdown (Groq · Llama 3.3 70B)
Generates a streaming 3-paragraph pundit preview seeded with real model numbers — xG, Elo ratings, win probability, most likely scoreline. Token-by-token streaming via SSE. Falls back to Pollinations.ai (`openai` model) if Groq is unavailable.

### 🎨 Stadium Hero Art (Pollinations.ai · FLUX)
Generates a unique AI stadium image per session via a direct `<img>` URL — no API key required for the free tier. Resolves CORS by using the browser's native image loading rather than `fetch()`.

### 🖼 Team Identity Art (Pollinations.ai)
Each team selected in the Predictor tab gets an abstract AI-generated color art image, updating live as teams change.

### 🔈 Match Commentary (ElevenLabs)
Finished matches show a **"Hear the call"** button that streams AI text-to-speech commentary summarising the result. Requires a server-side `ELEVENLABS_API_KEY`; degrades gracefully to "Unavailable" if unset.

### 💹 Kalshi Prediction Market
The Predictor tab surfaces the live implied **tournament-winner** probability for each selected team from the Kalshi "2026 FIFA World Cup Winner" market. These are *title-to-win* odds — the app deliberately labels them as **not** a head-to-head forecast for the individual matchup. The match-winner prediction itself comes from the built-in Poisson/Elo engine, not Kalshi.

### 🔮 Predict the Champion (community picks + real Kalshi trading)
A free, no-account "who wins it all" pick sits alongside the Kalshi odds — one pick per browser session, stored in Supabase (`champion_picks` table, run `supabase/champion_picks.sql`). Shows a live community-consensus bar chart and the real Kalshi odds for your pick. A **"Trade real money on Kalshi ↗"** button deep-links to the actual `KXMENWORLDCUP-26` market on kalshi.com — no trading logic lives in this app; placing a real trade requires the user's own Kalshi account.

---

## 📡 Live Data Pipeline

```
Incoming request
  └─► /api/fixtures          (local serverless, if deployed)
        └─► football-data.org  (X-Auth-Token · throttle-aware via response headers)
              └─► api-football   (x-apisports-key · api-sports.io)
                    └─► worldcup26.ir  (public · no auth)
                          └─► SEED_FX   (hardcoded fallback · real WC2026 results to Jun 14)
```

All sources normalise to a unified internal fixture schema consumed by the Elo engine and all UI tabs.

---

## 📱 Mobile Support

- Fixed bottom tab bar on screens ≤ 640px (iOS/Android native app feel)
- `env(safe-area-inset-bottom)` padding for iPhone notch and home-bar
- All interactive elements meet the 48 × 48 px minimum touch target (WCAG 2.5.5)
- Zero horizontal scroll at 375 px viewport width (iPhone SE)
- `backdrop-filter: blur()` glassmorphism with `-webkit-` prefix for Safari

---

## ⭐ Community Reviews

- **Open to everyone** — no account required; enter an optional display name or post as Anonymous
- **Supabase Postgres** — star rating + text content written to the `reviews` table
- **Realtime sync** — Supabase Realtime subscription pushes new reviews to all connected clients without polling
- **Offline fallback** — if the `reviews` table doesn't exist, reviews fall back to `localStorage` with an inline banner

---

## 🌐 Deployment

### Vercel (recommended)

```bash
npm run build        # outputs to dist/
vercel --prod
```

Add all `VITE_*` variables in the Vercel dashboard under **Settings → Environment Variables**.

### Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

### Preview locally

```bash
npm run preview      # serves the dist/ build at http://localhost:4173
```

---

## 🔑 API Keys

| Variable | Source | Free Tier |
|---|---|---|
| `FOOTBALL_DATA_API_TOKEN` | [football-data.org/client/register](https://www.football-data.org/client/register) | ✅ Free |
| `API_FOOTBALL_KEY` | [api-sports.io](https://api-sports.io) | ✅ 100 req/day |
| `VITE_GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | ✅ Free tier |
| `VITE_SUPABASE_URL` + `ANON_KEY` | [supabase.com](https://supabase.com) | ✅ Free tier |
| `VITE_GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | ✅ Free tier |

> **Security note:** `VITE_*` variables are bundled into the client-side JavaScript. This is acceptable for personal or demo projects. For production, proxy sensitive API calls through serverless functions and keep secrets server-side only.

---

## 🗺 Roadmap

- [x] Knock-out bracket simulator (Round of 32 → Final) — *Final Path tab*
- [x] Dark / light theme toggle
- [ ] **Per-match Kalshi odds** (head-to-head match-winner markets, not just tournament-winner)
- [ ] Head-to-head historical record overlay
- [ ] Push notifications for LIVE match alerts
- [ ] Share predicted scorelines as images

---

## 📜 License

MIT — free to use, modify, and distribute.

---

## 👤 Author

**Salman Khan** · [sak03926@gmail.com](mailto:sak03926@gmail.com)

> Built with React, Supabase, Groq, and Pollinations.ai during the FIFA World Cup 2026.
