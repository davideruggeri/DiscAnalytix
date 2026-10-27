import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';

export default function MatchStats({ events, teamPlayers, colors, onUpdateStats, manualData, role, hasPermission }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    breakConvNum: '', breakConvDen: '', oCleanNum: '', oCleanDen: ''
  });

  // 1. Raggruppamento eventi per Punti (per calcolo automatico)
  const points = [];
  let currentPoint = [];
  events.forEach(ev => {
    currentPoint.push(ev);
    if (['Meta', 'Break', 'Meta subita', 'Half Time', 'Fine Partita'].includes(ev.label)) {
      points.push([...currentPoint]);
      currentPoint = [];
    }
  });

  // 2. Calcolo Statistiche Squadra (Automatiche)
  let totalMetas = 0; let totalMetasSubite = 0; let totalBreaks = 0; let totalDPoints = 0; let totalOPoints = 0; let totalCleanAttackMetas = 0;

  points.forEach((pList) => {
    const isGoalOur = pList.some(e => e.label === 'Meta' || e.label === 'Break');
    const isGoalOpp = pList.some(e => e.label === 'Meta subita');
    if (isGoalOur) totalMetas++;
    if (isGoalOpp) totalMetasSubite++;

    const isPointFinished = isGoalOur || isGoalOpp;
    const startedInD = pList[0]?.possessionSide === 'D';
    if (isPointFinished) {
      if (startedInD) { totalDPoints++; if (isGoalOur) totalBreaks++; }
      else { totalOPoints++; const ourError = pList.some(ev => ev.isTurnover && ev.possessionSide === 'O'); if (isGoalOur && !ourError) totalCleanAttackMetas++; }
    }
  });

  // Visualizziamo i dati manuali se presenti, altrimenti quelli automatici
  const displayScore = `${totalMetas} - ${totalMetasSubite}`;
  const dBrkNum = manualData?.manualStats ? manualData.breakConvNum : totalBreaks;
  const dBrkDen = manualData?.manualStats ? manualData.breakConvDen : totalDPoints;
  const dClnNum = manualData?.manualStats ? manualData.oCleanNum : totalCleanAttackMetas;
  const dClnDen = manualData?.manualStats ? manualData.oCleanDen : totalOPoints;

  const handleOpenEdit = () => {
    setEditData({
      breakConvNum: String(manualData?.breakConvNum ?? totalBreaks),
      breakConvDen: String(manualData?.breakConvDen ?? totalDPoints),
      oCleanNum: String(manualData?.oCleanNum ?? totalCleanAttackMetas),
      oCleanDen: String(manualData?.oCleanDen ?? totalOPoints)
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdateStats({
      breakConvNum: parseInt(editData.breakConvNum) || 0,
      breakConvDen: parseInt(editData.breakConvDen) || 0,
      oCleanNum: parseInt(editData.oCleanNum) || 0,
      oCleanDen: parseInt(editData.oCleanDen) || 0,
      // Manteniamo le percentuali per la Home, ma nel Recap mostriamo n/tot
      breakConv: parseInt(editData.breakConvDen) > 0 ? Math.round((parseInt(editData.breakConvNum) / parseInt(editData.breakConvDen)) * 100) : 0,
      oClean: parseInt(editData.oCleanDen) > 0 ? Math.round((parseInt(editData.oCleanNum) / parseInt(editData.oCleanDen)) * 100) : 0,
      manualStats: true
    });
    setIsEditing(false);
  };

  const handleReset = () => {
    onUpdateStats({ manualStats: false });
    setIsEditing(false);
  };

  // 3. Calcolo Statistiche Giocatori
  const stats = teamPlayers.map(player => {
    let played = 0, goals = 0, assists = 0;
    points.forEach(pList => {
      if (pList.some(e => e.roster && e.roster.includes(player.id))) played++;
      if (pList.some(e => (e.label === 'Meta' || e.label === 'Break') && e.playerId === player.id)) goals++;
      const ourMetaIdx = pList.findIndex(e => (e.label === 'Meta' || e.label === 'Break'));
      if (ourMetaIdx !== -1) {
        for (let i = ourMetaIdx - 1; i >= 0; i--) {
          const ev = pList[i];
          if (ev.label.includes('Lancio') && !ev.isTurnover) { if (ev.playerId === player.id) assists++; break; }
        }
      }
    });
    return { ...player, played, goals, assists };
  }).filter(p => p.played > 0).sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists));

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={{ fontSize: 20 }}>📊</Text>
        <Text style={[styles.title, { color: colors.text }]}>RECAP TECNICO {manualData?.manualStats ? '(M)' : ''}</Text>
        {hasPermission(role, 'editor') && (
          <TouchableOpacity onPress={handleOpenEdit} style={{ marginLeft: 'auto' }}>
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{displayScore}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Score</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{dBrkNum}/{dBrkDen}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Break Conv.</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: '#2196F3' }]}>{dClnNum}/{dClnDen}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Offence Clean</Text>
        </View>
      </View>

      <View style={styles.tableContainer}>
        {/* ... Tabella giocatori invariata ... */}
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.colName, { color: colors.textSecondary }]}>GIOCATORE</Text>
          <Text style={[styles.colNum, { color: colors.textSecondary }]}>P</Text>
          <Text style={[styles.colNum, { color: colors.textSecondary }]}>G</Text>
          <Text style={[styles.colNum, { color: colors.textSecondary }]}>A</Text>
        </View>
        {stats.map(p => (
          <View key={p.id} style={[styles.tableRow, { borderBottomColor: colors.border + '33' }]}>
            <Text style={[styles.cellName, { color: colors.text }]}>#{p.number} {p.name}</Text>
            <Text style={[styles.cellNum, { color: colors.text }]}>{p.played}</Text>
            <Text style={[styles.cellNum, { color: '#4CAF50', fontWeight: '800' }]}>{p.goals}</Text>
            <Text style={[styles.cellNum, { color: '#2196F3', fontWeight: '800' }]}>{p.assists}</Text>
          </View>
        ))}
      </View>

      {/* Modal Modifica Stats */}
      <Modal visible={isEditing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Correzione Dati</Text>

            <View style={styles.inputGrid}>
              <View style={styles.inputBoxFull}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Break Conversion </Text>
                <View style={styles.fractionRow}>
                  <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border }]} value={editData.breakConvNum} onChangeText={t => setEditData({ ...editData, breakConvNum: t })} keyboardType="numeric" />
                  <Text style={[styles.fractionSlash, { color: colors.text }]}> </Text>
                  <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border }]} value={editData.breakConvDen} onChangeText={t => setEditData({ ...editData, breakConvDen: t })} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.inputBoxFull}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Offence-Clean Hold </Text>
                <View style={styles.fractionRow}>
                  <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border }]} value={editData.oCleanNum} onChangeText={t => setEditData({ ...editData, oCleanNum: t })} keyboardType="numeric" />
                  <Text style={[styles.fractionSlash, { color: colors.text }]}> </Text>
                  <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border }]} value={editData.oCleanDen} onChangeText={t => setEditData({ ...editData, oCleanDen: t })} keyboardType="numeric" />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                <Text style={{ color: '#FF3B30', fontWeight: '900', fontSize: 12 }}>RIPRISTINA AUTOMATICO</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity onPress={() => setIsEditing(false)} style={[styles.btn, { backgroundColor: colors.surface }]}><Text style={{ color: colors.text, fontWeight: '800' }}>Annulla</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={[styles.btn, { backgroundColor: colors.primary }]}><Text style={{ color: 'white', fontWeight: '900' }}>Salva</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 30, borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  tableContainer: { width: '100%' },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1 },
  colName: { flex: 1, fontSize: 10, fontWeight: '900' },
  colNum: { width: 40, textAlign: 'center', fontSize: 10, fontWeight: '900' },
  cellName: { flex: 1, fontSize: 13, fontWeight: '700' },
  cellNum: { width: 40, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 340, padding: 24, borderRadius: 24, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  inputBox: { width: '47%' },
  inputBoxFull: { width: '100%' },
  inputLabel: { fontSize: 10, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  input: { height: 45, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: '700' },
  modalActions: { marginTop: 10, alignItems: 'center' },
  resetBtn: { padding: 10 },
  btn: { flex: 1, height: 50, width: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  btnText: { fontSize: 15, fontWeight: '800' }
});
