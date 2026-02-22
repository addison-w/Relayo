import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  AppState,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import PermissionModule from '../native/NativePermissionModule';
import TerminalButton from '../components/TerminalButton';
import StatusBadge from '../components/StatusBadge';
import ScanlineOverlay from '../components/ScanlineOverlay';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

type PermissionStepStatus = 'pending' | 'granted';

interface PermissionStep {
  id: string;
  number: string;
  title: string;
  description: string;
  module: string;
  status: PermissionStepStatus;
  accentColor: 'green' | 'cyan' | 'amber' | 'text';
  type: 'runtime' | 'special' | 'install';
}

const INITIAL_STEPS: PermissionStep[] = [
  {
    id: 'sms',
    number: '01',
    title: 'PERMISSION_SMS',
    description: 'Required for payload interception',
    module: 'android.permission.RECEIVE_SMS + READ_SMS',
    status: 'pending',
    accentColor: 'green',
    type: 'runtime',
  },
  {
    id: 'notify',
    number: '02',
    title: 'PERMISSION_NOTIFY',
    description: 'Log output enabled',
    module: 'android.permission.POST_NOTIFICATIONS',
    status: 'pending',
    accentColor: 'green',
    type: 'runtime',
  },
  {
    id: 'phone_state',
    number: '03',
    title: 'PERMISSION_PHONE_STATE',
    description: 'SIM card identification',
    module: 'android.permission.READ_PHONE_STATE',
    status: 'pending',
    accentColor: 'green',
    type: 'runtime',
  },
  {
    id: 'battery',
    number: '04',
    title: 'OVERRIDE_BATTERY_OPT',
    description: 'Ensure continuous uptime',
    module: 'android.permission.REQUEST_IGNORE_BATTERY',
    status: 'pending',
    accentColor: 'cyan',
    type: 'special',
  },
  {
    id: 'autostart',
    number: '05',
    title: 'ENABLE_AUTOSTART',
    description: 'Initialize on system boot',
    module: 'android.permission.RECEIVE_BOOT_COMPLETED',
    status: 'granted',
    accentColor: 'green',
    type: 'install',
  },
  {
    id: 'fg_svc',
    number: '06',
    title: 'FOREGROUND_SVC',
    description: 'Persistent monitoring service',
    module: 'android.permission.FOREGROUND_SERVICE',
    status: 'granted',
    accentColor: 'green',
    type: 'install',
  },
];

const accentColorMap = {
  green: colors.green,
  cyan: colors.cyan,
  amber: colors.amber,
  text: colors.text,
} as const;

