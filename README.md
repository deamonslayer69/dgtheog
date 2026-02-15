# WakeBrief

WakeBrief is a cross-platform (iOS + Android) Expo app backed by Supabase. It delivers a pre-generated morning brief at each user’s wake time via push notification:

- Portfolio Pulse (daily change, top movers, company news)
- While You Slept (top world updates)
- Overnight one-liner
- Concept of the Day (grounded, short explainer)
- Source citations

## Project structure

- `app/` — Expo React Native app (TypeScript)
- `supabase/migrations/` — SQL schema + RLS + scheduling
- `supabase/functions/` — Edge Functions:
  - `register-push-token`
  - `generate-daily-brief`
  - `send-test-push`

## Fast bootstrap (recommended)

Run the helper script to link Supabase, apply migrations, publish secrets, deploy functions, and install app dependencies:

```bash
chmod +x scripts/setup.sh
SUPABASE_PROJECT_REF=<YOUR_PROJECT_REF> \
OPENAI_API_KEY=<...> \
NEWSAPI_KEY=<...> \
FINNHUB_KEY=<...> \
SUPABASE_URL=<https://...supabase.co> \
SUPABASE_ANON_KEY=<...> \
SUPABASE_SERVICE_ROLE_KEY=<...> \
./scripts/setup.sh
```

The script lives at `scripts/setup.sh`.

## 1) Create Supabase project

1. Create a new project on Supabase.
2. Install CLI:
   ```bash
   npm i -g supabase
   ```
3. Link project:
   ```bash
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   ```
4. Apply migration:
   ```bash
   supabase db push
   ```

## 2) Configure Edge Function secrets

Set required secrets (server-side only):

```bash
supabase secrets set OPENAI_API_KEY=<...>
supabase secrets set NEWSAPI_KEY=<...>
supabase secrets set FINNHUB_KEY=<...>
supabase secrets set SUPABASE_URL=<https://...supabase.co>
supabase secrets set SUPABASE_ANON_KEY=<...>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<...>
```

Deploy functions:

```bash
supabase functions deploy register-push-token
supabase functions deploy generate-daily-brief
supabase functions deploy send-test-push
```

## 3) Cron scheduling

Migration enables `pg_cron` and schedules a 15-minute trigger calling `generate-daily-brief` through `pg_net`.

For hosted projects, ensure database settings expose:

- `app.settings.supabase_url`
- `app.settings.service_role_key`

If not set, run:

```sql
alter database postgres set app.settings.supabase_url = 'https://<PROJECT_REF>.supabase.co';
alter database postgres set app.settings.service_role_key = '<SERVICE_ROLE_KEY>';
```

Then re-run migration SQL for cron scheduling snippet.

## 4) Run the app

```bash
cd app
npm install
npm run start
```

Set client env vars:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_PROJECT_ID` (from EAS project)

### Important: Push requires a dev build

Push notifications do **not** work in Expo Go for production-like delivery. Build a dev client:

```bash
npx expo prebuild
npx expo run:ios
npx expo run:android
```

(or via EAS build dev profiles).

## 5) Test push end-to-end

1. Sign in with magic link.
2. Complete onboarding and allow notifications.
3. In Settings, tap **Send test push**.
4. Confirm notification tap opens Today screen.
5. Trigger generation manually:
   ```bash
   curl -X POST \
     "https://<PROJECT_REF>.supabase.co/functions/v1/generate-daily-brief" \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

## Reliability and safeguards

- Keys are server-side only in Edge Functions.
- Brief generation is idempotent per `(user_id, brief_date)`.
- If external APIs fail, brief still generates with reduced content and data-delay notes.
- App/UI and payload include links for all cited stories.
- Briefs are factual summaries and explicitly not investment advice.
