import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

const TAB_CONFIG: Record<string, {label: string; icon: string}> = {
  Dashboard: {label: '/HOME', icon: '⌂'},
  Logs: {label: '/LOGS', icon: '☰'},
  Config: {label: '/CONF', icon: '⚙'},
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
        const config = TAB_CONFIG[route.name] ?? {label: '/' + route.name.toUpperCase(), icon: '●'};

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
            <View style={styles.iconWrapper}>
              <Text
                style={[
                  styles.icon,
                  {color: isFocused ? colors.green : colors.textMuted},
                ]}>
                {config.icon}
              </Text>
              {isFocused && <View style={styles.indicator} />}
            </View>
            <Text
              style={[
                styles.label,
                {color: isFocused ? colors.green : colors.textMuted},
              ]}>
              {config.label}
            </Text>
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
    height: 72,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 4,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: 4,
  },
  icon: {
    fontFamily: fontFamily.mono,
    fontSize: 22,
  },
  label: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.label,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  indicator: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    height: borderWidth.medium,
    backgroundColor: colors.green,
  },
});

export default CustomTabBar;
