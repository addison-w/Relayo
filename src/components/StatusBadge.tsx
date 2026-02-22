import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

type BadgeStatus =
  | 'ready'
  | 'warning'
  | 'error'
  | 'granted'
  | 'pending'
  | 'active'
  | 'attention';

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
}

interface StatusConfig {
  color: string;
  text: string;
  dim: boolean;
  strikethrough: boolean;
  glow: boolean;
}

const statusConfigMap: Record<BadgeStatus, StatusConfig> = {
  ready: {
    color: colors.green,
    text: 'READY',
    dim: false,
    strikethrough: false,
    glow: false,
  },
  warning: {
    color: colors.amber,
    text: 'WARNING',
    dim: false,
    strikethrough: false,
    glow: false,
  },
  error: {
    color: colors.red,
    text: 'ERROR',
    dim: false,
    strikethrough: false,
    glow: false,
  },
  granted: {
    color: colors.textMuted,
    text: 'GRANTED',
    dim: true,
    strikethrough: true,
    glow: false,
  },
  pending: {
    color: colors.textDim,
    text: 'PENDING',
    dim: true,
    strikethrough: false,
    glow: false,
  },
  active: {
    color: colors.green,
    text: 'ACTIVE',
    dim: false,
    strikethrough: false,
    glow: true,
  },
  attention: {
    color: colors.amber,
    text: 'ATTENTION',
    dim: false,
    strikethrough: false,
    glow: false,
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({status, label}) => {
  const config = statusConfigMap[status];
  const displayText = label?.toUpperCase() ?? config.text;

  const containerStyle: ViewStyle[] = [
    styles.container,
    {borderColor: config.color},
    config.dim ? styles.dimContainer : {},
    config.glow ? {
      shadowColor: config.color,
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.6,
      shadowRadius: 4,
      elevation: 4,
    } : {},
  ];

  return (
    <View style={containerStyle}>
      <Text
        style={[
          styles.text,
          {color: config.color},
          config.strikethrough && styles.strikethrough,
        ]}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: borderWidth.thin,
    borderRadius: 0,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  dimContainer: {
    borderColor: colors.borderDim,
  },
  text: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.micro,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
});

export default StatusBadge;
