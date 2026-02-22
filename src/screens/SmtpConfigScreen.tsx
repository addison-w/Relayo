import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {ConfigStackParamList} from '../navigation/types';
import TerminalInput from '../components/TerminalInput';
import TerminalButton from '../components/TerminalButton';
import ScanlineOverlay from '../components/ScanlineOverlay';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

type NavProp = NativeStackNavigationProp<ConfigStackParamList, 'SmtpConfig'>;

const SmtpConfigScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [useSsl, setUseSsl] = useState(false);
  const [useStartTls, setUseStartTls] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = () => {
    console.log('[SMTP_CONFIG] SAVE_CONFIG', {
      host,
      port,
      username,
      fromEmail,
      toEmail,
      useSsl,
      useStartTls,
    });
  };

  const handleTest = () => {
    console.log('[SMTP_CONFIG] TEST_SMTP', {host, port, username});
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
            <Text style={styles.headerTitle}>[CONFIG_PROTOCOL]</Text>
            <Text style={styles.headerSub}>SMTP_RELAY_SETTINGS</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.formSection}>
          <TerminalInput
            label="SMTP_HOST"
            value={host}
            onChangeText={setHost}
            placeholder="smtp.example.com"
            keyboardType="url"
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="SMTP_PORT"
            value={port}
            onChangeText={setPort}
            placeholder="587"
            keyboardType="numeric"
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="USER_IDENTITY"
            value={username}
            onChangeText={setUsername}
            placeholder="usr@domain.tld"
            keyboardType="email-address"
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="AUTH_TOKEN"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? '◉' : '◎'}
            onRightIconPress={() => setShowPassword(prev => !prev)}
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="FROM_EMAIL"
            value={fromEmail}
            onChangeText={setFromEmail}
            placeholder="from@domain.tld"
            keyboardType="email-address"
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="TO_EMAIL"
            value={toEmail}
            onChangeText={setToEmail}
            placeholder="to@domain.tld"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.toggleSection}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.togglePrefix}>{'> '}</Text>
              <Text style={styles.toggleName}>ENABLE_SSL</Text>
            </View>
            <Switch
              value={useSsl}
              onValueChange={setUseSsl}
              trackColor={{false: colors.border, true: colors.greenDim}}
              thumbColor={useSsl ? colors.green : colors.textDim}
            />
          </View>

          <View style={styles.toggleDivider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.togglePrefix}>{'> '}</Text>
              <Text style={styles.toggleName}>USE_STARTTLS</Text>
            </View>
            <Switch
              value={useStartTls}
              onValueChange={setUseStartTls}
              trackColor={{false: colors.border, true: colors.greenDim}}
              thumbColor={useStartTls ? colors.green : colors.textDim}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TerminalButton
            label="SAVE_CONFIG"
            onPress={handleSave}
            variant="primary"
            accentColor="green"
          />
          <View style={styles.footerSpacer} />
          <TerminalButton
            label="TEST_SMTP()"
            onPress={handleTest}
            variant="secondary"
            accentColor="cyan"
          />
        </View>

        <View style={styles.navSection}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => navigation.navigate('SimManagement')}
            activeOpacity={0.7}>
            <Text style={styles.navBtnLabel}>{'> '} HARDWARE_CFG</Text>
            <Text style={styles.navBtnArrow}>→</Text>
          </TouchableOpacity>
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
    color: colors.cyan,
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
  formSection: {
    marginBottom: spacing.xxl,
  },
  fieldSpacer: {
    height: spacing.lg,
  },
  toggleSection: {
    borderTopWidth: borderWidth.thin,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
    paddingTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  togglePrefix: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.cyan,
  },
  toggleName: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    color: colors.text,
    letterSpacing: 0.8,
  },
  toggleDivider: {
    borderBottomWidth: borderWidth.thin,
    borderBottomColor: colors.borderDim,
  },
  footer: {
    marginBottom: spacing.xxl,
  },
  footerSpacer: {
    height: spacing.md,
  },
  navSection: {
    borderTopWidth: borderWidth.thin,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  navBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: borderWidth.thin,
    borderColor: colors.borderDim,
    borderRadius: 0,
    padding: spacing.lg,
  },
  navBtnLabel: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    color: colors.amber,
    letterSpacing: 0.8,
  },
  navBtnArrow: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.subtitle,
    color: colors.amber,
  },
});

export default SmtpConfigScreen;
