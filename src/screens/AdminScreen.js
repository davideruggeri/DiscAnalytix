import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { hasPermission } from '../hooks/useUserRole';
import { useTheme } from '../context/ThemeContext';

const ROLES = ['viewer', 'player', 'editor', 'modder'];
const ROLE_LABELS = { viewer: '👁️ Viewer', player: '🏃 Player', editor: '🎬 Editor', modder: '🛡️ Modder' };
const ROLE_COLORS = { viewer: '#aaa', player: '#34C759', editor: '#0A84FF', modder: '#FF3B30' };

export default function AdminScreen() {
  const { colors, isDark } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    } catch (e) {
      window.alert(`Errore: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const changeRole = async (uid, newRole) => {
    if (uid === auth.currentUser?.uid) {
      return window.alert('Attenzione: Non puoi cambiare il tuo stesso ruolo.');
    }
    setUpdatingUid(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, role: newRole } : u))
      );
    } catch (e) {
      window.alert(`Errore: ${e.message}`);
    } finally {
      setUpdatingUid(null);
    }
  };

  const renderUser = ({ item }) => {
    const isMe = item.id === auth.currentUser?.uid;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, isMe && styles.cardMe]}>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.displayName || '(senza nome)'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
        </View>
        {updatingUid === item.id ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={styles.roleButtons}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleBtn,
                  { borderColor: ROLE_COLORS[r] },
                  item.role === r && { backgroundColor: ROLE_COLORS[r] },
                  isMe && styles.roleBtnDisabled,
                ]}
                onPress={() => !isMe && changeRole(item.id, r)}
                disabled={isMe}
              >
                <Text
                  style={[
                    styles.roleBtnText,
                    { color: item.role === r ? 'white' : ROLE_COLORS[r] },
                  ]}
                >
                  {ROLE_LABELS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>Nessun utente trovato</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

// ... styles aggiornati rimangono sotto ...

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  refreshBtn: { backgroundColor: '#0A84FF', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12 },
  refreshBtnText: { color: 'white', fontWeight: 'bold' },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },
  cardMe: { borderColor: '#0A84FF', borderWidth: 2 },
  userInfo: { marginBottom: 15 },
  userName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  userEmail: { fontSize: 13, color: '#888', marginTop: 2 },
  roleButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5 },
  roleBtnDisabled: { opacity: 0.3 },
  roleBtnText: { fontSize: 12, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#444', marginTop: 60, fontSize: 16 },
});
