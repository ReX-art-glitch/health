import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineStorage {
  static async saveDataLocally(key, data) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving locally:', error);
      return false;
    }
  }

  static async getLocalData(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting local data:', error);
      return null;
    }
  }

  static async queueForSync(data) {
    try {
      const pendingSync = await AsyncStorage.getItem('pendingSync');
      const syncQueue = pendingSync ? JSON.parse(pendingSync) : [];
      
      syncQueue.push({
        ...data,
        timestamp: new Date().toISOString(),
        syncStatus: 'pending'
      });
      
      await AsyncStorage.setItem('pendingSync', JSON.stringify(syncQueue));
      return true;
    } catch (error) {
      console.error('Error queuing for sync:', error);
      return false;
    }
  }

  static async getPendingSyncCount() {
    try {
      const pendingSync = await AsyncStorage.getItem('pendingSync');
      return pendingSync ? JSON.parse(pendingSync).length : 0;
    } catch (error) {
      return 0;
    }
  }

  static async clearSyncQueue() {
    try {
      await AsyncStorage.removeItem('pendingSync');
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  }
}

export default OfflineStorage;