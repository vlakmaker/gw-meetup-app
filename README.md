# Generalist World Meetup Matcher

An AI-powered networking app for Generalist World meetups. Attendees build a profile, get matched by AI based on shared interests and intentions, and connect with people worth meeting in the room.

**Live:** [gw-meetup-app.vercel.app](https://gw-meetup-app.vercel.app)

## Features

- **AI-Powered Matching** — Gemini Flash scores attendee compatibility based on discussion topics, current season, and what they're hoping for. Matching happens automatically when each attendee is checked in — no need to wait for everyone to arrive
- **Guided Onboarding** — 5-step profile setup: name, work one-liner, current season, discussion topics, intentions + LinkedIn. Returning attendees get a 2-step version (topics + intentions only) — their name, photo, and work one-liner carry over automatically
- **Discover Feed** — Browse top matches ranked by score, with match reasons and conversation starters
- **Waves & Connections** — Send a wave to signal interest; mutual waves unlock LinkedIn and create a connection
- **Admin Panel** — Create meetups, set discussion topics, add conversation starters, check in attendees, and run AI matching
- **Co-admin Support** — Add co-hosts to share admin access for a meetup
- **Magic Link + Google Auth** — Frictionless sign-in, no password required

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (Postgres + Auth + Storage) |
| AI | Google Gemini Flash (match scoring) |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Gemini API key](https://aistudio.google.com/apikeys) (for AI match scoring)

### Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/alanagoh/gw-meetup-app.git
   cd gw-meetup-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your keys:
   | Variable | Description |
   |----------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
   | `GEMINI_API_KEY` | Your Gemini API key (match scoring) |
   | `NEXT_PUBLIC_APP_URL` | Your app URL (`http://localhost:3000` for local dev) |

4. **Set up the database:**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/` in order
   - Tables: `meetups`, `profiles`, `topic_options`, `conversation_prompts`, `matches`, `waves`, `connections`

5. **Run the dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## How It Works

### Admin flow
1. Go to `/admin` → create a meetup with a name, date, and invite code
2. Add discussion topics and conversation starters
3. Share the `/join/[code]` invite link with attendees before the event
4. On the day: check in attendees as they arrive — AI matching runs automatically per check-in. A manual "Run matching" button is also available to re-score all pairs
5. Optionally add co-admins by email so co-hosts can help manage

### Attendee flow
1. Click the invite link → sign in with Google or magic link
2. Complete onboarding:
   - **First-time attendees** — 5-step profile setup (name, photo, work one-liner, current season, discussion topics, intentions + LinkedIn)
   - **Returning attendees** — 2-step re-onboarding (discussion topics + intentions for the new meetup only; profile carries over)
3. See your top matches in the Discover feed
4. Wave at people you want to meet → mutual waves create a connection

## Project Structure

```
src/
  app/              # Next.js App Router pages
    api/            # API routes (matching, profile, waves, etc.)
    admin/          # Admin panel (meetup management)
    auth/           # Auth callback + login
    connections/    # Mutual connections view
    discover/       # Discovery feed
    join/           # Invite link handler
    onboarding/     # 5-step profile setup (2-step for returning attendees)
    profile/        # Profile view + edit
  components/       # Shared UI components (BottomNav)
  lib/              # Supabase clients, constants
supabase/
  migrations/       # Database schema and policy migrations
```

## License

[MIT](./LICENSE)
