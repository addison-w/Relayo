import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, fontFamily, fontSize, spacing, borderWidth} from '../theme';
import type {DiagnosticModule} from '../types';
import StatusBadge from './StatusBadge';

interface DiagnosticsTableProps {
  modules: DiagnosticModule[];
}

const statusToBadge = (status: DiagnosticModule['status']) => {
  switch (status) {
    case 'ready':
      return 'ready' as const;
    case 'warning':
      return 'warning' as const;
    case 'error':
      return 'error' as const;
    default:
      return 'pending' as const;
  }
};

const DiagnosticsTable: React.FC<DiagnosticsTableProps> = ({modules}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>MODULE</Text>
        <Text style={[styles.headerCell, styles.statusHeader]}>STATUS</Text>
      </View>

      {modules.map((mod, index) => (
        <View
          key={mod.id}
          style={[
            styles.row,
            index < modules.length - 1 && styles.rowBorder,
          ]}>
          <View style={styles.moduleInfo}>
            <View style={styles.moduleNameRow}>
              <Text style={styles.moduleIcon}>{mod.icon}</Text>
              <Text style={styles.moduleName}>{mod.name.toUpperCase()}</Text>
            </View>
            <Text style={styles.moduleDescription}>{mod.description}</Text>
          </View>
          <View style={styles.statusCell}>
            <StatusBadge status={statusToBadge(mod.status)} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: borderWidth.thin,
    borderBottomColor: colors.border,
  },
  headerCell: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusHeader: {
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: borderWidth.thin,
    borderBottomColor: colors.border,
  },
  moduleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  moduleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  moduleIcon: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    color: colors.textDim,
  },
  moduleName: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.body,
    color: colors.text,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  moduleDescription: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    color: colors.textDim,
    marginTop: spacing.xxs,
    marginLeft: spacing.xl,
  },
  statusCell: {
    alignItems: 'flex-end',
  },
});

export default DiagnosticsTable;
