# Relayo — Full Build Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Android-only React Native app that forwards all incoming SMS to email via user-configured SMTP, with dual SIM support, offline outbox, and persistent background operation.

**Architecture:** React Native 0.84 (TypeScript) handles all UI — 4 screens with terminal/hacker aesthetic using JetBrains Mono, dark theme, green/cyan/amber accents. Android native modules (Kotlin) handle all reliability-critical logic: SMS reception, foreground service, SMTP sending, boot recovery, network monitoring. Communication via TurboModules (New Architecture, default in 0.84). Room/SQLite for offline outbox persistence. Android Keystore for encrypted SMTP password storage.

**Tech Stack:** React Native 0.84, TypeScript, Kotlin, React Navigation v7, Room (SQLite), Jakarta Mail, Android Keystore, TurboModules (Codegen)

---

## Research Findings (Consolidated)

### React Native 0.84 (Feb 9, 2026)
- Init: `npx @react-native-community/cli@latest init Relayo`
- Node 22.11+ required (we have 25.6.1 ✅)
- JDK 17 required (we have JDK 25 — may need JDK 17 specifically)
- New Architecture enforced (0.82+), TurboModules mandatory
- targetSdk: 35 (Android 15), minSdk: 24 (Android 7.0)

### Navigation
- React Navigation v7 (latest stable)
- Packages: `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`
- Dependencies: `react-native-screens`, `react-native-safe-area-context`
- Custom tab bar via `tabBar` prop on Tab.Navigator

### Native Modules (Kotlin TurboModules)
- Define TypeScript spec → Codegen generates native interfaces → Implement in Kotlin
- SMS: Use `android.provider.Telephony.Sms.Intents.SMS_RECEIVED_ACTION` BroadcastReceiver
- Foreground Service: `foregroundServiceType="dataSync"` for Android 14+
- SMTP: Jakarta Mail (`com.sun.mail:android-mail:1.6.7` + `android-activation`)
- Room: Standard Android Room setup in `android/app/build.gradle`
- Dual SIM: `SubscriptionManager.getActiveSubscriptionInfoList()` + `getSubscriptionId()` from SMS intent extras

### Design System (from UI Prototypes)
- Font: JetBrains Mono (all weights)
- Bg: `#0a0a0a` to `#0d0e12`
- Green: `#00ff41` (primary active)
- Cyan: `#00f0ff` (secondary/info)
- Amber: `#ffb000` (warning)
- Red: `#ff3333` (error)
- Dim: `#4d5b5b` to `#666666`
- Border: `#2c313a` to `#333333`
- Surface: `#111111` to `#161616`
- All corners: 0px (sharp)
- Icons: Material Symbols Outlined (filled variant)
- Labels: UPPERCASE, monospace, tracking-wide
- Buttons: `[ ACTION ]` bracket style
- Prompts: `> ` prefix for system messages

---

## Phase 0: Project Initialization

### Task 0.1: Initialize React Native Project

**Files:**
- Create: entire project scaffold via CLI

