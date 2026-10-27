import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, Platform, StatusBar, useWindowDimensions
} from 'react-native';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

import { auth, logout, db } from '../../firebaseConfig';
import useUserRole, { hasPermission } from '../hooks/useUserRole';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive Constants
const MAX_CONTENT_WIDTH = 1100;
const GAPS = Math.min(SCREEN_WIDTH * 0.05, 24);
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.42, 280);
const RADIUS = 24;

const ROLE_LABELS = { viewer: '👁️ Viewer', player: '🏃 Player', editor: '🎬 Editor', modder: '🛡️ Modder' };

function extractVideoId(input) {
  if (!input) return '';
  const clean = input.trim();
  if (clean.length === 11 && !clean.includes('/') && !clean.includes('?')) return clean;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const match = clean.match(re);
    if (match) return match[1];
  }
  return clean;
}

export default function MainScreen({ navigation }) {
  const user = auth.currentUser;
  const { width: windowWidth } = useWindowDimensions();
  const emptyCardWidth = Math.max(0, Math.min(windowWidth, MAX_CONTENT_WIDTH) - (GAPS * 2));

  const { role, loadingRole } = useUserRole();
  const { isDark, colors } = useTheme();
  const [inputVideoId, setInputVideoId] = useState('');
  const [recentMatches, setRecentMatches] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const scrollRef = useRef(null);
  const [scrollX, setScrollX] = useState(0);

  const handleScroll = (event) => {
    setScrollX(event.nativeEvent.contentOffset.x);
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const step = CARD_WIDTH + 16;
      const newX = direction === 'left' ? scrollX - step : scrollX + step;
      scrollRef.current.scrollTo({ x: Math.max(0, newX), animated: true });
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('addedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecentMatches(matches);
    });
    return unsub;
  }, []);

  const startAnalysis = (id) => {
    const cleanId = extractVideoId(id);
    if (!cleanId || cleanId.length !== 11) {
      window.alert("⚠️ Link YouTube non valido o non riconosciuto!");
      return;
    }
    navigation.navigate('Analysis', { selectedVideoId: cleanId });
    setInputVideoId('');
  };

  if (loadingRole) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerCentered}>

          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoSmall}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerCenterAbsolute} pointerEvents="none">
            <Text style={[styles.headerTitle, { color: colors.text }]}>DiscAnalytix</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.iconButton, { marginRight: 12 }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={{ fontSize: 24 }}>⚙️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowProfileMenu(!showProfileMenu)}
              style={[styles.profileZone, { borderColor: showProfileMenu ? colors.primary : colors.border, borderWidth: 2 }]}
            >
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarInitial}>{(user?.displayName || user?.email || 'O')[0].toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>

            {showProfileMenu && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.dropdownHeader}>
                  <Text style={[styles.dropdownRole, { color: colors.primary }]}>{ROLE_LABELS[role] || role}</Text>
                  <Text style={[styles.dropdownEmail, { color: colors.textSecondary }]} numberOfLines={1}>{user?.email}</Text>
                </View>
                <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />
                {hasPermission(role, 'editor') && (
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileMenu(false); navigation.navigate('Channel'); }}>
                    <Text style={{ fontSize: 16, marginRight: 10 }}>📺</Text>
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>Canale Video</Text>
                  </TouchableOpacity>
                )}
                {hasPermission(role, 'modder') && (
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileMenu(false); navigation.navigate('Admin'); }}>
                    <Text style={{ fontSize: 16, marginRight: 10 }}>🛡️</Text>
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>Gestione Ruoli</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileMenu(false); navigation.navigate('DataAnalysis'); }}>
                  <Text style={{ fontSize: 16, marginRight: 10 }}>📊</Text>
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>Analisi Avanzata</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileMenu(false); logout(); }}>
                  <Text style={{ fontSize: 16, marginRight: 10 }}>🚪</Text>
                  <Text style={[styles.dropdownItemText, { color: '#FF3B30' }]}>Disconnetti</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => setShowProfileMenu(false)}
      >
        <View style={[styles.contentInner, { gap: 32, paddingTop: 32 }]}>

          {/* New Analysis Action */}
          {hasPermission(role, 'editor') && (
            <View style={styles.actionHero}>
              <View style={[styles.inputBarHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.heroInput, { color: colors.text }]}
                  placeholder="Incolla link YouTube"
                  placeholderTextColor={colors.textSecondary}
                  value={inputVideoId}
                  onChangeText={setInputVideoId}
                />
                <TouchableOpacity
                  style={[styles.heroActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => startAnalysis(inputVideoId)}
                >
                  <Text style={styles.heroActionText}>Inizia 🎬</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Recent Analysis Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>Ultimi Lavori</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Matches')} hitSlop={{ top: 10, bottom: 20, left: 10, right: 20 }}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Vedi tutti match</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.carouselContainer}>
              {scrollX > 20 && (
                <TouchableOpacity 
                  style={[styles.scrollArrow, styles.leftArrow, { backgroundColor: colors.card + 'CC' }]} 
                  onPress={() => scroll('left')}
                >
                  <Text style={{ fontSize: 20, color: colors.text }}>◀</Text>
                </TouchableOpacity>
              )}

              <ScrollView 
                ref={scrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.recentList}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {recentMatches.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, width: emptyCardWidth }]}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nessun match ancora</Text>
                  </View>
                ) : (
                  recentMatches.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.matchCard, { backgroundColor: colors.card }]}
                      onPress={() => navigation.navigate('Analysis', { selectedVideoId: m.youtubeId || m.id })}
                    >
                      <Image source={{ uri: m.thumbnail }} style={styles.matchThumb} />
                      <View style={styles.matchInfo}>
                        <Text style={[styles.matchTitle, { color: colors.text }]} numberOfLines={2}>{m.title}</Text>
                        <Text style={[styles.matchDate, { color: colors.textSecondary }]}>
                          {m.addedAt?.seconds ? new Date(m.addedAt.seconds * 1000).toLocaleDateString() : 'N/D'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {recentMatches.length > 0 && (
                <TouchableOpacity 
                  style={[styles.scrollArrow, styles.rightArrow, { backgroundColor: colors.card + 'CC' }]} 
                  onPress={() => scroll('right')}
                >
                  <Text style={{ fontSize: 20, color: colors.text }}>▶</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Ultime Analisi (Vertical List) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ultime Analisi</Text>
            </View>

            {recentMatches.length > 0 ? (
              <View style={{ paddingHorizontal: GAPS, gap: 12 }}>
                {recentMatches.slice(0, 3).map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Analysis', { selectedVideoId: m.youtubeId || m.id })}
                    style={[styles.recentRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.rowMain}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{m.title}</Text>
                        {m.status === 'ongoing' && (
                          <View style={styles.ongoingBadge}>
                            <Text style={styles.ongoingText}>ANALISI IN CORSO</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                          Ultima modifica: {m.lastUpdate?.seconds ? new Date(m.lastUpdate.seconds * 1000).toLocaleDateString() : 'N/D'}
                        </Text>
                        <Text style={[styles.rowSubtitle, { color: colors.primary, fontWeight: '700' }]}>
                          BRK: {m.breakConv || 0}%  •  O-CLN: {m.oClean || 0}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.rowStats}>
                      <View style={[styles.rowScoreBadge, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                        <Text style={[styles.rowScoreText, { color: colors.text }]}>{m.scoreHome || 0} - {m.scoreAway || 0}</Text>
                      </View>
                      <Text style={[styles.rowEventCount, { color: colors.textSecondary }]}>{m.totalEvents || 0} eventi</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border, margin: GAPS }]}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>🎬</Text>
                <Text style={[styles.tipTitle, { color: colors.text }]}>Inizia la tua analisi</Text>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  Inserisci un link YouTube sopra e clicca su "Inizia" per entrare nell'area tecnica.
                </Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, width: '100%', alignItems: 'center', paddingBottom: 60, paddingTop: 10 },
  contentInner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH },

  header: { width: '100%', borderBottomWidth: 1, zIndex: 100, alignItems: 'center' },
  headerCentered: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GAPS,
    paddingTop: 15,
    paddingBottom: 15,
  },
  headerLeft: { zIndex: 1 },
  headerCenterAbsolute: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 0 },
  logoSmall: { width: 40, height: 40, borderRadius: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  iconButton: { padding: 4, justifyContent: 'center', alignItems: 'center' },
  profileZone: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: 'white', fontWeight: 'bold' },

  dropdownMenu: { position: 'absolute', top: 55, right: 0, width: 200, borderRadius: 18, borderLong: 1, padding: 12, elevation: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 15, zIndex: 1000 },
  dropdownHeader: { paddingBottom: 10, paddingHorizontal: 4 },
  dropdownRole: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  dropdownEmail: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  dropdownDivider: { height: 1, marginVertical: 8 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10 },
  dropdownItemText: { fontSize: 14, fontWeight: '600' },

  actionHero: { paddingHorizontal: GAPS },
  heroTitle: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  inputBarHero: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 20, borderWidth: 1 },
  heroInput: { flex: 1, paddingHorizontal: 16, fontSize: 15, fontWeight: '500', minWidth: 0 },
  heroActionBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, flexShrink: 0 },
  heroActionText: { color: 'white', fontWeight: '800', fontSize: 16, flexShrink: 0 },

  section: {},
  sectionHeader: { paddingHorizontal: GAPS, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  linkText: { fontSize: 14, fontWeight: '600' },
  carouselContainer: { position: 'relative', width: '100%' },
  recentList: { paddingHorizontal: GAPS, gap: 16, paddingVertical: 10 },
  scrollArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  leftArrow: { left: GAPS / 2 },
  rightArrow: { right: GAPS / 2 },

  matchCard: { width: CARD_WIDTH, borderRadius: RADIUS, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  matchThumb: { width: '100%', height: CARD_WIDTH * 0.65, backgroundColor: '#333' },
  matchInfo: { padding: 14 },
  matchTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6, lineHeight: 20 },
  matchDate: { fontSize: 12, fontWeight: '500', opacity: 0.8 },
  emptyCard: { width: 340, height: 150, borderRadius: RADIUS, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontWeight: '500' },

  tipCard: { margin: GAPS, padding: 24, borderRadius: 24, borderWidth: 1 },
  tipTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  tipText: { fontSize: 14, lineHeight: 22, fontWeight: '500' },

  recentRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  rowThumb: {
    width: 60,
    height: 45,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  rowMain: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  rowStats: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  rowScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  rowScoreText: {
    fontSize: 12,
    fontWeight: '900',
  },
  ongoingBadge: {
    backgroundColor: '#FF980015',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#FF9800',
  },
  ongoingText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FF9800',
    letterSpacing: 0.5,
  },
});
