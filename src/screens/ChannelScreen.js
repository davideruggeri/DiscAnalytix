import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { getValidYouTubeToken } from '../utils/youtubeAuth';

export default function ChannelScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState('⏳ Verifica sessione...');
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    // Carica gli ID dei video già salvati in Firestore
    getDocs(collection(db, 'matches')).then((snap) => {
      setSavedIds(new Set(snap.docs.map((d) => d.id)));
    }).catch(() => {});
  }, []);

  const fetchMyVideos = async () => {
    setLoading(true);
    setTokenStatus('🔄 Controllo token...');
    try {
      const token = await getValidYouTubeToken();
      if (!token) {
        throw new Error('Impossibile ottenere un token valido. Fai logout e riaccedi con Google.');
      }
      setTokenStatus('✅ Token attivo');

      // Step 1: ottieni il playlistId dei video caricati dal canale
      const chRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (chRes.status === 401 || chRes.status === 403) {
        throw new Error('Sessione YouTube scaduta. Per favore, esci dall\'app e riaccedi con Google.');
      }
      const chData = await chRes.json();
      if (chData.error) throw new Error(`YouTube API: ${chData.error.message}`);

      const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsId) throw new Error('Nessuna playlist di upload trovata. Assicurati di avere un canale YouTube attivo.');

      // Step 2: ottieni i video dalla playlist uploads
      const plRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=30`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (plRes.status === 401 || plRes.status === 403) {
        throw new Error('Sessione YouTube scaduta durante il recupero dei video.');
      }
      const plData = await plRes.json();
      if (plData.error) throw new Error(`YouTube Playlist API: ${plData.error.message}`);
      setVideos(plData.items || []);
      if (!plData.items?.length) window.alert('Nessun video trovato nel tuo canale YouTube.');
    } catch (e) {
      console.error('YouTube Fetch Error:', e);
      const errorMsg = e.message.includes('token') 
        ? 'Sessione scaduta. Per favore, fai Logout dal menu profilo e accedi di nuovo con Google per riattivare YouTube.'
        : e.message;
      setTokenStatus(`❌ Errore: ${errorMsg}`);
      window.alert(`Errore YouTube: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const selectVideo = async (item) => {
    const videoId = item.snippet?.resourceId?.videoId;
    const thumb = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url;
    if (!videoId) return window.alert('Errore: ID video non trovato');
    try {
      // Salva in Firestore (sovrascrive se già presente)
      await setDoc(doc(db, 'matches', videoId), {
        youtubeId: videoId,
        title: item.snippet.title,
        thumbnail: thumb,
        addedBy: auth.currentUser?.uid,
        addedAt: new Date(),
      });
      // Torna a MainScreen e carica subito il video nel player
      navigation.navigate('Main', { selectedVideoId: videoId });
    } catch (e) {
      window.alert(`Errore salvataggio: ${e.message}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Il mio canale YouTube</Text>
      <Text style={[styles.tokenStatus, { color: colors.textSecondary }]}>{tokenStatus}</Text>

      <TouchableOpacity 
        style={[styles.loadBtn, { backgroundColor: colors.primary }]} 
        onPress={fetchMyVideos} 
        disabled={loading}
      >
        <Text style={styles.loadBtnText}>{loading ? 'Caricamento...' : '🔄 Carica video'}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />}

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 15 }}
        renderItem={({ item }) => {
          const videoId = item.snippet?.resourceId?.videoId;
          const isSaved = savedIds.has(videoId);
          const thumb = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url;
          
          return (
            <TouchableOpacity 
              style={[styles.videoItem, { backgroundColor: colors.card, borderColor: colors.border }, isSaved && styles.videoItemDisabled]} 
              onPress={() => !isSaved && selectVideo(item)}
              disabled={isSaved}
            >
              {thumb && <Image source={{ uri: thumb }} style={[styles.thumbnail, isSaved && { opacity: 0.3 }]} />}
              <View style={styles.videoInfo}>
                <Text style={[styles.videoTitle, { color: colors.text }, isSaved && { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.snippet.title}
                </Text>
                {isSaved && <Text style={styles.savedBadge}>✓ Già aggiunto</Text>}
                <Text style={[styles.videoDate, { color: colors.textSecondary }]}>{new Date(item.snippet.publishedAt).toLocaleDateString('it-IT')}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>Cerca i tuoi video cliccando sopra</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 6, color: '#FFFFFF' },
  tokenStatus: { fontSize: 13, color: '#888', marginBottom: 20, fontStyle: 'italic' },
  loadBtn: { backgroundColor: '#0A84FF', padding: 18, borderRadius: 15, alignItems: 'center', elevation: 2 },
  loadBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  videoItem: { 
    backgroundColor: '#1E1E1E', 
    padding: 12, 
    borderRadius: 15, 
    marginBottom: 12, 
    elevation: 3, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },
  videoItemDisabled: { opacity: 0.4 },
  thumbnail: { width: 120, height: 68, borderRadius: 10, backgroundColor: '#000' },
  videoInfo: { flex: 1 },
  videoTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  savedBadge: { fontSize: 11, fontWeight: 'bold', color: '#34C759', marginBottom: 4 },
  videoDate: { fontSize: 12, color: '#666' },
  empty: { textAlign: 'center', color: '#444', marginTop: 60, fontSize: 16 }
});

