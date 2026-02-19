#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "❌ Supabase CLI not found. Install with: npm i -g supabase"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm not found. Install Node.js 18+ first."
  exit 1
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [[ -z "$PROJECT_REF" ]]; then
  read -r -p "Supabase project ref: " PROJECT_REF
fi

if [[ -z "$PROJECT_REF" ]]; then
  echo "❌ Project ref is required."
  exit 1
fi

echo "==> Linking Supabase project"
supabase link --project-ref "$PROJECT_REF"

echo "==> Applying database migrations"
supabase db push

echo "==> Validating required secret env vars"
required=(
  OPENAI_API_KEY
  NEWSAPI_KEY
  FINNHUB_KEY
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
)

missing=()
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "⚠️ Missing required secret values in environment: ${missing[*]}"
  echo "Set them in your shell, then re-run this script to publish secrets/functions."
  echo "Example: export OPENAI_API_KEY=..."
  exit 1
fi

echo "==> Publishing Supabase function secrets"
supabase secrets set \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  NEWSAPI_KEY="$NEWSAPI_KEY" \
  FINNHUB_KEY="$FINNHUB_KEY" \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

echo "==> Deploying edge functions"
supabase functions deploy register-push-token
supabase functions deploy generate-daily-brief
supabase functions deploy send-test-push

echo "==> Installing app dependencies"
(
  cd app
  npm install
)

cat <<'MSG'

✅ Setup complete.

Next steps:
1) Set Expo client env vars before running the app:
   export EXPO_PUBLIC_SUPABASE_URL=...
   export EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   export EXPO_PUBLIC_PROJECT_ID=...
2) Start app:
   cd app && npm run start
3) Build a dev client for push notifications:
   cd app && npx expo prebuild && npx expo run:ios  # or run:android

MSG
