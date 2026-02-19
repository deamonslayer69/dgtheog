import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const getUserClient = (jwt: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: jwt } }
  });

export const serviceClient = createClient(supabaseUrl, serviceRoleKey);
