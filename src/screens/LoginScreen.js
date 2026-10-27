import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Image,
  ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginWithCredential, loginWithEmail, registerWithEmail, loginAsGuest, configurePersistence } from '../../firebaseConfig';
import { useTheme } from '../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '487110888787-2a276gcqi0rrihn8o0c085qo7lcjts13.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    prompt: 'consent',
    accessType: 'offline',
    useProxy: Platform.OS !== 'web',
    redirectUri: Platform.OS === 'web' ? window.location.origin : undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { idToken, accessToken, refreshToken, expiresIn } = response.authentication || {};

      if (accessToken) {
        AsyncStorage.setItem('youtube_access_token', accessToken).catch(() => { });
        // Salviamo anche la data di scadenza (approssimativa)
        const expiryTime = Date.now() + (expiresIn || 3600) * 1000;
        AsyncStorage.setItem('youtube_token_expiry', expiryTime.toString()).catch(() => { });
      }

      if (refreshToken) {
        AsyncStorage.setItem('youtube_refresh_token', refreshToken).catch(() => { });
      }

      if (idToken || accessToken) {
        setLoading(true);
        configurePersistence(rememberMe)
          .then(() => loginWithCredential(idToken, accessToken))
          .then(() => setLoading(false))
          .catch(err => {
            setLoading(false);
            console.error('Errore Firebase login:', err);
            window.alert("Errore Login in Firebase: " + err.message);
          });
      } else {
        window.alert("Errore: nessun token ricevuto da Google.");
      }
    }
  }, [response]);

  const handleEmailAuth = async () => {
    if (!email || !password) return window.alert("Inserisci email e password");
    setLoading(true);
    try {
      await configurePersistence(rememberMe);
      if (isRegistering) {
        if (!name.trim()) return window.alert("Inserisci il tuo nome");
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (e) {
      window.alert("Errore: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await loginAsGuest();
    } catch (e) {
      window.alert("Errore Ospite: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.content}>
            <View style={[styles.headerSection, { marginTop: SCREEN_HEIGHT * 0.08 }]}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoMain}
                resizeMode="contain"
              />
              <Text style={[styles.title, { color: colors.text }]}>DiscAnalytix</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {showEmailForm ? (isRegistering ? 'Crea il tuo account' : 'Bentornato!') : 'Scegli come accedere'}
              </Text>
            </View>

            {showEmailForm ? (
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  {isRegistering && (
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      placeholder="Il tuo nome (es: Mario Rossi)"
                      placeholderTextColor={colors.textSecondary}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  )}
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="Email"
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      placeholder="Password"
                      placeholderTextColor={colors.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={{ fontSize: 18 }}>{showPassword ? "🙈" : "👁️"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.rememberRow}>
                  <Text style={[styles.rememberText, { color: colors.text }]}>Ricordami</Text>
                  <Switch
                    value={rememberMe}
                    onValueChange={setRememberMe}
                    trackColor={{ false: isDark ? '#3A3A3C' : '#D1D1D6', true: colors.primary }}
                  />
                </View>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleEmailAuth}>
                  <Text style={styles.actionBtnText}>{isRegistering ? 'Registrati' : 'Accedi'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)} style={styles.linkBtn}>
                  <Text style={[styles.switchText, { color: colors.primary }]}>
                    {isRegistering ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowEmailForm(false)} style={styles.backBtn}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image 
                      source={require('../../assets/arrow.png')} 
                      style={{ width: 14, height: 14, tintColor: colors.textSecondary, transform: [{ rotate: '180deg' }], marginRight: 6 }} 
                    />
                    <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Torna ai metodi di accesso</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={[styles.loginBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => promptAsync()}
                >
                  <View style={styles.iconWrapper}>
                    <Image source={require('../../assets/google.png')} style={styles.icon} />
                  </View>
                  <View style={styles.btnInfo}>
                    <Text style={[styles.loginBtnText, { color: colors.text }]}>Continua con Google</Text>
                    <Text style={[styles.loginBtnSubText, { color: colors.textSecondary }]}>Consigliato per YouTube</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loginBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowEmailForm(true)}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                    <Image source={require('../../assets/mail.png')} style={styles.icon} />
                  </View>
                  <View style={styles.btnInfo}>
                    <Text style={[styles.loginBtnText, { color: colors.text }]}>Accedi con Email</Text>
                    <Text style={[styles.loginBtnSubText, { color: colors.textSecondary }]}>Usa le tue credenziali</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textSecondary }]}>oppure</Text>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity
                  style={[styles.guestBtn, { borderColor: colors.border }]}
                  onPress={handleGuestLogin}
                >
                  <Text style={[styles.guestBtnText, { color: colors.textSecondary }]}>Entra come Ospite</Text>
                </TouchableOpacity>

                <View style={styles.footerRemember}>
                  <Text style={[styles.rememberSmallText, { color: colors.textSecondary }]}>Resta collegato</Text>
                  <Switch
                    value={rememberMe}
                    onValueChange={setRememberMe}
                    trackColor={{ false: isDark ? '#3A3A3C' : '#D1D1D6', true: colors.primary }}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 400, alignSelf: 'center' },

  headerSection: { alignItems: 'center', marginBottom: SCREEN_HEIGHT * 0.08 },
  logoMain: { width: 100, height: 100, marginBottom: 20, borderRadius: 24 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, textAlign: 'center', opacity: 0.8 },

  formContainer: { width: '100%' },
  inputGroup: { gap: 12, marginBottom: 20 },
  input: { padding: 18, borderRadius: 16, borderWidth: 1, fontSize: 16, fontWeight: '500' },
  passwordContainer: { width: '100%', justifyContent: 'center' },
  passwordInput: { paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 15, padding: 5 },

  rememberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4 },
  rememberText: { fontSize: 15, fontWeight: '600' },

  actionBtn: { padding: SCREEN_HEIGHT > 700 ? 20 : 16, borderRadius: 18, alignItems: 'center', marginTop: 8, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
  actionBtnText: { color: 'white', fontWeight: '800', fontSize: 17 },

  linkBtn: { marginTop: 12, padding: 10 },
  switchText: { textAlign: 'center', fontWeight: '700', fontSize: 15 },
  backBtn: { marginTop: 12, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '600' },

  buttonsContainer: { width: '100%', gap: 16 },
  loginBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  icon: { width: 24, height: 24 },
  btnInfo: { flex: 1 },
  loginBtnText: { fontSize: 16, fontWeight: '700' },
  loginBtnSubText: { fontSize: 12, marginTop: 2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  divider: { flex: 1, height: 1, opacity: 0.5 },
  dividerText: { paddingHorizontal: 16, fontSize: 13, fontWeight: '600' },

  guestBtn: { padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', borderStyle: 'dashed' },
  guestBtnText: { fontSize: 15, fontWeight: '600' },

  footerRemember: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, gap: 8 },
  rememberSmallText: { fontSize: 13, fontWeight: '500' },
});
