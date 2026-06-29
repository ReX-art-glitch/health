import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import thunk from 'redux-thunk';

// Reducers
import authReducer from './reducers/authReducer';
import dataReducer from './reducers/dataReducer';
import syncReducer from './reducers/syncReducer';

// Custom middleware
import { loggerMiddleware } from './middleware/logger';
import { analyticsMiddleware } from './middleware/analytics';
import { offlineQueueMiddleware } from './middleware/offlineQueue';

// Redux Persist Configuration
const rootPersistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'sync'], // Only persist auth and sync state
  blacklist: ['data'], // Don't persist large data sets
  version: 1,
  migrate: (state) => {
    // Handle state migrations between versions
    return Promise.resolve(state);
  },
};

// Auth persist config (more secure storage for sensitive data)
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'isAuthenticated', 'lastLogin'], // Only persist non-sensitive auth data
  blacklist: ['loading', 'error', 'token'], // Don't persist token in AsyncStorage
};

// Sync persist config
const syncPersistConfig = {
  key: 'sync',
  storage: AsyncStorage,
  whitelist: ['lastSyncTime', 'pendingSync'],
  blacklist: ['isSyncing', 'progress', 'error'],
};

// Combine reducers
const appReducer = combineReducers({
  auth: authReducer,
  data: dataReducer,
  sync: syncReducer,
});

// Root reducer with reset capability
const rootReducer = (state, action) => {
  // Handle logout by resetting state
  if (action.type === 'LOGOUT') {
    // Keep sync state when logging out
    const { sync } = state || {};
    state = { sync };
  }
  
  // Handle full app reset
  if (action.type === 'RESET_APP') {
    state = undefined;
  }

  return appReducer(state, action);
};

// Create persisted reducer
const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// Middleware configuration
const middleware = [
  thunk,
  offlineQueueMiddleware,
  analyticsMiddleware,
];

// Add logger in development
if (__DEV__) {
  middleware.push(loggerMiddleware);
}

// Redux DevTools configuration
let composeEnhancers = compose;

if (__DEV__) {
  // Enable Redux DevTools if available
  if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
    composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
      name: 'PublicHealthAI',
      trace: true,
      traceLimit: 25,
      actionsDenylist: ['SYNC_PROGRESS'], // Don't track high-frequency actions
    });
  }
}

// Create store
const store = createStore(
  persistedReducer,
  composeEnhancers(applyMiddleware(...middleware))
);

// Create persistor
const persistor = persistStore(store, null, () => {
  // After rehydration is complete
  console.log('Redux store rehydration complete');
  
  // Dispatch any pending actions that were queued during rehydration
  const pendingActions = store.getState()._pendingActions || [];
  pendingActions.forEach(action => store.dispatch(action));
});

// Export store and persistor
export { store, persistor };

// Export types for useSelector hooks
export const getState = () => store.getState();
export const dispatch = (action) => store.dispatch(action);

// Subscribe to store changes for debugging in development
if (__DEV__) {
  let previousState = store.getState();
  store.subscribe(() => {
    const currentState = store.getState();
    
    // Log state changes
    if (currentState !== previousState) {
      const changedKeys = Object.keys(currentState).filter(
        key => currentState[key] !== previousState[key]
      );
      
      if (changedKeys.length > 0) {
        console.log('State changed:', changedKeys.join(', '));
      }
      
      previousState = currentState;
    }
  });
}

// Export store types for TypeScript users
export const storeTypes = {
  auth: ['user', 'token', 'isAuthenticated', 'loading', 'error', 'lastLogin'],
  data: ['dashboardData', 'immunizations', 'maternalRecords', 'diseaseReports', 'inventory', 'loading', 'error', 'offlineData', 'lastFetch'],
  sync: ['isSyncing', 'progress', 'pendingSync', 'lastSyncTime', 'error', 'syncStats'],
};