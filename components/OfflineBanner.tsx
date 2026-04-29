import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function OfflineBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet — journal saves will sync when you're back online</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(220,80,40,0.15)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(220,80,40,0.3)',
  },
  text: {
    color: 'rgba(255,150,100,0.9)',
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
