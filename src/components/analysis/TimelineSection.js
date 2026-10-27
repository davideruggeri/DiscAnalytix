import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

const formatTimecode = (seconds, fps = 30) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * fps);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
};

export default function TimelineSection({
  colors,
  GAPS,
  events,
  teamPlayers,
  expandedMetas,
  setExpandedMetas,
  seekTo,
  deleteEvent,
  onEditTime,
  role,
  hasPermission,
  currentPossession,
  fps = 30,
  onResetPoint
}) {
  // Group events into meta folders
  const buildGroups = () => {
    const groups = [];
    let currentEvents = [];
    let metaNumber = 1;
    let nextStartingPossession = currentPossession || 'O';

    events.forEach((ev) => {
      const isTimeoutEvent = ev.label === 'Time Out Inizio' || ev.label === 'Time Out Fine';
      const isBetweenPoints = currentEvents.length === 0; // nessun evento dal Pull precedente

      if (ev.label === 'Half Time' || ev.label === 'Fine Partita') {
        if (currentEvents.length > 0) {
          groups.push({ number: metaNumber++, events: [...currentEvents], possession: nextStartingPossession, breakType: null });
          currentEvents = [];
        }
        groups.push({ isSeparator: true, label: ev.label, time: ev.time, id: ev.id });
        if (ev.label === 'Half Time') {
          nextStartingPossession = currentPossession === 'O' ? 'D' : 'O';
        }
      } else if (isTimeoutEvent && isBetweenPoints) {
        // Time Out tra un punto e l'altro → separatore accoppiato
        if (ev.label === 'Time Out Inizio') {
          groups.push({ isSeparator: true, isTimeout: true, label: 'Time Out', startTime: ev.time, endTime: null, startId: ev.id, endId: null });
        } else {
          // Fine: aggiungo all'ultimo separatore timeout aperto
          const lastTimeout = [...groups].reverse().find(g => g.isSeparator && g.isTimeout && g.endTime === null);
          if (lastTimeout) {
            lastTimeout.endTime = ev.time;
            lastTimeout.endId = ev.id;
          } else {
            groups.push({ isSeparator: true, isTimeout: true, label: 'Time Out', startTime: null, endTime: ev.time, startId: null, endId: ev.id });
          }
        }
      } else {
        // Evento normale + Time Out dentro un punto → va nella cartella
        currentEvents.push(ev);
        if (ev.label === 'Meta' || ev.label === 'Meta subita' || ev.label === 'Break') {
          const isOurPoint = ev.label === 'Meta' || ev.label === 'Break';
          const startPossession = nextStartingPossession;
          let breakType = null;
          if (ev.label === 'Break' || (startPossession === 'D' && isOurPoint)) breakType = 'BREAK';
          else if (startPossession === 'O' && ev.label === 'Meta subita') breakType = 'BREAK_SUBITO';
          groups.push({ number: metaNumber++, events: [...currentEvents], possession: startPossession, breakType });
          nextStartingPossession = isOurPoint ? 'D' : 'O';
          currentEvents = [];
        }
      }
    });

    if (currentEvents.length > 0) {
      groups.push({ number: metaNumber, events: currentEvents, isOngoing: true, possession: nextStartingPossession });
    }
    return groups;
  };

  const groups = buildGroups();
  const ongoingGroup = groups.find(g => g.isOngoing);
  const completedGroups = groups.filter(g => !g.isOngoing);
  const displayGroups = ongoingGroup ? [ongoingGroup, ...completedGroups] : completedGroups;

  return (
    <View style={[styles.timelineSection, { paddingHorizontal: GAPS * 2, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 40, paddingTop: 20 }]}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Timeline Eventi</Text>
      {events.length === 0 ? (
        <Text style={[styles.emptyTimeline, { color: colors.textSecondary }]}>Nessun evento registrato per questo video</Text>
      ) : (
        <>
          {displayGroups.map((group, index) => {
            if (group.isSeparator) {
              // ── Time Out accoppiato (tra punti) ──────────────────────────
              if (group.isTimeout) {
                return (
                  <View
                    key={`to-${group.startId || group.endId || index}`}
                    style={[styles.timeoutSeparator, { borderColor: '#9C27B0', backgroundColor: '#9C27B015' }]}
                  >
                    <Text style={{ fontSize: 14 }}>⏸️</Text>
                    <Text style={[styles.timeoutLabel, { color: '#9C27B0' }]}>TIME OUT</Text>
                    <View style={styles.timeoutTimes}>
                      {group.startTime !== null && (
                        <TouchableOpacity onPress={() => seekTo(group.startTime)}>
                          <Text style={[styles.timeoutTime, { color: colors.primary }]}>{formatTimecode(group.startTime, fps)}</Text>
                        </TouchableOpacity>
                      )}
                      {group.endTime !== null && (
                        <>
                          <Text style={{ color: colors.textSecondary, fontSize: 11 }}> → </Text>
                          <TouchableOpacity onPress={() => seekTo(group.endTime)}>
                            <Text style={[styles.timeoutTime, { color: colors.primary }]}>{formatTimecode(group.endTime, fps)}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                    {hasPermission(role, 'editor') && (
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {group.startId && (
                          <TouchableOpacity onPress={() => deleteEvent(group.startId)} style={{ padding: 4 }}>
                            <Text style={{ fontSize: 13 }}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                        {group.endId && (
                          <TouchableOpacity onPress={() => deleteEvent(group.endId)} style={{ padding: 4 }}>
                            <Text style={{ fontSize: 13 }}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              }

              // ── Half Time / Fine Partita ──────────────────────────────────
              const isHalf = group.label === 'Half Time';
              return (
                <TouchableOpacity
                  key={`sep-${group.id || index}`}
                  style={[styles.separatorContainer, { borderColor: isHalf ? (colors.warning || '#FF9500') : colors.text }]}
                  onPress={() => seekTo(group.time)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.separatorText, { color: isHalf ? (colors.warning || '#FF9500') : colors.text }]}>
                    {group.label.toUpperCase()} — {formatTimecode(group.time, fps)}
                  </Text>
                  {hasPermission(role, 'editor') && (
                    <TouchableOpacity onPress={() => deleteEvent(group.id)} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 14 }}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            }

            const isExpanded = expandedMetas[group.number] !== undefined
              ? expandedMetas[group.number]
              : group.isOngoing;

            // Resolve roster for this group
            const rosterData = group.events.find(e => e.roster && Array.isArray(e.roster));
            const groupRosterIds = rosterData ? rosterData.roster : [];
            const groupRoster = groupRosterIds
              .map(id => teamPlayers.find(p => p.id === id))
              .filter(p => !!p && p.name);

            return (
              <View key={group.number} style={[styles.metaFolder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Folder Header */}
                <TouchableOpacity
                  style={[styles.metaHeader, { backgroundColor: colors.surface + '50' }]}
                  onPress={() => setExpandedMetas(prev => ({ ...prev, [group.number]: !isExpanded }))}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.possessionBadge,
                    {
                      backgroundColor: group.possession === 'O' ? colors.primary : colors.accent,
                      width: 32, height: 32, borderRadius: 8
                    }
                  ]}>
                    <Text style={[styles.possessionBadgeText, { color: 'white', fontSize: 14 }]}>
                      {group.possession}
                    </Text>
                  </View>
                  <Text style={[styles.metaHeaderText, { color: colors.text, flex: 1 }]}>
                    META {group.number}
                    {group.breakType === 'BREAK' ? <Text style={{ color: '#4CAF50' }}> [BREAK]</Text> : null}
                    {group.breakType === 'BREAK_SUBITO' ? <Text style={{ color: '#F44336' }}> [BREAK SUBITO]</Text> : null}
                    {group.isOngoing ? <Text style={{ color: colors.danger, fontSize: 10 }}> ● LIVE</Text> : null}
                  </Text>

                  {hasPermission(role, 'editor') && onResetPoint && (
                    <TouchableOpacity 
                      onPress={() => {
                        const firstEv = group.events[0];
                        onResetPoint(group.number, firstEv ? firstEv.time : null);
                      }}
                      style={{ padding: 8, marginRight: 8 }}
                    >
                      <Text style={{ fontSize: 16 }}>🔄</Text>
                    </TouchableOpacity>
                  )}
                  
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                  <>
                    {/* Roster Row */}
                    {groupRoster.length > 0 && (
                      <View style={[styles.metaRoster, { borderBottomColor: colors.border }]}>
                        <Text style={{ fontSize: 14 }}>👥</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {groupRoster.map(p => (
                            <View key={p.id} style={[styles.rosterMemberBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                              <Text style={[styles.rosterMemberText, { color: colors.text }]}>
                                {p.number ? `#${p.number} ` : ''}{p.name}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Events */}
                    <View style={styles.metaContent}>
                      {group.events.map((ev) => (
                        <View key={ev.id} style={styles.eventChipContainerMini}>
                          <TouchableOpacity
                            style={[styles.eventChipMini, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={() => seekTo(ev.time)}
                          >
                            <View style={[
                              styles.chipIndicator,
                              {
                                backgroundColor: (ev.label === 'Meta' || ev.label === 'Break') ? '#4CAF50'
                                  : ev.label === 'Meta subita' ? colors.danger
                                  // Handblock/Intercetto → sempre arancio (giocata difensiva)
                                  : (ev.label === 'Intercetto' || ev.label === 'Handblock') ? '#FF9800'
                                   // Qualsiasi errore (isTurnover) in O -> rosso, in D -> arancio (copre tutti i tipi di lancio)
                                   : ev.isTurnover
                                     ? (ev.possessionSide === 'O' ? colors.danger : '#FF9800')
                                  : (ev.label === 'Pull' && ev.possessionSide === 'D') ? '#FF9800'
                                  : ev.possessionSide === 'D' ? '#FF9800'
                                  : ev.possessionSide === 'O' ? '#2196F3'
                                  : ev.label === 'Half Time' ? colors.warning || '#FF9500'
                                  : ev.label === 'Fine Partita' ? '#000'
                                  : colors.accent,
                                height: '100%',
                                width: 4
                              }
                            ]} />
                            <View style={{ flex: 1, paddingLeft: 8 }}>
                              <Text style={[styles.chipLabelMini, { color: colors.text }]} numberOfLines={1}>
                                {ev.playerName ? `${ev.playerName}: ` : ''}{ev.label}{ev.duration ? ` (${Math.floor(ev.duration)}s)` : ''}
                              </Text>
                              <Text style={[styles.chipTimeMini, { color: colors.primary }]}>
                                {formatTimecode(ev.time, fps)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          {hasPermission(role, 'editor') && (
                            <View style={styles.chipActionsMini}>
                              <TouchableOpacity
                                style={[styles.miniActionBtn, { backgroundColor: colors.card }]}
                                onPress={() => onEditTime(ev)}
                              >
                                <Text style={{ fontSize: 9 }}>✏️</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.miniActionBtn, { backgroundColor: colors.card }]}
                                onPress={() => deleteEvent(ev.id)}
                              >
                                <Text style={{ fontSize: 9 }}>🗑️</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  timelineSection: { paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  emptyTimeline: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  separatorContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, marginVertical: 16,
    borderTopWidth: 2, borderBottomWidth: 2, gap: 10
  },
  separatorText: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  metaFolder: { marginBottom: 20, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  metaHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  metaHeaderText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  possessionBadge: {
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2
  },
  possessionBadgeText: { fontSize: 10, fontWeight: '900' },
  metaRoster: {
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center',
    gap: 10, borderBottomWidth: 1
  },
  rosterMemberBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, marginRight: 6
  },
  rosterMemberText: { fontSize: 10, fontWeight: '800' },
  metaContent: { padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  eventChipContainerMini: { width: 160, marginBottom: 8, marginRight: 8, position: 'relative' },
  eventChipMini: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, borderWidth: 1, height: 40, overflow: 'hidden'
  },
  chipIndicator: {},
  chipLabelMini: { fontSize: 11, fontWeight: '700' },
  chipTimeMini: { fontSize: 9, fontWeight: '500' },
  chipActionsMini: {
    position: 'absolute', top: -6, right: -6,
    flexDirection: 'row', gap: 4, zIndex: 10
  },
  miniActionBtn: {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#eee',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2
  },
  timeoutSeparator: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, paddingHorizontal: 12,
    marginVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderLeftWidth: 4,
    gap: 8
  },
  timeoutLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  timeoutTimes: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  timeoutTime: { fontSize: 11, fontWeight: '700' },
});
