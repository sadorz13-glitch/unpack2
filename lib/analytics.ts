// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mp: any = null;
try {
  // Dynamic require so the module-level throw inside mixpanel-react-native
  // (when the native module is absent in Expo Go) is catchable.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Mixpanel } = require('mixpanel-react-native');
  mp = new Mixpanel(process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? '', false);
  mp.init().catch(() => {});
} catch {
  mp = null;
}

export function track(event: string, props?: Record<string, any>) {
  mp?.track(event, props ?? {});
}

export function identifyUser(userId: string) {
  mp?.identify(userId);
}

export function resetAnalytics() {
  mp?.reset();
}
