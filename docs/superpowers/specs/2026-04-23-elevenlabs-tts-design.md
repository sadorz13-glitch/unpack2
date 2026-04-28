# ElevenLabs TTS Integration

## Goal

Replace the OpenAI TTS call in `speakAndWait` (App.tsx) with ElevenLabs. The rest of the audio pipeline — file caching, `Audio.Sound` playback, fallback to `expo-speech` — stays unchanged.

## Scope

**One function changed:** `speakAndWait` in `App.tsx` (~6 lines swapped).  
No other files touched.

## Config

Two new values added to `.env`:

```
EXPO_PUBLIC_ELEVENLABS_KEY=<api key from elevenlabs.io dashboard>
EXPO_PUBLIC_ELEVENLABS_VOICE_ID=<voice ID from Voice Library>
```

Recommended female voices for a calm therapeutic tone: Sarah, Rachel, or Charlotte. Voice ID is found on the voice's detail page in the ElevenLabs Voice Library.

## API

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Headers:
  xi-api-key: {ELEVENLABS_KEY}
  Content-Type: application/json
Body:
  {
    "text": "...",
    "model_id": "eleven_turbo_v2_5",
    "voice_settings": { "stability": 0.5, "similarity_boost": 0.75 }
  }
Response: audio/mpeg binary
```

`eleven_turbo_v2_5` is the low-latency model — appropriate for real-time conversational use.

## Implementation

In `speakAndWait`, replace:

```tsx
const res = await fetch('https://api.openai.com/v1/audio/speech', {
  method: 'POST',
  headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'tts-1', input: text, voice: 'nova' }),
});
```

With:

```tsx
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
  method: 'POST',
  headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text,
    model_id: 'eleven_turbo_v2_5',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
  }),
});
```

Read the two new env vars at the top of App.tsx alongside the existing `OPENAI_KEY`:

```tsx
const ELEVENLABS_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_KEY ?? '';
const ELEVENLABS_VOICE_ID = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID ?? '';
```

## Fallback

No change — existing `catch` block falls through to `expo-speech` on any error.

## Out of Scope

- Voice selection UI
- Per-screen voice differentiation
- Streaming audio (chunked playback)
