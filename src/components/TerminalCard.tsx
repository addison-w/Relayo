import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

type AccentColor = 'green' | 'cyan' | 'amber';

interface TerminalCardProps {
  children: React.ReactNode;
  accentColor?: AccentColor;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
}

const accentMap: Record<AccentColor, string> = {
  green: colors.green,
  cyan: colors.cyan,
  amber: colors.amber,
};

const TerminalCard: React.FC<TerminalCardProps> = ({
  children,
  accentColor,
  title,
  subtitle,
  style,
}) => {
  const accent = accentColor ? accentMap[accentColor] : undefined;

  return (
    <View
      style={[
        styles.container,
        accent ? {borderLeftWidth: borderWidth.medium, borderLeftColor: accent} : null,
        style,
      ]}>
      <View style={[styles.cornerDot, styles.cornerTopLeft]} />
      <View style={[styles.cornerDot, styles.cornerTopRight]} />
      <View style={[styles.cornerDot, styles.cornerBottomLeft]} />
      <View style={[styles.cornerDot, styles.cornerBottomRight]} />

      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, accent ? {color: accent} : null]}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
};

const CORNER_SIZE = 3;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.lg,
    position: 'relative',
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.heading,
    color: colors.text,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.xxs,
  },
  cornerDot: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    backgroundColor: colors.border,
  },
  cornerTopLeft: {
    top: -1,
    left: -1,
  },
  cornerTopRight: {
    top: -1,
    right: -1,
  },
  cornerBottomLeft: {
    bottom: -1,
    left: -1,
  },
  cornerBottomRight: {
    bottom: -1,
    right: -1,
  },
});

export default TerminalCard;
