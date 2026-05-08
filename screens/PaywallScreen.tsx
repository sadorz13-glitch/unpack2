import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/iap';
import { track } from '../lib/analytics';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../constants';
import { colors, spacing, fontFamilies } from '../theme';

type Props = {
  visible: boolean;
  source: 'vent' | 'weekly_wheel' | 'session' | 'deep_dive';
  onClose: () => void;
  onSubscribed: () => Promise<void>;
};

export function PaywallScreen({ visible, source, onClose, onSubscribed }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    track('paywall_seen', { source });
    setSelectedPlan('annual');
    setError('');
    loadOfferings();
  }, [visible]);

  async function loadOfferings() {
    setLoading(true);
    try {
      const o = await getOfferings();
      const packages: PurchasesPackage[] = o.current?.availablePackages ?? [];
      setAnnualPkg(packages.find(p => p.packageType === 'ANNUAL') ?? null);
      setMonthlyPkg(packages.find(p => p.packageType === 'MONTHLY') ?? null);
    } catch {
      setError('Could not load pricing. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function getPrice(type: 'annual' | 'monthly'): string {
    const pkg = type === 'annual' ? annualPkg : monthlyPkg;
    return pkg?.product.priceString ?? (type === 'annual' ? '$34.99' : '$6.99');
  }

  async function handleSubscribe() {
    const pkg = selectedPlan === 'annual' ? annualPkg : monthlyPkg;
    if (!pkg) { setError('Pricing unavailable — try refreshing.'); return; }
    setPurchasing(true);
    setError('');
    try {
      await purchasePackage(pkg);
      track('subscription_started', { plan: selectedPlan });
      await onSubscribed();
      onClose();
    } catch (e: any) {
      if (!e?.userCancelled) setError('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setError('');
    try {
      await restorePurchases();
      track('subscription_restored');
      await onSubscribed();
      onClose();
    } catch {
      setError('Nothing to restore, or restore failed.');
    } finally {
      setRestoring(false);
    }
  }

  function handleClose() {
    track('paywall_dismissed', { source });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.headline}>Unpack Premium</Text>
        <Text style={styles.sub}>Go deeper. Understand yourself.</Text>

        <View style={styles.features}>
          {[
            'Unlimited daily sessions',
            'Voice AI — ElevenLabs audio responses',
            'Deep Dive analysis after every session',
            'Weekly Wheel — track your patterns over time',
            'Unlimited Vent messages',
          ].map(f => (
            <Text key={f} style={styles.feature}>· {f}</Text>
          ))}
        </View>

        <View style={styles.planRow}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.8}
          >
            <Text style={styles.bestValueBadge}>BEST VALUE</Text>
            <Text style={styles.planLabel}>ANNUAL</Text>
            <Text style={styles.planPrice}>{getPrice('annual')}</Text>
            <Text style={styles.planTrial}>7-day free trial</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <Text style={styles.planLabel}>MONTHLY</Text>
            <Text style={styles.planPrice}>{getPrice('monthly')}</Text>
            <Text style={styles.planNote}>per month</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : (
          <TouchableOpacity
            style={[styles.ctaBtn, (purchasing || restoring) && { opacity: 0.7 }]}
            onPress={handleSubscribe}
            disabled={purchasing || restoring}
            activeOpacity={0.85}
          >
            {purchasing
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.ctaBtnText}>
                  {selectedPlan === 'annual' ? 'Start 7-Day Free Trial' : 'Subscribe Now'}
                </Text>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleRestore} disabled={restoring || purchasing} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>{restoring ? 'Restoring...' : 'Restore Purchases'}</Text>
        </TouchableOpacity>

        <Text style={styles.disclosure}>
          {selectedPlan === 'annual'
            ? `After your free trial, ${getPrice('annual')}/year will be charged. `
            : `${getPrice('monthly')}/month will be charged. `}
          Payment will be charged to your Apple ID account at confirmation of purchase. Your subscription automatically renews unless canceled at least 24 hours before the end of the current period. You can manage and cancel your subscriptions by going to your App Store account settings after purchase.
        </Text>

        <View style={styles.links}>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.linkSep}> · </Text>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={styles.link}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg },
  closeBtn: { alignSelf: 'flex-end', padding: spacing.sm, marginBottom: spacing.base },
  closeBtnText: { color: colors.textGhost, fontSize: 18 },
  headline: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 16,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.xl,
  },
  features: { gap: spacing.base, marginBottom: spacing.xl },
  feature: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  planRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  planCard: {
    flex: 1,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    minHeight: 120,
    justifyContent: 'center',
    gap: 4,
  },
  planCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(180,140,90,0.1)',
  },
  bestValueBadge: { color: colors.accent, fontSize: 8, letterSpacing: 2, marginBottom: 4 },
  planLabel: { color: colors.textSecondary, fontSize: 9, letterSpacing: 3 },
  planPrice: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 24,
    color: colors.textPrimary,
    marginTop: 4,
  },
  planTrial: { color: colors.accent, fontSize: 11, marginTop: 2 },
  planNote: { color: colors.textGhost, fontSize: 11 },
  errorText: { color: '#e05252', fontSize: 12, marginBottom: spacing.base, textAlign: 'center' },
  ctaBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  ctaBtnText: { color: '#000', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  restoreBtn: { alignItems: 'center', paddingVertical: spacing.base, marginBottom: spacing.xl },
  restoreText: { color: colors.textGhost, fontSize: 12, letterSpacing: 1 },
  disclosure: {
    color: colors.textGhost,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  link: { color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' },
  linkSep: { color: colors.textGhost, fontSize: 12, marginHorizontal: spacing.sm },
});
