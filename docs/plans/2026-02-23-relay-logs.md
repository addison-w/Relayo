# Relay Logs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Record every SMS→email relay attempt in an append-only log table, expose it to JS via TurboModule, build a full Logs screen with individual/bulk deletion, and wire the dashboard's LAST_EXEC_LOG to real data.

**Architecture:** New `relay_log` Room table records every relay attempt (success + failure) as an immutable event. `SmsPipeline` and `RetryManager` write log entries after every SMTP attempt. A new `LogModule` TurboModule exposes log CRUD to JS. The Logs screen uses a FlatList with swipe-to-delete and a "CLEAR ALL" action. The dashboard's LAST_EXEC_LOG section queries the most recent log entry instead of the currently-dead `app_status` table.

**Tech Stack:** Room/SQLite (Kotlin), TurboModule (NativeModules bridge), React Native FlatList, existing TerminalCard/StatusBadge components

---

## Current State (READ THIS FIRST)

### What exists
- **`outbox` table** — mutable queue for failed SMS relays. Items are updated in-place (pending→sending→sent/failed). Not a log.
- **`app_status` table** — single row (id=1) meant to hold the last attempt info. **NEVER WRITTEN TO** — both `SmsPipeline` and `RetryManager` skip it entirely. Dashboard shows empty data.
- **`ServiceModule.kt`** — TurboModule exposing `getLastStatus()` (reads dead `app_status`) and `getOutboxCount()`.
- **`LogsScreen.tsx`** — placeholder showing "Coming in future release".

### What's missing
- No relay log table (append-only event log)
- No way to record successful immediate sends (SmsPipeline returns early on success)
- No TurboModule for log CRUD operations
- No log UI

### Key files you'll touch

```
KOTLIN (android/app/src/main/java/com/relayo/):
  db/RelayLogEntity.kt          — CREATE (new Room entity)
  db/RelayLogDao.kt              — CREATE (new DAO)
  db/RelayoDatabase.kt           — MODIFY (add entity + DAO + migration)
  pipeline/SmsPipeline.kt        — MODIFY (write log entry on every attempt)
  pipeline/RetryManager.kt       — MODIFY (write log entry on every attempt)
  log/LogModule.kt               — CREATE (new TurboModule)
  log/LogPackage.kt              — CREATE (ReactPackage for LogModule)
  MainApplication.kt             — MODIFY (register LogPackage) [check if auto-linked]

TYPESCRIPT (src/):
  native/NativeLogModule.ts      — CREATE (TurboModule TS spec)
  types/index.ts                 — MODIFY (add RelayLog type)
  screens/LogsScreen.tsx         — REWRITE (full implementation)
  screens/DashboardScreen.tsx    — MODIFY (use log module for LAST_EXEC_LOG)
```

---

## Task 1: Create RelayLogEntity (Room entity)

**Files:**
- Create: `android/app/src/main/java/com/relayo/db/RelayLogEntity.kt`

**Step 1: Create the entity**

```kotlin
package com.relayo.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "relay_log")
data class RelayLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val senderNumber: String,
    val receiverNumber: String,
    val messagePreview: String,
    val receivedAt: Long,
    val relayedAt: Long,
    val status: String,           // "sent" | "failed"
    val errorCode: String? = null,
    val errorMessage: String? = null
)
```

Fields rationale:
- `messagePreview` — first 100 chars of SMS body. Full body stays in outbox. Logs are for display, not replay.
- `receivedAt` — when the SMS was received (from broadcast)
- `relayedAt` — when the relay attempt happened (System.currentTimeMillis at send time)
- `status` — "sent" or "failed" only. No intermediate states — this is a completed-event log.
- `errorCode` / `errorMessage` — nullable, only populated on failure. Matches SmtpResult.Failure fields.

**Step 2: Commit**

```
feat(db): add RelayLogEntity for immutable relay event log
```

---

## Task 2: Create RelayLogDao

**Files:**
- Create: `android/app/src/main/java/com/relayo/db/RelayLogDao.kt`

