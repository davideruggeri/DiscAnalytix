import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Keyboard } from 'react-native';

export default function PlayerActionModal({ 
  visible, 
  onClose, 
  player, 
  possessionSide, 
  onActionSelect,
  colors,
  lastEvent,
  tagShortcuts = {},
  shortcuts = {},
  customTags = []
}) {
  const SYSTEM_TAGS_MAP = {
    'Ricezione': '🤲', 'Lancio': '🥏', 'Meta': '🏆',
    'Stall Out': '⏱️', 'Handblock': '🖐️', 'Intercetto': '⚡',
    'Dump': '↩️', 'Avanzamento': '➡️', 'Sparo': '🚀', 'Buco': '🎯', 'Reset': '🔄'
  };

  const [step, setStep] = useState('main'); 
  const [pendingAction, setPendingAction] = useState(null);

  // Estraiamo le azioni custom dai shortcuts
  const customActions = Object.entries(shortcuts).reduce((acc, [key, tags]) => {
    const tagList = Array.isArray(tags) ? tags : [tags];
    tagList.forEach(t => {
      // Nota: Qui non abbiamo la categoria nel shortcut, 
      // ma possiamo dedurla o passarla. Per ora usiamo i label.
      // Se il label è presente in shortcuts, lo consideriamo disponibile.
    });
    return acc;
  }, {});

  // Funzione per trovare azioni per categoria
  const getActionsByStep = (targetStep) => {
    const base = {
      main_O: ['Ricezione', 'Lancio'],
      main_D: ['Stall Out', 'Handblock', 'Intercetto'],
      throw_type: ['Dump', 'Avanzamento', 'Sparo', 'Buco', 'Reset']
    };
    
    let actions = base[targetStep] || [];

    // Aggiungiamo le azioni custom filtrate per categoria
    if (Array.isArray(customTags)) {
      let catFilter = '';
      if (targetStep === 'main_O') catFilter = 'Giocatore';
      if (targetStep === 'main_D') catFilter = 'Difesa';
      if (targetStep === 'throw_type') catFilter = 'Attacco';

      const matchedCustom = customTags
        .filter(t => t.cat === catFilter)
        .map(t => t.label);
        
      // Evitiamo duplicati con le azioni base
      const uniqueCustom = matchedCustom.filter(c => !actions.includes(c));
      actions = [...actions, ...uniqueCustom];
    }
    
    return actions;
  };

  useEffect(() => {
    if (visible) {
      setStep('main');
      setPendingAction(null);
    }
  }, [visible]);

  // Gestione scorciatoie da tastiera nel modal
  useEffect(() => {
    if (!visible) return;

    const handleModalKeys = (e) => {
      const key = e.key.toUpperCase();
      const code = e.code;
      
      // Traduzione flessibile: Numpad1 -> 1, ecc.
      let num = key;
      if (code.startsWith('Numpad') && code !== 'NumpadEnter') {
        num = code.replace('Numpad', '');
      }

      if (key === 'ESCAPE' || key === 'ESC') { 
        e.preventDefault();
        e.stopPropagation();
        onClose(); 
        return; 
      }

      if (step === 'main') {
        const side = possessionSide === 'O' ? 'main_O' : 'main_D';
        const actions = getActionsByStep(side);
        const idx = parseInt(num) - 1;
        if (idx >= 0 && idx < actions.length) {
          handleMainAction(actions[idx]);
        }
      } else if (step === 'throw_type') {
        const types = getActionsByStep('throw_type');
        const idx = parseInt(num) - 1;
        if (idx >= 0 && idx < types.length) {
          setPendingAction({ type: types[idx] });
          setStep('throw_outcome');
        }
      } else if (step === 'throw_outcome') {
        if (num === '1') onActionSelect({ label: `Lancio ${pendingAction.type}`, result: 'Completato', throwType: pendingAction.type });
        if (num === '2') onActionSelect({ label: `Lancio ${pendingAction.type}`, result: 'Errore', turnover: true, throwType: pendingAction.type });
      } else if (step === 'catch_outcome') {
        const isPullCatch = lastEvent?.label === 'Pull';
        const throwType = lastEvent?.throwType || (isPullCatch ? 'PULL' : 'N/D');
        if (num === '1') onActionSelect({ label: `Ricezione (${throwType})`, result: 'Completato' });
        if (num === '2') onActionSelect({ label: `Ricezione (${throwType})`, result: 'Drop', turnover: true });
        if (num === '3') onActionSelect({ label: 'META', result: 'Punto', isScore: true });
      }
    };

    window.addEventListener('keydown', handleModalKeys);
    return () => window.removeEventListener('keydown', handleModalKeys);
  }, [visible, step, possessionSide, pendingAction, lastEvent]);

  if (!player) return null;

  const handleMainAction = (actionLabel) => {
    if (actionLabel === 'Lancio') setStep('throw_type');
    else if (actionLabel === 'Ricezione') setStep('catch_outcome');
    else onActionSelect({ label: actionLabel, turnover: true });
  };

  const renderMain = () => {
    const side = possessionSide === 'O' ? 'main_O' : 'main_D';
    const actions = getActionsByStep(side);
    return (
      <View style={styles.grid}>
        {actions.map((label, i) => {
          const emoji = SYSTEM_TAGS_MAP[label] || (customTags.find(ct => ct.label === label)?.emoji || '🏷️');
          const color = label === 'Ricezione' ? '#4CAF50' : (label === 'Lancio' ? '#2196F3' : (label === 'Meta' ? '#FFD700' : colors.primary));
          return (
            <TouchableOpacity key={label} style={[styles.actionBtn, { borderColor: color }]} onPress={() => handleMainAction(label)}>
              <Text style={styles.keyBadge}>{i + 1}</Text>
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderThrowType = () => (
    <View style={styles.grid}>
      {getActionsByStep('throw_type').map((type, i) => (
        <TouchableOpacity key={type} style={[styles.actionBtn, { borderColor: colors.primary }]} onPress={() => { setPendingAction({ type }); setStep('throw_outcome'); }}>
          <Text style={styles.keyBadge}>{i + 1}</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>{type}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderThrowOutcome = () => (
    <View style={styles.grid}>
      <TouchableOpacity style={[styles.actionBtn, { borderColor: '#4CAF50' }]} onPress={() => onActionSelect({ label: `Lancio ${pendingAction.type}`, result: 'Completato', throwType: pendingAction.type })}>
        <Text style={styles.keyBadge}>1</Text>
        <Text style={[styles.actionLabel, { color: colors.text }]}>Completato</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, { borderColor: '#F44336' }]} onPress={() => onActionSelect({ label: `Lancio ${pendingAction.type}`, result: 'Errore', turnover: true, throwType: pendingAction.type })}>
        <Text style={styles.keyBadge}>2</Text>
        <Text style={[styles.actionLabel, { color: colors.text }]}>Errore (TO)</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCatchOutcome = () => {
    const isPullCatch = lastEvent?.label === 'Pull';
    const throwType = lastEvent?.throwType || (isPullCatch ? 'PULL' : 'N/D');
    return (
      <View style={styles.grid}>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#4CAF50' }]} onPress={() => onActionSelect({ label: `Ricezione (${throwType})`, result: 'Completato' })}>
          <Text style={styles.keyBadge}>1</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Preso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#F44336' }]} onPress={() => onActionSelect({ label: `Ricezione (${throwType})`, result: 'Drop', turnover: true })}>
          <Text style={styles.keyBadge}>2</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Drop (TO)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FFD700' }]} onPress={() => onActionSelect({ label: 'META', result: 'Punto', isScore: true })}>
          <Text style={styles.keyBadge}>3</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>🏆 META</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.playerNumber, { color: colors.primary }]}>#{player.number} • {player.name}</Text>
              <Text style={[styles.playerName, { color: colors.text }]}>
                {step === 'main' && (possessionSide === 'O' ? 'Cosa ha fatto?' : 'Azione Difensiva?')}
                {step === 'throw_type' && 'Che tipo di lancio?'}
                {step === 'throw_outcome' && 'Com\'è andato il lancio?'}
                {step === 'catch_outcome' && 'Com\'è andata la ricezione?'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 22, color: colors.textSecondary }}>✕</Text></TouchableOpacity>
          </View>
          {step === 'main' && renderMain()}
          {step === 'throw_type' && renderThrowType()}
          {step === 'throw_outcome' && renderThrowOutcome()}
          {step === 'catch_outcome' && renderCatchOutcome()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  content: { width: 400, borderRadius: 24, borderWidth: 1, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  playerNumber: { fontSize: 10, fontWeight: '900', opacity: 0.6 },
  playerName: { fontSize: 20, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flex: 1, minWidth: '45%', minHeight: 90, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  actionLabel: { fontSize: 13, fontWeight: '800' },
  keyBadge: { position: 'absolute', top: 5, left: 8, fontSize: 10, fontWeight: '900', opacity: 0.4 }
});
