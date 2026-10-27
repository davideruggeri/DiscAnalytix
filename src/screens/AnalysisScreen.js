import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity, Text,
  Platform, StatusBar, ActivityIndicator, useWindowDimensions, Alert, Modal
} from 'react-native';
import { collection, addDoc, query, onSnapshot, orderBy, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import VideoPlayer from '../components/VideoPlayer';
import { auth, db } from '../../firebaseConfig';
import useUserRole, { hasPermission } from '../hooks/useUserRole';
import { useTheme } from '../context/ThemeContext';

// Sub-components
import PremiumToast from '../components/analysis/PremiumToast';
import ScoreOverlay from '../components/analysis/ScoreOverlay';
import ConfigSection from '../components/analysis/ConfigSection';
import RosterSection from '../components/analysis/RosterSection';
import TaggingSection from '../components/analysis/TaggingSection';
import TimelineSection from '../components/analysis/TimelineSection';
import PlayerActionModal from '../components/analysis/PlayerActionModal';
import MatchStats from '../components/analysis/MatchStats';
import EditTimeModal from '../components/analysis/EditTimeModal';
import CurrentPointStats from '../components/analysis/CurrentPointStats';
import usePopoutSync from '../hooks/usePopoutSync';

const RADIUS = 24;
const PLAYER_WIDTH_PERCENTAGE = 0.5;

export default function AnalysisScreen({ route }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const GAPS = Math.min(SCREEN_WIDTH * 0.05, 24);
  const isWideScreen = SCREEN_WIDTH > 900;

  const playerWidth = isWideScreen ? (SCREEN_WIDTH * PLAYER_WIDTH_PERCENTAGE) : (SCREEN_WIDTH - GAPS * 2);
  const playerHeight = playerWidth * (9 / 16);

  const { selectedVideoId } = route.params || {};
  const user = auth.currentUser;
  const { role, loadingRole } = useUserRole();
  const { isDark, colors } = useTheme();

  // ── Core State ──────────────────────────────────────────
  const [videoId] = useState(selectedVideoId || '');
  const [isPlaying, setIsPlaying] = useState(true);
  const [events, setEvents] = useState([]);
  const [shortcutsMap, setShortcutsMap] = useState({});
  const [customTags, setCustomTags] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(true);
  const [actionModal, setActionModal] = useState({ visible: false, player: null });
  const [isDetached, setIsDetached] = useState(false);
  const playerRef = useRef(null);
  const popoutWindowRef = useRef(null);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const { sendCommand } = usePopoutSync('sender', (cmd) => {
    if (cmd.type === 'PROGRESS') {
      setCurrentTime(cmd.payload);
      currentTimeRef.current = cmd.payload;
    } else if (cmd.type === 'PLAYING') {
      setIsPlaying(true);
    } else if (cmd.type === 'PAUSED') {
      setIsPlaying(false);
    }
  });

  useEffect(() => {
    if (isDetached) {
      sendCommand(isPlaying ? 'PLAY' : 'PAUSE');
    }
  }, [isPlaying, isDetached]);

  const togglePopout = () => {
    if (Platform.OS !== 'web') return;

    if (!isDetached) {
      const url = `${window.location.origin}${window.location.pathname}?popout=true&videoId=${videoId}`;
      const win = window.open(url, 'DiscAnalytixPlayer', 'width=1280,height=720');

      // Monitora chiusura finestra
      const timer = setInterval(() => {
        if (win.closed) {
          clearInterval(timer);
          setIsDetached(false);
        }
      }, 1000);

      popoutWindowRef.current = win;
      setIsDetached(true);

      // Sincronizza stato iniziale
      setTimeout(() => {
        sendCommand('SEEK', currentTime);
        if (!isPlaying) sendCommand('PAUSE');
      }, 1500);
    } else {
      if (popoutWindowRef.current) popoutWindowRef.current.close();
      setIsDetached(false);
    }
  };

  // ── Team & Roster State ─────────────────────────────────
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [pointRoster, setPointRoster] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);
  const [surfaceType, setSurfaceType] = useState('grass');
  const maxPlayers = surfaceType === 'sand' ? 5 : 7;

  // ── UI / Match State ────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [fps, setFps] = useState(30);
  const [editTimeModal, setEditTimeModal] = useState({ visible: false, event: null });
  const [metaStartTime, setMetaStartTime] = useState(null);
  const [expandedMetas, setExpandedMetas] = useState({});
  const [possessionSide, setPossessionSide] = useState('O');
  const [isConfigConfirmed, setIsConfigConfirmed] = useState(false);
  const [pointStartPossession, setPointStartPossession] = useState(null);
  const [effectivePossession, setEffectivePossession] = useState('O');
  const [isManualConfigOpen, setIsManualConfigOpen] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [isSubstitutionMode, setIsSubstitutionMode] = useState(false);
  const [showSubChoiceModal, setShowSubChoiceModal] = useState(false);
  const [isTimeoutActive, setIsTimeoutActive] = useState(false);
  const [matchTitle, setMatchTitle] = useState('Analisi Video');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isMatchFinished, setIsMatchFinished] = useState(false);
  const lastBoundaryIdRef = useRef(null);
  const handleTagRef = useRef();
  const handleInjuryRef = useRef();
  const togglePlayerInRosterRef = useRef();
  const setActivePlayerRef = useRef();
  const teamPlayersRef = useRef();
  const pointRosterRef = useRef();
  const isConfigConfirmedRef = useRef();
  const metaStartTimeRef = useRef();
  const showToastRef = useRef();
  const maxPlayersRef = useRef();
  const currentTimeRef = useRef();
  const eventsRef = useRef();
  const surfaceTypeRef = useRef();
  const activePlayerRef = useRef();
  const selectedTeamRef = useRef();
  const effectivePossessionRef = useRef();
  const pointStartPossessionRef = useRef();
  const isTimeoutActiveRef = useRef();


  // Reconstruct possession and match state based on current video time
  useEffect(() => {
    const pastEvents = events.filter(e => e.time <= currentTime);
    let p = possessionSide || 'O';
    pastEvents.forEach(ev => {
      if (ev.label === 'Meta' || ev.label === 'Break') p = 'D';
      else if (ev.label === 'Meta subita') p = 'O';
      // Pull: riancora il possesso al valore registrato al momento del tag (fonte di verità)
      // Se il Pull ha un nome, siamo certamente in D (abbiamo pullato noi)
      else if (ev.label === 'Pull') p = ev.playerName ? 'D' : (ev.possessionSide || p);
      else if (ev.label === 'Turnover' || ev.label === 'Stall Out' || ev.label === 'Handblock' || ev.label === 'Intercetto' || ev.isTurnover) p = (p === 'O' ? 'D' : 'O');
      else if (ev.label === 'Half Time') p = (possessionSide === 'O' ? 'D' : 'O');
    });
    setEffectivePossession(p);
    const boundaryEvents = pastEvents.filter(e => ['Pull', 'Meta', 'Break', 'Meta subita'].includes(e.label));
    const lastBoundary = boundaryEvents[boundaryEvents.length - 1];
    const currentBoundaryId = lastBoundary ? lastBoundary.id : null;

    const matchEnded = pastEvents.some(e => e.label === 'Fine Partita');
    setIsMatchFinished(matchEnded);

    if (lastBoundary && !matchEnded) {
      if (lastBoundary.label === 'Pull') {
        let timeoutDuration = 0; let isCurrentlyInTimeout = false; let lastTimeoutStart = 0;
        const eventsSincePull = pastEvents.filter(e => e.time >= lastBoundary.time);
        eventsSincePull.forEach(e => {
          if (e.label === 'Time Out Inizio') { isCurrentlyInTimeout = true; lastTimeoutStart = e.time; }
          else if (e.label === 'Time Out Fine' && isCurrentlyInTimeout) { isCurrentlyInTimeout = false; timeoutDuration += (e.time - lastTimeoutStart); }
        });
        if (isCurrentlyInTimeout) timeoutDuration += (currentTime - lastTimeoutStart);
        setIsTimeoutActive(isCurrentlyInTimeout);
        setMetaStartTime(lastBoundary.time + timeoutDuration);
        if (!isManualConfigOpen) setIsConfigConfirmed(true);
        if (!isManualConfigOpen) {
          const eventsWithRoster = pastEvents.filter(e => e.label !== 'Meta' && e.label !== 'Break' && e.label !== 'Meta subita' && e.roster && Array.isArray(e.roster));
          if (eventsWithRoster.length > 0) {
            const latestRoster = eventsWithRoster[eventsWithRoster.length - 1].roster;
            if (JSON.stringify(latestRoster) !== JSON.stringify(pointRoster)) setPointRoster(latestRoster);
          }
        }
      } else {
        // Se l'ultimo evento è una Meta, resettiamo tutto SOLO se siamo appena "entrati" in questo stato (cambio boundary)
        if (currentBoundaryId !== lastBoundaryIdRef.current) {
          setIsTimeoutActive(false); setMetaStartTime(null);
          if (!isManualConfigOpen) {
            setIsConfigConfirmed(false);
            setPointRoster([]);
          }
        }
      }
    } else {
      // Se non ci sono proprio eventi, permettiamo la conferma manuale (Setup iniziale)
      if (currentBoundaryId !== lastBoundaryIdRef.current) {
        setIsTimeoutActive(false); setMetaStartTime(null);
        if (!isManualConfigOpen) {
          setIsConfigConfirmed(false);
          setPointRoster([]);
        }
      }
    }
    lastBoundaryIdRef.current = currentBoundaryId;
  }, [currentTime, events, possessionSide, isManualConfigOpen]);

  // Sync state and stats
  useEffect(() => {
    if (!videoId || !hasLoaded) return;
    const sync = async () => {
      const scoreHome = events.filter(e => e.label === 'Meta' || e.label === 'Break').length;
      const scoreAway = events.filter(e => e.label === 'Meta subita').length;

      // Calcolo stats per la Home
      const points = []; let currP = [];
      events.forEach(ev => { currP.push(ev); if (['Meta', 'Break', 'Meta subita', 'Half Time', 'Fine Partita'].includes(ev.label)) { points.push([...currP]); currP = []; } });
      if (currP.length > 0) points.push(currP);

      let dP = 0, oP = 0, brk = 0, cln = 0;
      points.forEach(p => {
        const isGoalOur = p.some(e => e.label === 'Meta' || e.label === 'Break');
        const isGoalOpp = p.some(e => e.label === 'Meta subita');
        if (!isGoalOur && !isGoalOpp) return;
        const startedInD = p[0]?.possessionSide === 'D';
        if (startedInD) { dP++; if (isGoalOur) brk++; }
        else { oP++; if (isGoalOur && !p.some(e => e.isTurnover && e.possessionSide === 'O')) cln++; }
      });

      const isFinished = events.some(e => e.label === 'Fine Partita');

      try {
        await setDoc(doc(db, 'matches', videoId), {
          scoreHome,
          scoreAway,
          totalEvents: events.length,
          pointRoster,
          surfaceType,
          possessionSide,
          isConfigConfirmed,
          teamId: selectedTeam?.id || null,
          teamName: selectedTeam?.name || null,
          lastUpdate: serverTimestamp(),
          ...(matchData?.manualStats ? {} : {
            breakConv: dP > 0 ? Math.round((brk / dP) * 100) : 0,
            oClean: oP > 0 ? Math.round((cln / oP) * 100) : 0,
            status: isFinished ? 'completed' : 'ongoing',
            scoreHome,
            scoreAway
          })
        }, { merge: true });
      } catch (e) { console.error(e); }
    };
    const timeout = setTimeout(sync, 1000);
    return () => clearTimeout(timeout);
  }, [events, videoId, pointRoster, surfaceType, possessionSide, isConfigConfirmed, hasLoaded, selectedTeam, matchData?.manualStats]);

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'info' }), 3000);
  };

  useEffect(() => {
    if (!videoId) return;
    const initializeMatch = async () => {
      try {
        const shortcutsRef = doc(db, 'settings', 'keyboardShortcuts');
        const shortcutsSnap = await getDoc(shortcutsRef);
        const currentShortcuts = shortcutsSnap.exists() ? shortcutsSnap.data() : {};

        if (hasPermission(role, 'editor')) {
          const defaultShortcuts = {
            'Q': 'Pull', 'W': 'Turnover', 'E': 'Meta subita', 'R': 'Time Out', 'T': 'Injury', 'Y': 'Stall Out',
            '1': 'Slot_1', '2': 'Slot_2', '3': 'Slot_3', '4': 'Slot_4', '5': 'Slot_5',
            'P1': 'Ricezione', 'P2': 'Lancio', 'P3': 'Meta', 'P4': 'Handblock', 'P5': 'Stall Out'
          };
          let needsUpdate = false; const finalShortcuts = { ...currentShortcuts };
          Object.entries(defaultShortcuts).forEach(([k, v]) => { if (!finalShortcuts[k]) { finalShortcuts[k] = v; needsUpdate = true; } });
          if (needsUpdate) await setDoc(shortcutsRef, finalShortcuts);
        }

        const matchRef = doc(db, 'matches', videoId);
        const matchSnap = await getDoc(matchRef);
        if (matchSnap.exists()) {
          const data = matchSnap.data();
          if (data.title) setMatchTitle(data.title);
          if (data.teamId) {
            setSelectedTeam({ id: data.teamId, name: data.teamName });
            if (data.surfaceType) setSurfaceType(data.surfaceType);
            if (data.possessionSide) setPossessionSide(data.possessionSide);
            if (data.pointRoster) setPointRoster(data.pointRoster);
            if (data.isConfigConfirmed !== undefined) setIsConfigConfirmed(data.isConfigConfirmed);
            setMatchData(data);
          }
        } else if (hasPermission(role, 'editor')) {
          // Solo gli editor possono creare il documento partita se non esiste
          await setDoc(matchRef, { youtubeId: videoId, title: 'Analisi Video', thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, addedAt: new Date() });
        }
        setHasLoaded(true);
      } catch (e) { console.error(e); }
    };
    initializeMatch();
    const unsubShortcuts = onSnapshot(doc(db, 'settings', 'keyboardShortcuts'), (docSnap) => {
      if (docSnap.exists()) setShortcutsMap(docSnap.data());
    });
    const unsubCustom = onSnapshot(doc(db, 'settings', 'customTags'), (docSnap) => {
      if (docSnap.exists()) setCustomTags(docSnap.data().tags || []);
    });
    const unsubEvents = onSnapshot(query(collection(db, `matches/${videoId}/events`), orderBy('time', 'asc')), (snap) => {
      const sortedEvents = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          if (a.time !== b.time) return a.time - b.time;
          return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        });
      setEvents(sortedEvents);
    });
    return () => { unsubShortcuts(); unsubCustom(); unsubEvents(); };
  }, [videoId, role]);

  useEffect(() => {
    return onSnapshot(query(collection(db, 'teams'), orderBy('name', 'asc')), (snap) => setAllTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    if (!selectedTeam) { setTeamPlayers([]); return; }
    return onSnapshot(query(collection(db, `teams/${selectedTeam.id}/players`), orderBy('number', 'asc')), (snap) => setTeamPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [selectedTeam]);

  useEffect(() => {
    if (!hasLoaded || !videoId || !hasPermission(role, 'editor')) return;
    const mCount = events.filter(e => e.label === 'Meta' || e.label === 'Break').length;
    const sCount = events.filter(e => e.label === 'Meta subita').length;
    const maxScore = Math.max(mCount, sCount);

    const halfScore = surfaceType === 'sand' ? 7 : 8;
    const finalScore = surfaceType === 'sand' ? 13 : 15;

    const hasHalf = events.some(e => e.label === 'Half Time');
    const hasFinal = events.some(e => e.label === 'Fine Partita');

    if (maxScore >= halfScore && !hasHalf && !hasFinal) {
      handleTag('Half Time');
    } else if (maxScore >= finalScore && !hasFinal) {
      handleTag('Fine Partita');
    }
  }, [events, surfaceType, hasLoaded]);

  const updateMatchTitle = async (newTitle) => { setMatchTitle(newTitle); if (videoId) await setDoc(doc(db, 'matches', videoId), { title: newTitle }, { merge: true }); };

  const togglePlayerInRoster = (playerId) => {
    if (isConfigConfirmedRef.current || isMatchFinished) return;
    setPointRoster(prev => {
      if (prev.includes(playerId)) { if (activePlayer === playerId) setActivePlayer(null); return prev.filter(id => id !== playerId); }
      if (prev.length >= maxPlayersRef.current) { showToast(`Limite raggiunto: max ${maxPlayersRef.current}`, 'warning'); return prev; }
      return [...prev, playerId];
    });
  };

  const handleUpdateTime = async (eventId, newTime) => {
    try {
      const event = events.find(e => e.id === eventId);
      const eventRef = doc(db, `matches/${videoId}/events`, eventId);
      await setDoc(eventRef, { time: newTime }, { merge: true });
      showToast('Orario aggiornato', 'success');
      
      if (event) {
        syncMetaEvents(event.metaNumber);
      }
    } catch (error) {
      console.error("Errore modifica orario:", error);
      showToast('Errore durante la modifica', 'error');
    }
  };

  const handleTag = async (label, playerId = null, throwType = null, isTurnover = false) => {
    if ((!playerRef.current && !isDetached) || !hasPermission(role, 'editor') || !videoId || isMatchFinished) return;
    try {
      const time = currentTimeRef.current;
      const pRoster = pointRosterRef.current;
      const effPoss = effectivePossessionRef.current;

      const playerInfo = playerId ? teamPlayersRef.current.find(p => p.id === playerId) : (activePlayerRef.current ? teamPlayersRef.current.find(p => p.id === activePlayerRef.current) : null);

      const eventData = {
        time: time || 0,
        label,
        createdAt: new Date(),
        author: user?.uid || 'anonymous',
        playerId: playerInfo?.id || null,
        playerName: playerInfo ? `${playerInfo.number ? '#' + playerInfo.number + ' ' : ''}${playerInfo.name}` : null,
        teamId: selectedTeamRef.current?.id || null,
        teamName: selectedTeamRef.current?.name || null,
        surfaceType: surfaceTypeRef.current || 'grass',
        possessionSide: effPoss,
        roster: pRoster,
        metaNumber: eventsRef.current.filter(e => e.label === 'Meta' || e.label === 'Break' || e.label === 'Meta subita').length + 1,
        throwType: throwType || null,
        isTurnover: isTurnover || ['Turnover', 'Stall Out', 'Handblock', 'Intercetto'].includes(label)
      };

      if (label === 'Pull') {
        if (pRoster.length !== maxPlayersRef.current) {
          showToastRef.current(`Seleziona esattamente ${maxPlayersRef.current} giocatori prima del Pull!`, 'warning');
          return;
        }
        if (effPoss === 'D' && !eventData.playerId) { showToastRef.current('Seleziona chi effettua il Pull!', 'warning'); return; }
        // Se c'è un giocatore che effettua il Pull, siamo certamente in D (abbiamo pullato noi)
        if (eventData.playerId) eventData.possessionSide = 'D';
        setMetaStartTime(time);
        setPointStartPossession(eventData.possessionSide);
        setIsConfigConfirmed(true);
        setIsManualConfigOpen(false);
        setActivePlayer(null);
      } else if (label === 'Meta') {
        if (effPoss === 'O') {
          const isBreak = pointStartPossessionRef.current === 'D';
          eventData.label = isBreak ? 'Break' : 'Meta';
        } else {
          eventData.label = 'Meta subita';
        }
        if (metaStartTimeRef.current !== null) eventData.duration = time - metaStartTimeRef.current;
        setPointStartPossession(null);
        setPointRoster([]);
        setActivePlayer(null);
        setIsConfigConfirmed(false);
        setIsManualConfigOpen(false);
      } else if (label === 'Time Out Inizio') {
        setIsTimeoutActive(true);
        showToast('Time Out iniziato', 'warning');
      } else if (label === 'Time Out Fine') {
        setIsTimeoutActive(false);
      } else if (label === 'Half Time') {
        showToast('Intervallo! Il possesso cambierà al prossimo punto.', 'warning');
      } else if (label === 'Fine Partita') {
        showToast('Match terminato.', 'success');
      }

      // Flip immediato del possesso per tutti gli eventi di turnover (ottimistic update)
      if (eventData.isTurnover) {
        setEffectivePossession(prev => prev === 'O' ? 'D' : 'O');
      }

      await addDoc(collection(db, `matches/${videoId}/events`), eventData);

      // Calcola stats riassuntive da salvare nel documento match
      const allEvents = [...eventsRef.current, { ...eventData, id: 'temp' }];
      const points = []; let currP = [];
      allEvents.forEach(ev => { currP.push(ev); if (['Meta', 'Break', 'Meta subita', 'Half Time', 'Fine Partita'].includes(ev.label)) { points.push([...currP]); currP = []; } });

      let dP = 0, oP = 0, brk = 0, cln = 0;
      points.forEach(p => {
        const isGoalOur = p.some(e => e.label === 'Meta' || e.label === 'Break');
        const isGoalOpp = p.some(e => e.label === 'Meta subita');
        if (!isGoalOur && !isGoalOpp) return;
        const startedInD = p[0]?.possessionSide === 'D';
        if (startedInD) { dP++; if (isGoalOur) brk++; }
        else { oP++; if (isGoalOur && !p.some(e => e.isTurnover && e.possessionSide === 'O')) cln++; }
      });

      const isFinished = allEvents.some(e => e.label === 'Fine Partita');
      if (!matchData?.manualStats) {
        await setDoc(doc(db, 'matches', videoId), {
          lastUpdate: serverTimestamp(),
          status: isFinished ? 'completed' : 'ongoing',
          breakConv: dP > 0 ? Math.round((brk / dP) * 100) : 0,
          oClean: oP > 0 ? Math.round((cln / oP) * 100) : 0,
          totalEvents: allEvents.length,
          scoreHome: allEvents.filter(e => e.label === 'Meta' || e.label === 'Break').length,
          scoreAway: allEvents.filter(e => e.label === 'Meta subita').length
        }, { merge: true });
      }

    } catch (e) { window.alert('Errore: ' + e.message); }
  };

  const handlePlayerAction = (action) => {
    if (!actionModal.player) return;

    let label = action.label;
    if (action.turnover) {
      if (action.label.includes('Lancio')) label = action.label.replace('Lancio', 'Turnover: Errore Lancio');
      else if (action.label.includes('Ricezione')) label = 'Turnover: Drop';
      else label = `Turnover: ${action.label}`;
    }

    if (action.isScore) {
      handleTag('Meta', actionModal.player.id);
    } else {
      handleTag(label, actionModal.player.id, action.throwType, action.turnover);
    }
    setActionModal({ visible: false, player: null });
    setActivePlayer(null);
    if (action.turnover) showToast(`Turnover! Ora in ${effectivePossession === 'O' ? 'Difesa' : 'Attacco'}`);
  };

  const handleSelectPlayer = async (playerId) => {
    if (isMatchFinished) return;
    if (isConfigConfirmed) {
      if (metaStartTime !== null) {
        const p = teamPlayers.find(p => p.id === playerId);
        if (!p) return;

        // --- LOGICA AUTO-TAG RICEZIONE ---
        const lastEvent = eventsRef.current.length > 0 ? eventsRef.current[eventsRef.current.length - 1] : null;
        if (lastEvent && lastEvent.label.includes('Lancio') && !lastEvent.isTurnover && lastEvent.playerId !== playerId) {
          const tType = lastEvent.throwType || 'N/D';
          await handleTag(`Ricezione (${tType})`, playerId, tType);
        }
        // ---------------------------------

        setActionModal({ visible: true, player: p });
        setActivePlayer(playerId);
      } else {
        setActivePlayer(prev => prev === playerId ? null : playerId);
      }
    } else {
      togglePlayerInRoster(playerId);
    }
  };

  const syncMetaEvents = async (mNum) => {
    if (!mNum) return;
    // Prendiamo tutti gli eventi della meta, ordinati per tempo
    const metaEvents = eventsRef.current.filter(e => e.metaNumber === mNum).sort((a, b) => a.time - b.time);
    
    let lastThrowType = 'N/D';

    for (const ev of metaEvents) {
      if (ev.label === 'Pull') {
        lastThrowType = 'PULL';
      } else if (ev.label.includes('Lancio')) {
        // Estraiamo il tipo dall'etichetta se non c'è nel campo throwType (per compatibilità vecchi eventi)
        const typeInLabel = ev.label.replace('Lancio ', '').replace('Turnover: Errore Lancio ', '');
        lastThrowType = ev.throwType || (typeInLabel !== ev.label ? typeInLabel : 'N/D');
      } else if (ev.label.includes('Ricezione')) {
        const expectedLabel = `Ricezione (${lastThrowType})`;
        // Aggiorna solo se l'etichetta è diversa o se è un (N/D) che possiamo risolvere
        if (ev.label !== expectedLabel) {
          try {
            await setDoc(doc(db, `matches/${videoId}/events`, ev.id), { 
              label: expectedLabel,
              throwType: lastThrowType 
            }, { merge: true });
          } catch (err) { console.error("Sync error:", err); }
        }
      }
    }
  };

  const handleResetPoint = async (metaNum, startTime) => {
    if (!hasPermission(role, 'editor') || isMatchFinished) return;

    if (!window.confirm(`Sei sicuro di voler rianalizzare la Meta ${metaNum}? Verranno eliminati tutti gli eventi di questo punto tranne il Pull.`)) return;

    try {
      setLoading(true);
      // Trova gli eventi della meta specifica
      const targetEvents = events.filter(e => e.metaNumber === metaNum);
      
      // Elimina tutti tranne il Pull
      const toDelete = targetEvents.filter(e => e.label !== 'Pull');
      
      const deletePromises = toDelete.map(e => 
        deleteDoc(doc(db, `matches/${videoId}/events`, e.id))
      );
      
      await Promise.all(deletePromises);

      // Riporta il video all'inizio della meta
      if (videoPlayerRef.current && startTime) {
        videoPlayerRef.current.seekTo(startTime, true);
      }

      // Se stiamo rianalizzando una meta passata, aggiorniamo il contatore corrente
      setMetaNumber(metaNum);
      setMetaStartTime(startTime);
      setIsConfigConfirmed(true); // Assumiamo che il roster sia già ok, o lo facciamo riconfermare? 
      // Per sicurezza, lo lasciamo confermato così può taggare subito.

      setActivePlayer(null);
      showToast(`Meta ${metaNum} resettata.`, "success");
    } catch (err) {
      console.error(err);
      showToast("Errore durante il reset della meta", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInjury = async () => {
    if (!hasPermission(role, 'editor') || isMatchFinished) return;
    setIsSubstitutionMode(true);
    setIsManualConfigOpen(true);
    setIsConfigConfirmed(false);
    showToast('Sostituzione attiva: cambia i giocatori e premi INVIO', 'warning');
  };

  const handleConfirmSubstitution = async (type) => {
    if (type === 'Errore') {
      // Trova l'evento di inizio meta (Pull o Meta precedente)
      const pastEvents = events.filter(e => e.time <= currentTimeRef.current);
      const boundaryEvents = pastEvents.filter(e => ['Pull', 'Meta', 'Break', 'Meta subita'].includes(e.label));
      const lastBoundary = boundaryEvents[boundaryEvents.length - 1];

      if (lastBoundary) {
        // Aggiorna tutti gli eventi a partire dall'evento di confine (incluso il Pull stesso)
        const pastEventsInMeta = events.filter(e => e.time >= lastBoundary.time);
        try {
          const batch = pastEventsInMeta.map(ev =>
            setDoc(doc(db, `matches/${videoId}/events`, ev.id), { roster: pointRoster }, { merge: true })
          );
          await Promise.all(batch);
          showToast('Roster corretto retroattivamente per questa meta', 'success');
        } catch (e) { console.error(e); }
      }
    }

    // Log the event only for Injuries (Error correction is silent/retroactive)
    if (type === 'Infortunio') {
      handleTag('Sostituzione Infortunio');
    }

    setIsSubstitutionMode(false);
    setShowSubChoiceModal(false);
    setIsConfigConfirmed(true);
  };

  // Update refs on every render
  handleTagRef.current = handleTag;
  handleInjuryRef.current = handleInjury;
  togglePlayerInRosterRef.current = togglePlayerInRoster;
  setActivePlayerRef.current = setActivePlayer;
  teamPlayersRef.current = teamPlayers;
  pointRosterRef.current = pointRoster;
  isConfigConfirmedRef.current = isConfigConfirmed;
  metaStartTimeRef.current = metaStartTime;
  showToastRef.current = showToast;
  maxPlayersRef.current = maxPlayers;
  currentTimeRef.current = currentTime;
  eventsRef.current = events;
  surfaceTypeRef.current = surfaceType;
  activePlayerRef.current = activePlayer;
  selectedTeamRef.current = selectedTeam;
  effectivePossessionRef.current = effectivePossession;
  pointStartPossessionRef.current = pointStartPossession;
  isTimeoutActiveRef.current = isTimeoutActive;

  const tagButtons = [
    { label: 'Pull', icon: 'send', color: '#2196F3', shortcut: 'Q' },
    { label: 'Meta subita', icon: 'close-circle', color: '#F44336', shortcut: 'E' },
    { label: 'Turnover', icon: 'repeat', color: '#FF9800', shortcut: 'W' },
    { label: 'Time Out', icon: 'pause', color: '#9C27B0', shortcut: 'R' },
    { label: 'Injury', icon: 'star', color: '#E91E63', shortcut: 'T' },
    { label: 'Stall Out', icon: 'timer', color: '#FF5722', shortcut: 'Y' },
    { label: 'Half Time', icon: 'hourglass', color: '#607D8B' },
    { label: 'Fine Partita', icon: 'flag', color: '#000000' },
  ];

  const seekTo = (time) => {
    const targetTime = Math.max(0, time);
    if (isDetached) {
      sendCommand('SEEK', targetTime);
    } else {
      if (Platform.OS === 'web') playerRef.current?.seekTo(targetTime, 'seconds');
      else playerRef.current?.seekTo(targetTime, true);
    }
    currentTimeRef.current = targetTime;
    setCurrentTime(targetTime);
  };


  const deleteEvent = async (id) => {
    if (!hasPermission(role, 'editor')) return;
    try {
      await deleteDoc(doc(db, `matches/${videoId}/events`, id));
      await setDoc(doc(db, 'matches', videoId), { lastUpdate: serverTimestamp() }, { merge: true });
    } catch (e) { window.alert(e.message); }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = async (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // Controlli Video (Sempre attivi per tutti)
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying(prev => !prev); return; }
      if (e.code === 'ArrowLeft') { e.preventDefault(); seekTo(currentTimeRef.current - 1); return; }
      if (e.code === 'ArrowRight') { e.preventDefault(); seekTo(currentTimeRef.current + 10); return; }

      // Da qui in poi solo per Editor
      if (!hasPermission(role, 'editor')) return;
      if (actionModal.visible || showSubChoiceModal) return;

      if (e.key === 'Delete' || e.code === 'Delete') { e.preventDefault(); if (eventsRef.current.length > 0) { const last = eventsRef.current[eventsRef.current.length - 1]; deleteEvent(last.id); showToast(`Eliminato: ${last.label}`, 'warning'); } return; }

      // Tasto Invio per confermare il Roster
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (isConfigConfirmedRef.current) return;

        if (pointRosterRef.current.length === maxPlayersRef.current) {
          if (isSubstitutionMode) {
            setShowSubChoiceModal(true);
          } else {
            setIsConfigConfirmed(true);
            showToast('Roster confermato! Ora registra il Pull (Q).', 'success');
          }
        } else {
          showToast(`Seleziona esattamente ${maxPlayersRef.current} giocatori per confermare!`, 'warning');
        }
        return;
      }

      const key = e.key.toUpperCase();
      const code = e.code;

      // Tasto M per modificare l'esito dell'ultima azione (Turnover toggle)
      if (key === 'M') {
        e.preventDefault();
        if (eventsRef.current.length > 0) {
          const last = eventsRef.current[eventsRef.current.length - 1];
          const newStatus = !last.isTurnover;
          
          let newLabel = last.label;
          if (newStatus) {
            if (last.label.includes('Lancio')) newLabel = last.label.replace('Lancio', 'Turnover: Errore Lancio');
            else if (last.label.includes('Ricezione')) newLabel = 'Turnover: Drop';
            else if (!last.label.includes('Turnover')) newLabel = `Turnover: ${last.label}`;
          } else {
            newLabel = last.label.replace('Turnover: Errore Lancio', 'Lancio')
                                 .replace('Turnover: Drop', 'Ricezione')
                                 .replace('Turnover: ', '');
          }

          try {
            await setDoc(doc(db, `matches/${videoId}/events`, last.id), { 
              isTurnover: newStatus,
              label: newLabel
            }, { merge: true });
            showToast(`Aggiornato: ${newLabel}`, 'success');
            
            // Sincronizza il resto della meta se necessario
            syncMetaEvents(last.metaNumber);
          } catch (err) { console.error(err); }
        }
        return;
      }

      // Mappatura flessibile: proviamo prima il code (Numpad) poi il key
      let mappedKey = null;
      if (code.startsWith('Numpad')) {
        const num = code.replace('Numpad', '');
        if (shortcutsMap[`P${num}`]) mappedKey = `P${num}`;
        else if (shortcutsMap[num]) mappedKey = num;
        else if (num === 'Enter') mappedKey = 'Enter';
        else mappedKey = `P${num}`; // default ID
      } else {
        mappedKey = key;
      }

      const rawAction = shortcutsMap[mappedKey];
      const actions = Array.isArray(rawAction) ? rawAction : (rawAction ? [rawAction] : []);

      const GLOBAL_LABELS = ['Pull', 'Turnover', 'Meta subita', 'Time Out', 'Injury', 'Stall Out', 'Half Time', 'Fine Partita'];

      // Cerchiamo un'azione globale (base o custom)
      const actionToTrigger = actions.find(a => {
        if (GLOBAL_LABELS.includes(a)) return true;
        const custom = customTags.find(ct => ct.label === a && ct.cat === 'Global');
        if (custom) {
          if (custom.possession === 'Always') return true;
          if (custom.possession === effectivePossession) return true;
        }
        return false;
      });

      if (actionToTrigger) {
        if (GLOBAL_LABELS.includes(actionToTrigger)) {
          // Azioni standard
          if (actionToTrigger === 'Pull') { handleTag('Pull'); return; }
          if (actionToTrigger === 'Turnover') { handleTag('Turnover'); return; }
          if (actionToTrigger === 'Meta subita') { handleTag('Meta subita'); return; }
          if (actionToTrigger === 'Time Out') { handleTag(isTimeoutActiveRef.current ? 'Time Out Fine' : 'Time Out Inizio'); return; }
          if (actionToTrigger === 'Injury') { handleInjury(); return; }
          if (actionToTrigger === 'Stall Out') { handleTag('Stall Out'); return; }
          if (actionToTrigger === 'Half Time') { handleTag('Half Time'); return; }
          if (actionToTrigger === 'Fine Partita') { handleTag('Fine Partita'); return; }
        } else {
          // Azione Custom Global
          const custom = customTags.find(ct => ct.label === actionToTrigger);
          if (custom) {
            handleTag(custom.label, null, null, custom.isTurnover);
            if (custom.stopsTimer && !isTimeoutActiveRef.current) {
              handleTag('Time Out Inizio');
            }
            return;
          }
        }
      }

      const hasSlot = actions.some(a => a && a.startsWith('Slot_'));
      if (hasSlot || ['1', '2', '3', '4', '5', '6', '7'].includes(key)) {
        // Se c'è uno slot assegnato o è un numero 1-7, lo usiamo per il roster
        const num = (mappedKey.startsWith('P') ? mappedKey.substring(1) : key);
        const idx = parseInt(num) - 1;
        const isConf = isConfigConfirmedRef.current || (pointRosterRef.current?.length >= maxPlayersRef.current);

        // Sincronizziamo l'ordine numerico con quello della UI
        const sorted = [...teamPlayersRef.current].sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
        const pList = isConf ? sorted.filter(p => pointRosterRef.current.includes(p.id)) : sorted;

        const p = pList[idx];
        if (p) {
          if (isConf) {
            handleSelectPlayer(p.id);
          } else {
            togglePlayerInRosterRef.current(p.id);
          }
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutsMap, actionModal.visible, isSubstitutionMode, showSubChoiceModal, role, isDetached]);

  if (loadingRole) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} onMouseDown={() => setIsOverlayEnabled(true)}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentInner, { flexDirection: isWideScreen ? 'row' : 'column', alignItems: isWideScreen ? 'flex-start' : 'center', paddingHorizontal: isWideScreen ? GAPS * 2 : 0 }]}>
          <View style={{ width: playerWidth, position: isWideScreen ? 'sticky' : 'relative', top: isWideScreen ? GAPS : 0, zIndex: 5 }}>
            <View style={[styles.playerContainer, { backgroundColor: colors.card, borderColor: colors.border, marginTop: GAPS }]}>
              {isDetached ? (
                <CurrentPointStats
                  colors={colors}
                  pointRoster={pointRoster}
                  teamPlayers={teamPlayers}
                  events={events}
                  currentTime={currentTime}
                  metaStartTime={metaStartTime}
                  possessionSide={effectivePossession}
                  onReattach={togglePopout}
                />
              ) : (
                <View style={styles.videoWrapper} onMouseDown={(e) => e.stopPropagation()}>
                  <VideoPlayer ref={playerRef} videoId={videoId} isPlaying={isPlaying} setIsPlaying={setIsPlaying} onProgress={setCurrentTime} height={playerHeight} width={playerWidth} />
                  {isOverlayEnabled && (
                    <TouchableOpacity activeOpacity={1} style={{ position: 'absolute', top: 40, left: 0, right: 0, bottom: 60 }} onPress={(e) => { setIsPlaying(!isPlaying); setIsOverlayEnabled(false); }} />
                  )}
                  <ScoreOverlay events={events} colors={colors} currentTime={currentTime} metaStartTime={metaStartTime} />

                  {/* Pulsante Popout */}
                  {Platform.OS === 'web' && (
                    <TouchableOpacity
                      style={styles.popoutBtn}
                      onPress={togglePopout}
                      title="Stacca Player"
                    >
                      <Text style={{ fontSize: 20 }}>⧉</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
          <View style={{ flex: isWideScreen ? 1 : undefined, width: isWideScreen ? undefined : '100%', marginLeft: isWideScreen ? GAPS * 2 : 0, marginTop: isWideScreen ? 0 : GAPS }}>
            <ConfigSection colors={colors} isWideScreen={isWideScreen} GAPS={GAPS} allTeams={allTeams} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} teamPlayers={teamPlayers} surfaceType={surfaceType} setSurfaceType={setSurfaceType} pointRoster={pointRoster} setPointRoster={setPointRoster} possessionSide={effectivePossession} setPossessionSide={setPossessionSide} isConfigConfirmed={isConfigConfirmed} hasEvents={events.length > 0} setIsConfigConfirmed={setIsConfigConfirmed} showToast={showToast} matchTitle={matchTitle} updateMatchTitle={updateMatchTitle} fps={fps} setFps={setFps} role={role} hasPermission={(r, p) => isMatchFinished ? false : hasPermission(r, p)} />
            <RosterSection
              colors={colors}
              isWideScreen={isWideScreen}
              GAPS={GAPS}
              isConfigConfirmed={isConfigConfirmed}
              setIsConfigConfirmed={setIsConfigConfirmed}
              selectedTeam={selectedTeam}
              teamPlayers={teamPlayers}
              pointRoster={pointRoster}
              togglePlayerInRoster={togglePlayerInRoster}
              activePlayer={activePlayer}
              setActivePlayer={handleSelectPlayer}
              maxPlayers={maxPlayers}
              tagShortcuts={(isConfigConfirmed || pointRoster.length >= maxPlayers) ? Object.fromEntries(Object.entries(shortcutsMap).map(([k, v]) => [v, k])) : {}}
              role={role}
              hasPermission={(r, p) => isMatchFinished ? false : hasPermission(r, p)}
              onConfirmRoster={() => {
                if (isMatchFinished) return;
                if (pointRoster.length === maxPlayers) {
                  if (isSubstitutionMode) setShowSubChoiceModal(true);
                  else setIsConfigConfirmed(true);
                }
              }}
            />
            <TaggingSection 
              colors={colors} 
              isWideScreen={isWideScreen} 
              GAPS={GAPS} 
              isConfigConfirmed={isConfigConfirmed && !isMatchFinished} 
              role={role} 
              hasPermission={(r, p) => isMatchFinished ? false : hasPermission(r, p)} 
              handleTag={handleTag} 
              tagButtons={tagButtons} 
              tagShortcuts={Object.fromEntries(Object.entries(shortcutsMap).map(([k, v]) => [v, k]))} 
              metaStartTime={metaStartTime} 
              currentTime={currentTime} 
              possessionSide={effectivePossession} 
              handleInjury={handleInjury} 
              isTimeoutActive={isTimeoutActive}
              onFinishMeta={() => handleTag('Meta')}
            />
          </View>
        </View>
        <TimelineSection 
          colors={colors} 
          GAPS={GAPS} 
          events={events} 
          teamPlayers={teamPlayers} 
          expandedMetas={expandedMetas} 
          setExpandedMetas={setExpandedMetas} 
          seekTo={seekTo} 
          deleteEvent={deleteEvent} 
          onEditTime={(ev) => setEditTimeModal({ visible: true, event: ev })} 
          role={role} 
          hasPermission={hasPermission} 
          currentPossession={possessionSide} 
          fps={fps}
          onResetPoint={handleResetPoint}
        />

        {events.some(e => e.label === 'Fine Partita') && (
          <View style={{ paddingHorizontal: isWideScreen ? GAPS * 2 : GAPS }}>
            <MatchStats
              events={events}
              teamPlayers={teamPlayers}
              colors={colors}
              manualData={matchData}
              role={role}
              hasPermission={hasPermission}
              onUpdateStats={async (newData) => {
                setMatchData(prev => ({ ...prev, ...newData }));
                await setDoc(doc(db, 'matches', videoId), newData, { merge: true });
              }}
            />
          </View>
        )}
      </ScrollView>
      <EditTimeModal
        visible={editTimeModal.visible}
        event={editTimeModal.event}
        onClose={() => setEditTimeModal({ visible: false, event: null })}
        onSave={handleUpdateTime}
        colors={colors}
        fps={fps}
      />
      <PlayerActionModal
        visible={actionModal.visible}
        onClose={() => setActionModal({ visible: false, player: null })}
        player={actionModal.player}
        possessionSide={effectivePossession}
        onActionSelect={handlePlayerAction}
        colors={colors}
        lastEvent={[...events].reverse().find(e => e.label.includes('Lancio') || e.label === 'Pull')}
        shortcuts={shortcutsMap}
        customTags={customTags}
      />
      <PremiumToast toast={toast} colors={colors} />

      {/* Modal Scelta Sostituzione */}
      <Modal visible={showSubChoiceModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 320, backgroundColor: colors.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 10 }}>Conferma Sostituzioni</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              I cambiamenti fatti al roster sono dovuti a un infortunio in questo momento o a un errore di inserimento per questa meta?
            </Text>

            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, marginBottom: 10, alignItems: 'center' }}
              onPress={() => handleConfirmSubstitution('Infortunio')}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>🩹 INFORTUNIO</Text>
              <Text style={{ color: 'white', fontSize: 10, opacity: 0.8 }}>Sostituisce da ora in poi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: colors.surface, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              onPress={() => handleConfirmSubstitution('Errore')}
            >
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>✏️ ERRORE ROSTER</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Corregge l'intera meta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 15, alignSelf: 'center' }}
              onPress={() => setShowSubChoiceModal(false)}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, width: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { width: '100%', paddingBottom: 60 },
  contentInner: { width: '100%' },
  playerContainer: { borderRadius: RADIUS, borderWidth: 1, overflow: 'hidden', marginHorizontal: 'auto' },
  videoWrapper: { position: 'relative' },
  popoutBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  }
});