**Step 1: Create the DAO**

```kotlin
package com.relayo.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface RelayLogDao {

    @Insert
    suspend fun insert(entity: RelayLogEntity): Long

    @Query("SELECT * FROM relay_log ORDER BY relayedAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getPage(limit: Int, offset: Int): List<RelayLogEntity>

    @Query("SELECT * FROM relay_log ORDER BY relayedAt DESC LIMIT 1")
    suspend fun getLatest(): RelayLogEntity?

    @Query("SELECT COUNT(*) FROM relay_log")
    suspend fun getCount(): Int

    @Query("DELETE FROM relay_log WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM relay_log")
    suspend fun deleteAll()
}
```

Design notes:
- `getPage()` with LIMIT/OFFSET for paginated loading in FlatList. Start with page size 50.
- `getLatest()` for the dashboard's LAST_EXEC_LOG — single query, no pagination overhead.
- `deleteById()` for individual log removal (swipe-to-delete).
- `deleteAll()` for the "CLEAR ALL" action.
- No update methods — this is append-only.

**Step 2: Commit**

```
feat(db): add RelayLogDao with pagination and deletion
```

---

## Task 3: Register entity in RelayoDatabase + migration

**Files:**
- Modify: `android/app/src/main/java/com/relayo/db/RelayoDatabase.kt`

**Step 1: Update the database class**

Current state: version 1 with `[OutboxEntity::class, AppStatusEntity::class]`.

Change to:

```kotlin
package com.relayo.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [OutboxEntity::class, AppStatusEntity::class, RelayLogEntity::class],
    version = 2,
    exportSchema = false
)
abstract class RelayoDatabase : RoomDatabase() {

    abstract fun outboxDao(): OutboxDao
    abstract fun appStatusDao(): AppStatusDao
    abstract fun relayLogDao(): RelayLogDao

    companion object {
        @Volatile
        private var INSTANCE: RelayoDatabase? = null

        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS relay_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        senderNumber TEXT NOT NULL,
                        receiverNumber TEXT NOT NULL,
                        messagePreview TEXT NOT NULL,
                        receivedAt INTEGER NOT NULL,
                        relayedAt INTEGER NOT NULL,
                        status TEXT NOT NULL,
                        errorCode TEXT,
                        errorMessage TEXT
                    )
                """.trimIndent())
            }
        }

        fun getInstance(context: Context): RelayoDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    RelayoDatabase::class.java,
                    "relayo_db"
                )
                .addMigrations(MIGRATION_1_2)
                .build().also { INSTANCE = it }
            }
    }
}
```

Key points:
- Additive migration only (CREATE TABLE) — no data loss, no destructive fallback.
- Version bump 1 → 2.
- Add `relayLogDao()` abstract method.

**Step 2: Commit**

```
feat(db): register RelayLogEntity with v1→v2 migration
```

---

## Task 4: Wire SmsPipeline to write log entries

**Files:**
- Modify: `android/app/src/main/java/com/relayo/pipeline/SmsPipeline.kt`

**Step 1: Update processAsync to log every attempt**

Current behavior: tries SMTP, if success returns silently, if failure queues to outbox. Neither path logs.

New behavior: log both outcomes.

