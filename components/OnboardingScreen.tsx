import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { saveProfile } from '../lib/auth';

type ProfileData = { name: string; dob: string };
type Props = { onComplete: (profile: ProfileData) => void };

export function OnboardingScreen({ onComplete }: Props) {
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const trimmedName = name.trim();
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (!trimmedName) { setError('Enter your name.'); return; }
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
      setError('Enter a valid date of birth.');
      return;
    }

    const dob = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    setSaving(true);
    try {
      await saveProfile(trimmedName, dob);
      onComplete({ name: trimmedName, dob });
    } catch (e) {
      setError('Something went wrong. Try again.');
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <View style={s.inner}>
        <Text style={s.headline}>Before we start.</Text>
        <Text style={s.sub}>Just the basics.</Text>

        <Text style={s.label}>YOUR NAME</Text>
        <TextInput
          style={s.input}
          placeholder="First name"
          placeholderTextColor="#555"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
          maxLength={100}
        />

        <Text style={s.label}>DATE OF BIRTH</Text>
        <View style={s.dobRow}>
          <TextInput
            style={[s.input, s.dobInput]}
            placeholder="DD"
            placeholderTextColor="#555"
            value={day}
            onChangeText={v => setDay(v.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
          />
          <TextInput
            style={[s.input, s.dobInput]}
            placeholder="MM"
            placeholderTextColor="#555"
            value={month}
            onChangeText={v => setMonth(v.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
          />
          <TextInput
            style={[s.input, s.dobInput, { flex: 1.5 }]}
            placeholder="YYYY"
            placeholderTextColor="#555"
            value={year}
            onChangeText={v => setYear(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={saving}>
          <Text style={s.btnText}>{saving ? 'Saving...' : "Let's go"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  headline: { fontFamily: 'Georgia', fontSize: 36, fontStyle: 'italic', color: '#fff', marginBottom: 6 },
  sub: { fontFamily: 'Georgia', fontSize: 18, fontStyle: 'italic', color: '#888', marginBottom: 48 },
  label: { fontSize: 11, letterSpacing: 2, color: '#b48c5a', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  dobRow: { flexDirection: 'row', gap: 10 },
  dobInput: { flex: 1, textAlign: 'center' },
  error: { color: '#e05252', fontSize: 13, marginBottom: 16, marginTop: -8 },
  btn: {
    backgroundColor: '#b48c5a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
