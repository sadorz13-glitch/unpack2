import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Mic, BookOpen, BarChart3, Star, Shield } from 'lucide-react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/iap';
import { track } from '../lib/analytics';
import { TERMS_URL, PRIVACY_POLICY_URL } from '../constants';
import { useTheme } from '../theme';
import { PillButton } from '../components/ui/PillButton';
import { IconButton } from '../components/ui/IconButton';
import { PricingCard } from '../components/ui/PricingCard';

type Props = {
  visible: boolean;
  source: 'vent' | 'weekly_wheel' | 'session' | 'deep_dive';
  onClose: () => void;
  onSubscribed: () => Promise<void>;
};

const BENEFITS = [
  { Icon: Mic,       label: 'Unlimited voice sessions' },
  { Icon: BookOpen,  label: 'Unlimited journal entries' },
  { Icon: BarChart3, label: 'Deep insight analytics' },
  { Icon: Star,      label: 'AI-powered synthesis' },
  { Icon: Shield,    label: 'Priority support' },
] as const;

export function PaywallScreen({ visible, source, onClose, onSubscribed }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = useTheme();

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
    // REVIEW: loadOfferings defined in component, not in deps
  }, [visible, source]);

  async function loadOfferings() {
    setLoading(true);
    try {
      const o = await getOfferings();
      const packages: PurchasesPackage[] = o?.current?.availablePackages ?? [];
      const annual = packages.find(p => p.packageType === 'ANNUAL') ?? null;
      const monthly = packages.find(p => p.packageType === 'MONTHLY') ?? null;
      setAnnualPkg(annual);
      setMonthlyPkg(monthly);
      if (__DEV__) {
        console.log('ANNUAL PKG FULL:', JSON.stringify(annual?.product, null, 2));
        console.log('MONTHLY PKG FULL:', JSON.stringify(monthly?.product, null, 2));
      }
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

  function getCtaLabel(): string {
    if (selectedPlan === 'annual' && annualPkg) return 'START FREE TRIAL';
    return 'CONTINUE';
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
    } catch (e) {
      if (!(e as { userCancelled?: boolean })?.userCancelled) setError('Purchase failed. Please try again.');
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

  const annualPrice = getPrice('annual');
  const monthlyPrice = getPrice('monthly');

  const trialDays = (() => {
    if (loading || !annualPkg) return null;
    const intro = annualPkg.product.introPrice;
    if (intro != null) {
      return intro.periodUnit === 'DAY' ? intro.periodNumberOfUnits : 7;
    }
    const introAlt = (annualPkg.product as unknown as Record<string, unknown>).introductoryPrice;
    if (introAlt != null) return 7;
    // Trial is configured in App Store Connect — RC App Store credentials not yet set up
    return 7;
  })();
  const trialBadgeText = trialDays ? `${trialDays} DAYS FREE` : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <ScrollView
        style={[styles.root, { backgroundColor: colors['bg-primary'] }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl,
            paddingHorizontal: 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: X close top-left only */}
        <View style={styles.topBar}>
          <IconButton
            icon={X}
            onPress={handleClose}
            accessibilityLabel="Close paywall"
          />
        </View>

        {/* Eyebrow label */}
        <Text
          style={[
            typography.labelCaps,
            { color: colors['text-tertiary'], textAlign: 'center', marginBottom: spacing.sm },
          ]}
        >
          INFINITE JOURNAL
        </Text>

        {/* h1 headline */}
        <Text
          style={[
            typography.h1,
            { color: colors['text-primary'], textAlign: 'center', marginBottom: spacing.md },
          ]}
        >
          Unlock the Infinite
        </Text>

        {/* Subtitle */}
        <Text
          style={[
            typography.body,
            {
              color: colors['text-secondary'],
              textAlign: 'center',
              marginBottom: spacing.xl,
            },
          ]}
        >
          Your stories deserve space. Unpack deeper, reflect further, and never lose a thought.
        </Text>

        {/* Benefits list */}
        <View style={[styles.benefitsList, { marginBottom: spacing.xl }]}>
          {BENEFITS.map(({ Icon, label }) => (
            <View key={label} style={styles.benefitRow}>
              <View
                style={[
                  styles.benefitIcon,
                  {
                    backgroundColor: colors['bg-surface'],
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Icon size={20} color={colors['text-primary']} strokeWidth={1.5} />
              </View>
              <Text style={[typography.body, { color: colors['text-primary'], flex: 1 }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Pricing cards */}
        <View style={[styles.pricingStack, { marginBottom: spacing.lg }]}>
          <PricingCard
            title="Annual"
            price={annualPrice}
            period="Billed annually"
            selected={selectedPlan === 'annual'}
            onPress={() => setSelectedPlan('annual')}
            savingsBadge="Save 58%"
            trialBadge={trialBadgeText ?? undefined}
            style={{ marginBottom: spacing.sm }}
          />
          <PricingCard
            title="Monthly"
            price={monthlyPrice}
            period="Billed monthly"
            selected={selectedPlan === 'monthly'}
            onPress={() => setSelectedPlan('monthly')}
          />
        </View>

        {/* Error message */}
        {error ? (
          <Text
            style={[
              typography.caption,
              { color: colors['status-danger'], textAlign: 'center', marginBottom: spacing.md },
            ]}
          >
            {error}
          </Text>
        ) : null}

        {/* CTA button */}
        {loading ? (
          <ActivityIndicator
            color={colors['accent-primary']}
            style={{ marginVertical: spacing.xl }}
          />
        ) : (
          <>
            <PillButton
              label={purchasing ? '...' : getCtaLabel()}
              onPress={handleSubscribe}
              disabled={purchasing || restoring}
              style={styles.ctaButton}
            />
            <Text
              style={[
                typography.caption,
                { color: colors['text-secondary'], textAlign: 'center', marginTop: 8 },
              ]}
            >
              {trialDays
                ? `${trialDays}-day free trial, then ${annualPrice}. Cancel anytime.`
                : `${annualPrice}. Cancel anytime.`}
            </Text>
          </>
        )}

        {/* Footer */}
        <Text
          style={[
            typography.caption,
            {
              color: colors['text-tertiary'],
              textAlign: 'center',
              marginTop: spacing.lg,
              marginBottom: spacing.md,
            },
          ]}
        >
          Subscriptions automatically renew unless cancelled 24 hours before the end of the trial or period.
        </Text>

        <View style={styles.footerLinks}>
          <TouchableOpacity
            onPress={handleRestore}
            disabled={restoring || purchasing}
            accessibilityLabel="Restore purchases"
          >
            <Text
              style={[
                typography.caption,
                { color: colors['text-tertiary'] },
              ]}
            >
              {restoring ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>

          <Text style={[typography.caption, { color: colors['text-tertiary'], marginHorizontal: spacing.sm }]}>
            |
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL(TERMS_URL)}
            accessibilityLabel="Terms of Service"
          >
            <Text style={[typography.caption, { color: colors['text-tertiary'] }]}>
              Terms
            </Text>
          </TouchableOpacity>

          <Text style={[typography.caption, { color: colors['text-tertiary'], marginHorizontal: spacing.sm }]}>
            |
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityLabel="Privacy Policy"
            accessibilityRole="link"
          >
            <Text style={[typography.caption, { color: colors['text-tertiary'] }]}>
              Privacy
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitsList: {
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingStack: {},
  ctaButton: {
    width: '100%',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
