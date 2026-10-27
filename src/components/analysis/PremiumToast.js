import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function PremiumToast({ toast, colors }) {
  if (!toast.visible) return null;

  const bgColor = toast.type === 'warning' ? colors.danger : colors.primary;
  const emoji = toast.type === 'warning' ? '⚠️' : 'ℹ️';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Text style={styles.text}>{toast.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    gap: 10,
    zIndex: 1000
  },
  text: { color: 'white', fontWeight: '700', fontSize: 14 }
});
