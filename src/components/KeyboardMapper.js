import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const KEY_SIZE = 60;
const KEY_GAP = 8;
const RADIUS = 12;

export default function KeyboardMapper({ shortcuts, onKeyClick, colors }) {
  // QWERTY Layout
  const mainRows = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M']
  ];

  // Numpad Layout
  const numRows = [
    ['P7', 'P8', 'P9'],
    ['P4', 'P5', 'P6'],
    ['P1', 'P2', 'P3'],
    ['P0']
  ];

  const renderKey = (key, isNumpad = false) => {
    const actions = shortcuts[key] || [];
    const actionList = Array.isArray(actions) ? actions : [actions];
    const hasActions = actionList.length > 0;

    return (
      <TouchableOpacity 
        key={key} 
        onPress={() => onKeyClick(key)}
        style={[
          styles.key, 
          { 
            backgroundColor: hasActions ? colors.primary : colors.card,
            borderColor: hasActions ? colors.primary : colors.border,
            width: isNumpad && key === 'P0' ? (KEY_SIZE * 2 + KEY_GAP) : KEY_SIZE,
            height: KEY_SIZE,
            elevation: hasActions ? 5 : 2
          }
        ]}
      >
        <Text style={[styles.keyText, { color: hasActions ? 'white' : colors.text }]}>
          {isNumpad && key.startsWith('P') ? key.substring(1) : key}
        </Text>
        {hasActions && <View style={styles.indicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.boardWrapper}>
        {/* Main Keyboard */}
        <View style={styles.mainBoard}>
          {mainRows.map((row, i) => (
            <View key={i} style={[styles.row, { paddingLeft: i * 20 }]}>
              {row.map(k => renderKey(k))}
            </View>
          ))}
        </View>

        {/* Numpad Section */}
        <View style={[styles.numPad, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.numTitle, { color: colors.textSecondary }]}>NUMPAD</Text>
          {numRows.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map(k => renderKey(k, true))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    width: '100%', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 20 
  },
  boardWrapper: { 
    flexDirection: 'row', 
    gap: 40, 
    flexWrap: 'wrap', 
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  mainBoard: { gap: KEY_GAP },
  numPad: { 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1, 
    gap: KEY_GAP,
    alignItems: 'center'
  },
  numTitle: { fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 2 },
  row: { flexDirection: 'row', gap: KEY_GAP },
  key: { 
    borderRadius: RADIUS, 
    borderWidth: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    position: 'relative'
  },
  keyText: { fontSize: 20, fontWeight: '900' },
  indicator: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    opacity: 0.8
  }
});
