import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { REVENUECAT_ENTITLEMENT_ID } from '../constants';

export function initIAP() {
  Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY! });
}

export async function loginIAP(userId: string) {
  await Purchases.logIn(userId);
}

export async function logoutIAP() {
  try { await Purchases.logOut(); } catch {}
}

export async function getOfferings() {
  return Purchases.getOfferings();
}

export async function purchasePackage(pkg: PurchasesPackage) {
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}

export async function checkPremiumStatus(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return !!info.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
}
