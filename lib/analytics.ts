import { Mixpanel } from 'mixpanel-react-native';

const mp = new Mixpanel(process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? '', false);
mp.init().catch(() => {});

export function track(event: string, props?: Record<string, any>) {
  mp.track(event, props ?? {});
}

export function identifyUser(userId: string) {
  mp.identify(userId);
}

export function resetAnalytics() {
  mp.reset();
}
