import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, Platform, Modal, FlatList
} from 'react-native';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import useUserRole from '../hooks/useUserRole';

export default function DataAnalysisScreen({ navigation }) {
  const { isDark, colors } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { role, loadingRole } = useUserRole();

  // ── Filters State ───────────────────────────────────────
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  
  const [selectedMatch, setSelectedMatch] = useState({ id: 'all', title: 'Tutti i Match' });
  const [selectedTeam, setSelectedTeam] = useState({ id: 'all', name: 'Tutte le Squadre' });
  const [selectedPlayer, setSelectedPlayer] = useState({ id: 'all', name: 'Tutti i Giocatori' });

  // ── UI Control State ─────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(null); // 'match', 'team', 'player'
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState([]); 
  const [expandedPoints, setExpandedPoints] = useState({});
  const [stats, setStats] = useState({ total: 0, goals: 0, turnovers: 0, efficiency: 0 });

  // ── Load Initial Data ───────────────────────────────────
  useEffect(() => {
    const unsubMatches = onSnapshot(query(collection(db, 'matches'), orderBy('addedAt', 'desc')), (snap) => {
      setMatches([{ id: 'all', title: 'Tutti i Match' }, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
    });
    const unsubTeams = onSnapshot(query(collection(db, 'teams'), orderBy('name', 'asc')), (snap) => {
      setTeams([{ id: 'all', name: 'Tutte le Squadre' }, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
    });
    return () => { unsubMatches(); unsubTeams(); };
  }, []);

  useEffect(() => {
    if (selectedTeam.id === 'all') {
      setPlayers([]);
      setSelectedPlayer({ id: 'all', name: 'Tutti i Giocatori' });
      return;
    }
    const unsubPlayers = onSnapshot(query(collection(db, `teams/${selectedTeam.id}/players`), orderBy('number', 'asc')), (snap) => {
      setPlayers([{ id: 'all', name: 'Tutti i Giocatori' }, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
    });
    return unsubPlayers;
  }, [selectedTeam]);

  // ── Logic ───────────────────────────────────────────────
  const formatTime = (seconds, fps = 30) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * fps);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const runQuery = async () => {
    setLoading(true);
    try {
      let allEvents = [];
      if (selectedMatch.id !== 'all') {
        const q = query(collection(db, `matches/${selectedMatch.id}/events`), orderBy('time', 'asc'));
        const snap = await getDocs(q);
        // Recuperiamo l'fps del match se disponibile, altrimenti 30
        const mDoc = matches.find(m => m.id === selectedMatch.id);
        const matchFps = mDoc?.fps || 30;

        allEvents = snap.docs.map(d => ({ 
          id: d.id, 
          matchId: selectedMatch.id, 
          matchTitle: selectedMatch.title, 
          matchFps: matchFps,
          ...d.data() 
        }));
      } else {
        const activeMatches = matches.filter(m => m.id !== 'all').slice(0, 10);
        const matchPromises = activeMatches.map(async (m) => {
          const q = query(collection(db, `matches/${m.id}/events`), orderBy('time', 'asc'));
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ 
            id: d.id, 
            matchId: m.id, 
            matchTitle: m.title, 
            matchFps: m.fps || 30,
            ...d.data() 
          }));
        });
        const results = await Promise.all(matchPromises);
        allEvents = results.flat();
      }

      let filtered = allEvents;
      if (selectedTeam.id !== 'all') filtered = filtered.filter(e => e.teamId === selectedTeam.id);
      if (selectedPlayer.id !== 'all') filtered = filtered.filter(e => e.playerId === selectedPlayer.id);

      const groupedPoints = {};
      filtered.forEach(e => {
        const key = `${e.matchId}_meta_${e.metaNumber || 0}`;
        if (!groupedPoints[key]) {
          groupedPoints[key] = { id: key, matchTitle: e.matchTitle, matchId: e.matchId, metaNumber: e.metaNumber || 0, events: [], actions: [] };
        }
        groupedPoints[key].events.push(e);
      });

      Object.values(groupedPoints).forEach(p => {
        p.events.sort((a, b) => a.time - b.time);
        let processedActions = [];
        let lastThrowTypeForPoint = 'N/D';

        for (let i = 0; i < p.events.length; i++) {
          const current = p.events[i];
          const next = p.events[i + 1];
          const fps = current.matchFps || 30;

          if (current.label.includes('Lancio')) lastThrowTypeForPoint = current.throwType || 'N/D';

          if (current.label.includes('Ricezione') && next && next.label.includes('Lancio') && current.playerId === next.playerId) {
            // Risoluzione dinamica del tipo di ricezione se (N/D)
            let catchLabel = current.label;
            if (catchLabel.includes('(N/D)') && lastThrowTypeForPoint !== 'N/D') {
              catchLabel = `Ricezione (${lastThrowTypeForPoint})`;
            }

            processedActions.push({ 
              type: 'Sequence', 
              player: current.playerName, 
              playerId: current.playerId, 
              label: catchLabel + ' + ' + next.label, 
              details: `${formatTime(current.time, fps)} → ${formatTime(next.time, fps)}`, 
              time: current.time, 
              isTurnover: next.isTurnover,
              fps
            });
            i++;
          } else {
            let label = current.label;
            if (label.includes('Ricezione') && label.includes('(N/D)') && lastThrowTypeForPoint !== 'N/D') {
              label = `Ricezione (${lastThrowTypeForPoint})`;
            }

            processedActions.push({ 
              type: 'Single', 
              player: current.playerName || 'Team', 
              playerId: current.playerId, 
              label: label, 
              details: `@ ${formatTime(current.time, fps)}`, 
              time: current.time, 
              isTurnover: current.isTurnover,
              fps
            });
          }
        }
        p.actions = processedActions;
      });

      const finalPoints = Object.values(groupedPoints).sort((a, b) => {
        if (a.matchId !== b.matchId) return a.matchTitle.localeCompare(b.matchTitle);
        // Ordinamento numerico per metaNumber
        return (a.metaNumber || 0) - (b.metaNumber || 0);
      });

      setPoints(finalPoints);
      const goals = filtered.filter(e => e.label === 'Meta' || e.label === 'Break').length;
      const turnovers = filtered.filter(e => e.isTurnover).length;
      setStats({ total: filtered.length, goals, turnovers, efficiency: filtered.length > 0 ? Math.round(((filtered.length - turnovers) / filtered.length) * 100) : 0 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const rows = [];
    points.forEach(p => p.actions.forEach(a => rows.push([`"${p.matchTitle}"`, p.metaNumber, `"${a.player}"`, `"${a.label}"`, `"${a.details}"`, a.isTurnover ? 'SI' : 'NO'])));
    const csvContent = [['Match', 'Meta #', 'Giocatore', 'Azione', 'Dettagli', 'Turnover'], ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `Sequenze_${new Date().getTime()}.csv`; link.click();
  };

  const renderPickerModal = () => {
    let data = [], title = "", selectedId = "", onSelect = () => {};
    if (pickerVisible === 'match') { data = matches; title = "Seleziona Match"; selectedId = selectedMatch.id; onSelect = setSelectedMatch; }
    else if (pickerVisible === 'team') { data = teams; title = "Seleziona Squadra"; selectedId = selectedTeam.id; onSelect = setSelectedTeam; }
    else if (pickerVisible === 'player') { data = players; title = "Seleziona Giocatore"; selectedId = selectedPlayer.id; onSelect = setSelectedPlayer; }
    if (!pickerVisible) return null;
    return (
      <Modal visible={true} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setPickerVisible(null)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <FlatList data={data} keyExtractor={item => item.id} renderItem={({ item }) => (
              <TouchableOpacity style={[styles.pickerItem, { borderBottomColor: colors.border + '33' }]} onPress={() => { onSelect(item); setPickerVisible(null); }}>
                <Text style={[styles.pickerItemText, { color: colors.text, fontWeight: selectedId === item.id ? '800' : '500' }]}>{item.title || item.name}</Text>
                {selectedId === item.id && <Text>✅</Text>}
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <FilterBtn label="PARTITA" value={selectedMatch.title} onPress={() => setPickerVisible('match')} colors={colors} />
          <FilterBtn label="SQUADRA" value={selectedTeam.name} onPress={() => setPickerVisible('team')} colors={colors} />
          <FilterBtn label="GIOCATORE" value={selectedPlayer.name} onPress={() => setPickerVisible('player')} colors={colors} disabled={selectedTeam.id === 'all'} />
          <TouchableOpacity style={[styles.queryBtn, { backgroundColor: colors.primary }]} onPress={runQuery} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.queryBtnText}>ANALIZZA 📊</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsRow}><StatCard label="Eventi" value={stats.total} icon="🔍" colors={colors} /><StatCard label="Goal" value={stats.goals} icon="⚽" colors={colors} color="#4CAF50" /><StatCard label="Turnover" value={stats.turnovers} icon="⚠️" colors={colors} color="#FF9800" /><StatCard label="Efficienza" value={`${stats.efficiency}%`} icon="📈" colors={colors} color={colors.primary} /></View>
        <View style={styles.actionBar}><Text style={[styles.resultsCount, { color: colors.textSecondary }]}>{points.length} punti analizzati</Text><TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={exportCSV} disabled={points.length === 0}><Text style={[styles.exportBtnText, { color: colors.text }]}>📥 Esporta Sequenze</Text></TouchableOpacity></View>
        <View style={styles.accordionContainer}>
          {points.length === 0 ? <View style={styles.emptyState}><Text style={{ fontSize: 50, marginBottom: 16 }}>📈</Text><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Configura i filtri e premi Analizza</Text></View> :
            points.map(p => (
              <View key={p.id} style={[styles.pointCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.pointHeader} onPress={() => setExpandedPoints(prev => ({ ...prev, [p.id]: !prev[p.id] }))} activeOpacity={0.7}>
                  <View style={styles.pointTitleRow}><View style={[styles.metaBadge, { backgroundColor: colors.primary + '20' }]}><Text style={[styles.metaText, { color: colors.primary }]}>META {p.metaNumber}</Text></View><Text style={[styles.matchTitleSmall, { color: colors.textSecondary }]} numberOfLines={1}>{p.matchTitle}</Text></View>
                  <Text style={{ color: colors.textSecondary, fontSize: 18 }}>{expandedPoints[p.id] ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {expandedPoints[p.id] && (
                  <View style={[styles.pointDetails, { borderTopColor: colors.border + '33' }]}>
                    {p.actions.map((a, idx) => (
                      <View key={idx} style={[styles.actionRow, { borderBottomColor: colors.border + '22' }]}>
                        <View style={styles.actionMain}><Text style={[styles.actionPlayer, { color: colors.text }]}>{a.player}</Text><Text style={[styles.actionLabel, { color: a.isTurnover ? '#FF3B30' : (a.label.includes('Ricezione') ? colors.primary : colors.textSecondary) }]}>{a.label}</Text></View>
                        <View style={styles.actionRight}><Text style={[styles.actionTime, { color: colors.textSecondary }]}>{a.details}</Text><TouchableOpacity style={[styles.playBtn, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('Analysis', { selectedVideoId: p.matchId })}><Text style={{ fontSize: 12 }}>▶️</Text></TouchableOpacity></View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
        </View>
      </ScrollView>
      {renderPickerModal()}
    </View>
  );
}

function FilterBtn({ label, value, onPress, colors, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}>
      <Text style={[styles.filterBtnLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.filterBtnValueRow}><Text style={[styles.filterBtnValue, { color: colors.text }]} numberOfLines={1}>{value}</Text><Text style={{ fontSize: 10, color: colors.textSecondary }}>▼</Text></View>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, icon, colors, color }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>{icon}</Text>
      <Text style={[styles.statValue, { color: color || colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { paddingVertical: 16, borderBottomWidth: 1, zIndex: 100 },
  filterScroll: { paddingHorizontal: 20, gap: 12, alignItems: 'center' },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, minWidth: 140 },
  filterBtnLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 },
  filterBtnValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  filterBtnValue: { fontSize: 13, fontWeight: '700', flex: 1 },
  queryBtn: { height: 48, paddingHorizontal: 24, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  queryBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },
  scrollContent: { padding: 20, gap: 24 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsCount: { fontSize: 13, fontWeight: '600' },
  exportBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  exportBtnText: { fontSize: 13, fontWeight: '700' },
  accordionContainer: { gap: 12 },
  pointCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  pointHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  pointTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  metaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 12, fontWeight: '900' },
  matchTitleSmall: { fontSize: 12, fontWeight: '600', flex: 1 },
  pointDetails: { padding: 8, borderTopWidth: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1 },
  actionMain: { flex: 1 },
  actionPlayer: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  actionRight: { alignItems: 'flex-end', gap: 4 },
  actionTime: { fontSize: 11, fontWeight: '500' },
  playBtn: { padding: 8, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 320, maxHeight: '70%', borderRadius: 30, borderWidth: 1, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 15 },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600' }
});
