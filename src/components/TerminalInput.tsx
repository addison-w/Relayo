import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardTypeOptions,
} from 'react-native';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

interface TerminalInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

const TerminalInput: React.FC<TerminalInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  rightIcon,
  onRightIconPress,
}) => {
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{'> '}{label.toUpperCase()}:</Text>
      <View
        style={[
          styles.inputContainer,
          {borderColor: focused ? colors.cyan : colors.borderDim},
        ]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={colors.cyan}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {rightIcon && onRightIconPress && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.rightIconText}>{rightIcon}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.cyan,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: borderWidth.thin,
    borderRadius: 0,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rightIcon: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rightIconText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textDim,
  },
});

export default TerminalInput;
