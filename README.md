# Org Directory App

A directory of cancer-support organizations with a curated list plus a live
web-search feature. Built with Next.js (App Router), Supabase, and the
Anthropic API.

## What changed from the Claude.ai artifact version

- **API calls moved server-side.** The artifact called `api.anthropic.com`
  directly from the browser, which only works inside Claude.ai's sandbox
  (it injects the key for you there). Here, that call lives in
  `app/api/find-orgs/route.js` and runs on the server, so your Anthropic API
  key never reaches the browser.
- **`window.storage` replaced with Supabase.** That API is a Claude.ai
  artifact-only feature. `lib/supabase.js` swaps it for a real Postgres table
  (`saved_orgs`), scoped by a random per-browser session id stored in
  `localStorage` — no login required, but saved orgs stay on the device that
  saved them. Add real auth later if you want cross-device syncing.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at https://supabase.com (free tier is
   plenty for this app). In the SQL editor, run the schema in the comment
   block at the top of `lib/supabase.js` to create the `saved_orgs` table.

3. **Get your Anthropic API key** from https://console.anthropic.com

4. **Set environment variables.** Copy the example file and fill in your
   real values:
   ```bash
   cp .env.local.example .env.local
   ```
   - `ANTHROPIC_API_KEY` — server-only, keep this secret
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your
     Supabase project settings → API. The anon key is safe to expose; it's
     designed for browser use and is restricted by the row-level security
     policy on the table.

5. **Run locally**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

## Deploying

The easiest path is **Vercel** (built by the same team as Next.js, free tier
covers this app easily):

1. Push this project to a GitHub repo.
2. Import the repo at https://vercel.com/new
3. Add the same three environment variables in the Vercel project settings
   (Settings → Environment Variables) — same names, same values as your
   `.env.local`.
4. Deploy. Vercel auto-detects Next.js, no config needed.

## Notes / next steps

- The "location" field in the web-search box is just a text hint passed to
  the search prompt — it's not real geolocation. If you later want an
  actual "orgs near me" map view, that's a separate feature (Google Places
  or Mapbox) layered on top of this.
- Right now saved orgs are tied to a random browser ID, not a real account.
  If you want users to see their saved list on a new device, add Supabase
  Auth (email or OAuth) and swap `session_id` for the authenticated user ID.
- Consider adding basic rate limiting to `/api/find-orgs` before going live
  — each click triggers a web-search-enabled Claude API call, which costs
  money per request.
