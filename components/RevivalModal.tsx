import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function RevivalModal({ visible, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);

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
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Reclaim your streak</Text>
          <Text style={styles.body}>Restore one missed day and keep your streak alive.</Text>
          <Text style={styles.price}>$0.99</Text>
          {loading ? (
            <ActivityIndicator color="rgba(180,140,90,0.9)" style={styles.spinner} />
          ) : (
            <>
              <TouchableOpacity style={styles.buyBtn} onPress={handleBuy}>
                <Text style={styles.buyTxt}>RESTORE MISSED DAY</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelTxt}>Not now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: { backgroundColor: '#141414', borderWidth: 1, borderColor: 'rgba(180,140,90,0.2)', borderRadius: 4, padding: 28, width: '100%' },
  title: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 10 },
  body: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  price: { color: 'rgba(180,140,90,0.9)', fontSize: 22, fontWeight: '300', marginBottom: 24 },
  spinner: { marginVertical: 16 },
  buyBtn: { borderWidth: 1, borderColor: 'rgba(180,140,90,0.4)', borderRadius: 2, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  buyTxt: { color: 'rgba(180,140,90,0.9)', fontSize: 11, letterSpacing: 2, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
});
