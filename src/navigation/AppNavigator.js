import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useTheme } from '../context/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import MainScreen from '../screens/MainScreen';
import ChannelScreen from '../screens/ChannelScreen';
import AdminScreen from '../screens/AdminScreen';
import MatchesScreen from '../screens/MatchesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import EventTypesScreen from '../screens/EventTypesScreen';
import TeamsScreen from '../screens/TeamsScreen';
import DataAnalysisScreen from '../screens/DataAnalysisScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark, colors } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#121212' : '#F2F2F7' }]}>
        <ActivityIndicator size="large" color={isDark ? '#0A84FF' : '#007AFF'} />
      </View>
    );
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.header,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerShown: false,
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: ({ canGoBack, tintColor }) => canGoBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
              <Image
                source={require('../../assets/arrow.png')}
                style={{ marginLeft: 10, width: 16, height: 16, tintColor, transform: [{ rotate: '180deg' }] }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : null,
        })}
      >
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen
              name="Channel"
              component={ChannelScreen}
              options={{ headerShown: true, title: '📡 Canale YouTube' }}
            />
            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{ headerShown: true, title: '🛡️ Gestione Ruoli' }}
            />
            <Stack.Screen
              name="Matches"
              component={MatchesScreen}
              options={{ headerShown: true, title: '🎬 Archivio Analisi' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: '⚙️ Impostazioni' }}
            />
            <Stack.Screen
              name="Analysis"
              component={AnalysisScreen}
              options={{ headerShown: true, title: '🎬 Analisi Video' }}
            />
            <Stack.Screen
              name="EventTypes"
              component={EventTypesScreen}
              options={{ headerShown: true, title: '🏷️ Gestione Eventi' }}
            />
            <Stack.Screen
              name="Teams"
              component={TeamsScreen}
              options={{ headerShown: true, title: '🛡️ Gestione Squadre' }}
            />
            <Stack.Screen
              name="DataAnalysis"
              component={DataAnalysisScreen}
              options={{ headerShown: true, title: '📊 Analisi Avanzata' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
