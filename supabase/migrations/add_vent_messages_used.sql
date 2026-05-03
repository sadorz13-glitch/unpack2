-- Add vent_messages_used to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vent_messages_used integer NOT NULL DEFAULT 0;

-- RPC to increment safely (returns new count)
CREATE OR REPLACE FUNCTION increment_vent_messages(user_uuid uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE profiles
    SET vent_messages_used = vent_messages_used + 1
    WHERE id = user_uuid
    RETURNING vent_messages_used INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;
