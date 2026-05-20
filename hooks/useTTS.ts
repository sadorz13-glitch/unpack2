import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import {
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SUPABASE_URL } from '../constants';
import { getAccessToken } from '../lib/auth';
import { hasAIConsent } from '../lib/aiConsent';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsoundRef = useRef<Audio.Sound | null>(null);
  const ttsResolveRef = useRef<(() => void) | null>(null);
  const ttsMeteringSV = useSharedValue(0);

  function setSpeaking(val: boolean) {
    isSpeakingRef.current = val;
    setIsSpeaking(val);
    cancelAnimation(ttsMeteringSV);
    ttsMeteringSV.value = val
      ? withRepeat(
          withSequence(
            withTiming(0.35, { duration: 90 }),
            withTiming(0.85, { duration: 120 }),
            withTiming(0.5, { duration: 80 }),
            withTiming(0.7, { duration: 110 }),
          ),
          -1,
          true,
        )
      : withTiming(0, { duration: 160 });
  }

  async function stopTTS() {
    if (ttsResolveRef.current) { ttsResolveRef.current(); ttsResolveRef.current = null; }
    Speech.stop();
    if (ttsoundRef.current) {
      try { await ttsoundRef.current.stopAsync(); await ttsoundRef.current.unloadAsync(); } catch {}
      ttsoundRef.current = null;
    }
    setSpeaking(false);
  }

  async function speakAndWait(text: string) {
    if (!text) { return; }
    if (!(await hasAIConsent())) { return; }
    try {
      await stopTTS();
      setSpeaking(true);

      // Non-fatal — audio session may already be configured correctly
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch {
        // non-fatal — audio session may already be configured correctly
      }

      const token = await getAccessToken();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          text,
          stability: 0.9,
          similarity_boost: 0.6,
          style: 0,
          use_speaker_boost: false,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`TTS proxy ${res.status}: ${errBody}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) throw new Error('TTS: no cache directory available');
      const fileUri = cacheDir + `tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: false },
      );
      ttsoundRef.current = sound;

      await new Promise<void>((resolve, reject) => {
        ttsResolveRef.current = resolve;
        sound.setOnPlaybackStatusUpdate((status: { isLoaded: boolean; didJustFinish?: boolean; error?: string }) => {
          if (status.isLoaded && status.didJustFinish) {
            ttsResolveRef.current = null;
            ttsoundRef.current = null;
            sound.unloadAsync().catch(() => {});
            FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
            setSpeaking(false);
            resolve();
          }
          if (status.error) {
            reject(new Error(status.error));
          }
        });
        sound.setVolumeAsync(1.0).catch(() => {});
        sound.playAsync()
          .then(() => {})
          .catch(e => { reject(e); });
      });
    } catch {
      setSpeaking(false);
      await new Promise<void>(resolve => {
        Speech.speak(text, { rate: 0.92, onDone: resolve, onStopped: resolve, onError: () => resolve() });
      });
    }
  }

  return { isSpeaking, isSpeakingRef, ttsEnabled, setTtsEnabled, ttsoundRef, ttsMeteringSV, stopTTS, speakAndWait };
}
