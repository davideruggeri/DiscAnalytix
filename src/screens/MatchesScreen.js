import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert
} from 'react-native';
import { doc, deleteDoc, collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import useUserRole, { hasPermission } from '../hooks/useUserRole';
import { useTheme } from '../context/ThemeContext';

export default function MatchesScreen({ navigation }) {
  const { role, loadingRole } = useUserRole();
  const { colors } = useTheme();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('addedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const selectMatch = (match) => {
    navigation.navigate('Analysis', { selectedVideoId: match.youtubeId || match.id });
  };

  const deleteMatch = async (matchId, title) => {
    const confirmed = window.confirm(`Vuoi eliminare "${title}"?`);
    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'matches', matchId));
      } catch (e) {
        window.alert(`Errore: ${e.message}`);
      }
    }
  };

  if (loading || loadingRole) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={(
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nessuna analisi salvata</Text>
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
              Carica un video dalla pagina principale per iniziare l'analisi
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => selectMatch(item)}
          >
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: colors.surface }]}>
                <Text style={styles.thumbnailPlaceholderText}>🎬</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title || item.youtubeId}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>ID: {item.youtubeId}</Text>
              {item.addedAt && (
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {new Date(item.addedAt.seconds * 1000).toLocaleDateString('it-IT')}
                </Text>
              )}
            </View>
            {hasPermission(role, 'editor') && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={(e) => { e.stopPropagation?.(); deleteMatch(item.id, item.title || item.youtubeId); }}
              >
                <Text style={styles.deleteBtnText}>🗑️</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  container: { flex: 1, backgroundColor: '#121212', padding: 15 },
  card: { 
    backgroundColor: '#1E1E1E', 
    borderRadius: 15, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    overflow: 'hidden', 
    elevation: 3,
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },
  thumbnail: { width: 130, height: 73, backgroundColor: '#000' },
  thumbnailPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  thumbnailPlaceholderText: { color: '#444', fontSize: 24 },
  info: { flex: 1, padding: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  meta: { fontSize: 11, color: '#888' },
  deleteBtn: { padding: 15 },
  deleteBtnText: { fontSize: 22 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, color: '#444', marginBottom: 10 },
  emptyHint: { fontSize: 13, color: '#333', textAlign: 'center', maxWidth: 300 },
});
