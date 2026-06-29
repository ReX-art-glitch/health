import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineStorage } from './OfflineStorage';
import { ImmunizationAPI } from '../api/immunization';
import { MaternalAPI } from '../api/maternal';
import { DiseaseAPI } from '../api/diseases';
import { InventoryAPI } from '../api/inventory';

class SyncManagerService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = [];
    this.lastSyncTime = null;
  }

  /**
   * Initialize sync manager
   */
  async initialize() {
    try {
      const lastSync = await AsyncStorage.getItem('lastSyncTime');
      this.lastSyncTime = lastSync ? new Date(lastSync) : null;
      
      // Clean up old completed items
      await OfflineStorage.cleanupCompleted(7);
      
      console.log('Sync Manager initialized');
    } catch (error) {
      console.error('Error initializing sync manager:', error);
    }
  }

  /**
   * Sync all pending data
   */
  async syncAll() {
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return { success: false, message: 'No internet connection' };
    }

    this.isSyncing = true;
    this.notifyListeners('started');

    const results = {
      success: true,
      synced: 0,
      errors: 0,
      details: [],
      startedAt: new Date().toISOString(),
    };

    try {
      const queue = await OfflineStorage.getSyncQueue();
      const pendingItems = queue.filter(item => 
        item.status === 'pending' || (item.status === 'failed' && item.retryCount < 3)
      );

      for (const item of pendingItems) {
        try {
          await OfflineStorage.updateSyncItemStatus(item.id, 'syncing');
          
          let response;
          switch (item.type) {
            case 'immunization':
              response = await ImmunizationAPI.submitRecord(item.data);
              break;
            case 'maternal_health':
              response = await MaternalAPI.registerPregnancy(item.data);
              break;
            case 'anc_visit':
              response = await MaternalAPI.recordANCVisit(
                item.data.pregnancyId,
                item.data
              );
              break;
            case 'disease_report':
              response = await DiseaseAPI.reportDisease(item.data);
              break;
            case 'inventory':
              response = await InventoryAPI.updateInventory(item.data);
              break;
            case 'facility_assessment':
              response = await this.syncFacilityAssessment(item.data);
              break;
            default:
              throw new Error(`Unknown data type: ${item.type}`);
          }

          if (response.success) {
            await OfflineStorage.removeFromSyncQueue(item.id);
            results.synced++;
            results.details.push({
              id: item.id,
              type: item.type,
              status: 'success',
            });
          } else {
            throw new Error(response.error || 'Sync failed');
          }
        } catch (error) {
          await OfflineStorage.updateSyncItemStatus(item.id, 'failed', error.message);
          results.errors++;
          results.details.push({
            id: item.id,
            type: item.type,
            status: 'failed',
            error: error.message,
          });
        }
      }

      // Update last sync time
      this.lastSyncTime = new Date();
      await AsyncStorage.setItem('lastSyncTime', this.lastSyncTime.toISOString());

      results.completedAt = new Date().toISOString();
      results.duration = (new Date(results.completedAt) - new Date(results.startedAt)) / 1000;

    } catch (error) {
      results.success = false;
      results.error = error.message;
    } finally {
      this.isSyncing = false;
      this.notifyListeners('completed', results);
    }

    return results;
  }

  /**
   * Sync specific data type
   */
  async syncByType(dataType) {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return { success: false, message: 'No internet connection' };
    }

    const results = { synced: 0, errors: 0, details: [] };
    
    try {
      const queue = await OfflineStorage.getSyncQueue();
      const pendingItems = queue.filter(item => 
        item.type === dataType && item.status === 'pending'
      );

      for (const item of pendingItems) {
        try {
          // Process item (similar to syncAll)
          await OfflineStorage.removeFromSyncQueue(item.id);
          results.synced++;
        } catch (error) {
          results.errors++;
          results.details.push({
            id: item.id,
            error: error.message,
          });
        }
      }
    } catch (error) {
      console.error(`Error syncing ${dataType}:`, error);
    }

    return results;
  }

  /**
   * Get pending sync count
   */
  async getPendingSyncCount() {
    return await OfflineStorage.getPendingSyncCount();
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const stats = await OfflineStorage.getSyncStats();
    
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime?.toISOString(),
      pendingCount: stats?.pending || 0,
      failedCount: stats?.failed || 0,
      totalPending: stats?.total || 0,
      stats: stats,
    };
  }

  /**
   * Force sync
   */
  async forceSync() {
    // Clear sync lock if stuck
    this.isSyncing = false;
    return await this.syncAll();
  }

  /**
   * Add sync listener
   */
  addListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data = null) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Retry failed items
   */
  async retryFailedItems() {
    const failedItems = await OfflineStorage.getFailedItems();
    
    if (failedItems.length === 0) {
      return { success: true, message: 'No failed items to retry' };
    }

    // Reset failed items to pending
    const queue = await OfflineStorage.getSyncQueue();
    for (const item of queue) {
      if (item.status === 'failed' && item.retryCount < 3) {
        item.status = 'pending';
      }
    }
    await AsyncStorage.setItem(
      OfflineStorage.SYNC_QUEUE_KEY,
      JSON.stringify(queue)
    );

    // Trigger sync
    return await this.syncAll();
  }
}

export const SyncManager = new SyncManagerService();

// Background sync task
export const BackgroundSync = async () => {
  try {
    const result = await SyncManager.syncAll();
    console.log('Background sync completed:', result);
  } catch (error) {
    console.error('Background sync failed:', error);
  }
};