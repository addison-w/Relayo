# Relayo — Project Context

## What Is This
Android-only React Native app that forwards incoming SMS to email via SMTP. Terminal/hacker UI aesthetic.

## Tech Stack
- **UI:** React Native 0.84, TypeScript, React Navigation v7
- **Native:** Kotlin, TurboModules (New Architecture)
- **Storage:** Room/SQLite (outbox), Android Keystore (SMTP password)
- **SMTP:** Jakarta Mail (`com.sun.mail:android-mail`)
- **Design:** JetBrains Mono font, dark theme, green/cyan/amber accents, 0px border radius

## Architecture
```
React Native (TS)          Android Native (Kotlin)
┌─────────────────┐       ┌──────────────────────────┐
│ OnboardingScreen │       │ SmsBroadcastReceiver     │
│ DashboardScreen  │──────▶│ RelayoForegroundService  │
│ SmtpConfigScreen │ Turbo │ SmtpSender               │
│ SimMgmtScreen    │ Mods  │ BootReceiver             │
└─────────────────┘       │ NetworkMonitor           │
                          │ Room DB (OutboxQueue)    │
                          │ SimResolver              │
                          └──────────────────────────┘
```

## Key Patterns
- TurboModule specs in `src/native/` → Kotlin implementations in `android/app/src/main/java/com/relayo/`
- Design tokens in `src/theme/` — all components reference these, never hardcode colors
- Terminal aesthetic: `[ ACTION ]` buttons, `> ` prompt prefixes, UPPERCASE labels, monospace everything
- Navigation: RootStack → Onboarding | MainTabs (Dashboard, Logs, Config)

## File Structure
```
src/
├── theme/          # Design tokens (colors, typography, spacing)
├── screens/        # 4 screen components
├── components/     # Shared terminal-style components
├── navigation/     # React Navigation setup
├── native/         # TurboModule TypeScript specs
├── stores/         # State management
└── types/          # Shared TypeScript types

android/app/src/main/java/com/relayo/
├── smtp/           # SMTP sending + config
├── sms/            # SMS BroadcastReceiver + parser
├── sim/            # Dual SIM resolution
├── service/        # Foreground service
├── boot/           # Boot receiver
├── network/        # Network monitoring
├── db/             # Room database (outbox)
└── pipeline/       # SMS → Email pipeline + retry
```

## Commands
- `npm start` — Metro bundler
- `npm run android` — Build and run on Android device/emulator
- `npx react-native run-android` — Alternative build command

## Important Notes
- Android only — no iOS support
- New Architecture enforced (0.82+) — all native modules must be TurboModules
- SMTP password stored encrypted via Android Keystore
- Foreground service required for background SMS listening
- `foregroundServiceType="dataSync"` for Android 14+
