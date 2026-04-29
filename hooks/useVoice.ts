import { useState, useRef, useEffect } from 'react';
import { Platform, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { OPENAI_KEY } from '../constants';

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const recordingRef = useRef<any>(null);
  const recordingSetterRef = useRef<any>(null);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const micPulseAnim = useRef(new Animated.Value(1)).current;
  const meteringLevelAnim = useRef(new Animated.Value(1)).current;
  const onTranscribedRef = useRef<((text: string) => void) | null>(null);

  // Animate mic pulse dot while recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
          Animated.timing(micPulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      micPulseAnim.stopAnimation();
      micPulseAnim.setValue(1);
    }
  }, [isRecording]);

  async function startVoiceRecording(setterFn: any, onTranscribed?: (text: string) => void) {
    onTranscribedRef.current = onTranscribed ?? null;
    try {
      if (recordingRef.current) return;
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recordingRef.current = recording;
      recordingSetterRef.current = setterFn;
      setIsRecording(true);

      const startedAt = Date.now();
      // Android metering reports higher values than iOS — use a looser threshold
      const SILENCE_DB = Platform.OS === 'android' ? -28 : -42;
      const SILENCE_DURATION_MS = 1800;
      let speechEverDetected = false;

      meteringIntervalRef.current = setInterval(async () => {
        if (!recordingRef.current) return;
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (!status.isRecording) return;
          const level = status.metering ?? -160;

          const clamped = Math.max(-60, Math.min(-5, level));
          const targetScale = 1 + ((clamped + 60) / 55) * 2.5;
          Animated.timing(meteringLevelAnim, {
            toValue: targetScale,
            duration: 60,
            useNativeDriver: true,
          }).start();

          if (Date.now() - startedAt < 1500) return; // warmup window

          if (level > -20) speechEverDetected = true;
          if (!speechEverDetected) return;

          if (level < SILENCE_DB) {
            if (!silenceStartRef.current) silenceStartRef.current = Date.now();
            else if (Date.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
              clearInterval(meteringIntervalRef.current!);
              meteringIntervalRef.current = null;
              silenceStartRef.current = null;
              stopVoiceRecording(recordingSetterRef.current);
            }
          } else {
            silenceStartRef.current = null;
          }
        } catch {}
      }, 100);
    } catch {}
  }

  async function stopVoiceRecording(setterFn: any) {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null; // claim immediately — prevents double-stop race
    try {
      if (meteringIntervalRef.current) {
        clearInterval(meteringIntervalRef.current);
        meteringIntervalRef.current = null;
      }
      silenceStartRef.current = null;
      setIsRecording(false);
      setIsTranscribing(true);
      Animated.timing(meteringLevelAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        defaultToSpeakerphone: true,
      });
      const uri = rec.getURI();
      if (!uri) { setIsTranscribing(false); return; }

      const formData = new FormData();
      formData.append('file', { uri, type: 'audio/m4a', name: 'voice.m4a' } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body: formData,
      });

      setIsTranscribing(false);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      const text = data.text?.trim();
      if (text) {
        if (onTranscribedRef.current) {
          onTranscribedRef.current(text);
        } else {
          setterFn((prev: string) => (prev ? prev + ' ' + text : text));
          setInputMode('type');
        }
      }
    } catch (e) {
      setIsRecording(false);
      setIsTranscribing(false);
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        defaultToSpeakerphone: true,
      }).catch(() => {});
    }
  }

  return {
    isRecording,
    isTranscribing,
    inputMode,
    setInputMode,
    micPulseAnim,
    meteringLevelAnim,
    recordingRef,
    recordingSetterRef,
    startVoiceRecording,
    stopVoiceRecording,
  };
}
