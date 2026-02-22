import React, {useEffect, useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {ConfigStackParamList} from '../navigation/types';
import SmtpModule from '../native/NativeSmtpModule';
import TerminalInput from '../components/TerminalInput';
import TerminalButton from '../components/TerminalButton';
import ScanlineOverlay from '../components/ScanlineOverlay';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

type NavProp = NativeStackNavigationProp<ConfigStackParamList, 'SmtpConfig'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (value: string): boolean =>
  EMAIL_REGEX.test(value.trim());

const isValidPort = (value: string): boolean => {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && num <= 65535 && String(num) === value.trim();
};

const SmtpConfigScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [useSsl, setUseSsl] = useState(true);
  const [useStartTls, setUseStartTls] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => (text: string) => {
    setTouched(prev => ({...prev, [field]: true}));
    switch (field) {
      case 'host': return setHost(text);
      case 'port': return setPort(text.replace(/[^0-9]/g, ''));
      case 'username': return setUsername(text);
      case 'password':
        setHasSavedPassword(false);
        return setPassword(text);
      case 'fromEmail': return setFromEmail(text);
      case 'toEmail': return setToEmail(text);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const config = await SmtpModule.loadConfig();
        if (config) {
          setHost(config.host);
          setPort(String(config.port));
          setUsername(config.username);
          if (config.hasPassword) {
            setHasSavedPassword(true);
          }
          setFromEmail(config.fromEmail);
          setToEmail(config.toEmail);
          setUseSsl(config.useSsl);
          setUseStartTls(config.useStartTls);
        }
      } catch {
        Alert.alert('ERR_LOAD_CONFIG', 'Failed to load saved configuration.');
      } finally {
        setLoadingConfig(false);
      }
    };
    load();
  }, []);

  const errors = useMemo(() => {
    const e: Record<string, string | undefined> = {};
    if (touched.port && port.length > 0 && !isValidPort(port)) {
      e.port = 'Valid port range: 1–65535';
    }
    if (touched.fromEmail && fromEmail.length > 0 && !isValidEmail(fromEmail)) {
      e.fromEmail = 'Invalid email format';
    }
    if (touched.toEmail && toEmail.length > 0 && !isValidEmail(toEmail)) {
      e.toEmail = 'Invalid email format';
    }
    return e;
  }, [port, fromEmail, toEmail, touched]);

  const hasConnectionFields =
    host.trim().length > 0 &&
    port.trim().length > 0 && isValidPort(port) &&
    username.trim().length > 0 &&
    (password.length > 0 || hasSavedPassword);

  const hasAllFields =
    hasConnectionFields &&
    fromEmail.trim().length > 0 && isValidEmail(fromEmail) &&
    toEmail.trim().length > 0 && isValidEmail(toEmail);

  const canTest = hasConnectionFields;
  const canSave = hasAllFields;

  const handleSave = async () => {
    setSaving(true);
    try {
      await SmtpModule.saveConfig({
        host,
        port: parseInt(port, 10) || 0,
        username,
        password,
        fromEmail,
        toEmail,
        useSsl,
        useStartTls,
      });
      Alert.alert('CONFIG_SAVED', 'SMTP configuration stored successfully.');
    } catch {
      Alert.alert('ERR_SAVE', 'Failed to save SMTP configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const success = await SmtpModule.testConnection({
        host,
        port: parseInt(port, 10) || 0,
        username,
        password,
        fromEmail,
        toEmail,
        useSsl,
        useStartTls,
      });
      if (success) {
        Alert.alert('TEST_PASS', 'SMTP connection authenticated successfully.');
      } else {
        Alert.alert('TEST_FAIL', 'Connection test returned false.');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown SMTP error';
      Alert.alert('TEST_FAIL', message);
    } finally {
      setTesting(false);
    }
  };

  if (loadingConfig) {
    return (
      <View style={[styles.screen, {paddingTop: insets.top}]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{'> Loading config...'}</Text>
        </View>
        <ScanlineOverlay />
      </View>
    );
  }

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
            onChangeText={markTouched('host')}
            placeholder="smtp.example.com"
            keyboardType="url"
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="SMTP_PORT"
            value={port}
            onChangeText={markTouched('port')}
            placeholder="465"
            keyboardType="numeric"
            error={errors.port}
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="USER_IDENTITY"
            value={username}
            onChangeText={markTouched('username')}
            placeholder="usr@domain.tld"
            keyboardType="email-address"
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="AUTH_TOKEN"
            value={password}
            onChangeText={markTouched('password')}
            placeholder={hasSavedPassword && password.length === 0 ? '(saved)' : '••••••••'}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? '◉' : '◎'}
            onRightIconPress={() => setShowPassword(prev => !prev)}
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="FROM_EMAIL"
            value={fromEmail}
            onChangeText={markTouched('fromEmail')}
            placeholder="from@domain.tld"
            keyboardType="email-address"
            error={errors.fromEmail}
          />
          <View style={styles.fieldSpacer} />

          <TerminalInput
            label="TO_EMAIL"
            value={toEmail}
            onChangeText={markTouched('toEmail')}
            placeholder="to@domain.tld"
            keyboardType="email-address"
            error={errors.toEmail}
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
            variant={canSave ? 'primary' : 'disabled'}
            accentColor="green"
            loading={saving}
          />
          <View style={styles.footerSpacer} />
          <TerminalButton
            label="TEST_SMTP()"
            onPress={handleTest}
            variant={canTest ? 'secondary' : 'disabled'}
            accentColor="cyan"
            loading={testing}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textDim,
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
