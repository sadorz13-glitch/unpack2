import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Animated } from 'react-native';
import { Audio } from 'expo-av';
import * as Sentry from '@sentry/react-native';
import { SUPABASE_URL, VAD_HARD_TIMEOUT_MS } from '../constants';
import { getAccessToken } from '../lib/auth';
import { checkMicPermission } from '../lib/micPermission';

function createVAD(isTtsSpeaking?: () => boolean) {
  let baselineDb = -50;
  let isUserSpeaking = false;
  let speechOnsetTime: number | null = null;
  let speakingStartedAt: number | null = null;
  let silenceStartTime: number | null = null;
  let silenceBreakCount = 0;
  const startTime = Date.now();
  let lastRecalibTime = startTime;
  const recalibSamples: number[] = [];
  // Calibration window: extends when TTS is speaking, includes sanity check on exit
  let calibrationStartTime = startTime;
  let calibrationDone = false;

  return {
    process(level: number, onSpeechEnd: () => void): void {
      const now = Date.now();

      if (!calibrationDone) {
        const elapsedCalib = now - calibrationStartTime;
        if (elapsedCalib < 2500) {
          if (isTtsSpeaking?.()) {
            // TTS active — throw away samples and restart window
            calibrationStartTime = now;
            recalibSamples.length = 0;
          } else {
            recalibSamples.push(level);
            if (recalibSamples.length >= 5) {
              const sorted = [...recalibSamples].sort((a, b) => a - b);
              const n = Math.max(1, Math.ceil(sorted.length * 0.3));
              baselineDb = sorted.slice(0, n).reduce((s, v) => s + v, 0) / n;
            }
          }
          return;
        }
        // Calibration window elapsed — sanity check
        if (baselineDb > -25) {
          calibrationStartTime = now;
          recalibSamples.length = 0;
          baselineDb = -50;
          return;
        }
        calibrationDone = true;
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

      const speechThreshold = baselineDb + 18;
      const silenceThreshold = baselineDb + 18;

      if (!isUserSpeaking) {
        if (level > speechThreshold) {
          if (speechOnsetTime === null) { speechOnsetTime = now; }
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
          silenceBreakCount = 0;
          if (silenceStartTime === null) { silenceStartTime = now; }
          else if (now - silenceStartTime >= 1000) {
            const speechDuration = silenceStartTime - (speakingStartedAt ?? silenceStartTime);
            if (speechDuration >= 500) {
              isUserSpeaking = false;
              speechOnsetTime = null;
              speakingStartedAt = null;
              silenceStartTime = null;
              silenceBreakCount = 0;
              onSpeechEnd();
            }
          }
        } else {
          silenceBreakCount++;
          if (silenceBreakCount >= 6) {
            silenceStartTime = null;
            silenceBreakCount = 0;
          }
        }
      }
    },
  };
}

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [forceStopCount, setForceStopCount] = useState(0);
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingSetterRef = useRef<Dispatch<SetStateAction<string>> | null>(null);
  const vadRef = useRef<ReturnType<typeof createVAD> | null>(null);
  const micPulseAnim = useRef(new Animated.Value(1)).current;
  const meteringLevelAnim = useRef(new Animated.Value(1)).current;
  const onTranscribedRef = useRef<((text: string) => void) | null>(null);
  const hardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  async function startVoiceRecording(setterFn: Dispatch<SetStateAction<string>>, onTranscribed?: (text: string) => void, isTtsSpeaking?: () => boolean) {
    onTranscribedRef.current = onTranscribed ?? null;
    try {
      if (recordingRef.current) return;
      const granted = await checkMicPermission();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recordingRef.current = recording;
      recordingSetterRef.current = setterFn;
      setIsRecording(true);

      const vad = createVAD(isTtsSpeaking);
      vadRef.current = vad;

      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
      hardTimeoutRef.current = setTimeout(() => {
        if (recordingRef.current && recordingSetterRef.current) {
          setForceStopCount(c => c + 1);
          stopVoiceRecording(recordingSetterRef.current);
        }
      }, VAD_HARD_TIMEOUT_MS);

      recording.setProgressUpdateInterval(100);
      recording.setOnRecordingStatusUpdate((status: { isRecording: boolean; metering?: number }) => {
        if (!status.isRecording) return;
        const level = status.metering ?? -160;

        const clamped = Math.max(-60, Math.min(-5, level));
        const targetScale = 1 + ((clamped + 60) / 55) * 2.5;
        Animated.timing(meteringLevelAnim, {
          toValue: targetScale,
          duration: 60,
          useNativeDriver: true,
        }).start();

        vad.process(level, () => { if (recordingSetterRef.current) stopVoiceRecording(recordingSetterRef.current); });
      });
    } catch (e) { Sentry.captureException(e); }
  }

  async function stopVoiceRecording(setterFn: Dispatch<SetStateAction<string>>) {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null; // claim immediately — prevents double-stop race
    if (hardTimeoutRef.current) { clearTimeout(hardTimeoutRef.current); hardTimeoutRef.current = null; }
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
    forceStopCount,
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