**Step 1: Install JDK 17 (if needed) and set ANDROID_HOME**
```bash
export ANDROID_HOME=~/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**Step 2: Initialize React Native project**
```bash
npx @react-native-community/cli@latest init Relayo --directory . --skip-install
```
Note: If CLI errors because directory not empty, we'll init in a temp dir and move files.

**Step 3: Install dependencies**
```bash
npm install
```

**Step 4: Verify project structure exists**
Confirm: `android/`, `ios/`, `src/` (or `App.tsx`), `package.json`, `tsconfig.json`

**Step 5: Commit**
```bash
git add -A && git commit -m "chore: initialize React Native 0.84 project"
```

---

### Task 0.2: Install Core Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install navigation**
```bash
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context
```

**Step 2: Install fonts and icons**
```bash
npm install react-native-vector-icons @expo-google-fonts/jetbrains-mono
```
Alternative: manually link JetBrains Mono via `react-native.config.js` asset linking.

**Step 3: Install encrypted storage**
```bash
npm install react-native-keychain
```

**Step 4: Install additional utilities**
```bash
npm install react-native-device-info
```

**Step 5: Commit**
```bash
git add -A && git commit -m "chore: install navigation, fonts, keychain, and device-info"
```

---

### Task 0.3: Configure Project Structure

**Files:**
- Create: `src/` directory tree
- Create: `src/theme/` — design tokens
- Create: `src/screens/` — 4 screens
- Create: `src/components/` — shared components
- Create: `src/navigation/` — navigators
- Create: `src/native/` — TurboModule specs
- Create: `src/stores/` — state management
- Create: `src/types/` — TypeScript types

**Step 1: Create directory structure**
```
src/
├── theme/
│   ├── colors.ts          # Color tokens from design system
│   ├── typography.ts       # Font config
│   ├── spacing.ts          # Spacing scale
│   └── index.ts            # Re-export all
├── screens/
│   ├── OnboardingScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── SmtpConfigScreen.tsx
│   └── SimManagementScreen.tsx
├── components/
│   ├── TerminalCard.tsx     # Reusable card with terminal border
│   ├── TerminalButton.tsx   # [ ACTION ] style button
│   ├── TerminalInput.tsx    # Terminal-style text input
│   ├── StatusBadge.tsx      # [READY] / [ATTENTION] badges
│   ├── ProgressBar.tsx      # Terminal progress bar
│   ├── ScanlineOverlay.tsx  # CRT scanline effect
│   ├── DiagnosticsTable.tsx # Module status table
│   └── CustomTabBar.tsx     # Bottom nav bar
├── navigation/
│   ├── AppNavigator.tsx     # Root navigator
│   ├── TabNavigator.tsx     # Bottom tab navigator
│   └── types.ts             # Navigation type defs
├── native/
│   ├── NativeSmtpModule.ts   # TurboModule spec: SMTP
│   ├── NativeSmsModule.ts    # TurboModule spec: SMS
│   ├── NativeServiceModule.ts # TurboModule spec: Foreground Service
│   └── NativePermissionModule.ts # TurboModule spec: Permission checks
├── stores/
│   ├── SmtpConfigStore.ts    # SMTP config state
│   ├── ServiceStatusStore.ts # Service running state
│   └── LastStatusStore.ts    # Last send result
├── types/
│   └── index.ts              # Shared type definitions
└── App.tsx                    # Root component
```

**Step 2: Create theme tokens**

`src/theme/colors.ts`:
```typescript
export const colors = {
  bg: '#0a0a0a',
  surface: '#111111',
  card: '#161616',
  border: '#2c313a',
  borderDim: '#333333',
  
  green: '#00ff41',
  greenDim: '#004d13',
  cyan: '#00f0ff',
  amber: '#ffb000',
  red: '#ff3333',
  
  text: '#e5e5e5',
  textDim: '#666666',
  textMuted: '#4d5b5b',
  
  white: '#ffffff',
  black: '#000000',
} as const;
```

**Step 3: Commit**
```bash
git add -A && git commit -m "chore: set up project structure and design tokens"
```

---

## Phase 1: M1 — UI Screens + Test Email

### Task 1.1: Build Theme System

**Files:**
- Create: `src/theme/colors.ts`
- Create: `src/theme/typography.ts`
- Create: `src/theme/spacing.ts`
- Create: `src/theme/index.ts`

Complete theme tokens matching UI prototypes. Typography uses JetBrains Mono with size scale matching prototypes (10px labels, 12px body, 14px headings, 20px titles).

---

### Task 1.2: Build Shared Components

**Files:**
- Create: `src/components/TerminalCard.tsx`
- Create: `src/components/TerminalButton.tsx`
- Create: `src/components/TerminalInput.tsx`
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/ScanlineOverlay.tsx`
- Create: `src/components/CustomTabBar.tsx`

Each component implements the terminal aesthetic:
- `TerminalCard`: Dark surface, thin border, optional colored left-border accent, corner decoration
- `TerminalButton`: `[ ACTION ]` bracket text, border matches accent color, hover/press states
- `TerminalInput`: Dark input bg, dim border, colored focus, monospace, `> ` label prefix
- `StatusBadge`: `[READY]`, `[ATTENTION]`, `[FAIL]` with color coding
- `ScanlineOverlay`: Fullscreen CRT overlay with animated scanline
- `CustomTabBar`: Bottom nav with `/HOME`, `/LOGS`, `/CONF` labels, material icons, green active indicator

---

### Task 1.3: Build Navigation Structure

**Files:**
- Create: `src/navigation/AppNavigator.tsx`
- Create: `src/navigation/TabNavigator.tsx`
- Create: `src/navigation/types.ts`
- Modify: `src/App.tsx`