```kotlin
private suspend fun processAsync(
    context: Context,
    senderNumber: String,
    messageBody: String,
    receivedAt: Long,
    subscriptionId: Int
) {
    val simResolver = SimResolver(context)
    val receiverNumber = simResolver.resolveReceiverNumber(subscriptionId)
    val fingerprint = buildFingerprint(senderNumber, receiverNumber, receivedAt, messageBody)

    val subject = EmailTemplateBuilder.buildSubject(senderNumber, receiverNumber)
    val body = EmailTemplateBuilder.buildBody(senderNumber, receiverNumber, receivedAt, messageBody)

    val db = RelayoDatabase.getInstance(context)
    val smtpConfig = SmtpConfigStore(context).load()

    if (smtpConfig != null) {
        val result = SmtpSender.send(smtpConfig, subject, body)
        val now = System.currentTimeMillis()

        when (result) {
            is SmtpResult.Success -> {
                db.relayLogDao().insert(
                    RelayLogEntity(
                        senderNumber = senderNumber,
                        receiverNumber = receiverNumber,
                        messagePreview = messageBody.take(100),
                        receivedAt = receivedAt,
                        relayedAt = now,
                        status = "sent"
                    )
                )
                return
            }
            is SmtpResult.Failure -> {
                db.relayLogDao().insert(
                    RelayLogEntity(
                        senderNumber = senderNumber,
                        receiverNumber = receiverNumber,
                        messagePreview = messageBody.take(100),
                        receivedAt = receivedAt,
                        relayedAt = now,
                        status = "failed",
                        errorCode = result.errorCode,
                        errorMessage = result.message.take(200)
                    )
                )
            }
        }
    }

    // Still queue to outbox for retry
    val entity = OutboxEntity(
        fingerprint = fingerprint,
        senderNumber = senderNumber,
        receiverNumberResolved = receiverNumber,
        messageBody = messageBody,
        receivedAt = receivedAt,
        status = "pending"
    )
    db.outboxDao().insert(entity)
}
```

Import additions needed at top of file:
```kotlin
import com.relayo.db.RelayLogEntity
```

**Step 2: Commit**

```
feat(pipeline): log relay attempts in SmsPipeline
```

---

## Task 5: Wire RetryManager to write log entries

**Files:**
- Modify: `android/app/src/main/java/com/relayo/pipeline/RetryManager.kt`

**Step 1: Add log writes after each retry attempt**

In `processOutbox()`, after the `when (result)` block, insert log entries:

```kotlin
suspend fun processOutbox() {
    val db = RelayoDatabase.getInstance(context)
    val dao = db.outboxDao()
    val logDao = db.relayLogDao()
    val smtpStore = SmtpConfigStore(context)
    val config = smtpStore.load() ?: return
    val now = System.currentTimeMillis()

    val pending = dao.getPending()
    val retryItems = dao.getNextRetryItems(now)
    val items = pending + retryItems

    for (item in items) {
        dao.markSending(item.id)
        val subject = EmailTemplateBuilder.buildSubject(item.senderNumber, item.receiverNumberResolved)
        val body = EmailTemplateBuilder.buildBody(
            item.senderNumber, item.receiverNumberResolved, item.receivedAt, item.messageBody
        )
        val attemptTime = System.currentTimeMillis()
        when (val result = SmtpSender.send(config, subject, body)) {
            is SmtpResult.Success -> {
                dao.markSent(item.id)
                logDao.insert(
                    RelayLogEntity(
                        senderNumber = item.senderNumber,
                        receiverNumber = item.receiverNumberResolved,
                        messagePreview = item.messageBody.take(100),
                        receivedAt = item.receivedAt,
                        relayedAt = attemptTime,
                        status = "sent"
                    )
                )
            }
            is SmtpResult.Failure -> {
                val nextRetryDelay = nextDelay(item.retryCount)
                val nextRetryAt = System.currentTimeMillis() + nextRetryDelay * 1000L
                dao.markFailed(
                    item.id,
                    result.errorCode,
                    result.message.take(200),
                    nextRetryAt
                )
                logDao.insert(
                    RelayLogEntity(
                        senderNumber = item.senderNumber,
                        receiverNumber = item.receiverNumberResolved,
                        messagePreview = item.messageBody.take(100),
                        receivedAt = item.receivedAt,
                        relayedAt = attemptTime,
                        status = "failed",
                        errorCode = result.errorCode,
                        errorMessage = result.message.take(200)
                    )
                )
            }
        }
    }
}
```

Import additions needed at top of file:
```kotlin
import com.relayo.db.RelayLogEntity
```

**Step 2: Commit**

```
feat(pipeline): log relay attempts in RetryManager
```

---

