import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return new Response('Unauthorized', { status: 401, headers: CORS });

  const allowed = await checkRateLimit(user.id, 'elevenlabs-proxy');
  if (!allowed) return new Response('Rate limit exceeded', { status: 429, headers: CORS });

  const { text, stability, similarity_boost, style, use_speaker_boost } = await req.json();
  const voiceId = Deno.env.get('ELEVENLABS_VOICE_ID')!;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': Deno.env.get('ELEVENLABS_KEY')!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability, similarity_boost, style, use_speaker_boost },
    }),
  });

  if (!res.ok) return new Response('TTS failed', { status: res.status, headers: CORS });

  const audioBuffer = await res.arrayBuffer();
  return new Response(audioBuffer, {
    headers: { ...CORS, 'Content-Type': 'audio/mpeg' },
  });
});
