import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';

// Converte i secondi totali in formato HH:MM:SS:FF
const formatTimecode = (seconds, fps) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * fps);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
};

// Converte una stringa HH:MM:SS:FF in secondi totali
const parseTimecode = (str, fps) => {
  const parts = str.split(':').map(n => parseInt(n, 10) || 0);
  if (parts.length === 4) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2] + (parts[3] / fps);
  } else if (parts.length === 3) {
    // Se l'utente digita MM:SS:FF
    return (parts[0] * 60) + parts[1] + (parts[2] / fps);
  } else if (parts.length === 2) {
    // Se l'utente digita SS:FF
    return parts[0] + (parts[1] / fps);
  }
  // Fallback se scrive un numero normale
  return parseFloat(str.replace(',', '.')) || 0;
};

export default function EditTimeModal({ visible, event, onClose, onSave, colors, fps = 30 }) {
  const [timeStr, setTimeStr] = useState(event ? formatTimecode(event.time, fps) : '00:00:00:00');

  useEffect(() => {
    if (visible && event) {
      setTimeStr(formatTimecode(event.time, fps));
    }
  }, [visible, event, fps]);

  const handleAdjust = (offsetSeconds) => {
    const currentSecs = parseTimecode(timeStr, fps);
    const newSecs = Math.max(0, currentSecs + offsetSeconds);
    setTimeStr(formatTimecode(newSecs, fps));
  };

  const handleSave = () => {
    const newTime = parseTimecode(timeStr, fps);
    onSave(event.id, newTime);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Sincronizzazione Evento</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{event?.playerName ? `${event.playerName}: ` : ''}{event?.label}</Text>
          
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => handleAdjust(-1)} style={[styles.adjBtn, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>-1s</Text>
            </TouchableOpacity>
            
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={timeStr}
              onChangeText={setTimeStr}
              keyboardType="default"
              selectTextOnFocus
            />

            <TouchableOpacity onPress={() => handleAdjust(1)} style={[styles.adjBtn, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>+1s</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.btnSave, { backgroundColor: colors.primary }]}>
              <Text style={{ color: 'white', fontWeight: '900' }}>SALVA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 24, borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 30 },
  input: { flex: 1, minWidth: 0, height: 50, borderRadius: 12, borderWidth: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  adjBtn: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, width: 60, alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  btnCancel: { padding: 12 },
  btnSave: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }
});
