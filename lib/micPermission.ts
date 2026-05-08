import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const KEY = 'mic_granted';

export async function requestMicPermission(): Promise<boolean> {
  const cached = await AsyncStorage.getItem(KEY).catch(() => null);
  if (cached === 'true') return true;
  const { granted } = await Audio.requestPermissionsAsync();
  if (granted) AsyncStorage.setItem(KEY, 'true').catch(() => {});
  return granted;
}

export async function checkMicPermission(): Promise<boolean> {
  const cached = await AsyncStorage.getItem(KEY).catch(() => null);
  if (cached === 'true') return true;
  const { granted } = await Audio.getPermissionsAsync();
  return granted;
}
