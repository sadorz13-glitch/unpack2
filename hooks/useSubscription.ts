import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkPremiumStatus } from '../lib/iap';
import { getVentCount, incrementVentCount } from '../lib/supabase';
import { STORAGE_KEY_VENT_MESSAGES_USED, FREE_VENT_MESSAGE_LIMIT } from '../constants';

export function useSubscription() {
  const [isPremium, setIsPremium] = useState(false);
  const [ventMessagesUsed, setVentMessagesUsed] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [isPrem, usedStr] = await Promise.all([
        checkPremiumStatus().catch(() => false),
        AsyncStorage.getItem(STORAGE_KEY_VENT_MESSAGES_USED),
      ]);
      setIsPremium(isPrem);
      const localCount = usedStr ? parseInt(usedStr, 10) : 0;
      // Seed from server — server is authoritative against reinstall bypass
      const serverCount = await getVentCount().catch(() => 0);
      const count = Math.max(serverCount, localCount);
      setVentMessagesUsed(count);
      if (serverCount > localCount) {
        AsyncStorage.setItem(STORAGE_KEY_VENT_MESSAGES_USED, String(serverCount)).catch(() => {});
      }
      setLoaded(true);
    })();
  }, []);

  const incrementVentMessages = useCallback(async () => {
    const serverCount = await incrementVentCount().catch(() => 0);
    // If RPC returned 0 but we already had a count, the call failed — fall back to local increment
    const next = serverCount > 0 ? serverCount : ventMessagesUsed + 1;
    setVentMessagesUsed(next);
    AsyncStorage.setItem(STORAGE_KEY_VENT_MESSAGES_USED, String(next)).catch(() => {});
  }, [ventMessagesUsed]);

  const refreshPremiumStatus = useCallback(async () => {
    const isPrem = await checkPremiumStatus().catch(() => false);
    setIsPremium(isPrem);
  }, []);

  const canUseVent = isPremium || ventMessagesUsed < FREE_VENT_MESSAGE_LIMIT;
  const freeMessagesRemaining = Math.max(0, FREE_VENT_MESSAGE_LIMIT - ventMessagesUsed);

  return { isPremium, canUseVent, freeMessagesRemaining, loaded, ventMessagesUsed, incrementVentMessages, refreshPremiumStatus };
}