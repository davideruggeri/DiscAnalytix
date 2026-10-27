import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, ScrollView, Modal
} from 'react-native';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import KeyboardMapper from '../components/KeyboardMapper';

export default function EventTypesScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [shortcutsMap, setShortcutsMap] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  const EMOJI_LIST = ['🏷️', '⭐', '🔥', '🎯', '🚀', '⚡', '🤲', '🥏', '🏆', '🔄', '⚠️', '🚫', '⏱️', '⏸️', '🏥', '🏁', '🔚', '👤', '🛡️', '⚔️', '🏐', '👟', '💨', '🛑', '📈', '📉', '📢', '💡', '🧪', '🧬'];

  // Lista COMPLETA di tutte le azioni possibili nel sistema
  const SYSTEM_TAGS = [
    // Azioni Globali (QWERTY)
    { label: 'Pull', name: 'Pull [Globale]', emoji: '🥏', cat: 'Global', possession: 'Always', desc: 'Inizio Punto' },
    { label: 'Turnover', name: 'Turnover [Globale]', emoji: '🔄', cat: 'Global', possession: 'Always', isTurnover: true },
    { label: 'Meta subita', name: 'Meta Subita [Globale]', emoji: '❌', cat: 'Global', possession: 'Always', isTurnover: true },
    { label: 'Stall Out', name: 'Stall Out [Globale]', emoji: '⏱️', cat: 'Global', possession: 'D', isTurnover: true },
    { label: 'Time Out', name: 'Time Out [Globale]', emoji: '⏸️', cat: 'Global', possession: 'Always', stopsTimer: true },
    { label: 'Injury', name: 'Infortunio [Globale]', emoji: '🏥', cat: 'Global', possession: 'Always', stopsTimer: true },
    
    // Slot Giocatori (Fino a 7 per Grass)
    { label: 'Slot_1', name: 'Giocatore 1 (Slot)', emoji: '👤', cat: 'Roster' },
    { label: 'Slot_2', name: 'Giocatore 2 (Slot)', emoji: '👤', cat: 'Roster' },
    { label: 'Slot_3', name: 'Giocatore 3 (Slot)', emoji: '👤', cat: 'Roster' },
    { label: 'Slot_4', name: 'Giocatore 4 (Slot)', emoji: '👤', cat: 'Roster' },
    { label: 'Slot_5', name: 'Giocatore 5 (Slot)', emoji: '👤', cat: 'Roster' },
    { label: 'Slot_6', name: 'Giocatore 6 (Slot)', emoji: '👤', cat: 'Roster' },
    { label: 'Slot_7', name: 'Giocatore 7 (Slot)', emoji: '👤', cat: 'Roster' },
 
    // Azioni Pop-up
    { label: 'Ricezione', name: 'Ricezione', emoji: '🤲', cat: 'Giocatore' },
    { label: 'Lancio', name: 'Lancio', emoji: '🥏', cat: 'Giocatore' },
    { label: 'Meta', name: 'META (Punto)', emoji: '🏆', cat: 'Giocatore', isTurnover: true, desc: 'Fine Punto' },
    { label: 'Preso', name: 'Ricezione: Preso', emoji: '✅', cat: 'Giocatore' },
    { label: 'Drop', name: 'Ricezione: Drop', emoji: '❌', cat: 'Giocatore', isTurnover: true },
    { label: 'Completato', name: 'Lancio: Completato', emoji: '🎯', cat: 'Giocatore' },
    { label: 'Errore', name: 'Lancio: Errore', emoji: '⚠️', cat: 'Giocatore', isTurnover: true },

    // Tipologie Lancio (Step 3)
    { label: 'Dump', name: 'Lancio: Dump', emoji: '↩️', cat: 'Attacco' },
    { label: 'Avanzamento', name: 'Lancio: Avanzamento', emoji: '➡️', cat: 'Attacco' },
    { label: 'Sparo', name: 'Lancio: Sparo', emoji: '🚀', cat: 'Attacco' },
    { label: 'Buco', name: 'Lancio: Buco', emoji: '🎯', cat: 'Attacco' },
    { label: 'Reset', name: 'Lancio: Reset', emoji: '🔄', cat: 'Attacco' },

    { label: 'Handblock', name: 'Handblock [Difesa]', emoji: '🖐️', cat: 'Difesa', isTurnover: true },
    { label: 'Intercetto', name: 'Intercetto [Difesa]', emoji: '⚡', cat: 'Difesa', isTurnover: true },
    { label: 'Stall Out D', name: 'Stall Out [Difesa]', emoji: '⏱️', cat: 'Difesa', isTurnover: true },
  ];

  const [customTags, setCustomTags] = useState([]);
  const [newCustomTag, setNewCustomTag] = useState({ 
    name: '', 
    emoji: '🏷️', 
    cat: 'Giocatore',
    possession: 'Always',
    isTurnover: false,
    stopsTimer: false
  });
  const [customModalStep, setCustomModalStep] = useState(0); // 0: Name, 1: Type, 2: Details
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mappingTag, setMappingTag] = useState(null); // Tag che stiamo mappando

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'keyboardShortcuts'), (docSnap) => {
      if (docSnap.exists()) setShortcutsMap(docSnap.data());
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'customTags'), (docSnap) => {
      if (docSnap.exists()) setCustomTags(docSnap.data().tags || []);
    });
  }, []);

  const handleKeyClick = (key) => {
    if (mappingTag) {
      // Se siamo in modalità "Mappa Tag", assegniamo il tag al tasto cliccato
      assignShortcut(mappingTag, key);
      setMappingTag(null);
    } else {
      setSelectedKey(key);
      setModalVisible(true);
    }
  };

  const assignShortcut = async (tagLabel, targetKey = selectedKey) => {
    if (!targetKey) return;
    try {
      const currentTags = shortcutsMap[targetKey] || [];
      const newTags = Array.isArray(currentTags) ? [...currentTags] : [currentTags];

      if (!newTags.includes(tagLabel)) {
        newTags.push(tagLabel);
      } else {
        // Se già presente, lo rimuoviamo (toggle)
        const idx = newTags.indexOf(tagLabel);
        newTags.splice(idx, 1);
      }

      const updated = { ...shortcutsMap, [targetKey]: newTags };
      setShortcutsMap(updated);
      await setDoc(doc(db, 'settings', 'keyboardShortcuts'), updated);
    } catch (e) { window.alert("Errore: " + e.message); }
    setModalVisible(false);
  };

  const removeShortcut = async (keyToRemove) => {
    const key = keyToRemove || selectedKey;
    if (!key) return;
    try {
      const newMap = { ...shortcutsMap };
      delete newMap[key];
      await setDoc(doc(db, 'settings', 'keyboardShortcuts'), newMap);
    } catch (e) { console.error(e); }
    setModalVisible(false);
  };

  const categories = ['Global', 'Roster', 'Giocatore', 'Attacco', 'Difesa'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>MAPPATURA TASTIERA INTERATTIVA</Text>
            </View>
            <KeyboardMapper shortcuts={shortcutsMap} onKeyClick={handleKeyClick} colors={colors} />
            {mappingTag && (
              <View style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 12, marginTop: 10, alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: 'white' }}>
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>
                  👉 CLICCA UN TASTO SULLA TASTIERA SOPRA PER ASSEGNARE: {mappingTag.toUpperCase()}
                </Text>
                <TouchableOpacity onPress={() => setMappingTag(null)} style={{ marginTop: 5 }}>
                  <Text style={{ color: 'white', fontSize: 10, textDecorationLine: 'underline', opacity: 0.8 }}>Annulla mappatura</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' }} />
              <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: 'bold' }}>SINCRONIZZATO IN TEMPO REALE CON ANALISI</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AZIONI PERSONALIZZATE</Text>
            <TouchableOpacity 
              onPress={() => {
                setNewCustomTag({ name: '', emoji: '🏷️', cat: 'Giocatore', possession: 'Always', isTurnover: false, stopsTimer: false });
                setIsEditMode(false);
                setCustomModalStep(0);
                setIsCustomModalVisible(true);
              }}
              style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}
            >
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>+ CREA NUOVA AZIONE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RIEPILOGO AZIONI E TASTI</Text>
            {categories.map(cat => (
              <View key={cat} style={styles.catGroup}>
                <Text style={[styles.catTitle, { color: colors.primary }]}>{cat.toUpperCase()}</Text>
                {[...SYSTEM_TAGS, ...customTags].filter(t => t.cat === cat).map(tag => {
                  const assignedKeys = Object.entries(shortcutsMap)
                    .filter(([k, v]) => Array.isArray(v) ? v.includes(tag.label) : v === tag.label)
                    .map(([k]) => k);
                  
                  const isCustom = customTags.some(ct => ct.label === tag.label);

                  return (
                    <View key={tag.label} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 20, marginRight: 12 }}>{tag.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13 }}>{tag.name}</Text>
                            {tag.desc && <Text style={{ fontSize: 10, color: colors.primary, fontWeight: 'bold' }}>• {tag.desc.toUpperCase()}</Text>}
                            {tag.isTurnover && <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 'bold' }}>🔄 TURNOVER</Text>}
                            {tag.stopsTimer && <Text style={{ fontSize: 10, color: '#FFC107', fontWeight: 'bold' }}>⏹️ STOP TIMER</Text>}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {assignedKeys.length > 0 ? (
                              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>TASTI: {assignedKeys.join(', ')}</Text>
                            ) : (
                              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Nessun tasto</Text>
                            )}
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>•</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 10, fontStyle: 'italic' }}>
                              {tag.cat === 'Global' ? `Fase: ${tag.possession === 'Always' ? 'Tutte' : tag.possession}` : `Modal: ${tag.cat}`}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {isCustom && (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity 
                              onPress={() => {
                                setNewCustomTag({ ...tag, name: tag.label });
                                setIsEditMode(true);
                                setCustomModalStep(0);
                                setIsCustomModalVisible(true);
                              }}
                              style={{ padding: 8, backgroundColor: colors.primary + '10', borderRadius: 10 }}
                            >
                              <Text style={{ fontSize: 14 }}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={async () => {
                                if (confirm("Eliminare questa azione?")) {
                                  const updatedTags = customTags.filter(ct => ct.label !== tag.label);
                                  setCustomTags(updatedTags);
                                  await setDoc(doc(db, 'settings', 'customTags'), { tags: updatedTags });
                                }
                              }}
                              style={{ padding: 8, backgroundColor: colors.danger + '15', borderRadius: 10 }}
                            >
                              <Text style={{ fontSize: 14 }}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        
                        <TouchableOpacity 
                          onPress={() => { setMappingTag(tag.label); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: mappingTag === tag.label ? colors.primary : (colors.primary + '15'), borderRadius: 10, justifyContent: 'center' }}
                        >
                          <Text style={{ color: mappingTag === tag.label ? 'white' : colors.primary, fontWeight: '900', fontSize: 10 }}>
                            {mappingTag === tag.label ? 'IN ATTESA TASTO...' : 'MAPPA'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Assegna a tasto: {selectedKey}</Text>
            <ScrollView style={{ maxHeight: 450 }}>
              {[...SYSTEM_TAGS, ...customTags].map(t => {
                const isSelected = shortcutsMap[selectedKey] && (Array.isArray(shortcutsMap[selectedKey]) ? shortcutsMap[selectedKey].includes(t.label) : shortcutsMap[selectedKey] === t.label);
                return (
                  <TouchableOpacity 
                    key={t.label} 
                    style={[styles.modalItem, { borderColor: colors.border, backgroundColor: isSelected ? (colors.primary + '20') : 'transparent' }]} 
                    onPress={() => assignShortcut(t.label)}
                  >
                    <Text style={{ fontSize: 16, marginRight: 10 }}>{t.emoji}</Text>
                    <Text style={{ color: isSelected ? colors.primary : colors.text, fontSize: 13, fontWeight: isSelected ? '800' : 'normal' }}>{t.name}</Text>
                    {isSelected && <Text style={{ marginLeft: 'auto', color: colors.primary }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.danger }]} onPress={() => removeShortcut()}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Rimuovi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Annulla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Creazione Azione Custom */}
      <Modal visible={isCustomModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 360, backgroundColor: colors.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>
                {isEditMode ? "Modifica Azione" : (
                  customModalStep === 0 ? "Nome Azione" : 
                  customModalStep === 1 ? "Tipo di Evento" : 
                  (newCustomTag.cat === 'Global' ? "Configura Globale" : "Configura Modal")
                )}
              </Text>
              <TouchableOpacity onPress={() => { setIsCustomModalVisible(false); setIsEditMode(false); }}>
                <Text style={{ fontSize: 20, color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {customModalStep === 0 && (
              <View>
                <View style={{ backgroundColor: colors.background, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, marginBottom: 20 }}>
                  <input 
                    autoFocus
                    style={{ height: 60, background: 'transparent', border: 'none', color: colors.text, width: '100%', outline: 'none', fontSize: 18, fontWeight: '700' }}
                    placeholder="es. 'Buco'..."
                    value={newCustomTag.name}
                    onChange={(e) => setNewCustomTag(prev => ({ ...prev, name: e.target.value }))}
                  />
                </View>

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 10 }}>SCEGLI UN'ICONA</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, maxHeight: 150, overflow: 'auto' }}>
                  {EMOJI_LIST.map(emoji => (
                    <TouchableOpacity 
                      key={emoji}
                      onPress={() => setNewCustomTag(prev => ({ ...prev, emoji }))}
                      style={{ 
                        width: 46, 
                        height: 46, 
                        backgroundColor: newCustomTag.emoji === emoji ? colors.primary + '20' : colors.surface, 
                        borderRadius: 12, 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        borderWidth: 1, 
                        borderColor: newCustomTag.emoji === emoji ? colors.primary : colors.border 
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity 
                  style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 15, alignItems: 'center', opacity: newCustomTag.name ? 1 : 0.5 }}
                  onPress={() => newCustomTag.name && setCustomModalStep(1)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>AVANTI</Text>
                </TouchableOpacity>
              </View>
            )}

            {customModalStep === 1 && (
              <View style={{ gap: 10 }}>
                <TouchableOpacity 
                  onPress={() => { setNewCustomTag(prev => ({ ...prev, cat: 'Global' })); setCustomModalStep(2); }}
                  style={{ padding: 20, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>🌍 GLOBALE</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Sempre accessibile dalla schermata principale</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => { setNewCustomTag(prev => ({ ...prev, cat: 'Giocatore' })); setCustomModalStep(2); }}
                  style={{ padding: 20, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>👤 GIOCATORE / MODAL</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Compare solo quando selezioni un giocatore</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCustomModalStep(0)} style={{ marginTop: 10, alignSelf: 'center' }}>
                  <Text style={{ color: colors.textSecondary }}>Indietro</Text>
                </TouchableOpacity>
              </View>
            )}

            {customModalStep === 2 && (
              <View>
                {newCustomTag.cat === 'Global' ? (
                  <View style={{ gap: 15 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>CHI PUÒ FARLO?</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {['Always', 'O', 'D'].map(p => (
                        <TouchableOpacity 
                          key={p} 
                          onPress={() => setNewCustomTag(prev => ({ ...prev, possession: p }))}
                          style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: newCustomTag.possession === p ? colors.primary : colors.border, backgroundColor: newCustomTag.possession === p ? colors.primary + '10' : colors.background, alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: newCustomTag.possession === p ? colors.primary : colors.textSecondary }}>{p === 'Always' ? 'Sempre' : p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity 
                        onPress={() => setNewCustomTag(prev => ({ ...prev, isTurnover: !prev.isTurnover }))}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: newCustomTag.isTurnover ? colors.danger + '10' : colors.background, borderRadius: 12, borderWidth: 1, borderColor: newCustomTag.isTurnover ? colors.danger : colors.border }}
                      >
                        <Text style={{ fontSize: 20 }}>{newCustomTag.isTurnover ? '🔴' : '⚪'}</Text>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>Turnover Automatico</Text>
                          <Text style={{ fontSize: 10, color: colors.textSecondary }}>Cambia possesso quando premuto</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setNewCustomTag(prev => ({ ...prev, stopsTimer: !prev.stopsTimer }))}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: newCustomTag.stopsTimer ? '#FFC10720' : colors.background, borderRadius: 12, borderWidth: 1, borderColor: newCustomTag.stopsTimer ? '#FFC107' : colors.border }}
                      >
                        <Text style={{ fontSize: 20 }}>{newCustomTag.stopsTimer ? '⏹️' : '⚪'}</Text>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>Ferma Cronometro</Text>
                          <Text style={{ fontSize: 10, color: colors.textSecondary }}>Avvia un Time Out automatico</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>QUANDO DEVE COMPARIRE?</Text>
                    {[
                      { id: 'Giocatore', label: '👤 Step 1: Scelta Azione', desc: 'Insieme a Ricezione/Lancio' },
                      { id: 'Attacco', label: '🥏 Step 3: Tipo Lancio', desc: 'Dopo aver scelto "Lancio"' },
                      { id: 'Difesa', label: '🛡️ Difesa', desc: 'Durante la fase di D' }
                    ].map(c => (
                      <TouchableOpacity 
                        key={c.id} 
                        onPress={() => setNewCustomTag(prev => ({ ...prev, cat: c.id }))}
                        style={{ padding: 15, backgroundColor: newCustomTag.cat === c.id ? colors.primary + '10' : colors.surface, borderRadius: 12, borderWidth: 1, borderColor: newCustomTag.cat === c.id ? colors.primary : colors.border }}
                      >
                        <Text style={{ fontWeight: 'bold', color: newCustomTag.cat === c.id ? colors.primary : colors.text }}>{c.label}</Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{c.desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity 
                  style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 20 }}
                  onPress={async () => {
                    let finalName = newCustomTag.name;
                    if (newCustomTag.cat === 'Global' && !finalName.includes('[Globale]')) {
                      finalName += ' [Globale]';
                    }
                    const tag = { ...newCustomTag, name: finalName, label: finalName };
                    let updatedTags;
                    if (isEditMode) {
                      // Se siamo in edit, cerchiamo per la vecchia label se il nome è cambiato (ma qui usiamo label come ID)
                      updatedTags = customTags.map(ct => ct.label === newCustomTag.label ? tag : ct);
                    } else {
                      updatedTags = [...customTags, tag];
                    }
                    setCustomTags(updatedTags);
                    await setDoc(doc(db, 'settings', 'customTags'), { tags: updatedTags });
                    setIsCustomModalVisible(false);
                    setIsEditMode(false);
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>{isEditMode ? "SALVA MODIFICHE" : "CONFERMA E SALVA"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCustomModalStep(1)} style={{ marginTop: 10, alignSelf: 'center' }}>
                  <Text style={{ color: colors.textSecondary }}>Indietro</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15 },
  catGroup: { marginBottom: 20 },
  catTitle: { fontSize: 12, fontWeight: '900', marginBottom: 10, opacity: 0.8 },
  card: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 10, 
    borderRadius: 12, 
    borderWidth: 1,
    marginBottom: 6
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700' },
  keyContainer: { flexDirection: 'row', gap: 4 },
  keyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, minWidth: 20, alignItems: 'center' },
  keyText: { color: 'white', fontSize: 9, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 420, borderRadius: 24, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, justifyContent: 'center' },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }
});
