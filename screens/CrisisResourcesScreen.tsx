import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { X } from 'lucide-react-native';
import { IconButton } from '../components/ui/IconButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  onClose: () => void;
};

type CrisisEntry = {
  country: string;
  org: string;
  display: string;
  url: string;
  isWeb?: boolean;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const CRISIS_LINES: CrisisEntry[] = [
  {
    country: 'United States',
    org: '988 Suicide and Crisis Lifeline',
    display: 'Call or text: 988',
    url: 'tel:988',
  },
  {
    country: 'United Kingdom',
    org: 'Samaritans',
    display: '116 123',
    url: 'tel:116123',
  },
  {
    country: 'Netherlands',
    org: '113 Zelfmoordpreventie',
    display: '0800 0113 / 113',
    url: 'tel:08000113',
  },
  {
    country: 'Germany',
    org: 'Telefonseelsorge',
    display: '0800 111 0 111',
    url: 'tel:08001110111',
  },
  {
    country: 'France',
    org: 'National Prevention Hotline',
    display: '3114',
    url: 'tel:3114',
  },
  {
    country: 'Australia',
    org: 'Lifeline',
    display: '13 11 14',
    url: 'tel:131114',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CrisisRow({ entry }: { entry: CrisisEntry }) {
  const { colors, typography } = useTheme();

  function handlePress() {
    Linking.openURL(entry.url).catch(() => {});
  }

  const label = entry.isWeb
    ? `Open ${entry.org}`
    : `Call ${entry.org}`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.crisisRow}
    >
      <Text style={[typography.labelCaps, { color: colors['text-tertiary'], marginBottom: 2 }]}>
        {entry.country}
      </Text>
      <Text style={[typography.body, { color: colors['text-primary'] }]}>
        {entry.org}
      </Text>
      <Text style={[typography.body, { color: colors['text-secondary'] }]}>
        {entry.display}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function CrisisResourcesScreen({ onClose }: Props) {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  function handleFindMore() {
    Linking.openURL('https://findahelpline.com/').catch(() => {});
  }

  return (
    <View style={[styles.container, { backgroundColor: colors['bg-primary'] }]}>
      <IconButton
        icon={X}
        onPress={onClose}
        accessibilityLabel="Close"
        style={{ ...styles.closeBtn, top: insets.top + 8 }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.lg, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Heading */}
        <Text
          style={[
            typography.h2,
            { color: colors['text-primary'], marginBottom: spacing.md },
          ]}
        >
          If you're in crisis
        </Text>

        {/* Disclaimer */}
        <Text
          style={[
            typography.body,
            { color: colors['text-secondary'], marginBottom: spacing.xl },
          ]}
        >
          Unpack is a journaling tool, not a substitute for professional mental
          health care. If you're in crisis or need immediate support, please
          reach out to one of the resources below.
        </Text>

        {/* Crisis rows */}
        {CRISIS_LINES.map(entry => (
          <React.Fragment key={entry.org}>
            <CrisisRow entry={entry} />
            <View style={[styles.rowDivider, { backgroundColor: colors['border-subtle'] }]} />
          </React.Fragment>
        ))}

        {/* Find help in another country */}
        <TouchableOpacity
          onPress={handleFindMore}
          accessibilityRole="button"
          accessibilityLabel="Open Find a Helpline"
          style={styles.crisisRow}
        >
          <Text style={[typography.labelCaps, { color: colors['text-tertiary'], marginBottom: 2 }]}>
            Other Countries
          </Text>
          <Text style={[typography.body, { color: colors['text-primary'] }]}>
            Find help in another country
          </Text>
          <Text style={[typography.body, { color: colors['text-secondary'] }]}>
            findahelpline.com
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={[styles.rowDivider, { backgroundColor: colors['border-subtle'] }]} />
        <Text
          style={[
            typography.body,
            {
              color: colors['text-tertiary'],
              marginTop: spacing.xl,
              textAlign: 'center',
            },
          ]}
        >
          In an emergency, contact your local emergency services (US: 911,
          Europe: 112).
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: 8,
    width: 44,
    height: 44,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  crisisRow: {
    paddingVertical: 14,
    minHeight: 44,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
