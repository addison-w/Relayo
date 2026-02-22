import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import TerminalCard from '../components/TerminalCard';
import DiagnosticsTable from '../components/DiagnosticsTable';
import ScanlineOverlay from '../components/ScanlineOverlay';
import type {DiagnosticModule} from '../types';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

const MOCK_DIAGNOSTICS: DiagnosticModule[] = [
  {
    id: 'sms',
    name: 'SMS_ACCESS',
    description: 'Broadcast receiver bound',
    icon: '📨',
    status: 'ready',
  },
  {
    id: 'battery',
    name: 'BATTERY_OP',
    description: 'Optimization bypassed',
    icon: '🔋',
    status: 'ready',
  },
  {
    id: 'net',
    name: 'NET_SOCKET',
    description: 'SMTP connection pool active',
    icon: '🌐',
    status: 'ready',
  },
];

const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [isActive, setIsActive] = useState(true);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [cursorOpacity]);

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotate.start();
    return () => rotate.stop();
  }, [ringRotation]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseOpacity]);

  const spin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinReverse = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const statusColor = isActive ? colors.green : colors.textMuted;

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Relayo.sh</Text>
            <Text style={styles.headerVersion}>v2.4.1-stable</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.powerContainer}>
            <Animated.View
              style={[
                styles.outerRing,
                {
                  borderColor: statusColor,
                  transform: [{rotate: spin}],
                },
              ]}>
              <View style={[styles.ringDash, {backgroundColor: statusColor}]} />
              <View
                style={[
                  styles.ringDash,
                  styles.ringDashBottom,
                  {backgroundColor: statusColor},
                ]}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.innerRing,
                {
                  borderColor: statusColor,
                  transform: [{rotate: spinReverse}],
                  opacity: 0.4,
                },
              ]}>
              <View style={[styles.ringDash2, {backgroundColor: statusColor}]} />
            </Animated.View>

            <TouchableOpacity
              style={[styles.powerButton, {borderColor: statusColor}]}
              onPress={() => setIsActive(prev => !prev)}
              activeOpacity={0.8}>
              <Animated.View
                style={[
                  styles.powerGlow,
                  {
                    backgroundColor: statusColor,
                    opacity: isActive ? pulseOpacity : 0.1,
                  },
                ]}
              />
              <Text style={[styles.powerIcon, {color: statusColor}]}>⏻</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusText, {color: statusColor}]}>
              {isActive ? 'SYSTEM ACTIVE' : 'SYSTEM INACTIVE'}
            </Text>
            <Animated.Text
              style={[
                styles.statusCursor,
                {color: statusColor, opacity: cursorOpacity},
              ]}>
              █
            </Animated.Text>
          </View>

          <Text style={styles.uptimeText}>
            UPTIME: {isActive ? '42h 12m' : '00h 00m'}
          </Text>
        </View>

        <TerminalCard accentColor="cyan" title="DIAGNOSTICS" subtitle="SYSTEM_MODULE_STATUS">
          <DiagnosticsTable modules={MOCK_DIAGNOSTICS} />
        </TerminalCard>

        <View style={styles.sectionSpacer} />

        <TerminalCard accentColor="green" title="LAST_EXEC_LOG" subtitle="MOST_RECENT_RELAY">
          <View style={styles.logBox}>
            <View style={styles.logLine}>
              <Text style={styles.logPrompt}>$ </Text>
              <Text style={styles.logCmd}>timestamp --utc</Text>
            </View>
            <Text style={styles.logOutputGreen}>2026-02-22T14:32:07Z</Text>

            <View style={[styles.logLine, styles.logLineSpaced]}>
              <Text style={styles.logPrompt}>$ </Text>
              <Text style={styles.logCmd}>cat payload.txt</Text>
            </View>
            <Text style={styles.logOutputCyan}>
              &quot;Your verification code is 847291...&quot;
            </Text>

            <View style={[styles.logLine, styles.logLineSpaced]}>
              <Text style={styles.logPrompt}>$ </Text>
              <Text style={styles.logCmd}>check_result</Text>
            </View>
            <View style={styles.resultRow}>
              <Animated.View
                style={[styles.pulsingDot, {opacity: pulseOpacity}]}
              />
              <Text style={styles.logSuccess}>{'>>'} SEND_SUCCESS</Text>
            </View>
          </View>
        </TerminalCard>
      </ScrollView>
      <ScanlineOverlay />
    </View>
  );
};

const POWER_SIZE = 100;
const OUTER_RING_SIZE = 150;
const INNER_RING_SIZE = 130;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
  },
  headerTitle: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.title,
    color: colors.text,
    letterSpacing: 1,
  },
  headerVersion: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    marginTop: spacing.xxs,
    letterSpacing: 0.5,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.subtitle,
    color: colors.textDim,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    paddingVertical: spacing.xl,
  },
  powerContainer: {
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  outerRing: {
    position: 'absolute',
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    borderWidth: borderWidth.thin,
    borderRadius: OUTER_RING_SIZE / 2,
    borderStyle: 'dashed',
  },
  innerRing: {
    position: 'absolute',
    width: INNER_RING_SIZE,
    height: INNER_RING_SIZE,
    borderWidth: borderWidth.thin,
    borderRadius: INNER_RING_SIZE / 2,
  },
  ringDash: {
    position: 'absolute',
    width: 8,
    height: 2,
    top: -1,
    left: '50%',
    marginLeft: -4,
  },
  ringDashBottom: {
    top: undefined,
    bottom: -1,
  },
  ringDash2: {
    position: 'absolute',
    width: 6,
    height: 2,
    right: -1,
    top: '50%',
    marginTop: -1,
  },
  powerButton: {
    width: POWER_SIZE,
    height: POWER_SIZE,
    borderWidth: borderWidth.medium,
    borderRadius: POWER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  powerGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
  },
  powerIcon: {
    fontSize: 36,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusText: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.subtitle,
    letterSpacing: 2,
  },
  statusCursor: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.subtitle,
    marginLeft: spacing.xs,
  },
  uptimeText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    letterSpacing: 1,
  },
  sectionSpacer: {
    height: spacing.lg,
  },
  logBox: {
    backgroundColor: colors.bg,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.md,
  },
  logLine: {
    flexDirection: 'row',
  },
  logLineSpaced: {
    marginTop: spacing.md,
  },
  logPrompt: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  logCmd: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textDim,
  },
  logOutputGreen: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.green,
    marginTop: spacing.xxs,
    marginLeft: spacing.lg,
  },
  logOutputCyan: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.cyan,
    marginTop: spacing.xxs,
    marginLeft: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
    marginLeft: spacing.lg,
    gap: spacing.sm,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  logSuccess: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    color: colors.green,
    letterSpacing: 0.5,
  },
});

export default DashboardScreen;
