import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
