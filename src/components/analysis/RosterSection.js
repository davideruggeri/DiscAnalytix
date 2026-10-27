import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';

export default function RosterSection({
  colors,
  isWideScreen,
  GAPS,
  isConfigConfirmed,
  setIsConfigConfirmed,
  selectedTeam,
  teamPlayers,
  pointRoster,
  togglePlayerInRoster,
  activePlayer,
  setActivePlayer,
  maxPlayers,
  tagShortcuts = {},
  role,
  hasPermission,
  onConfirmRoster
}) {
  if (!selectedTeam) return null;
  const canEdit = hasPermission ? hasPermission(role, 'editor') : true;

  const displayedPlayers = isConfigConfirmed
    ? teamPlayers.filter(p => pointRoster.includes(p.id))
    : teamPlayers;

  const RosterGrid = (
    <View style={isConfigConfirmed ? styles.horizontalGrid : styles.rosterGrid}>
      {displayedPlayers
        .sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0))
        .map((player, index) => {
          const isSelected = pointRoster.includes(player.id);
          const isActive = activePlayer === player.id;
          const slotIndex = index + 1;

          return (
            <TouchableOpacity
              key={player.id}
              style={[
                styles.playerCard,
                {
                  backgroundColor: isActive ? colors.primary : (isSelected ? colors.surface : colors.background),
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isActive ? 2 : 1,
                  paddingVertical: isConfigConfirmed ? 12 : 8,
                  width: isConfigConfirmed ? 90 : '23.5%',
                  marginRight: isConfigConfirmed ? 8 : 0,
                  marginBottom: isConfigConfirmed ? 0 : 8,
                  position: 'relative'
                }
              ]}
              onPress={() => {
                if (!canEdit) return;
                if (isConfigConfirmed) {
                  setActivePlayer(player.id);
                } else {
                  togglePlayerInRoster(player.id);
                }
              }}
            >
              {isSelected && tagShortcuts[`Slot_${slotIndex}`] && (
                <View style={[styles.shortcutBadge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>
                    {tagShortcuts[`Slot_${slotIndex}`]}
                  </Text>
                </View>
              )}
              <Text style={[
                styles.playerNumber,
                { color: isActive || isSelected ? colors.text : colors.textSecondary }
              ]}>
                {player.number ? `#${player.number}` : '—'}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.playerName,
                  { color: isActive ? 'white' : colors.text, fontSize: isConfigConfirmed ? 12 : 11 }
                ]}
              >
                {player.name}
              </Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );

  return (
    <View style={[styles.rosterSection, { paddingHorizontal: isWideScreen ? 0 : GAPS, marginTop: 24 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
          {isConfigConfirmed 
            ? `In Campo (${pointRoster.length})` 
            : `Seleziona Roster (${pointRoster.length}/${maxPlayers}) - Necessari ${maxPlayers} per confermare (ENTER)`}
        </Text>
        {!isConfigConfirmed && pointRoster.length === maxPlayers && (
          <TouchableOpacity 
            onPress={onConfirmRoster}
            style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          >
            <Text style={{ fontSize: 11, color: 'white', fontWeight: '900' }}>CONFERMA ROSTER</Text>
          </TouchableOpacity>
        )}
        {isConfigConfirmed && canEdit && (
          <TouchableOpacity onPress={() => setIsConfigConfirmed(false)}>
            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>CAMBI / SETUP</Text>
          </TouchableOpacity>
        )}
      </View>

      {isConfigConfirmed ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 10 }}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {RosterGrid}
        </ScrollView>
      ) : (
        RosterGrid
      )}

      {isConfigConfirmed && activePlayer && (
        <View style={[styles.activePlayerBanner, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
          <Text style={[styles.activePlayerText, { color: colors.primary }]}>
            Tag per: <Text style={{ fontWeight: '900' }}>
              {teamPlayers.find(p => p.id === activePlayer)?.name}
            </Text>
          </Text>
          <TouchableOpacity onPress={() => setActivePlayer(null)}>
            <Text style={{ fontSize: 18, color: colors.primary }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rosterSection: { marginBottom: 8 },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  rosterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' },
  horizontalGrid: { flexDirection: 'row', alignItems: 'center' },
  playerCard: {
    paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center'
  },
  playerNumber: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  playerName: { fontWeight: '700' },
  activePlayerBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, marginTop: 8
  },
  activePlayerText: { fontSize: 13 },
  shortcutBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 16,
    alignItems: 'center'
  },
  shortcutText: {
    fontSize: 8,
    fontWeight: '900'
  }
});
