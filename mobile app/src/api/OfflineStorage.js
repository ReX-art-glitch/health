import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

class OfflineStorageService {
  constructor() {
    this.SYNC_QUEUE_KEY = 'syncQueue';
    this.LOCAL_DATA_KEY = 'localData';
    this.PENDING_SYNC_KEY = 'pendingSync';
  }

  /**
   * Save data for later sync
   */
  async saveForSync(dataType, data) {
    try {
      const queue = await this.getSyncQueue();
      
      const syncItem = {
        id: uuidv4(),
        type: dataType,
        data: data,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending',
      };

      queue.push(syncItem);
      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
      
      // Update pending count
      await this.updatePendingCount();
      
      return syncItem.id;
    } catch (error) {
      console.error('Error saving for sync:', error);
      return null;
    }
  }

  /**
   * Get sync queue
   */
  async getSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem(this.SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(itemId) {
    try {
      const queue = await this.getSyncQueue();
      const updatedQueue = queue.filter(item => item.id !== itemId);
      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
      await this.updatePendingCount();
      return true;
    } catch (error) {
      console.error('Error removing from sync queue:', error);
      return false;
    }
  }

  /**
   * Update item status in sync queue
   */
  async updateSyncItemStatus(itemId, status, error = null) {
    try {
      const queue = await this.getSyncQueue();
      const itemIndex = queue.findIndex(item => item.id === itemId);
      
      if (itemIndex !== -1) {
        queue[itemIndex].status = status;
        if (error) queue[itemIndex].error = error;
        if (status === 'failed') {
          queue[itemIndex].retryCount += 1;
        }
        await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Error updating sync item:', error);
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingSyncCount() {
    try {
      const queue = await this.getSyncQueue();
      return queue.filter(item => item.status === 'pending').length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Update pending sync count
   */
  async updatePendingCount() {
    const count = await this.getPendingSyncCount();
    await AsyncStorage.setItem(this.PENDING_SYNC_KEY, count.toString());
    return count;
  }

  /**
   * Save data locally
   */
  async saveLocalData(key, data) {
    try {
      const localData = await this.getLocalData();
      localData[key] = {
        data: data,
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem(this.LOCAL_DATA_KEY, JSON.stringify(localData));
      return true;
    } catch (error) {
      console.error('Error saving local data:', error);
      return false;
    }
  }

  /**
   * Get local data
   */
  async getLocalData(key = null) {
    try {
      const data = await AsyncStorage.getItem(this.LOCAL_DATA_KEY);
      const localData = data ? JSON.parse(data) : {};
      
      return key ? localData[key]?.data : localData;
    } catch (error) {
      console.error('Error getting local data:', error);
      return key ? null : {};
    }
  }

  /**
   * Remove local data
   */
  async removeLocalData(key) {
    try {
      const localData = await this.getLocalData();
      delete localData[key];
      await AsyncStorage.setItem(this.LOCAL_DATA_KEY, JSON.stringify(localData));
      return true;
    } catch (error) {
      console.error('Error removing local data:', error);
      return false;
    }
  }

  /**
   * Clear all offline data
   */
  async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        this.SYNC_QUEUE_KEY,
        this.LOCAL_DATA_KEY,
        this.PENDING_SYNC_KEY,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing offline data:', error);
      return false;
    }
  }

  /**
   * Get sync queue stats
   */
  async getSyncStats() {
    try {
      const queue = await this.getSyncQueue();
      
      const stats = {
        total: queue.length,
        pending: 0,
        syncing: 0,
        completed: 0,
        failed: 0,
        byType: {},
      };

      queue.forEach(item => {
        stats[item.status] = (stats[item.status] || 0) + 1;
        
        if (!stats.byType[item.type]) {
          stats.byType[item.type] = { total: 0, pending: 0, failed: 0 };
        }
        stats.byType[item.type].total++;
        if (item.status === 'pending') stats.byType[item.type].pending++;
        if (item.status === 'failed') stats.byType[item.type].failed++;
      });

      return stats;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up old completed items
   */
  async cleanupCompleted(daysOld = 7) {
    try {
      const queue = await this.getSyncQueue();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const updatedQueue = queue.filter(item => {
        if (item.status === 'completed') {
          const itemDate = new Date(item.timestamp);
          return itemDate > cutoffDate;
        }
        return true;
      });

      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
      return queue.length - updatedQueue.length;
    } catch (error) {
      console.error('Error cleaning up sync queue:', error);
      return 0;
    }
  }

  /**
   * Get failed items
   */
  async getFailedItems() {
    try {
      const queue = await this.getSyncQueue();
      return queue.filter(item => item.status === 'failed' && item.retryCount < 3);
    } catch (error) {
      return [];
    }
  }
}

export const OfflineStorage = new OfflineStorageService();