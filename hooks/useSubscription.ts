import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkPremiumStatus } from '../lib/iap';
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
      setVentMessagesUsed(usedStr ? parseInt(usedStr, 10) : 0);
      setLoaded(true);
    })();
  }, []);

  const incrementVentMessages = useCallback(async () => {
    const next = ventMessagesUsed + 1;
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