const OnboardingScreen: React.FC<Props> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const [steps, setSteps] = useState<PermissionStep[]>(INITIAL_STEPS);
  const [loading, setLoading] = useState(true);

  const grantedCount = steps.filter(s => s.status === 'granted').length;
  const allGranted = grantedCount === steps.length;
  const progressWidth = `${(grantedCount / steps.length) * 100}%` as const;

  const checkPermissions = useCallback(async () => {
    try {
      const status = await PermissionModule.checkAllPermissions();
      setSteps(prev =>
        prev.map(step => {
          if (step.type === 'install') return step;

          switch (step.id) {
            case 'sms':
              return {
                ...step,
                status:
                  status.RECEIVE_SMS && status.READ_SMS ? 'granted' : 'pending',
              };
            case 'notify':
              return {
                ...step,
                status: status.POST_NOTIFICATIONS ? 'granted' : 'pending',
              };
            case 'phone_state':
              return {
                ...step,
                status: status.READ_PHONE_STATE ? 'granted' : 'pending',
              };
            case 'battery':
              return {
                ...step,
                status: status.BATTERY_OPTIMIZED ? 'granted' : 'pending',
              };
            default:
              return step;
          }
        }),
      );
    } catch {
      // Native module unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        checkPermissions();
      }
    });
    return () => sub.remove();
  }, [checkPermissions]);

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

  const requestSmsPermissions = async () => {
    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      ]);
      const allGranted =
        results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.READ_SMS] ===
          PermissionsAndroid.RESULTS.GRANTED;
      if (allGranted) {
        updateStepStatus('sms', 'granted');
      }
    } catch {
      // Fallback to app settings if request fails
      await PermissionModule.openAppSettings();
    }
  };

  const requestNotificationPermission = async () => {
    if (Number(Platform.Version) < 33) {
      updateStepStatus('notify', 'granted');
      return;
    }
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        updateStepStatus('notify', 'granted');
      }
    } catch {
      await PermissionModule.openAppSettings();
    }
  };

  const requestPhoneStatePermission = async () => {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        updateStepStatus('phone_state', 'granted');
      }
    } catch {
      await PermissionModule.openAppSettings();
    }
  };

  const requestBatteryOptimization = async () => {
    await PermissionModule.openBatteryOptimizationSettings();
  };

  const updateStepStatus = (stepId: string, status: PermissionStepStatus) => {
    setSteps(prev =>
      prev.map(s => (s.id === stepId ? {...s, status} : s)),
    );
  };

  const handleExecute = async (stepId: string) => {
    switch (stepId) {
      case 'sms':
        await requestSmsPermissions();
        break;
      case 'notify':
        await requestNotificationPermission();
        break;
      case 'phone_state':
        await requestPhoneStatePermission();
        break;
      case 'battery':
        await requestBatteryOptimization();
        break;
      default:
        break;
    }
    await checkPermissions();
  };

  const handleProceed = () => {
    navigation.replace('MainTabs', {screen: 'Dashboard'});
  };

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.versionString}>SYS_INIT_SEQ_V.1.0.4</Text>
          <StatusBadge
            status={loading ? 'pending' : allGranted ? 'ready' : 'pending'}
            label={loading ? 'SCANNING' : allGranted ? 'READY' : 'PENDING'}
          />
        </View>

        <View style={styles.asciiContainer}>
          <Text style={styles.asciiArt}>
            {'██████╗ ███████╗██╗      █████╗ ██╗   ██╗ ██████╗\n'}
            {'██╔══██╗██╔════╝██║     ██╔══██╗╚██╗ ██╔╝██╔═══██╗\n'}
            {'██████╔╝█████╗  ██║     ███████║ ╚████╔╝ ██║   ██║\n'}
            {'██╔══██╗██╔══╝  ██║     ██╔══██║  ╚██╔╝  ██║   ██║\n'}
            {'██║  ██║███████╗███████╗██║  ██║   ██║   ╚██████╔╝\n'}
            {'╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝'}
          </Text>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>SYSTEM INITIALIZATION</Text>
          <Animated.Text style={[styles.cursor, {opacity: cursorOpacity}]}>
            █
          </Animated.Text>
        </View>

        <Text style={styles.subtitle}>
          {'> Initializing boot sequence...'}
        </Text>
        <Text style={styles.subtitle}>
          {'> Requesting user authorization'}
        </Text>

        <View style={styles.divider} />

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const isGranted = step.status === 'granted';
            const accent = accentColorMap[step.accentColor];
            const isLast = index === steps.length - 1;

            return (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepTimeline}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isGranted
                          ? colors.textMuted
                          : accent,
                        borderColor: isGranted ? colors.textMuted : accent,
                      },
                    ]}
                  />
                  {!isLast && (
                    <View
                      style={[
                        styles.stepLine,
                        {
                          borderColor: isGranted
                            ? colors.borderDim
                            : colors.border,
                        },
                      ]}
                    />
                  )}
                </View>

                <View style={styles.stepContent}>
                  <View style={styles.stepHeader}>
                    <Text
                      style={[
                        styles.stepNumber,
                        {color: isGranted ? colors.textMuted : accent},
                      ]}>
                      {step.number}
                    </Text>
                    <Text
                      style={[
                        styles.stepTitle,
                        isGranted && styles.stepTitleGranted,
                        !isGranted && {color: accent},
                      ]}>
                      {step.title}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepDesc,
                      isGranted && styles.stepDescGranted,
                    ]}>
                    {step.description}
                  </Text>
                  <Text style={styles.stepModule}>{step.module}</Text>

                  <View style={styles.stepAction}>
                    {isGranted ? (
                      <StatusBadge status="granted" label="✓ GRANTED" />
                    ) : (
                      <TerminalButton
                        label="EXECUTE"
                        onPress={() => handleExecute(step.id)}
                        variant="primary"
                        accentColor={
                          step.accentColor === 'text'
                            ? 'green'
                            : step.accentColor
                        }
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>AUTHORIZATION_PROGRESS</Text>
              <Text style={styles.progressCount}>
                {grantedCount}/{steps.length}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, {width: progressWidth}]}
              />
            </View>
          </View>

          <TerminalButton
            label={allGranted ? 'PROCEED' : 'AWAITING_PERMISSIONS'}
            onPress={handleProceed}
            variant={allGranted ? 'primary' : 'disabled'}
          />
        </View>
      </ScrollView>
      <ScanlineOverlay />
    </View>
  );
};

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
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  versionString: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    letterSpacing: 0.5,
  },
  asciiContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
  },
  asciiArt: {
    fontFamily: fontFamily.monoBold,
    fontSize: 6,
    color: colors.green,
    lineHeight: 8,
    letterSpacing: -0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.title,
    color: colors.text,
    letterSpacing: 1,
  },
  cursor: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.title,
    color: colors.green,
    marginLeft: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textDim,
    lineHeight: 20,
  },
  divider: {
    borderTopWidth: borderWidth.thin,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: spacing.xxl,
  },
  stepsContainer: {
    marginBottom: spacing.xxl,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepTimeline: {
    width: spacing.xxl,
    alignItems: 'center',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 0,
    borderWidth: borderWidth.thin,
    marginTop: spacing.xxs,
  },
  stepLine: {
    flex: 1,
    width: 0,
    borderLeftWidth: borderWidth.thin,
    borderStyle: 'dashed',
    marginVertical: spacing.xxs,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.xl,
    paddingLeft: spacing.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepNumber: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.label,
    letterSpacing: 1,
  },
  stepTitle: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.heading,
    color: colors.text,
    letterSpacing: 0.8,
  },
  stepTitleGranted: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  stepDesc: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    marginTop: spacing.xs,
    letterSpacing: 0.3,
  },
  stepDescGranted: {
    color: colors.textMuted,
  },
  stepModule: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  stepAction: {
    marginTop: spacing.md,
  },
  footer: {
    gap: spacing.lg,
  },
  progressContainer: {
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    letterSpacing: 0.5,
  },
  progressCount: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.label,
    color: colors.green,
    letterSpacing: 1,
  },
  progressTrack: {
    height: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: 0,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
  },
});

export default OnboardingScreen;
