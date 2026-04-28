import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { saveRequeuedQuestion, loadAndClearRequeuedQuestion } from '../screens/SessionScreen';

describe('session requeue logic', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and retrieves a requeued question', async () => {
    await saveRequeuedQuestion('What are you avoiding?');
    const result = await loadAndClearRequeuedQuestion();
    expect(result).toBe('What are you avoiding?');
  });

  it('clears the question after loading', async () => {
    await saveRequeuedQuestion('What are you avoiding?');
    await loadAndClearRequeuedQuestion();
    const result = await loadAndClearRequeuedQuestion();
    expect(result).toBeNull();
  });

  it('returns null when no question is queued', async () => {
    const result = await loadAndClearRequeuedQuestion();
    expect(result).toBeNull();
  });
});
