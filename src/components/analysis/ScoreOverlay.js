import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const formatTimer = (seconds) => {
  if (seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function ScoreOverlay({ events, colors, currentTime, metaStartTime }) {
  const metaCount = events.filter(e => e.label === 'Meta' || e.label === 'Break').length;
  const metaSubitaCount = events.filter(e => e.label === 'Meta subita').length;

  const showTimer = metaStartTime !== null;
  const duration = showTimer ? Math.max(0, currentTime - metaStartTime) : 0;

  return (
    <View 
      pointerEvents="none"
      style={[styles.container, { backgroundColor: colors.card + 'CC', borderColor: colors.border }]}
    >
      <View style={styles.scoreContainer}>
        <Text style={[styles.text, { color: colors.primary }]}>{metaCount}</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.text, { color: colors.danger }]}>{metaSubitaCount}</Text>
      </View>

      {showTimer && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border, height: 20, marginHorizontal: 4 }]} />
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: colors.text }]}>{formatTimer(duration)}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 10
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  text: { fontSize: 16, fontWeight: '900' },
  timerText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  divider: { width: 1, height: 14, opacity: 0.3 },
  timerContainer: {
    paddingLeft: 4
  }
});
