import React from 'react';
import YoutubePlayer from 'react-native-youtube-iframe';

const getYouTubeId = (urlOrId) => {
  if (!urlOrId) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[2].length === 11) ? match[2] : urlOrId;
};

const VideoPlayer = React.forwardRef(({ videoId, isPlaying, setIsPlaying, height, width, onProgress }, ref) => {
  const cleanId = getYouTubeId(videoId);
  const intervalRef = React.useRef(null);

  React.useEffect(() => {
    if (isPlaying && onProgress) {
      intervalRef.current = setInterval(async () => {
        if (ref.current && ref.current.getCurrentTime) {
          try {
            const time = await ref.current.getCurrentTime();
            onProgress(time);
          } catch (e) {
            // Silently fail if player not ready
          }
        }
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, onProgress, ref]);
  
  return (
    <YoutubePlayer
      ref={ref}
      height={height}
      width={width}
      videoId={cleanId}
      play={isPlaying}
      onChangeState={(state) => {
        if (state === 'playing') setIsPlaying(true);
        if (state === 'paused') setIsPlaying(false);
      }}
      webViewProps={{
        allowsFullscreenVideo: true,
        androidLayerType: 'hardware',
      }}
    />
  );
});

export default VideoPlayer;
