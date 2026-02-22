PRD: SMS → Email Forwarder (React Native)

App Name: Relayo

1. Overview
1.1 Product Summary

An Android app (UI built with React Native) that runs persistently in the background to listen for all incoming SMS messages and forwards them in near real time to a user-specified email address via user-configured SMTP. It supports dual SIM: the email must include both the Sender Number (SMS originator) and the Receiver Number (the actual phone number of the SIM that received the SMS). If the system cannot retrieve the SIM’s actual phone number, the app allows the user to manually input it as a fallback.

1.2 Platform Scope

Android only (MVP)

iOS not supported: iOS does not provide sufficient permissions/capabilities to read/monitor system SMS content or run persistent background listeners that would meet the “auto-forward all SMS” requirement.

2. Goals and Non-Goals
2.1 Goals (MVP)

Automatically forward all incoming SMS to email (via SMTP).

Near real-time sending: send as soon as possible after an SMS is received (target < 5 seconds to trigger send when network is normal).

Automatic retries on failures; if still failing, store in an offline outbox queue; retry automatically when network becomes available again.

Dual SIM support: email must include receiver number (the SIM’s actual phone number) and the sender number.

Persistent background + boot auto-start: provide a status dashboard that monitors critical permissions/toggles and offers one-tap navigation to system settings.

Offline utility: no login, no backend, no subscriptions/paywalls.

2.2 Non-Goals (Not in MVP)

Filtering rules / allowlists / blocklists (forward everything)

Custom email templates (fixed template only)

SMS history list / email send history / export (only show “Last Status”)

Gmail/Outlook provider shortcuts (future version)

3. Target Users and Use Cases
3.1 Target User

Personal users who want SMS backups in email for archiving, cross-device access, and search.

3.2 Primary Use Case

After configuring SMTP and a destination email address, the app runs in the background. Every time the phone receives an SMS, the user receives an email containing the full SMS content and required metadata.

4. User Stories

As a user, I want a clear onboarding flow that helps me grant permissions, enable background persistence, configure SMTP, and successfully send a test email.

As a user, I want the app to keep running in the background and automatically forward SMS to email immediately when messages arrive.

As a user, when the network is unavailable or SMTP sending fails, I want the app to retry automatically; if it still fails, it should be queued and sent automatically when the network recovers.

As a dual SIM user, I want every email to show which phone number (receiver number) actually received the SMS.

As a user, I want the Home screen to clearly show whether the app is running, the most important system toggles, and the last send result with actionable steps to fix issues.

5. Functional Requirements
5.1 Onboarding and Permissions Guidance (Required)

On first launch, the app must provide an onboarding flow and continue to show system status on the Home screen. It must include monitoring for:

SMS permissions: receive/read SMS

Notification permission (Android 13+)

Battery optimization: whether background running is allowed (e.g., ignore battery optimizations / unrestricted background)

Foreground service: whether it is currently running

Boot auto-start capability: whether auto-start is allowed (system/OEM differences)

Background data restrictions: whether background network is restricted

Each item must provide:

A status indicator (✅/⚠️/❌)

A short explanation (why it matters)

A “Go enable” action that navigates to the relevant Android settings screen

5.2 SMTP Settings (Required)

User-configurable fields:

SMTP Host

Port

Username

Password (encrypted storage)

From Email

To Email

Security mode: SSL / STARTTLS (at least one; recommended to support both)

Optional: timeouts (use defaults if not exposed)

Capabilities:

Save configuration

Send test email (required):

Success: show confirmation

Failure: show a concise, diagnosable reason (e.g., auth failed / network error / TLS error / timeout)

5.3 SMS Capture and Near Real-Time Forwarding (Required)

Capture all incoming SMS

Support multipart (long SMS segments) and merge into a single message before sending

Upon receipt, immediately run the send pipeline:

Parse SMS content and timestamp

Determine sender number

Determine receiver number (see 5.4)

Build the fixed email template

Send via SMTP

5.4 Dual SIM: Receiver Number Resolution (Required + Fallback)

Goal: email must include the actual phone number (MSISDN) of the SIM that received the SMS.

Resolution requirements:

Prefer system Telephony/Subscription APIs to retrieve the line1Number for the subscription that received the SMS (when available).

If system retrieval fails or returns empty:

Show a clear message: “System cannot read this SIM phone number”

Allow the user to manually enter the actual SIM phone number as a fallback

Receiver number resolution priority:
System value (preferred) → User-provided manual value → Unknown

Note: Many OEMs/carriers return an empty number; manual fallback is required to satisfy “must include the actual phone number”.

5.5 Fixed Email Template (Not Customizable)

Subject
SMS from {senderNumber} to {receiverNumber}

Body

Timestamp: {receivedAtLocalTime}

Sender: {senderNumber}

Receiver: {receiverNumber}

Message:
{messageBody}

Optional (non-blocking):

Device model / Android version (for troubleshooting)

5.6 Retry + Offline Outbox Queue (Required)

Failure handling:

Automatic retry: retry immediately once

If still failing: persist to outbox and retry with exponential backoff

Suggested backoff: 1 min, 5 min, 15 min, 1 h, 3 h, 6 h… (cap at 24 h)

After max attempts (suggested: 10): keep queued and wait for network recovery events to trigger new attempts

Network recovery trigger: when network becomes available, automatically resume outbox processing

