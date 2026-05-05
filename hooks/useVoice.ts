import { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { Audio } from 'expo-av';
import { SUPABASE_URL } from '../constants';
import { getAccessToken } from '../lib/auth';

function createVAD() {
  let baselineDb = -50;
  let isUserSpeaking = false;
  let speechOnsetTime: number | null = null;
  let speakingStartedAt: number | null = null;
  let silenceStartTime: number | null = null;
  const startTime = Date.now();
  let lastRecalibTime = startTime;
  const recalibSamples: number[] = [];

  return {
    process(level: number, onSpeechEnd: () => void): void {
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed < 1500) {
        recalibSamples.push(level);
        if (recalibSamples.length >= 5) {
          const sorted = [...recalibSamples].sort((a, b) => a - b);
          const n = Math.max(1, Math.ceil(sorted.length * 0.3));
          baselineDb = sorted.slice(0, n).reduce((s, v) => s + v, 0) / n;
        }
        return;
      }

      if (!isUserSpeaking && now - lastRecalibTime >= 10000) {
        recalibSamples.push(level);
        if (recalibSamples.length > 30) recalibSamples.shift();
        const sorted = [...recalibSamples].sort((a, b) => a - b);
        const n = Math.max(1, Math.ceil(sorted.length * 0.3));
        baselineDb = sorted.slice(0, n).reduce((s, v) => s + v, 0) / n;
        lastRecalibTime = now;
      }

      const speechThreshold = baselineDb + 12;
      const silenceThreshold = baselineDb + 4;

      if (!isUserSpeaking) {
        if (level > speechThreshold) {
          if (speechOnsetTime === null) speechOnsetTime = now;
          else if (now - speechOnsetTime >= 300) {
            isUserSpeaking = true;
            speakingStartedAt = speechOnsetTime;
            silenceStartTime = null;
          }
        } else {
          speechOnsetTime = null;
        }
      } else {
        if (level < silenceThreshold) {
          if (silenceStartTime === null) silenceStartTime = now;
          else if (now - silenceStartTime >= 1500) {
            const speechDuration = silenceStartTime - (speakingStartedAt ?? silenceStartTime);
            if (speechDuration >= 500) {
              isUserSpeaking = false;
              speechOnsetTime = null;
              speakingStartedAt = null;
              silenceStartTime = null;
              onSpeechEnd();
            }
          }
        } else {
          silenceStartTime = null;
        }
      }
    },
  };
}

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const recordingRef = useRef<any>(null);
  const recordingSetterRef = useRef<any>(null);
  const vadRef = useRef<ReturnType<typeof createVAD> | null>(null);
  const micPulseAnim = useRef(new Animated.Value(1)).current;
  const meteringLevelAnim = useRef(new Animated.Value(1)).current;
  const onTranscribedRef = useRef<((text: string) => void) | null>(null);

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

      const vad = createVAD();
      vadRef.current = vad;

      recording.setProgressUpdateInterval(100);
      recording.setOnRecordingStatusUpdate((status: any) => {
        if (!status.isRecording) return;
        const level = status.metering ?? -160;

        const clamped = Math.max(-60, Math.min(-5, level));
        const targetScale = 1 + ((clamped + 60) / 55) * 2.5;
        Animated.timing(meteringLevelAnim, {
          toValue: targetScale,
          duration: 60,
          useNativeDriver: true,
        }).start();

        vad.process(level, () => stopVoiceRecording(recordingSetterRef.current));
      });
    } catch {}
  }

  async function stopVoiceRecording(setterFn: any) {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null; // claim immediately — prevents double-stop race
    try {
      vadRef.current = null;
      rec.setOnRecordingStatusUpdate(null);
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

      const token = await getAccessToken();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/whisper-proxy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
