import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

const SyncStatus = ({ onSyncPress }) => {
  const { isSyncing, progress, pendingSync, lastSyncTime, error } = useSelector(
    state => state.sync
  );

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusInfo}>
          <Icon
            name={pendingSync > 0 ? 'sync-problem' : 'sync'}
            size={16}
            color={pendingSync > 0 ? COLORS.warning : COLORS.success}
          />
          <Text style={styles.statusText}>
            {isSyncing
              ? 'Syncing...'
              : pendingSync > 0
              ? `${pendingSync} items pending`
              : 'All synced'}
          </Text>
        </View>

        <Text style={styles.lastSync}>
          {lastSyncTime
            ? `Last sync: ${formatDate(lastSyncTime, 'relative')}`
            : 'Never synced'}
        </Text>
      </View>

      {/* Progress Bar */}
      {isSyncing && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={14} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Sync Button */}
      {pendingSync > 0 && !isSyncing && (
        <TouchableOpacity style={styles.syncButton} onPress={onSyncPress}>
          <Icon name="sync" size={14} color="#fff" />
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 15,
    marginVertical: 8,
    elevation: 2,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  lastSync: {
    fontSize: 11,
    color: '#999',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    width: 35,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginTop: 10,
    alignSelf: 'flex-end',
    gap: 6,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SyncStatus;