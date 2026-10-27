import React from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import PopoutPlayerScreen from './src/screens/PopoutPlayerScreen';

export default function App() {
  // Bypass per la modalità pop-out su Web
  const isPopout = typeof window !== 'undefined' && window.location.search.includes('popout=true');

  if (isPopout) {
    return (
      <ThemeProvider>
        <PopoutPlayerScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
