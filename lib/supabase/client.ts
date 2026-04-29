import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../constants';

// SecureStore keys cannot contain colons — replace them to avoid errors
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key.replace(/:/g, '_')),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(key.replace(/:/g, '_'), value),
  removeItem: (key: string) =>
    SecureStore.deleteItemAsync(key.replace(/:/g, '_')),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