Navigation structure:
```
RootStack (Native Stack)
├── Onboarding (full-screen, no tabs)
└── MainTabs (Bottom Tab Navigator)
    ├── /HOME → DashboardScreen
    ├── /LOGS → (placeholder for future)
    └── /CONF → ConfigStack (Native Stack)
        ├── SmtpConfigScreen
        └── SimManagementScreen
```

---

### Task 1.4: Build Onboarding Screen

**Files:**
- Create: `src/screens/OnboardingScreen.tsx`

Matches UI prototype: `app_setup_&_permissions/screen.png`
- Header: ASCII art logo, `SYS_INIT_SEQ_V.1.0.4`, blinking cursor title
- Steps: Numbered 01-06 with step connector lines
  - SMS Permission (RECEIVE_SMS, READ_SMS)
  - Notification Permission (Android 13+)
  - Battery Optimization Override
  - Autostart Enable
  - Background Data
  - Foreground Service
- Each step: title, description, `[EXECUTE]` button or `GRANTED` badge
- Footer: progress bar, `AWAITING_PERMISSIONS` / `PROCEED` button

---

### Task 1.5: Build Dashboard Screen

**Files:**
- Create: `src/screens/DashboardScreen.tsx`

Matches UI prototype: `relayo_dashboard_status/screen.png`
- Header: App logo + version, settings icon
- Hero: Large power icon (animated rings), `SYSTEM ACTIVE` / `SYSTEM INACTIVE`, uptime counter
- Diagnostics section: Table with SMS_ACCESS, BATTERY_OP, NET_SOCKET, NOTIFICATION status rows
- Last Exec Log: Terminal-style last send result (timestamp, payload preview, status)

---

### Task 1.6: Build SMTP Config Screen

**Files:**
- Create: `src/screens/SmtpConfigScreen.tsx`

Matches UI prototype: `smtp_configuration/screen.png`
- Header: `[CONFIG_PROTOCOL]`, back button
- Form: SMTP_HOST, SMTP_PORT, USER_IDENTITY, AUTH_TOKEN (password w/ visibility toggle)
- Toggles: ENABLE_SSL, USE_STARTTLS (binary 0/1 switches)
- Footer: `[SAVE_CONFIG]` primary button, `TEST_SMTP()` secondary button
- From Email / To Email fields (additional to prototype — required by PRD)

---

### Task 1.7: Build SIM Management Screen

**Files:**
- Create: `src/screens/SimManagementScreen.tsx`

Matches UI prototype: `sim_number_management/screen.png`
- Header: `HARDWARE_CFG`, back button, version
- Per SIM slot card:
  - Status dot (green=active, amber=attention)
  - Carrier name, signal strength bars
  - MSISDN resolved (green) or MSISDN_MISSING (amber) with manual input
  - ICCID display
- Info box: Protocol explanation
- Footer: `EXECUTE_CONFIG_SAVE` button

---

### Task 1.8: Implement SMTP Native Module (Kotlin)

**Files:**
- Create: `src/native/NativeSmtpModule.ts` (TurboModule spec)
- Create: `android/app/src/main/java/com/relayo/smtp/SmtpModule.kt`
- Create: `android/app/src/main/java/com/relayo/smtp/SmtpSender.kt`
- Modify: `android/app/build.gradle` (add Jakarta Mail dependency)

TurboModule spec:
```typescript
export interface Spec extends TurboModule {
  saveConfig(config: {
    host: string; port: number; username: string; password: string;
    fromEmail: string; toEmail: string; useSsl: boolean; useStartTls: boolean;
  }): Promise<void>;
  loadConfig(): Promise<SmtpConfig | null>;
  sendTestEmail(): Promise<{ success: boolean; error?: string }>;
  sendEmail(subject: string, body: string): Promise<{ success: boolean; error?: string }>;
}
```

Kotlin implementation uses Jakarta Mail (`com.sun.mail:android-mail:1.6.7`).
Password encrypted via Android Keystore before storing in SharedPreferences.

---

### Task 1.9: Wire SMTP Config Screen to Native Module

**Files:**
- Modify: `src/screens/SmtpConfigScreen.tsx`
- Modify: `src/stores/SmtpConfigStore.ts`