## Task 6: Create LogModule TurboModule (Kotlin)

**Files:**
- Create: `android/app/src/main/java/com/relayo/log/LogModule.kt`
- Create: `android/app/src/main/java/com/relayo/log/LogPackage.kt`

**Step 1: Create LogModule.kt**

```kotlin
package com.relayo.log

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.relayo.db.RelayLogEntity
import com.relayo.db.RelayoDatabase
import java.util.concurrent.Executors

class LogModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "LogModule"

    private val executor = Executors.newSingleThreadExecutor()

    @ReactMethod
    fun getLogs(limit: Int, offset: Int, promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                val logs = kotlinx.coroutines.runBlocking {
                    db.relayLogDao().getPage(limit, offset)
                }
                val array = WritableNativeArray()
                for (log in logs) {
                    array.pushMap(logToMap(log))
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun getLatestLog(promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                val log = kotlinx.coroutines.runBlocking {
                    db.relayLogDao().getLatest()
                }
                if (log == null) {
                    promise.resolve(null)
                    return@execute
                }
                promise.resolve(logToMap(log))
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun getLogCount(promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                val count = kotlinx.coroutines.runBlocking {
                    db.relayLogDao().getCount()
                }
                promise.resolve(count)
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun deleteLog(id: Double, promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                kotlinx.coroutines.runBlocking {
                    db.relayLogDao().deleteById(id.toLong())
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun clearAllLogs(promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                kotlinx.coroutines.runBlocking {
                    db.relayLogDao().deleteAll()
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    private fun logToMap(log: RelayLogEntity): WritableNativeMap {
        return WritableNativeMap().apply {
            putDouble("id", log.id.toDouble())
            putString("senderNumber", log.senderNumber)
            putString("receiverNumber", log.receiverNumber)
            putString("messagePreview", log.messagePreview)
            putDouble("receivedAt", log.receivedAt.toDouble())
            putDouble("relayedAt", log.relayedAt.toDouble())
            putString("status", log.status)
            putString("errorCode", log.errorCode)
            putString("errorMessage", log.errorMessage)
        }
    }
}
```

Note: `deleteLog` takes `Double` because React Native bridge passes JS numbers as doubles. Convert to `Long` for Room.

**Step 2: Create LogPackage.kt**

```kotlin
package com.relayo.log

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LogPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(LogModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
```

**Step 3: Register LogPackage in MainApplication**

