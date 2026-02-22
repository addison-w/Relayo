# Relayo — CONTINUITY.md (Working Memory)

> Last updated: 2026-02-22T19:47Z

## Current Phase
**BOOTSTRAP** — Initializing project infrastructure and researching tech stack.

## What I'm Doing NOW
- Setting up .loki/ directory structure ✅
- Researching React Native 0.76+ init, Kotlin native modules, React Navigation (3 librarian agents running)
- Next: Collect research results → Create architecture plan → Initialize RN project

## Completion Promise
Build Relayo (SMS → Email forwarder) from PRD to working Android app across 5 milestones:
- M1: RN UI + Test Email
- M2: SMS receiver + forwarding
- M3: Dual SIM support
- M4: Outbox + retry
- M5: Foreground service + boot auto-start

## Key Decisions Made
- Android only (per PRD)
- Terminal/hacker UI aesthetic (per UI prototypes)
- JetBrains Mono font throughout
- Color scheme: black bg, green/cyan/amber accents, sharp corners (0px radius)
- 4 screens: Onboarding, Dashboard, SMTP Config, SIM Management
- Bottom nav: /HOME, /LOGS, /CONF

## Architecture (Pending Research)
- React Native (TypeScript) — UI layer
- Android Native (Kotlin) — SMS, Foreground Service, SMTP, Boot, Network
- Room/SQLite — Outbox queue persistence
- Android Keystore — Encrypted SMTP password

## Mistakes & Learnings
_(None yet — first session)_

## Pending Fixes
_(None)_

## Active Background Tasks
- bg_f89c054f: RN init + Kotlin native modules research
- bg_976b2e7b: React Navigation + theming research
- bg_24c9e545: Android SMS/Foreground/SMTP research
