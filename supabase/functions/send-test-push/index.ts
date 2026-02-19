import { corsHeaders } from '../_shared/cors.ts';
import { getUserClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Missing auth header', { status: 401, headers: corsHeaders });

  const userClient = getUserClient(authHeader);
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const { data: profile, error: profileErr } = await userClient
    .from('profiles')
    .select('expo_push_token')
    .eq('user_id', userData.user.id)
    .single();

  if (profileErr || !profile?.expo_push_token) {
    return new Response('No push token on profile', { status: 400, headers: corsHeaders });
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: profile.expo_push_token,
      title: 'WakeBrief test push',
      body: 'If you can read this, WakeBrief notifications are configured.',
      data: { deepLink: '/today' }
    })
  });

  if (!res.ok) return new Response(await res.text(), { status: 500, headers: corsHeaders });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
