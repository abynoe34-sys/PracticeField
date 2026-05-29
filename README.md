# 🏟️ Practice Field

**Practice Field** is a mobile-first performance coaching app for American football coaches and players. Log session reviews, generate AI-powered training plans, and track player progress over time — no account required.

---

## Quick Start (5 steps)

```bash
# 1. Clone and install
git clone <your-repo-url> practice-field
cd practice-field
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Edit .env.local and fill in your Supabase + OpenAI keys

# 3. Run database migrations
# (See "Supabase Setup" below — paste migrations.sql into the SQL Editor)

# 4. (Optional) Seed with demo data
npm run seed

# 5. Start the dev server
npm run dev
# → http://localhost:3000
```

---

## Supabase Setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Copy your project URL and keys from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server only)
3. Open **SQL Editor → New Query**
4. Paste the contents of `supabase/migrations.sql` and click **Run**

---

## OpenAI Setup

1. Go to [platform.openai.com](https://platform.openai.com) → **API Keys → Create new secret key**
2. Add it to `.env.local`:
   ```
   OPENAI_API_KEY=sk-...
   ```

> **No key?** Training plans still work — they fall back to the built-in expert template library. The toggle in the UI lets you choose.

---

## Deploy to Render

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service → Connect GitHub**
3. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Node Version:** 20+
4. Under **Environment Variables**, add all values from `.env.example`
5. Click **Deploy** — Render auto-deploys on every push to `main`

---

## How to Use v1

### Coach Workflow
1. Visit the app → click **Start Coaching**
2. You get a unique Coach ID (e.g., `ABC123XYZ`) — **bookmark this URL**
3. Add your first player: name, position, experience level
4. After each practice → **New Session**:
   - Log strengths (what's working)
   - Log areas to improve (pain points)
   - Add root cause for each issue (WHY does it exist?)
5. Click **Generate Training Plan** → AI builds a targeted exercise plan
6. View historical sessions and performance charts on the player page
7. Log metrics (40-yard dash, vertical, etc.) on the training plan page
8. Share your Coach ID URL with players so they can view their own progress

### Player Workflow
1. Coach shares the URL: `https://your-app.com/COACHID`
2. Player visits → sees dashboard with their sessions, plan, and charts
3. Player can log self-assessments via **New Session**

---

## Project Structure

```
practice-field/
├── app/
│   ├── page.tsx                          # Landing page (create/resume session)
│   ├── layout.tsx                        # Root layout
│   ├── globals.css
│   ├── [coachId]/
│   │   ├── layout.tsx                    # Navigation shell
│   │   ├── page.tsx                      # Dashboard
│   │   ├── players/
│   │   │   ├── page.tsx                  # Player list + add player
│   │   │   └── [playerId]/
│   │   │       ├── page.tsx              # Player detail, history, charts
│   │   │       ├── plan/page.tsx         # Generate training plan
│   │   │       └── sessions/
│   │   │           ├── new/page.tsx      # Log new session
│   │   │           └── [sessionId]/page.tsx
│   │   ├── training-plans/
│   │   │   └── [planId]/
│   │   │       ├── page.tsx              # View full training plan
│   │   │       └── LogMetricForm.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── coach/route.ts
│       ├── players/route.ts + [playerId]/route.ts
│       ├── sessions/route.ts + [sessionId]/route.ts
│       ├── training-plans/route.ts
│       └── progress/route.ts
├── components/
│   ├── Navigation.tsx
│   ├── PlayerCard.tsx
│   ├── SessionReview.tsx
│   ├── TrainingPlanCard.tsx
│   └── PerformanceChart.tsx
├── lib/
│   ├── supabase.ts
│   ├── openai.ts
│   ├── training-templates.ts             # Hardcoded expert exercise library
│   └── utils.ts
├── types/index.ts
├── supabase/migrations.sql
└── scripts/seed.ts
```

---

## Known Limitations (v1)

- **No login system** — your Coach ID is your only credential. Don't lose it.
- **No video uploads** — storage infrastructure is ready; UI not yet built.
- **No multi-team support** — one workspace per Coach ID.
- **No offline mode** — requires internet for Supabase reads/writes.
- **Plateau detection is basic** — checks if the same improvement areas repeat across 3+ sessions.
- **AI plans cost money** — each generation calls GPT-4o mini (~$0.01–0.05/plan depending on length).

---

## v2 Roadmap

- [ ] Email magic link login (keep Coach ID, add recovery)
- [ ] Video clip upload per session (Supabase Storage)
- [ ] Team management (multiple coaches, shared roster)
- [ ] Position-specific drill libraries
- [ ] Shareable player progress report (PDF export)
- [ ] Push notifications for plateau warnings
- [ ] Offline PWA mode

---

## Success Checklist

- [ ] Runnable locally in 5 minutes after cloning
- [ ] Coach can add player, log session, see generated plan
- [ ] Progress chart shows historical data
- [ ] Deployable to Render in 10 minutes
- [ ] Shareable coach URL works across devices
- [ ] Ready to demo to 3 real coaches