/**
 * Offline Queue Middleware
 * Queues actions when offline and replays them when online
 */

import NetInfo from '@react-native-community/netinfo';
import { OfflineStorage } from '../../services/OfflineStorage';

const offlineActionQueue = [];
let isOnline = true;

// Monitor network state
NetInfo.addEventListener(state => {
  const wasOffline = !isOnline;
  isOnline = state.isConnected && state.isInternetReachable;

  // If coming back online, replay queued actions
  if (wasOffline && isOnline && offlineActionQueue.length > 0) {
    replayOfflineActions();
  }
});

export const offlineQueueMiddleware = (store) => (next) => (action) => {
  // Actions that should be queued when offline
  const offlineQueueActions = [
    'SUBMIT_DATA_START',
    'FETCH_DATA_START',
    'FETCH_DASHBOARD_START',
  ];

  // Check if action should be queued when offline
  if (offlineQueueActions.includes(action.type) && !isOnline) {
    // Don't block the action, just log it
    console.log('[OfflineQueue] Queuing action for later:', action.type);
    
    offlineActionQueue.push({
      action,
      timestamp: new Date().toISOString(),
    });

    // Keep queue size manageable
    if (offlineActionQueue.length > 100) {
      offlineActionQueue.shift();
    }

    // Save queue to persistent storage
    saveOfflineQueue();
  }

  // Process action normally
  return next(action);
};

// Replay queued actions when back online
const replayOfflineActions = async () => {
  console.log(`[OfflineQueue] Replaying ${offlineActionQueue.length} queued actions`);
  
  const queue = [...offlineActionQueue];
  offlineActionQueue.length = 0;

  for (const item of queue) {
    try {
      // Dispatch the queued action
      store.dispatch(item.action);
      
      // Small delay between actions
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('[OfflineQueue] Failed to replay action:', error);
      
      // Re-queue failed action
      offlineActionQueue.push(item);
    }
  }

  // Save updated queue
  saveOfflineQueue();
};

// Save queue to persistent storage
const saveOfflineQueue = async () => {
  try {
    await OfflineStorage.saveLocalData('offlineActionQueue', offlineActionQueue);
  } catch (error) {
    console.error('[OfflineQueue] Failed to save queue:', error);
  }
};

// Load queue from persistent storage on app start
export const loadOfflineQueue = async () => {
  try {
    const savedQueue = await OfflineStorage.getLocalData('offlineActionQueue');
    if (savedQueue) {
      offlineActionQueue.push(...savedQueue);
      console.log(`[OfflineQueue] Loaded ${savedQueue.length} saved actions`);
    }
  } catch (error) {
    console.error('[OfflineQueue] Failed to load queue:', error);
  }
};

// Export queue helpers
export const getOfflineQueue = () => offlineActionQueue;

export const clearOfflineQueue = async () => {
  offlineActionQueue.length = 0;
  await saveOfflineQueue();
};

export const getOfflineQueueSize = () => offlineActionQueue.length;