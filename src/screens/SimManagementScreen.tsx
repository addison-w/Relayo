import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import TerminalCard from '../components/TerminalCard';
import TerminalInput from '../components/TerminalInput';
import TerminalButton from '../components/TerminalButton';
import StatusBadge from '../components/StatusBadge';
import ScanlineOverlay from '../components/ScanlineOverlay';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

const SIGNAL_BARS = 4;

const SignalIndicator: React.FC<{level: number; color: string}> = ({
  level,
  color,
}) => (
  <View style={sigStyles.container}>
    {Array.from({length: SIGNAL_BARS}, (_, i) => (
      <View
        key={i}
        style={[
          sigStyles.bar,
          {
            height: 6 + i * 4,
            backgroundColor: i < level ? color : colors.borderDim,
          },
        ]}
      />
    ))}
  </View>
);

const sigStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  bar: {
    width: 4,
    borderRadius: 0,
  },
});

const SimManagementScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [manualNumber, setManualNumber] = useState('');

  const handleSave = () => {
    console.log('[SIM_CFG] EXECUTE_CONFIG_SAVE', {manualNumber});
  };

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>HARDWARE_CFG</Text>
            <Text style={styles.headerSub}>v2.4.1-stable</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>
            {'> '}SYSTEM_DIAGNOSTIC_RUNNING
          </Text>
          <Text style={styles.infoBannerDesc}>
            SIM slot detection via TelephonyManager. Manual override available
            for slots without MSISDN.
          </Text>
        </View>

        <TerminalCard accentColor="green" title="SLOT_01" subtitle="PRIMARY_TRANSCEIVER">
          <View style={styles.simHeader}>
            <StatusBadge status="active" label="ACTIVE" />
            <SignalIndicator level={3} color={colors.green} />
          </View>

          <View style={styles.simGrid}>
            <View style={styles.simRow}>
              <Text style={styles.simLabel}>CARRIER</Text>
              <Text style={styles.simValue}>CARRIER_A</Text>
            </View>
            <View style={styles.simRow}>
              <Text style={styles.simLabel}>MSISDN</Text>
              <Text style={styles.simValueGreen}>+81 90-1234-5678</Text>
            </View>
            <View style={styles.simRow}>
              <Text style={styles.simLabel}>ICCID</Text>
              <Text style={styles.simValueMono}>8981100...</Text>
            </View>
          </View>
        </TerminalCard>

        <View style={styles.cardSpacer} />

        <TerminalCard accentColor="amber" title="SLOT_02" subtitle="SECONDARY_TRANSCEIVER">
          <View style={styles.simHeader}>
            <StatusBadge status="attention" label="ATTENTION" />
            <SignalIndicator level={2} color={colors.amber} />
          </View>

          <View style={styles.simGrid}>
            <View style={styles.simRow}>
              <Text style={styles.simLabel}>CARRIER</Text>
              <Text style={styles.simValue}>CARRIER_B</Text>
            </View>
            <View style={styles.simRow}>
              <Text style={styles.simLabel}>MSISDN</Text>
              <Text style={styles.simValueAmber}>MSISDN_MISSING</Text>
            </View>
            <View style={styles.simRow}>
              <Text style={styles.simLabel}>ICCID</Text>
              <Text style={styles.simValueMono}>8981200...</Text>
            </View>
          </View>

          <View style={styles.manualInput}>
            <TerminalInput
              label="MANUAL_OVERRIDE"
              value={manualNumber}
              onChangeText={setManualNumber}
              placeholder="+XX XXX-XXXX-XXXX"
              keyboardType="phone-pad"
            />
          </View>
        </TerminalCard>

        <View style={styles.cardSpacer} />

        <View style={styles.protocolBox}>
          <Text style={styles.protocolIcon}>⚡</Text>
          <View style={styles.protocolContent}>
            <Text style={styles.protocolTitle}>RELAY_PROTOCOL</Text>
            <Text style={styles.protocolDesc}>
              Incoming SMS from all active slots will be forwarded via the
              configured SMTP relay. Each message includes SIM metadata in
              X-Relayo-Slot headers.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TerminalButton
            label="EXECUTE_CONFIG_SAVE"
            onPress={handleSave}
            variant="primary"
            accentColor="green"
          />
          <Text style={styles.hashCheck}>
            SHA-256 INTEGRITY CHECK: PENDING
          </Text>
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
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.subtitle,
    color: colors.text,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.heading,
    color: colors.amber,
    letterSpacing: 1,
  },
  headerSub: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
    color: colors.textDim,
    marginTop: spacing.xxs,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 36,
  },
  infoBanner: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoBannerTitle: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    color: colors.cyan,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  infoBannerDesc: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    lineHeight: 16,
  },
  simHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  simGrid: {
    gap: spacing.md,
  },
  simRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simLabel: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  simValue: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.text,
  },
  simValueGreen: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    color: colors.green,
    letterSpacing: 0.5,
  },
  simValueAmber: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    color: colors.amber,
    letterSpacing: 0.5,
  },
  simValueMono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
    color: colors.textDim,
  },
  manualInput: {
    marginTop: spacing.lg,
    borderTopWidth: borderWidth.thin,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  cardSpacer: {
    height: spacing.lg,
  },
  protocolBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  protocolIcon: {
    fontSize: fontSize.title,
    marginTop: spacing.xxs,
  },
  protocolContent: {
    flex: 1,
  },
  protocolTitle: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    color: colors.text,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  protocolDesc: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    lineHeight: 16,
  },
  footer: {
    gap: spacing.lg,
  },
  hashCheck: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.8,
  },
});

export default SimManagementScreen;
