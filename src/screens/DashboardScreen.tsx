import React, {useCallback, useEffect, useRef, useState} from 'react';
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
import ServiceModule from '../native/NativeServiceModule';
import PermissionModule from '../native/NativePermissionModule';
import type {AppStatus} from '../native/NativeServiceModule';
import type {DiagnosticModule} from '../types';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

const POLL_INTERVAL = 5000;

const buildDiagnostics = (perms: {
  RECEIVE_SMS: boolean;
  READ_SMS: boolean;
  READ_PHONE_STATE: boolean;
  POST_NOTIFICATIONS?: boolean;
}): DiagnosticModule[] => [
  {
    id: 'sms',
    name: 'SMS_ACCESS',
    description: perms.READ_SMS
      ? 'Broadcast receiver bound'
      : 'Permission not granted',
    icon: '📨',
    status: perms.READ_SMS && perms.RECEIVE_SMS ? 'ready' : 'error',
  },
  {
    id: 'phone',
    name: 'PHONE_STATE',
    description: perms.READ_PHONE_STATE
      ? 'Telephony access granted'
      : 'Permission not granted',
    icon: '📱',
    status: perms.READ_PHONE_STATE ? 'ready' : 'warning',
  },
  {
    id: 'notify',
    name: 'NOTIFICATIONS',
    description:
      perms.POST_NOTIFICATIONS !== false
        ? 'Notification channel active'
        : 'Permission not granted',
    icon: '🔔',
    status: perms.POST_NOTIFICATIONS !== false ? 'ready' : 'warning',
  },
];

const DEFAULT_DIAGNOSTICS: DiagnosticModule[] = [
  {
    id: 'sms',
    name: 'SMS_ACCESS',
    description: 'Checking...',
    icon: '📨',
    status: 'unknown',
  },
  {
    id: 'phone',
    name: 'PHONE_STATE',
    description: 'Checking...',
    icon: '📱',
    status: 'unknown',
  },
  {
    id: 'notify',
    name: 'NOTIFICATIONS',
    description: 'Checking...',
    icon: '🔔',
    status: 'unknown',
  },
];

const formatUptime = (startMs: number): string => {
  const elapsed = Date.now() - startMs;
  if (elapsed < 0) {
    return '00h 00m';
  }
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
};

const formatTimestamp = (ms: number): string => {
  const d = new Date(ms);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [isActive, setIsActive] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [lastStatus, setLastStatus] = useState<AppStatus | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [diagnostics, setDiagnostics] =
    useState<DiagnosticModule[]>(DEFAULT_DIAGNOSTICS);
  const [serviceStartTime, setServiceStartTime] = useState<number | null>(null);
  const [uptimeStr, setUptimeStr] = useState('00h 00m');

  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  const pollData = useCallback(async () => {
    try {
      const [running, status, count] = await Promise.all([
        ServiceModule.isServiceRunning(),
        ServiceModule.getLastStatus(),
        ServiceModule.getOutboxCount(),
      ]);
      setIsActive(running);
      setLastStatus(status);
      setOutboxCount(count);
      if (running && serviceStartTime === null) {
        setServiceStartTime(Date.now());
      } else if (!running) {
        setServiceStartTime(null);
      }
    } catch {
      setIsActive(false);
    }
  }, [serviceStartTime]);

  const loadDiagnostics = useCallback(async () => {
    try {
      const perms = await PermissionModule.checkAllPermissions();
      setDiagnostics(buildDiagnostics(perms));
    } catch {
      setDiagnostics(
        DEFAULT_DIAGNOSTICS.map(d => ({
          ...d,
          description: 'Check failed',
          status: 'error' as const,
        })),
      );
    }
  }, []);

  useEffect(() => {
    pollData();
    loadDiagnostics();
    const interval = setInterval(pollData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pollData, loadDiagnostics]);

  useEffect(() => {
    if (!serviceStartTime) {
      setUptimeStr('00h 00m');
      return;
    }
    setUptimeStr(formatUptime(serviceStartTime));
    const interval = setInterval(() => {
      setUptimeStr(formatUptime(serviceStartTime));
    }, 60000);
    return () => clearInterval(interval);
  }, [serviceStartTime]);

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

  const handleToggleService = async () => {
    setToggling(true);
    try {
      if (isActive) {
        await ServiceModule.stopService();
        setIsActive(false);
        setServiceStartTime(null);
      } else {
        await ServiceModule.startService();
        setIsActive(true);
        setServiceStartTime(Date.now());
      }
    } catch {
      // Toggle failed — next poll will correct state
    } finally {
      setToggling(false);
    }
  };

  const spin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinReverse = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const statusColor = isActive ? colors.green : colors.textMuted;

  const lastResultLabel =
    lastStatus?.lastResult === 'success'
      ? 'SEND_SUCCESS'
      : lastStatus?.lastResult === 'failed'
        ? 'SEND_FAILED'
        : 'NO_DATA';

  const lastResultColor =
    lastStatus?.lastResult === 'success' ? colors.green : colors.red;

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
              onPress={handleToggleService}
              disabled={toggling}
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
              <View style={styles.powerIconContainer}>
                <View style={[styles.powerStem, {backgroundColor: statusColor}]} />
                <View style={[styles.powerArc, {borderColor: statusColor}]} />
              </View>
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
            UPTIME: {uptimeStr}
            {outboxCount > 0 ? `  |  OUTBOX: ${outboxCount}` : ''}
          </Text>
        </View>

        <TerminalCard accentColor="cyan" title="DIAGNOSTICS" subtitle="SYSTEM_MODULE_STATUS">
          <DiagnosticsTable modules={diagnostics} />
        </TerminalCard>

        <View style={styles.sectionSpacer} />

        <TerminalCard accentColor="green" title="LAST_EXEC_LOG" subtitle="MOST_RECENT_RELAY">
          <View style={styles.logBox}>
            <View style={styles.logLine}>
              <Text style={styles.logPrompt}>$ </Text>
              <Text style={styles.logCmd}>timestamp --utc</Text>
            </View>
            <Text style={styles.logOutputGreen}>
              {lastStatus?.lastAttemptAt
                ? formatTimestamp(lastStatus.lastAttemptAt)
                : 'N/A'}
            </Text>

            <View style={[styles.logLine, styles.logLineSpaced]}>
              <Text style={styles.logPrompt}>$ </Text>
              <Text style={styles.logCmd}>check_result</Text>
            </View>
            <View style={styles.resultRow}>
              <Animated.View
                style={[styles.pulsingDot, {opacity: pulseOpacity}]}
              />
              <Text
                style={[
                  styles.logSuccess,
                  {color: lastStatus ? lastResultColor : colors.textDim},
                ]}>
                {'>>'} {lastResultLabel}
              </Text>
            </View>

            {lastStatus?.lastErrorShort && (
              <>
                <View style={[styles.logLine, styles.logLineSpaced]}>
                  <Text style={styles.logPrompt}>$ </Text>
                  <Text style={styles.logCmd}>cat error.log</Text>
                </View>
                <Text style={styles.logOutputError}>
                  {lastStatus.lastErrorShort}
                </Text>
              </>
            )}
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
  powerIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  powerStem: {
    width: 3,
    height: 16,
    position: 'absolute',
    top: 0,
    zIndex: 1,
  },
  powerArc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderTopColor: 'transparent',
    position: 'absolute',
    top: 6,
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
  logOutputError: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.red,
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
