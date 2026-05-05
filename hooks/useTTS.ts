import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { SUPABASE_URL } from '../constants';
import { getAccessToken } from '../lib/auth';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsoundRef = useRef<any>(null);
  const ttsResolveRef = useRef<(() => void) | null>(null);

  async function stopTTS() {
    if (ttsResolveRef.current) { ttsResolveRef.current(); ttsResolveRef.current = null; }
    Speech.stop();
    if (ttsoundRef.current) {
      try { await ttsoundRef.current.stopAsync(); await ttsoundRef.current.unloadAsync(); } catch {}
      ttsoundRef.current = null;
    }
    setIsSpeaking(false);
  }

  async function speakAndWait(text: string) {
    if (!text) return;
    try {
      await stopTTS();
      setIsSpeaking(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        defaultToSpeakerphone: true,
      });
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
      if (!res.ok) { setIsSpeaking(false); return; }

      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      console.log('[TTS] base64 length:', base64.length);

      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) throw new Error('TTS: no cache directory available');
      const fileUri = cacheDir + `tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[TTS] file written:', fileUri);

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: false },
      );
      console.log('[TTS] sound created');
      ttsoundRef.current = sound;

      await new Promise<void>((resolve, reject) => {
        ttsResolveRef.current = resolve;
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            ttsResolveRef.current = null;
            ttsoundRef.current = null;
            sound.unloadAsync().catch(() => {});
            FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
            setIsSpeaking(false);
            resolve();
          }
          if (status.error) {
            console.log('[TTS] playback error:', status.error);
            reject(new Error(status.error));
          }
        });
        sound.playAsync()
          .then(s => console.log('[TTS] playAsync status:', s.isPlaying))
          .catch(e => { console.log('[TTS] playAsync failed:', e); reject(e); });
      });
    } catch {
      setIsSpeaking(false);
      await new Promise<void>(resolve => {
        Speech.speak(text, { rate: 0.92, onDone: resolve, onStopped: resolve, onError: () => resolve() });
      });
    }
  }

  return { isSpeaking, ttsEnabled, setTtsEnabled, ttsoundRef, stopTTS, speakAndWait };
}
