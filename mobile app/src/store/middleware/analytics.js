/**
 * Analytics Middleware
 * Tracks user actions and syncs analytics data
 */

const analyticsEvents = [];

export const analyticsMiddleware = (store) => (next) => (action) => {
  // Track specific actions
  const trackedActions = [
    'AUTH_SUCCESS',
    'AUTH_FAILURE',
    'LOGOUT',
    'SUBMIT_DATA_SUCCESS',
    'SUBMIT_DATA_FAILURE',
    'SYNC_SUCCESS',
    'SYNC_FAILURE',
    'FETCH_DASHBOARD_SUCCESS',
    'ANALYTICS_EVENT',
  ];

  // Process the action first
  const result = next(action);

  // Then track it if it's in our tracked list
  if (trackedActions.includes(action.type) || action.type === 'ANALYTICS_EVENT') {
    const state = store.getState();
    
    const eventData = {
      action: action.type,
      timestamp: new Date().toISOString(),
      user: state.auth?.user?.id || 'anonymous',
      payload: action.type === 'ANALYTICS_EVENT' ? action.payload : null,
      metadata: {
        screen: getCurrentScreen(state),
        online: state.sync?.status?.isOnline !== false,
        appVersion: '1.0.0',
      },
    };

    // Add to events queue
    analyticsEvents.push(eventData);

    // Keep only last 1000 events
    if (analyticsEvents.length > 1000) {
      analyticsEvents.shift();
    }

    // Log analytics in development
    if (__DEV__) {
      console.log('%c [Analytics]', 'color: #FF9800; font-weight: bold;', eventData);
    }

    // Batch send analytics periodically
    if (analyticsEvents.length >= 10) {
      sendAnalyticsBatch();
    }
  }

  return result;
};

// Get current screen from navigation state
const getCurrentScreen = (state) => {
  try {
    // This would extract the current screen from navigation state
    return 'unknown';
  } catch {
    return 'unknown';
  }
};

// Send analytics batch to server
const sendAnalyticsBatch = async () => {
  if (analyticsEvents.length === 0) return;

  const batch = [...analyticsEvents];
  analyticsEvents.length = 0; // Clear queue

  try {
    // Send to analytics endpoint
    // await API.post('/analytics/events', { events: batch });
    
    if (__DEV__) {
      console.log(`%c [Analytics] Sent ${batch.length} events`, 'color: #FF9800;');
    }
  } catch (error) {
    // Re-queue failed events
    analyticsEvents.unshift(...batch);
    console.error('Analytics send failed:', error);
  }
};

// Export analytics helper
export const getAnalyticsQueue = () => analyticsEvents;

export const clearAnalyticsQueue = () => {
  analyticsEvents.length = 0;
};