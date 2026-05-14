import type { PurchasesPackage, PurchasesOfferings } from 'react-native-purchases';
import { REVENUECAT_ENTITLEMENT_ID, REVIVAL_PRODUCT_ID } from '../constants';

// Dynamic require so the module-level NativeEventEmitter(undefined) throw inside
// react-native-purchases (native module absent in Expo Go + New Architecture) is catchable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Purchases: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Purchases = require('react-native-purchases').default;
} catch {}

export function initIAP(): void {
  try {
    Purchases?.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY! });
  } catch {}
}

export async function loginIAP(userId: string): Promise<void> {
  await Purchases?.logIn(userId);
}

export async function logoutIAP(): Promise<void> {
  try { await Purchases?.logOut(); } catch {}
}

export async function getOfferings(): Promise<PurchasesOfferings | undefined> {
  return Purchases?.getOfferings();
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<unknown> {
  return Purchases?.purchasePackage(pkg);
}

export async function restorePurchases(): Promise<unknown> {
  return Purchases?.restorePurchases();
}

export async function checkPremiumStatus(): Promise<boolean> {
  if (!Purchases) return false;
  const info = await Purchases.getCustomerInfo();
  return !!info.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
}

export async function purchaseRevival(): Promise<boolean> {
  if (!Purchases) return false;
  try {
    const offerings = await Purchases.getOfferings();
    if (__DEV__) {
      console.log('[Revival] offerings:', JSON.stringify(offerings?.current?.availablePackages?.map((p: any) => p.product?.identifier)));
    }
    const pkg = offerings.current?.availablePackages.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.product.identifier === REVIVAL_PRODUCT_ID
    );
    if (!pkg) {
      throw Object.assign(new Error('revival_not_available'), { revivalNotAvailable: true });
    }
    await Purchases.purchasePackage(pkg);
    return true;
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return false;
    if ((e as { revivalNotAvailable?: boolean })?.revivalNotAvailable) {
      throw Object.assign(new Error('revival_not_available'), { revivalNotAvailable: true });
    }
    throw e;
  }
}
