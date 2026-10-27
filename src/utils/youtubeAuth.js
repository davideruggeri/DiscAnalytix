import AsyncStorage from '@react-native-async-storage/async-storage';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CLIENT_ID = '487110888787-2a276gcqi0rrihn8o0c085qo7lcjts13.apps.googleusercontent.com';

/**
 * Recupera un token YouTube valido. Se quello attuale è scaduto (o sta per scadere),
 * prova a rinnovarlo usando il refresh_token.
 */
export async function getValidYouTubeToken() {
  try {
    const accessToken = await AsyncStorage.getItem('youtube_access_token');
    const expiryStr = await AsyncStorage.getItem('youtube_token_expiry');
    const refreshToken = await AsyncStorage.getItem('youtube_refresh_token');

    if (!accessToken) return null;

    const expiryTime = parseInt(expiryStr || '0', 10);
    // Se il token scade tra meno di 5 minuti, o è già scaduto, facciamo il refresh
    const isExpired = Date.now() > (expiryTime - 300000);

    if (!isExpired) {
      return accessToken;
    }

    if (!refreshToken) {
      console.warn('Token scaduto e nessun refresh_token trovato.');
      return null;
    }

    console.log('🔄 Refreshing YouTube token...');
    
    // Per Expo Auth Session + Google, il refresh si fa via POST all'endpoint di Google
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await response.json();

    if (data.access_token) {
      await AsyncStorage.setItem('youtube_access_token', data.access_token);
      const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;
      await AsyncStorage.setItem('youtube_token_expiry', newExpiry.toString());
      console.log('✅ YouTube token refreshed successfully.');
      return data.access_token;
    } else {
      console.error('❌ Failed to refresh token:', data);
      if (data.error === 'invalid_grant') {
        console.warn('Refresh token is invalid or revoked. User must re-login.');
      }
      return null;
    }
  } catch (error) {
    console.error('❌ Error in getValidYouTubeToken:', error);
    return null;
  }
}