Connect form save/load to native module. Test email button calls `sendTestEmail()` and shows success/failure.

---

## Phase 2: M2 — SMS Receiver + Forwarding

### Task 2.1: Implement SMS BroadcastReceiver (Kotlin)

**Files:**
- Create: `android/app/src/main/java/com/relayo/sms/SmsBroadcastReceiver.kt`
- Create: `android/app/src/main/java/com/relayo/sms/SmsParser.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`

BroadcastReceiver listens on `android.provider.Telephony.SMS_RECEIVED`.
SmsParser merges multipart SMS, extracts sender, timestamp, subscription ID.

### Task 2.2: Implement SMS → Email Pipeline (Kotlin)

**Files:**
- Create: `android/app/src/main/java/com/relayo/pipeline/SmsPipeline.kt`
- Create: `android/app/src/main/java/com/relayo/pipeline/EmailTemplateBuilder.kt`

On SMS received: parse → build email template → send via SMTP.
Fixed template per PRD §5.5.

---

## Phase 3: M3 — Dual SIM

### Task 3.1: Implement SIM Resolution (Kotlin)

**Files:**
- Create: `android/app/src/main/java/com/relayo/sim/SimResolver.kt`
- Create: `android/app/src/main/java/com/relayo/sim/SimStore.kt`
- Create: `src/native/NativeSimModule.ts`

Priority: System MSISDN → User manual entry → "Unknown"
Uses SubscriptionManager for active SIM info.

### Task 3.2: Wire SIM Management Screen

**Files:**
- Modify: `src/screens/SimManagementScreen.tsx`

Connect to native module. Show detected SIMs, allow manual number entry.

---

## Phase 4: M4 — Outbox + Retry

### Task 4.1: Set Up Room Database (Kotlin)

**Files:**
- Create: `android/app/src/main/java/com/relayo/db/RelayoDatabase.kt`
- Create: `android/app/src/main/java/com/relayo/db/OutboxDao.kt`
- Create: `android/app/src/main/java/com/relayo/db/OutboxEntity.kt`
- Modify: `android/app/build.gradle` (add Room dependencies)

Room entities per PRD §8.3 data model.

### Task 4.2: Implement Retry Strategy (Kotlin)

**Files:**
- Create: `android/app/src/main/java/com/relayo/pipeline/RetryManager.kt`
- Create: `android/app/src/main/java/com/relayo/network/NetworkMonitor.kt`

Exponential backoff: 1m → 5m → 15m → 1h → 3h → 6h (cap 24h).
Max 10 attempts, then wait for network recovery.
Dedup via fingerprint (sender + receiver + timestamp + body hash).

---

## Phase 5: M5 — Foreground Service + Boot

### Task 5.1: Implement Foreground Service (Kotlin)

**Files:**
- Create: `android/app/src/main/java/com/relayo/service/RelayoForegroundService.kt`
- Create: `src/native/NativeServiceModule.ts`
- Modify: `android/app/src/main/AndroidManifest.xml`

Ongoing notification: "SMS Forwarder running — Listening for incoming SMS"
`foregroundServiceType="dataSync"` for Android 14+.

### Task 5.2: Implement Boot Receiver (Kotlin)

**Files:**
- Create: `android/app/src/main/java/com/relayo/boot/BootReceiver.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`

Listens for `BOOT_COMPLETED`, starts foreground service, resumes outbox processing.

### Task 5.3: Wire Dashboard Status Updates

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Create: `src/native/NativePermissionModule.ts`

Dashboard reads live permission/service status from native modules.
Last Status section reads from native AppStatus store.

---

## Execution Order

```
0.1 Init RN → 0.2 Install deps → 0.3 Project structure
→ 1.1 Theme → 1.2 Components → 1.3 Navigation
→ 1.4 Onboarding → 1.5 Dashboard → 1.6 SMTP Screen → 1.7 SIM Screen
→ 1.8 SMTP Native → 1.9 Wire SMTP
→ 2.1 SMS Receiver → 2.2 SMS Pipeline
→ 3.1 SIM Resolver → 3.2 Wire SIM Screen
→ 4.1 Room DB → 4.2 Retry Strategy
→ 5.1 Foreground Service → 5.2 Boot Receiver → 5.3 Dashboard Status
```

Each task gets committed atomically. Tests added where applicable (primarily for native modules).
