# 🏆 World Cup Predictor — FIFA World Cup 2026

> A full-stack AI-powered prediction platform for the FIFA World Cup 2026. Real-time match data, probabilistic match forecasting, AI-generated tactical analysis, community reviews, and generative stadium art — all in a single responsive React app.

---

## ✨ Features

| Category | Details |
|---|---|
| **Prediction Engine** | Rating-driven bivariate Poisson model + live Elo rating updates after every result |
| **Live Match Data** | Four-tier live data pipeline: local API → football-data.org → api-football → worldcup26.ir |
| **AI Tactical Breakdown** | Groq (Llama 3.3 70B) streams pundit-style match previews in real time; falls back to Pollinations.ai |
| **Generative Stadium Art** | Pollinations.ai FLUX model generates a unique stadium hero image per session |
| **AI Team Art** | Dynamic Pollinations.ai images rendered per team in the Predictor tab |
| **Community Reviews** | Supabase Postgres with RLS — submit star ratings & reviews (name optional); live realtime sync |
| **Title Race** | Championship probability chart with gold/silver/bronze podium |
| **Group Standings** | Live standings for all groups with promotion zone highlighting |
| **Mobile-First UI** | Bottom tab bar on iOS/Android, glassmorphism cards, safe-area insets, 48px touch targets |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5 |
| **Charts** | Recharts (BarChart, RadarChart) |
| **Auth & Database** | Supabase (Auth + Postgres + Realtime) |
| **AI — Text** | Groq API (Llama 3.3 70B, streaming SSE) |
| **AI — Images** | Pollinations.ai (FLUX model) |
| **Sports Data** | football-data.org · api-football (api-sports.io) · worldcup26.ir |
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

# ---- Hugging Face (optional) ----
VITE_HF_TOKEN=hf_...
```

### 3. Set up Supabase

**Database** — run this in your Supabase SQL Editor:

```sql
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_name text,
  rating integer check (rating between 1 and 5),
  content text,
  created_at timestamptz default now()
);

alter table reviews enable row level security;
create policy "Anyone can read reviews"
  on reviews for select using (true);
create policy "Anyone can insert reviews"
  on reviews for insert with check (true);
```

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
| `VITE_POLLINATIONS_KEY` | [enter.pollinations.ai](https://enter.pollinations.ai) | ✅ Free (works without key too) |
| `VITE_SUPABASE_URL` + `ANON_KEY` | [supabase.com](https://supabase.com) | ✅ Free tier |
| `VITE_GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | ✅ Free tier |
| `VITE_HF_TOKEN` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | ✅ Free |

> **Security note:** `VITE_*` variables are bundled into the client-side JavaScript. This is acceptable for personal or demo projects. For production, proxy sensitive API calls through serverless functions and keep secrets server-side only.

---

## 🗺 Roadmap

- [ ] Knock-out bracket simulator (Round of 32 → Final)
- [ ] Head-to-head historical record overlay
- [ ] Push notifications for LIVE match alerts
- [ ] Share predicted scorelines as images
- [ ] Dark / light theme toggle

---

## 📜 License

MIT — free to use, modify, and distribute.

---

## 👤 Author

**Salman Khan** · [sak03926@gmail.com](mailto:salmanazizkhan02@gmail.com)

> Built with React, Supabase, Groq, and Pollinations.ai during the FIFA World Cup 2026.
