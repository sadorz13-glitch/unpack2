import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS });

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) return new Response('Unauthorized', { status: 401, headers: CORS });

  const uid = user.id;
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1. answers — FK on sessions, must go first
  const { data: sessions } = await admin.from('sessions').select('id').eq('user_id', uid);
  const sessionIds = (sessions ?? []).map((s: any) => s.id);
  if (sessionIds.length > 0) {
    const { error: e1 } = await admin.from('answers').delete().in('session_id', sessionIds);
    if (e1) return new Response(JSON.stringify({ error: e1.message }), { status: 500, headers: CORS });
  }

  // 2. sessions
  const { error: e2 } = await admin.from('sessions').delete().eq('user_id', uid);
  if (e2) return new Response(JSON.stringify({ error: e2.message }), { status: 500, headers: CORS });

  // 3. day_notes
  const { error: e3 } = await admin.from('day_notes').delete().eq('user_id', uid);
  if (e3) return new Response(JSON.stringify({ error: e3.message }), { status: 500, headers: CORS });

  // 4. rate_limits — ignore error, user may have no rows
  await admin.from('rate_limits').delete().eq('user_id', uid);

  // 5. profiles
  const { error: e5 } = await admin.from('profiles').delete().eq('user_id', uid);
  if (e5) return new Response(JSON.stringify({ error: e5.message }), { status: 500, headers: CORS });

  // 6. auth user — must be last
  const { error: authErr } = await admin.auth.admin.deleteUser(uid);
  if (authErr) return new Response(JSON.stringify({ error: authErr.message }), { status: 500, headers: CORS });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
