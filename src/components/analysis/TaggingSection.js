import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function TaggingSection({
  colors,
  isWideScreen,
  GAPS,
  isConfigConfirmed,
  handleTag,
  possessionSide,
  isTimeoutActive,
  handleInjury,
  role,
  hasPermission,
  onResetPoint,
  onFinishMeta
}) {
  if (!hasPermission || !hasPermission(role, 'editor')) return null;
  
  // Azioni dinamiche basate sul possesso
  const gameActions = [
    { label: 'Pull', emoji: '🥏', color: colors.primary, showIn: ['O', 'D'], key: 'Q' },
    { label: 'Meta subita', emoji: '❌', color: colors.danger, showIn: ['D'], key: 'E' },
    { label: 'Turnover', emoji: '🔄', color: '#FF9800', showIn: ['D'], key: 'W' },
    { label: 'Stall Out', emoji: '⏱️', color: '#FF5722', showIn: ['O'], key: 'Y' },
    { label: 'Time Out', emoji: isTimeoutActive ? '▶️' : '⏸️', color: '#9C27B0', showIn: ['O', 'D'], key: 'R' },
    { label: 'Injury', emoji: '🏥', color: '#E91E63', showIn: ['O', 'D'], key: 'T' },
  ];

  // Controlli globali del match
  const matchControls = [
    { label: 'Half Time', emoji: '⏳', color: colors.textSecondary, action: () => handleTag('Half Time') },
    { label: 'Fine Partita', emoji: '🏁', color: colors.textSecondary, action: () => handleTag('Fine Partita') },
  ];

  const visibleActions = gameActions.filter(tag => tag.showIn.includes(possessionSide));

  return (
    <View style={[styles.taggingSection, { paddingHorizontal: isWideScreen ? 0 : GAPS, marginTop: 24 }]}>
      {/* Sezione Azioni */}
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
        Azioni {possessionSide === 'O' ? 'Attacco' : 'Difesa'}
      </Text>
      <View style={styles.tagGrid}>
        {visibleActions.map((tag) => (
          <TouchableOpacity
            key={tag.label}
            style={[styles.tagButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              if (tag.label === 'Injury') handleInjury();
              else if (tag.label === 'Time Out') handleTag(isTimeoutActive ? 'Time Out Fine' : 'Time Out Inizio');
              else handleTag(tag.label);
            }}
          >
            <View style={[styles.keyBadge, { backgroundColor: colors.border }]}>
              <Text style={[styles.keyText, { color: colors.text }]}>{tag.key}</Text>
            </View>
            <Text style={styles.tagEmoji}>{tag.emoji}</Text>
            <Text style={[styles.tagLabel, { color: colors.text }]}>{tag.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sezione Controllo Match */}
      <View style={[styles.matchControls, { borderTopWidth: 1, borderTopColor: colors.border + '33' }]}>
        {matchControls.map((control) => (
          <TouchableOpacity
            key={control.label}
            style={[styles.controlButton, { backgroundColor: colors.surface + '80', borderColor: control.color || colors.border }]}
            onPress={control.action}
          >
            <Text style={styles.controlEmoji}>{control.emoji}</Text>
            <Text style={[styles.controlLabel, { color: control.color || colors.textSecondary }]}>{control.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  taggingSection: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  tagGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
    marginBottom: 20
  },
  tagButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: 85,
    height: 75,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative'
  },
  tagLabel: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  tagEmoji: { fontSize: 20 },
  keyBadge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, opacity: 0.6 },
  keyText: { fontSize: 8, fontWeight: '900' },
  
  matchControls: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 12,
    borderWidth: 1
  },
  controlEmoji: { fontSize: 16 },
  controlLabel: { fontSize: 11, fontWeight: '700' }
});
