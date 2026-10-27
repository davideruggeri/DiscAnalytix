import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, FlatList } from 'react-native';

export default function ConfigSection({
  colors,
  isWideScreen,
  GAPS,
  allTeams,
  selectedTeam,
  setSelectedTeam,
  teamPlayers,
  surfaceType,
  setSurfaceType,
  pointRoster,
  setPointRoster,
  possessionSide,
  setPossessionSide,
  isConfigConfirmed,
  setIsConfigConfirmed,
  showToast,
  hasEvents,
  matchTitle,
  updateMatchTitle,
  fps,
  setFps,
  role,
  hasPermission
}) {
  const [isManualEditMode, setIsManualEditMode] = useState(false);
  const [isTeamPickerVisible, setIsTeamPickerVisible] = useState(false);
  
  const canEdit = hasPermission ? hasPermission(role, 'editor') : true;
  const isSettingsLocked = !canEdit || (isConfigConfirmed || (hasEvents && !isManualEditMode));

  return (
    <View style={[styles.container, { paddingHorizontal: isWideScreen ? 0 : GAPS, marginTop: GAPS }]}>
      <View style={styles.mainRow}>
        
        {/* Titolo Partita */}
        <View style={styles.titleContainer}>
          <TextInput
            style={[styles.titleInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, opacity: canEdit ? 1 : 0.6 }]}
            value={matchTitle}
            onChangeText={canEdit ? updateMatchTitle : undefined}
            editable={canEdit}
            placeholder="Titolo Partita"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Tasto Squadra */}
        <TouchableOpacity
          disabled={isSettingsLocked}
          style={[styles.configBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: isSettingsLocked ? 0.6 : 1 }]}
          onPress={() => setIsTeamPickerVisible(true)}
        >
          <Text style={{ fontSize: 16 }}>👥</Text>
          <Text style={[styles.btnText, { color: colors.text }]} numberOfLines={1}>
            {selectedTeam ? selectedTeam.name : 'Seleziona Squadra'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>▼</Text>
        </TouchableOpacity>

        {/* Superficie */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border, opacity: isSettingsLocked ? 0.6 : 1 }]} pointerEvents={isSettingsLocked ? 'none' : 'auto'}>
          <TouchableOpacity onPress={() => setSurfaceType('grass')} style={[styles.segmentBtn, surfaceType === 'grass' && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, { color: surfaceType === 'grass' ? 'white' : colors.textSecondary }]}>🌱</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSurfaceType('sand')} style={[styles.segmentBtn, surfaceType === 'sand' && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, { color: surfaceType === 'sand' ? 'white' : colors.textSecondary }]}>🏖️</Text>
          </TouchableOpacity>
        </View>

        {/* O / D */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border, opacity: isSettingsLocked ? 0.6 : 1 }]} pointerEvents={isSettingsLocked ? 'none' : 'auto'}>
          <TouchableOpacity onPress={() => setPossessionSide('O')} style={[styles.segmentBtn, possessionSide === 'O' && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, { color: possessionSide === 'O' ? 'white' : colors.textSecondary }]}>O</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPossessionSide('D')} style={[styles.segmentBtn, possessionSide === 'D' && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, { color: possessionSide === 'D' ? 'white' : colors.textSecondary }]}>D</Text>
          </TouchableOpacity>
        </View>

        {/* FPS */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border, opacity: isSettingsLocked ? 0.6 : 1 }]} pointerEvents={isSettingsLocked ? 'none' : 'auto'}>
          <TouchableOpacity onPress={() => setFps(25)} style={[styles.segmentBtn, fps === 25 && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, { color: fps === 25 ? 'white' : colors.textSecondary }]}>25</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFps(30)} style={[styles.segmentBtn, fps === 30 && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, { color: fps === 30 ? 'white' : colors.textSecondary }]}>30</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFps(60)} style={[styles.segmentBtn, fps === 60 && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, { color: fps === 60 ? 'white' : colors.textSecondary }]}>60</Text>
          </TouchableOpacity>
        </View>

        {/* Lucchetto Edit */}
        {hasEvents && canEdit && (
          <TouchableOpacity 
            onPress={() => setIsManualEditMode(!isManualEditMode)}
            style={[styles.lockBtn, { backgroundColor: isManualEditMode ? colors.primary + '20' : colors.surface, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 16 }}>{isManualEditMode ? '🔓' : '🔒'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Team Picker Modal */}
      <Modal visible={isTeamPickerVisible} transparent={true} animationType="fade" onRequestClose={() => setIsTeamPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsTeamPickerVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Seleziona Squadra</Text>
            <FlatList
              data={allTeams}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.teamItem, { borderBottomColor: colors.border + '33' }]}
                  onPress={() => { setSelectedTeam(item); setIsTeamPickerVisible(false); }}
                >
                  <Text style={[styles.teamItemText, { color: colors.text }]}>{item.name}</Text>
                  {selectedTeam?.id === item.id && <Text style={{ fontSize: 18 }}>✅</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  titleContainer: { flex: 1, minWidth: 150 },
  titleInput: { fontSize: 16, fontWeight: '900', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 44 },
  configBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, minWidth: 140 },
  btnText: { fontSize: 13, fontWeight: '800', flex: 1 },
  segmentedControl: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', height: 44, padding: 3 },
  segmentBtn: { paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10 },
  segmentText: { fontSize: 13, fontWeight: '800' },
  lockBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 300, maxHeight: '60%', borderRadius: 20, borderWidth: 1, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  teamItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  teamItemText: { fontSize: 15, fontWeight: '700' }
});
