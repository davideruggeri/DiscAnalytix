import React, { useEffect, useRef, useImperativeHandle } from 'react';

const getYouTubeId = (urlOrId) => {
  if (!urlOrId) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[2].length === 11) ? match[2] : urlOrId;
};

const VideoPlayer = React.forwardRef(({ videoId, isPlaying, setIsPlaying, onProgress, height, width }, ref) => {
  const iframeRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const cleanId = getYouTubeId(videoId);

  useEffect(() => {
    if (!cleanId) return;

    function initPlayer() {
      if (iframeRef.current && window.YT && window.YT.Player && !ytPlayerRef.current) {
        ytPlayerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              }
            }
          }
        });
      }
    }

    // Load YT API if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
      
      // La callback globale che YouTube chiama quando lo script è caricato
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }
  }, [cleanId, setIsPlaying]);

  // Sincronizza prop isPlaying con il player reale
  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
      if (isPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

  // Aggiorna il tempo continuamente (onProgress)
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const time = ytPlayerRef.current.getCurrentTime();
          if (onProgress) onProgress(time);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, onProgress]);

  // Espone i metodi al componente padre (AnalysisScreen) tramite ref
  useImperativeHandle(ref, () => ({
    seekTo: (time) => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(time, true);
      }
    },
    getCurrentTime: () => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        return ytPlayerRef.current.getCurrentTime();
      }
      return 0;
    }
  }));

  if (!cleanId) return null;

  return (
    <iframe
      ref={iframeRef}
      id={`ytplayer-${cleanId}`}
      type="text/html"
      width={width || "100%"}
      height={height}
      src={`https://www.youtube.com/embed/${cleanId}?enablejsapi=1&origin=${window.location.origin}&playsinline=1&rel=0`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
});

export default VideoPlayer;
