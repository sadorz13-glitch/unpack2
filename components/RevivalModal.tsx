import { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  date?: string;
};

function formatRevivalDate(date?: string): string {
  if (!date) return 'yesterday';
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    }).format(new Date(date + 'T12:00:00'));
  } catch {
    return 'yesterday';
  }
}

export default function RevivalModal({ visible, onClose, onConfirm, date }: Props) {
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors['overlay-scrim'],
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    card: {
      backgroundColor: colors['bg-surface'],
      borderWidth: 1,
      borderColor: colors['border-subtle'],
      borderRadius: 4,
      padding: 28,
      width: '100%',
    },
    title: {
      color: colors['text-primary'],
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 10,
    },
    body: {
      color: colors['text-secondary'],
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 16,
    },
    price: {
      color: colors['accent-gold'],
      fontSize: 22,
      fontWeight: '300',
      marginBottom: 24,
    },
    spinner: { marginVertical: 16 },
    buyBtn: {
      borderWidth: 1,
      borderColor: `${colors['accent-gold']}66`,
      borderRadius: 2,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    buyTxt: {
      color: colors['accent-gold'],
      fontSize: 11,
      letterSpacing: 2,
      fontWeight: '500',
    },
    cancelBtn: { alignItems: 'center', paddingVertical: 8 },
    cancelTxt: { color: colors['text-tertiary'], fontSize: 12 },
  }), [colors]);

  const handleBuy = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay} accessibilityViewIsModal={true}>
        <View style={styles.card}>
          <Text style={styles.title}>Reclaim {formatRevivalDate(date)}</Text>
          <Text style={styles.body}>Restore one missed day and keep your streak alive.</Text>
          <Text style={styles.price}>$0.99</Text>
          {loading ? (
            <ActivityIndicator color={colors['accent-gold']} style={styles.spinner} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.buyBtn}
                onPress={handleBuy}
                accessibilityLabel="Restore missed day"
                accessibilityRole="button"
              >
                <Text style={styles.buyTxt}>RESTORE MISSED DAY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                accessibilityLabel="Dismiss"
                accessibilityRole="button"
              >
                <Text style={styles.cancelTxt}>Not now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
