import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';
import usePopoutSync from '../hooks/usePopoutSync';

export default function PopoutPlayerScreen() {
  const [videoId, setVideoId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const playerRef = useRef(null);
  const currentTimeRef = useRef(0);

  // Recupera videoId dall'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('videoId');
    if (id) setVideoId(id);
  }, []);

  const { sendCommand } = usePopoutSync('receiver', (cmd) => {
    switch (cmd.type) {
      case 'PLAY':
        setIsPlaying(true);
        sendCommand('PLAYING');
        break;
      case 'PAUSE':
        setIsPlaying(false);
        sendCommand('PAUSED');
        break;
      case 'SEEK':
        if (playerRef.current) {
          playerRef.current.seekTo(cmd.payload, 'seconds');
          currentTimeRef.current = cmd.payload;
        }
        break;
    }
  });

  // Gestione tastiera locale nel pop-out
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!playerRef.current) return;
      const curTime = currentTimeRef.current;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const target = Math.max(0, curTime - 1);
        playerRef.current.seekTo(target, 'seconds');
        currentTimeRef.current = target;
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const target = curTime + 10;
        playerRef.current.seekTo(target, 'seconds');
        currentTimeRef.current = target;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Notifica la finestra principale della posizione attuale del video
  const handleProgress = (time) => {
    currentTimeRef.current = time;
    sendCommand('PROGRESS', time);
  };

  if (!videoId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoPlayer
        ref={playerRef}
        videoId={videoId}
        isPlaying={isPlaying}
        setIsPlaying={(val) => {
          setIsPlaying(val);
          sendCommand(val ? 'PLAYING' : 'PAUSED');
        }}
        onProgress={handleProgress}
        width="100%"
        height="100%"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
});
