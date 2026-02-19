import { corsHeaders } from '../_shared/cors.ts';
import { getUserClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Missing auth header', { status: 401, headers: corsHeaders });

  const userClient = getUserClient(authHeader);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const { expoPushToken } = await req.json();
  if (!expoPushToken || typeof expoPushToken !== 'string') {
    return new Response('Invalid expoPushToken', { status: 400, headers: corsHeaders });
  }

  const { error } = await userClient
    .from('profiles')
    .update({ expo_push_token: expoPushToken })
    .eq('user_id', userData.user.id);

  if (error) return new Response(error.message, { status: 500, headers: corsHeaders });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