Outbox requirements:

Persisted locally (survives process kill and device reboot)

Remove from queue after successful send

At-least-once delivery is acceptable (rare duplicates possible), but dedup should be implemented (see 6.3)

5.7 Persistent Background Operation (Required)

Use a Foreground Service to stay alive and show an ongoing notification:

Title: SMS Forwarder running

Content: Listening for incoming SMS

Tap action: open the app

Home screen must show “Service running / not running”, plus quick remediation guidance (at minimum, deep links to relevant settings)

5.8 Boot Auto-Start (Required)

After device reboot, automatically restore the service and outbox processing

If required permissions are missing, notify/prompt the user to open the app and fix them

5.9 “Last Status” (Required)

Home screen shows a single “Last Status” entry (no history list):

Last sent at: timestamp

Last result: Success / Failed

Last error: short label (auth failed / no network / TLS error / timeout)

6. Non-Functional Requirements (NFR)
6.1 Security and Privacy

SMTP password must be stored encrypted (Android Keystore + encrypted storage)

The app does not upload SMS to any third-party service; it only sends via SMTP to the user-configured email

Principle of least privilege

6.2 Reliability

Under normal network conditions, forward quickly after SMS receipt (target < 5 seconds to trigger send)

Outbox persists across reboots

6.3 Deduplication (Recommended / Effectively Required)

Ensure multipart merging does not produce multiple emails

Generate a fingerprint per SMS (sender + receiver + receivedAt + body hash)

Before enqueuing/sending, check fingerprint to avoid duplicate enqueue/sends (especially across retries and restarts)

6.4 Performance and Battery

Send outbox items serially to reduce battery usage and avoid SMTP throttling

Foreground service is a required tradeoff; keep CPU usage minimal

7. Technical Approach (React Native + Android Native Modules)
7.1 Layering

React Native (JS/TS)

UI: onboarding, SMTP settings, status dashboard, SIM manual fallback input, last status

Invoke native modules for: status checks, send test email, start/stop service (optional)

Android Native (Kotlin) — core logic for reliability

SMS BroadcastReceiver: receive and parse/merge multipart SMS

Foreground Service: background persistence, outbox processing

BootReceiver: auto-start on reboot

Network monitor: retry when connectivity returns

SMTP sender: send and classify errors

Local DB (Room/SQLite): persisted outbox

Secure storage: Keystore encryption for SMTP password

7.2 Android Permissions (Expected)

RECEIVE_SMS

READ_SMS

INTERNET

RECEIVE_BOOT_COMPLETED

Foreground service-related permissions (depends on target SDK)

Notification permission (Android 13+)

Exact permission set and foreground service types depend on the final target Android SDK.

8. Local Data Model
8.1 SMTPConfig (Encrypted Fields)

host, port, username

password (encrypted)

fromEmail, toEmail

securityMode: SSL / STARTTLS / None (recommend disallow None or default STARTTLS)

8.2 SimMapping (Manual Fallback)

subscriptionId

detectedNumber (nullable)

manualNumber (nullable)

lastUpdatedAt

8.3 OutboxQueue (Offline Queue)

id

fingerprint (unique)

senderNumber

receiverNumberResolved (final value used in email)

receiverSubscriptionId

messageBody

receivedAt

status: pending / sending / failed

retryCount

nextRetryAt

lastErrorCode

lastErrorMessageShort

8.4 AppStatus (Last Status)

lastAttemptAt

lastResult: success/failed

lastErrorShort

9. UI / Screens (MVP)

Onboarding (Permissions + Background Setup)

Step-by-step status checks + deep links to system settings

Home (Status Dashboard)

Service running state

List of critical toggles (permissions, battery optimization, auto-start hints, notifications, background data)

Last Status

SMTP Settings

Configuration form + Save

Send Test Email

SIM Numbers (Shown only when system fails to detect, or under Advanced)

Display SIM info (carrier/slot/subscriptionId)

Manual entry of actual phone number fallback

10. Acceptance Criteria

✅ User can complete onboarding, configure SMTP, and send a test email successfully

✅ Any incoming SMS results in a corresponding email containing sender/receiver/message/time

✅ Dual SIM: receiver number correctly reflects the SIM that received the SMS; if system cannot detect, manual fallback ensures the email still contains the actual receiver phone number

✅ If offline or SMTP fails, the SMS is queued and later automatically sent when network recovers

✅ Foreground service remains active; after reboot, the service and outbox processing are restored automatically

✅ Home screen displays key system toggles and Last Status

11. Risks and Constraints

Android phone number retrieval is unreliable: manual fallback is required to meet “receiver number must be the actual phone number”.

OEM background restrictions vary: the status dashboard must provide clear guidance; some devices may still kill background services.

SMTP compatibility: user-provided SMTP servers may vary in SSL/TLS/auth behavior; error messaging must be diagnosable.

Privacy sensitivity: SMS content is forwarded via email; app must clearly disclose this behavior.

12. Milestones (Suggested)

M1: RN UI (Onboarding + SMTP + Home) + Test Email

M2: SMS receiver + fixed-template forwarding (single SIM)

M3: Dual SIM receiver number resolution + manual fallback input

M4: Persisted outbox + retry strategy + network recovery trigger

M5: Foreground service persistence + boot auto-start + improved status dashboard