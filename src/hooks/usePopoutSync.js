import { useEffect, useRef } from 'react';

export default function usePopoutSync(role, onCommand) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Crea un canale univoco per questa sessione video
    channelRef.current = new BroadcastChannel('disc_analytix_video_sync');

    channelRef.current.onmessage = (event) => {
      if (onCommand) {
        onCommand(event.data);
      }
    };

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [onCommand]);

  const sendCommand = (type, payload) => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type, payload });
    }
  };

  return { sendCommand };
}
