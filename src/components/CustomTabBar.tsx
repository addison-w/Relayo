import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

const TAB_LABELS: Record<string, string> = {
  Dashboard: '/HOME',
  Logs: '/LOGS',
  Config: '/CONF',
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const isFocused = state.index === index;
        const label = TAB_LABELS[route.name] ?? '/' + route.name.toUpperCase();

        const handlePress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const handleLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? {selected: true} : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={handlePress}
            onLongPress={handleLongPress}
            style={styles.tab}>
            <Text
              style={[
                styles.label,
                {color: isFocused ? colors.green : colors.textMuted},
              ]}>
              {label}
            </Text>
            {isFocused && <View style={styles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: borderWidth.thin,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    position: 'relative',
  },
  label: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: spacing.xl,
    right: spacing.xl,
    height: borderWidth.medium,
    backgroundColor: colors.green,
  },
});

export default CustomTabBar;
