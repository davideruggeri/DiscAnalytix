import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, Alert, Image
} from 'react-native';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../../firebaseConfig';

export default function TeamsScreen() {
  const { colors } = useTheme();
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  // Players state
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingTeamId, setEditingTeamId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedTeam) {
      setPlayers([]);
      return;
    }
    const q = query(collection(db, `teams/${selectedTeam.id}/players`), orderBy('number', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedPlayers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlayers(fetchedPlayers);
      
      // Safe sync: avoids loops by checking realCount vs state
      const realCount = fetchedPlayers.length;
      if (selectedTeam && realCount !== (selectedTeam.playerCount || 0)) {
        setDoc(doc(db, 'teams', selectedTeam.id), { 
          playerCount: realCount 
        }, { merge: true });
      }
    });
    return unsub;
  }, [selectedTeam?.id]); // Only depend on ID to prevent count loops

  const handleSaveTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      if (editingTeamId) {
        await setDoc(doc(db, 'teams', editingTeamId), {
          name: newTeamName.trim(),
          updatedAt: new Date()
        }, { merge: true });
        setEditingTeamId(null);
      } else {
        await addDoc(collection(db, 'teams'), {
          name: newTeamName.trim(),
          createdAt: new Date(),
          author: auth.currentUser?.uid || 'anonymous'
        });
      }
      setNewTeamName('');
    } catch (e) {
      window.alert("Errore: " + e.message);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa squadra e tutti i suoi giocatori?")) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
      if (selectedTeam?.id === id) setSelectedTeam(null);
    } catch (e) {
      window.alert("Errore: " + e.message);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !selectedTeam) return;
    try {
      if (editingPlayerId) {
        await setDoc(doc(db, `teams/${selectedTeam.id}/players`, editingPlayerId), {
          name: newPlayerName.trim(),
          number: newPlayerNumber.trim(),
          updatedAt: new Date()
        }, { merge: true });
        setEditingPlayerId(null);
      } else {
        await addDoc(collection(db, `teams/${selectedTeam.id}/players`), {
          name: newPlayerName.trim(),
          number: newPlayerNumber.trim(),
          createdAt: new Date()
        });
        
        // Update player count in team document
        const teamRef = doc(db, 'teams', selectedTeam.id);
        const currentCount = selectedTeam.playerCount || 0;
        await setDoc(teamRef, { playerCount: currentCount + 1 }, { merge: true });
      }
      setNewPlayerName('');
      setNewPlayerNumber('');
    } catch (e) {
      window.alert("Errore: " + e.message);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm("Eliminare questo giocatore?")) return;
    try {
      await deleteDoc(doc(db, `teams/${selectedTeam.id}/players`, playerId));
      
      // Update player count in team document
      const teamRef = doc(db, 'teams', selectedTeam.id);
      const currentCount = selectedTeam.playerCount || 0;
      await setDoc(teamRef, { playerCount: Math.max(0, currentCount - 1) }, { merge: true });
    } catch (e) {
      window.alert("Errore: " + e.message);
    }
  };

  const renderTeamItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.teamCard, 
        { 
          backgroundColor: colors.card, 
          borderColor: selectedTeam?.id === item.id ? colors.primary : colors.border,
          borderWidth: selectedTeam?.id === item.id ? 2 : 1
        }
      ]}
      onPress={() => setSelectedTeam(item)}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.teamName, { color: colors.text }]}>
          {item.name} <Text style={{ color: colors.primary, fontSize: 12 }}>({item.playerCount || 0})</Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity 
          onPress={() => {
            setEditingTeamId(item.id);
            setNewTeamName(item.name);
          }} 
          style={styles.iconBtn}
        >
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteTeam(item.id)} style={styles.iconBtn}>
          <Text style={{ fontSize: 18 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderPlayerItem = ({ item }) => (
    <View style={[styles.playerRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.playerNumber, { color: colors.primary }]}>#{item.number || '--'}</Text>
      <Text style={[styles.playerName, { color: colors.text }]}>{item.name}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={() => {
          setEditingPlayerId(item.id);
          setNewPlayerName(item.name);
          setNewPlayerNumber(item.number || '');
        }}>
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeletePlayer(item.id)}>
          <Text style={{ fontSize: 16 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.mainLayout}>
        {/* Left Sidebar: Teams List */}
        <View style={styles.sidebar}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Squadre</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Nome Squadra"
              placeholderTextColor={colors.textSecondary}
              value={newTeamName}
              onChangeText={setNewTeamName}
            />
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: editingTeamId ? colors.accent : colors.primary }]} 
              onPress={handleSaveTeam}
            >
              <Text style={{ fontSize: 20, color: 'white' }}>{editingTeamId ? "✅" : "+"}</Text>
            </TouchableOpacity>
            {editingTeamId && (
              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} 
                onPress={() => {
                  setEditingTeamId(null);
                  setNewTeamName('');
                }}
              >
                <Text style={{ fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <FlatList
              data={teams}
              keyExtractor={item => item.id}
              renderItem={renderTeamItem}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Right Content: Players Management */}
        <View style={[styles.content, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {selectedTeam ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Roster: <Text style={{ color: colors.primary }}>{selectedTeam.name}</Text>
              </Text>
              
              <View style={styles.playerInputRow}>
                <TextInput
                  style={[styles.smallInput, { flex: 0.3, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Num"
                  placeholderTextColor={colors.textSecondary}
                  value={newPlayerNumber}
                  onChangeText={setNewPlayerNumber}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Nome Giocatore"
                  placeholderTextColor={colors.textSecondary}
                  value={newPlayerName}
                  onChangeText={setNewPlayerName}
                />
                <TouchableOpacity 
                  style={[styles.addBtn, { backgroundColor: editingPlayerId ? colors.accent : colors.primary }]} 
                  onPress={handleAddPlayer}
                >
                  <Text style={{ fontSize: 20, color: 'white' }}>{editingPlayerId ? "✅" : "👤+"}</Text>
                </TouchableOpacity>
                {editingPlayerId && (
                  <TouchableOpacity 
                    style={[styles.addBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} 
                    onPress={() => {
                      setEditingPlayerId(null);
                      setNewPlayerName('');
                      setNewPlayerNumber('');
                    }}
                  >
                    <Image source={require('../../assets/elimina.png')} style={{ width: 20, height: 20, tintColor: colors.text }} />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={players}
                keyExtractor={item => item.id}
                renderItem={renderPlayerItem}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 60, opacity: 0.3 }}>🛡️</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Seleziona una squadra per gestire il roster</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  mainLayout: { flexDirection: 'row', flex: 1, gap: 16 },
  sidebar: { width: '35%' },
  content: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15 },
  inputBox: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  playerInputRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  input: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, fontSize: 14 },
  smallInput: { padding: 12, borderRadius: 12, borderWidth: 1, fontSize: 14, textAlign: 'center' },
  addBtn: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  teamCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 16, 
    marginBottom: 8,
    borderWidth: 1
  },
  teamName: { fontSize: 15, fontWeight: '700' },
  iconBtn: { padding: 4 },
  playerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1,
    gap: 12
  },
  playerNumber: { fontSize: 14, fontWeight: '900', width: 40 },
  playerName: { flex: 1, fontSize: 16, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
