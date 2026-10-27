import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // Default dark

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then(val => {
      if (val !== null) setIsDark(val === 'dark');
    });
  }, []);

  const toggleTheme = () => {
    const newVal = !isDark;
    setIsDark(newVal);
    AsyncStorage.setItem('theme_mode', newVal ? 'dark' : 'light');
  };

  const colors = isDark ? darkPalette : lightPalette;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

const darkPalette = {
  background: '#121212',
  card: '#1E1E1E',
  header: '#1E1E2E',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#888',
  primary: '#0A84FF',
  accent: '#FF9F0A',
  danger: '#FF3B30',
  surface: '#2C2C2E',
  input: '#1E1E1E',
  inputText: '#FFF'
};

const lightPalette = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  header: '#FFFFFF',
  border: '#E5E5EA',
  text: '#000000',
  textSecondary: '#666',
  primary: '#007AFF',
  accent: '#FF9500',
  danger: '#FF3824',
  surface: '#FFFFFF',
  input: '#F2F2F7',
  inputText: '#000'
};
