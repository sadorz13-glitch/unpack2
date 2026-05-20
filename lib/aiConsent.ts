import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserId } from './auth';

export const AI_CONSENT_KEY_PREFIX = 'aiConsentGiven';

export class AIConsentError extends Error {
  constructor() {
    super('AI features are disabled. Re-enable in Settings.');
    this.name = 'AIConsentError';
  }
}

export async function hasAIConsent(): Promise<boolean> {
  const uid = getUserId();
  if (!uid) return false;
  const val = await AsyncStorage.getItem(`${AI_CONSENT_KEY_PREFIX}_${uid}`);
  return !!val && val !== '0';
}

export async function assertAIConsent(): Promise<void> {
  if (!(await hasAIConsent())) {
    throw new AIConsentError();
  }
}
