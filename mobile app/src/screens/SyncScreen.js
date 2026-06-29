import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SyncManager } from '../services/SyncManager';
import { OfflineStorage } from '../services/OfflineStorage';
import { triggerSync, updatePendingCount } from '../store/actions/syncActions';

const SyncScreen = ({ navigation }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStats, setSyncStats] = useState({
    total: 0,
    synced: 0,
    failed: 0,
  });
  const [syncItems, setSyncItems] = useState([]);
  const dispatch = useDispatch();
  const { pendingSync, lastSyncTime } = useSelector(state => state.sync);

  useEffect(() => {
    loadSyncStatus();
    const unsubscribe = SyncManager.addListener(handleSyncEvent);
    return () => unsubscribe();
  }, []);

  const loadSyncStatus = async () => {
    const status = await SyncManager.getSyncStatus();
    const stats = await OfflineStorage.getSyncStats();
    const queue = await OfflineStorage.getSyncQueue();
    
    setSyncItems(queue.filter(item => item.status === 'pending' || item.status === 'failed'));
    if (stats) {
      setSyncStats({
        total: stats.total,
        synced: stats.completed || 0,
        failed: stats.failed || 0,
      });
    }
  };

  const handleSyncEvent = (event, data) => {
    switch (event) {
      case 'started':
        setSyncing(true);
        setSyncProgress(0);
        break;
      case 'completed':
        setSyncing(false);
        setSyncProgress(100);
        loadSyncStatus();
        dispatch(updatePendingCount());
        break;
      case 'progress':
        setSyncProgress(data.progress || 0);
        break;
    }
  };

  const handleStartSync = async () => {
    if (syncing) return;

    Alert.alert(
      'Start Sync',
      'This will sync all pending data with the server. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync All',
          onPress: async () => {
            setSyncing(true);
            const result = await SyncManager.syncAll();
            
            if (result.success) {
              Alert.alert(
                'Sync Complete',
                `Synced: ${result.synced}\nFailed: ${result.errors}`,
                [{ text: 'OK', onPress: () => loadSyncStatus() }]
              );
            } else {
              Alert.alert('Sync Error', result.message || 'Sync failed');
            }
            setSyncing(false);
          },
        },
      ]
    );
  };

  const handleForceSync = async () => {
    Alert.alert(
      'Force Sync',
      'This will clear sync lock and force synchronization. Use only if sync seems stuck.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Sync',
          style: 'destructive',
          onPress: async () => {
            const result = await SyncManager.forceSync();
            Alert.alert('Force Sync', result.message);
            loadSyncStatus();
          },
        },
      ]
    );
  };

  const handleRetryFailed = async () => {
    const result = await SyncManager.retryFailedItems();
    Alert.alert('Retry', result.message);
    loadSyncStatus();
  };

  const handleClearQueue = async () => {
    Alert.alert(
      'Clear Queue',
      'This will remove all pending sync items. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await OfflineStorage.clearAll();
            loadSyncStatus();
            dispatch(updatePendingCount());
            Alert.alert('Cleared', 'Sync queue has been cleared.');
          },
        },
      ]
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const getSyncItemIcon = (type) => {
    switch (type) {
      case 'immunization': return 'vaccines';
      case 'maternal_health': return 'pregnant-woman';
      case 'anc_visit': return 'event';
      case 'disease_report': return 'coronavirus';
      case 'inventory': return 'inventory';
      case 'facility_assessment': return 'assessment';
      default: return 'description';
    }
  };

  const getSyncItemColor = (type) => {
    switch (type) {
      case 'immunization': return '#4CAF50';
      case 'maternal_health': return '#E91E63';
      case 'disease_report': return '#FF9800';
      case 'inventory': return '#2196F3';
      case 'facility_assessment': return '#9C27B0';
      default: return '#607D8B';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="sync" size={30} color="#fff" />
        <Text style={styles.headerTitle}>Data Sync</Text>
      </View>

      {/* Sync Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Sync Status</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: syncing ? '#FF9800' : pendingSync > 0 ? '#f44336' : '#4CAF50' }
          ]}>
            <Text style={styles.statusBadgeText}>
              {syncing ? 'Syncing...' : pendingSync > 0 ? 'Pending' : 'Up to Date'}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Sync</Text>
          <Text style={styles.statusValue}>{formatTime(lastSyncTime)}</Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Pending Items</Text>
          <Text style={styles.statusValue}>{pendingSync}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      {syncing && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${syncProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{syncProgress}% Complete</Text>
        </View>
      )}

      {/* Sync Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.syncButton]}
          onPress={handleStartSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="sync" size={20} color="#fff" />
              <Text style={styles.actionText}>Sync All Data</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retryButton]}
            onPress={handleRetryFailed}
          >
            <Icon name="replay" size={18} color="#fff" />
            <Text style={styles.actionSmallText}>Retry Failed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.forceButton]}
            onPress={handleForceSync}
          >
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={styles.actionSmallText}>Force Sync</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Sync Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>{syncStats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{syncStats.synced}</Text>
            <Text style={styles.statLabel}>Synced</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#f44336' }]}>{syncStats.failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      </View>

      {/* Pending Items List */}
      <View style={styles.itemsSection}>
        <Text style={styles.itemsTitle}>Pending Sync Items</Text>
        
        {syncItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="check-circle" size={50} color="#4CAF50" />
            <Text style={styles.emptyText}>No pending items</Text>
          </View>
        ) : (
          syncItems.map((item, index) => (
            <View key={item.id || index} style={styles.syncItem}>
              <View style={[styles.itemIcon, { backgroundColor: getSyncItemColor(item.type) }]}>
                <Icon name={getSyncItemIcon(item.type)} size={20} color="#fff" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemType}>
                  {item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Text style={styles.itemTime}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
              <View style={[
                styles.itemStatus,
                { backgroundColor: item.status === 'failed' ? '#ffebee' : '#fff3e0' }
              ]}>
                <Text style={[
                  styles.itemStatusText,
                  { color: item.status === 'failed' ? '#f44336' : '#FF9800' }
                ]}>
                  {item.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleClearQueue}
        >
          <Icon name="delete-forever" size={20} color="#f44336" />
          <Text style={styles.dangerButtonText}>Clear Sync Queue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#607D8B',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  actions: {
    padding: 15,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
    elevation: 2,
  },
  syncButton: {
    backgroundColor: '#2196F3',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 12,
  },
  forceButton: {
    flex: 1,
    backgroundColor: '#f44336',
    padding: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionSmallText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  itemsSection: {
    padding: 15,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  syncItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
    elevation: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  itemStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  itemStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  dangerZone: {
    padding: 15,
    marginTop: 20,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 10,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    gap: 8,
  },
  dangerButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SyncScreen;