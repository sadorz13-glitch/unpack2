import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIMITS: Record<string, number> = {
  'claude-proxy': 60,
  'whisper-proxy': 30,
  'elevenlabs-proxy': 30,
};

export async function checkRateLimit(
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const limit = LIMITS[endpoint] ?? 30;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
  });
  if (error) return true; // fail open — don't block on DB errors
  return (data as number) <= limit;
}
