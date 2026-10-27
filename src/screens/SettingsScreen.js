import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../../firebaseConfig';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import useUserRole, { hasPermission } from '../hooks/useUserRole';

export default function SettingsScreen({ navigation }) {
  const { isDark, toggleTheme, colors } = useTheme();

  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingLoading, setSavingLoading] = useState(false);
  const { role } = useUserRole();

  const saveProfile = async () => {
    if (!user) return;
    setSavingLoading(true);
    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
        await updateDoc(doc(db, 'users', user.uid), { displayName });
        window.alert('Profilo aggiornato con successo!');
      }
    } catch (error) {
      console.error(error);
      window.alert('Errore: impossibile aggiornare il profilo');
    } finally {
      setSavingLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {user && !user.isAnonymous && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
          <Text style={[styles.label, { color: colors.text, marginBottom: 10 }]}>Profilo</Text>
          <Text style={[styles.subLabel, { color: colors.textSecondary, marginBottom: 10 }]}>Nome Visualizzato</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Il tuo nome"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={saveProfile}
            disabled={savingLoading}
          >
            {savingLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>Salva Nome</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View>
            <Text style={[styles.label, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
              Attiva o disattiva il tema scuro
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={isDark ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>
      </View>

      {hasPermission(role, 'editor') && (
        <>
          <TouchableOpacity 
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 20 }]}
            onPress={() => navigation.navigate('EventTypes')}
          >
            <View style={styles.row}>
              <View>
                <Text style={[styles.label, { color: colors.text }]}>🏷️ Gestione Eventi</Text>
                <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                  Configura i tipi di tag per l'analisi
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}
            onPress={() => navigation.navigate('Teams')}
          >
            <View style={styles.row}>
              <View>
                <Text style={[styles.label, { color: colors.text }]}>🛡️ Gestione Squadre</Text>
                <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                  Configura squadre e roster giocatori
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      <Text style={[styles.info, { color: colors.textSecondary }]}>
        Versione App: 1.2.0 (Premium)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 25 },
  section: {
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: { fontSize: 18, fontWeight: '700' },
  subLabel: { fontSize: 14, marginTop: 4 },
  info: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15
  },
  saveBtn: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  saveBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  }
});
