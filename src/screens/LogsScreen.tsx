import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ScanlineOverlay from '../components/ScanlineOverlay';
import {colors, fontFamily, fontSize, spacing} from '../theme';

const LogsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      <View style={styles.content}>
        <Text style={styles.title}>LOG_VIEWER</Text>
        <Text style={styles.subtitle}>Coming in future release</Text>
        <Text style={styles.prompt}>{'> No log data available'}</Text>
      </View>
      <ScanlineOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.title,
    color: colors.text,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textDim,
    marginBottom: spacing.xl,
  },
  prompt: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
});

export default LogsScreen;
