import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CurrentPointStats({
  colors,
  pointRoster,
  teamPlayers,
  events,
  currentTime,
  metaStartTime,
  possessionSide,
  onReattach
}) {
  const activePlayers = teamPlayers.filter(p => pointRoster.includes(p.id));

  // Calcolo durata meta
  const duration = metaStartTime !== null ? Math.max(0, currentTime - metaStartTime) : 0;
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Prendi gli eventi della meta corrente
  const currentPointEvents = events.filter(e => metaStartTime !== null && e.time >= metaStartTime);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Meta in corso</Text>
          <Text style={[styles.timer, { color: colors.primary }]}>{formatTime(duration)}</Text>
        </View>
        <TouchableOpacity style={styles.reattachBtn} onPress={onReattach}>
          <Text style={styles.reattachText}>Riattacca Video</Text>
          <Text style={{ fontSize: 18 }}>📺</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ROSTER IN CAMPO</Text>
          <View style={styles.rosterGrid}>
            {activePlayers.map(p => (
              <View key={p.id} style={[styles.playerTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.playerNum, { color: colors.primary }]}>#{p.number}</Text>
                <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SEQUENZA AZIONI</Text>
          <ScrollView style={styles.eventList}>
            {currentPointEvents.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>
                In attesa di azioni...
              </Text>
            ) : (
              currentPointEvents.map((ev, idx) => (
                <View key={ev.id || idx} style={styles.eventItem}>
                  <Text style={[styles.eventTime, { color: colors.textSecondary }]}>{formatTime(ev.time)}</Text>
                  <Text style={[styles.eventLabel, { color: colors.text }]}>{ev.label}</Text>
                  {ev.playerName && <Text style={[styles.eventPlayer, { color: colors.primary }]}>{ev.playerName}</Text>}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={[styles.possessionBadge, { backgroundColor: possessionSide === 'O' ? '#4CAF50' : '#F44336' }]}>
          <Text style={styles.possessionText}>POSSESSO: {possessionSide === 'O' ? 'ATTACCO' : 'DIFESA'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timer: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  reattachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  reattachText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  rosterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  playerNum: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventList: {
    maxHeight: 150,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  eventTime: {
    fontSize: 11,
    fontFamily: 'monospace',
    width: 40,
  },
  eventLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  eventPlayer: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
  },
  possessionBadge: {
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  possessionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  }
});