Find `MainApplication.kt` (likely at `android/app/src/main/java/com/relayo/MainApplication.kt`). Check if it uses auto-linking or manual package registration. If manual, add `LogPackage()` to the packages list. Follow the same pattern used by existing packages (ServiceModule's package).

Look for a `getPackages()` override or `PackageList`. Add:
```kotlin
import com.relayo.log.LogPackage
// In getPackages():
packages.add(LogPackage())
```

**Step 4: Commit**

```
feat(native): add LogModule TurboModule for relay log CRUD
```

---

## Task 7: Create TypeScript TurboModule spec + types

**Files:**
- Create: `src/native/NativeLogModule.ts`
- Modify: `src/types/index.ts`

**Step 1: Add RelayLog type**

Append to `src/types/index.ts`:

```typescript
export type RelayLog = {
  id: number;
  senderNumber: string;
  receiverNumber: string;
  messagePreview: string;
  receivedAt: number;
  relayedAt: number;
  status: 'sent' | 'failed';
  errorCode: string | null;
  errorMessage: string | null;
};
```

**Step 2: Create NativeLogModule.ts**

Follow exact same pattern as `NativeServiceModule.ts`:

```typescript
import {NativeModules} from 'react-native';
import type {RelayLog} from '../types';

interface LogModuleInterface {
  getLogs(limit: number, offset: number): Promise<RelayLog[]>;
  getLatestLog(): Promise<RelayLog | null>;
  getLogCount(): Promise<number>;
  deleteLog(id: number): Promise<boolean>;
  clearAllLogs(): Promise<boolean>;
}

const {LogModule} = NativeModules as {LogModule: LogModuleInterface};

export default {
  getLogs: (limit: number, offset: number): Promise<RelayLog[]> =>
    LogModule.getLogs(limit, offset),

  getLatestLog: (): Promise<RelayLog | null> =>
    LogModule.getLatestLog(),

  getLogCount: (): Promise<number> =>
    LogModule.getLogCount(),

  deleteLog: (id: number): Promise<boolean> =>
    LogModule.deleteLog(id),

  clearAllLogs: (): Promise<boolean> =>
    LogModule.clearAllLogs(),
};
```

**Step 3: Commit**

```
feat(native): add TypeScript spec for LogModule
```

---

## Task 8: Implement LogsScreen

**Files:**
- Rewrite: `src/screens/LogsScreen.tsx`

**Design spec** (terminal aesthetic, matching existing screens):

The screen should have:
1. **Header**: "RELAY_LOG" title + log count + "[ CLEAR ALL ]" button (top right)
2. **FlatList** of log entries, each entry in a TerminalCard-like row showing:
   - Status indicator (green dot for sent, red for failed)
   - Sender number
   - Relative timestamp ("2m ago", "1h ago", etc.)
   - Message preview (truncated single line)
   - Error code (if failed, in red)
3. **Swipe-to-delete** on individual entries (or a delete icon/button on each row)
4. **Empty state**: terminal prompt "No relay logs recorded yet"
5. **Pagination**: load more on scroll (50 per page)

**Step 1: Write the full LogsScreen**

```tsx
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  AppState,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ScanlineOverlay from '../components/ScanlineOverlay';
import LogModule from '../native/NativeLogModule';
import type {RelayLog} from '../types';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';

const PAGE_SIZE = 50;

const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const LogsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<RelayLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasMore = useRef(true);

  const loadLogs = useCallback(async (offset: number, append: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      const [page, count] = await Promise.all([
        LogModule.getLogs(PAGE_SIZE, offset),
        offset === 0 ? LogModule.getLogCount() : Promise.resolve(totalCount),
      ]);
      if (offset === 0) setTotalCount(count);
      hasMore.current = page.length === PAGE_SIZE;
      setLogs(prev => (append ? [...prev, ...page] : page));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [loading, totalCount]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    hasMore.current = true;
    await loadLogs(0, false);
    setRefreshing(false);
  }, [loadLogs]);

  useEffect(() => {
    loadLogs(0, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        loadLogs(0, false);
      }
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    if (hasMore.current && !loading) {
      loadLogs(logs.length, true);
    }
  };

  const handleDeleteLog = (log: RelayLog) => {
    Alert.alert(
      'DELETE LOG',
      `Remove relay log from ${log.senderNumber}?`,
      [
        {text: 'CANCEL', style: 'cancel'},
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            await LogModule.deleteLog(log.id);
            setLogs(prev => prev.filter(l => l.id !== log.id));
            setTotalCount(prev => prev - 1);
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    if (logs.length === 0) return;
    Alert.alert(
      'CLEAR ALL LOGS',
      `Delete all ${totalCount} relay logs? This cannot be undone.`,
      [
        {text: 'CANCEL', style: 'cancel'},
        {
          text: 'CLEAR ALL',
          style: 'destructive',
          onPress: async () => {
            await LogModule.clearAllLogs();
            setLogs([]);
            setTotalCount(0);
          },
        },
      ],
    );
  };

  const renderLogItem = ({item}: {item: RelayLog}) => {
    const isSent = item.status === 'sent';
    const statusColor = isSent ? colors.green : colors.red;
    const statusLabel = isSent ? 'SENT' : 'FAIL';

    return (
      <View style={styles.logRow}>
        <View style={styles.logHeader}>
          <View style={styles.logHeaderLeft}>
            <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
            <Text style={[styles.statusLabel, {color: statusColor}]}>
              {statusLabel}
            </Text>
            <Text style={styles.senderNumber}>{item.senderNumber}</Text>
          </View>
          <View style={styles.logHeaderRight}>
            <Text style={styles.timestamp}>
              {formatRelativeTime(item.relayedAt)}
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteLog(item)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.receiverLine} numberOfLines={1}>
          → {item.receiverNumber}
        </Text>

        <Text style={styles.messagePreview} numberOfLines={1}>
          {item.messagePreview}
        </Text>

        {!isSent && item.errorCode && (
          <Text style={styles.errorLine}>
            ERR:{item.errorCode}
            {item.errorMessage ? ` — ${item.errorMessage}` : ''}
          </Text>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyPrompt}>{'> No relay logs recorded yet'}</Text>
      <Text style={styles.emptyHint}>
        Logs appear after SMS relay attempts
      </Text>
    </View>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>RELAY_LOG</Text>
          <Text style={styles.headerCount}>
            {totalCount} {totalCount === 1 ? 'ENTRY' : 'ENTRIES'}
          </Text>
        </View>
        {logs.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>[ CLEAR ALL ]</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => String(item.id)}
        renderItem={renderLogItem}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={renderSeparator}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={[
          styles.listContent,
          logs.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
      <ScanlineOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.title,
    color: colors.text,
    letterSpacing: 1,
  },
  headerCount: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    marginTop: spacing.xxs,
    letterSpacing: 0.5,
  },
  clearBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: borderWidth.thin,
    borderColor: colors.red,
    marginTop: spacing.xxs,
  },
  clearBtnText: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.label,
    color: colors.red,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.massive,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  logRow: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.micro,
    letterSpacing: 0.8,
  },
  senderNumber: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    color: colors.text,
    letterSpacing: 0.5,
  },
  timestamp: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  deleteBtn: {
    paddingHorizontal: spacing.xs,
  },
  deleteBtnText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  receiverLine: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    marginBottom: spacing.xs,
  },
  messagePreview: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
  },
  errorLine: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
    color: colors.red,
    marginTop: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyPrompt: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
  },
});

export default LogsScreen;
```

**Step 2: Commit**

```
feat(ui): implement LogsScreen with pagination and deletion
```

---

## Task 9: Wire DashboardScreen LAST_EXEC_LOG to real data

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

**Step 1: Import LogModule and use getLatestLog()**

Add import:
```typescript
import LogModule from '../native/NativeLogModule';
import type {RelayLog} from '../types';
```

Add state:
```typescript
const [latestLog, setLatestLog] = useState<RelayLog | null>(null);
```

Add loader (alongside existing `loadDiagnostics`):
```typescript
const loadLatestLog = useCallback(async () => {
  try {
    const log = await LogModule.getLatestLog();
    setLatestLog(log);
  } catch {
    // silently fail
  }
}, []);
```

Call it in the existing polling `useEffect` alongside `pollData` and `loadDiagnostics`:
```typescript
useEffect(() => {
  pollData();
  loadDiagnostics();
  loadLatestLog();
  const interval = setInterval(() => {
    pollData();
    loadLatestLog();
  }, POLL_INTERVAL);
  return () => clearInterval(interval);
}, [pollData, loadDiagnostics, loadLatestLog]);
```

Also in the AppState listener:
```typescript
useEffect(() => {
  const sub = AppState.addEventListener('change', nextState => {
    if (nextState === 'active') {
      loadDiagnostics();
      loadLatestLog();
    }
  });
  return () => sub.remove();
}, [loadDiagnostics, loadLatestLog]);
```

**Step 2: Update the LAST_EXEC_LOG rendering to use latestLog**

Replace the current LAST_EXEC_LOG TerminalCard content. The card currently reads from `lastStatus` (AppStatusEntity). Change to read from `latestLog` (RelayLogEntity).

Change the derived variables:
```typescript
const lastResultLabel = latestLog
  ? latestLog.status === 'sent'
    ? 'SEND_SUCCESS'
    : 'SEND_FAILED'
  : 'NO_DATA';

const lastResultColor = latestLog
  ? latestLog.status === 'sent'
    ? colors.green
    : colors.red
  : colors.textDim;
```

Update the timestamp display:
```typescript
<Text style={styles.logOutputGreen}>
  {latestLog
    ? formatTimestamp(latestLog.relayedAt)
    : 'N/A'}
</Text>
```

Update the error section:
```typescript
{latestLog?.status === 'failed' && latestLog?.errorMessage && (
  <>
    <View style={[styles.logLine, styles.logLineSpaced]}>
      <Text style={styles.logPrompt}>$ </Text>
      <Text style={styles.logCmd}>cat error.log</Text>
    </View>
    <Text style={styles.logOutputError}>
      {latestLog.errorMessage}
    </Text>
  </>
)}
```

Add sender info line after the timestamp block:
```typescript
{latestLog && (
  <>
    <View style={[styles.logLine, styles.logLineSpaced]}>
      <Text style={styles.logPrompt}>$ </Text>
      <Text style={styles.logCmd}>echo $SENDER</Text>
    </View>
    <Text style={styles.logOutputGreen}>
      {latestLog.senderNumber} → {latestLog.receiverNumber}
    </Text>
  </>
)}
```

**Step 3: Remove `lastStatus`-related code**

After switching to `latestLog`:
- Remove `const [lastStatus, setLastStatus] = useState<AppStatus | null>(null);`
- Remove `setLastStatus(status)` from `pollData`
- Remove `ServiceModule.getLastStatus()` from the `Promise.all` in `pollData`
- Remove `import type {AppStatus} from '../native/NativeServiceModule';`
- Clean up any remaining `lastStatus` references

The `pollData` function simplifies to:
```typescript
const pollData = useCallback(async () => {
  try {
    const [running, count] = await Promise.all([
      ServiceModule.isServiceRunning(),
      ServiceModule.getOutboxCount(),
    ]);
    setIsActive(running);
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
```

**Step 4: Commit**

```
feat(ui): wire dashboard LAST_EXEC_LOG to relay log table
```

---

## Task 10: Build, install, and verify

**Step 1: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 2: Build and install on device**

```bash
export JAVA_HOME=~/.local/jdk/jdk-21.0.10+7 && export ANDROID_HOME=~/Android/Sdk && export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH" && npx react-native run-android --no-packager
```

Expected: BUILD SUCCESSFUL, installed on moto g75 5G.

**Step 3: Manual verification checklist**

- [ ] App launches without crash (DB migration runs)
- [ ] Dashboard LAST_EXEC_LOG shows "N/A" / "NO_DATA" (no logs yet)
- [ ] Logs tab shows empty state: "> No relay logs recorded yet"
- [ ] Send a test SMS to the phone → log entry appears in Logs tab
- [ ] Dashboard LAST_EXEC_LOG updates with sender, receiver, timestamp, result
- [ ] Tap delete (✕) on a log entry → confirmation dialog → entry removed
- [ ] Tap "CLEAR ALL" → confirmation dialog → all entries removed, count resets
- [ ] Pull-to-refresh on Logs screen works

**Step 4: Commit**

```
chore: verify relay logs feature end-to-end
```

---

## Dependency Graph

```
Task 1 (Entity) ──┐
Task 2 (DAO) ─────┤
                   ├── Task 3 (Database + migration)
                   │        │
                   │   ┌────┴────┐
                   │   │         │
                   Task 4      Task 5
                (SmsPipeline) (RetryManager)
                   │         │
                   └────┬────┘
                        │
                   Task 6 (LogModule Kotlin)
                        │
                   Task 7 (TS spec + types)
                        │
                   ┌────┴────┐
                   │         │
                 Task 8    Task 9
              (LogsScreen) (Dashboard)
                   │         │
                   └────┬────┘
                        │
                   Task 10 (Build + verify)
```

Tasks 1-2 can run in parallel. Tasks 4-5 can run in parallel. Tasks 8-9 can run in parallel.
