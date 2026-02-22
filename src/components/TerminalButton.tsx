import React, {useRef, useCallback} from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  View,
} from 'react-native';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

type AccentColor = 'green' | 'cyan' | 'amber';
type Variant = 'primary' | 'secondary' | 'disabled';

interface TerminalButtonProps {
  label: string;
  onPress: () => void;
  variant: Variant;
  accentColor?: AccentColor;
  icon?: string;
  loading?: boolean;
}

const accentMap: Record<AccentColor, string> = {
  green: colors.green,
  cyan: colors.cyan,
  amber: colors.amber,
};

const TerminalButton: React.FC<TerminalButtonProps> = ({
  label,
  onPress,
  variant,
  accentColor = 'green',
  icon,
  loading = false,
}) => {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const accent = accentMap[accentColor];

  const handlePressIn = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const isDisabled = variant === 'disabled' || loading;

  const bgColor =
    variant === 'primary'
      ? pressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['transparent', accent],
        })
      : 'transparent';

  const borderColor =
    variant === 'primary'
      ? accent
      : variant === 'secondary'
        ? pressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [accent, accent],
          })
        : colors.borderDim;

  const textColor =
    variant === 'primary'
      ? accent
      : variant === 'secondary'
        ? accent
        : colors.textMuted;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            borderColor: borderColor,
          },
          isDisabled && styles.disabled,
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color={accent} />
        ) : (
          <View style={styles.content}>
            {icon && <Text style={[styles.icon, {color: textColor}]}>{icon}</Text>}
            <Text style={[styles.label, {color: textColor}]}>
              {'[ '}
              {label.toUpperCase()}
              {' ]'}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: borderWidth.thin,
    borderRadius: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  icon: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
  },
  disabled: {
    opacity: 0.4,
  },
});

export default TerminalButton;
