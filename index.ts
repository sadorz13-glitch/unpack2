import * as Sentry from '@sentry/react-native';
import { registerRootComponent } from 'expo';
import App from './App';

if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
    // Session Replay disabled — app captures sensitive mental health content
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

registerRootComponent(Sentry.wrap(App));
