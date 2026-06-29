/**
 * Redux Logger Middleware
 * Logs actions and state changes in development
 */

const actionColors = {
    AUTH: '#1976D2',
    DATA: '#4CAF50',
    SYNC: '#FF9800',
    FETCH: '#9C27B0',
    SUBMIT: '#00BCD4',
    DEFAULT: '#607D8B',
  };
  
  const getActionColor = (actionType) => {
    if (actionType.includes('AUTH')) return actionColors.AUTH;
    if (actionType.includes('SYNC')) return actionColors.SYNC;
    if (actionType.includes('FETCH')) return actionColors.FETCH;
    if (actionType.includes('SUBMIT')) return actionColors.SUBMIT;
    if (actionType.includes('DATA')) return actionColors.DATA;
    return actionColors.DEFAULT;
  };
  
  export const loggerMiddleware = (store) => (next) => (action) => {
    if (!__DEV__) {
      return next(action);
    }
  
    const startTime = Date.now();
    const prevState = store.getState();
    
    // Skip logging for high-frequency actions
    const skipActions = ['SYNC_PROGRESS', 'SET_LAST_SYNC'];
    const shouldSkip = skipActions.includes(action.type);
    
    if (!shouldSkip) {
      console.group(
        `%c Action: %c${action.type}`,
        'color: #999; font-weight: normal;',
        `color: ${getActionColor(action.type)}; font-weight: bold;`
      );
      
      console.log('%c Previous State:', 'color: #9E9E9E; font-weight: bold;', prevState);
      console.log('%c Action Payload:', 'color: #03A9F4; font-weight: bold;', action.payload || action);
    }
    
    const result = next(action);
    
    if (!shouldSkip) {
      const nextState = store.getState();
      const duration = Date.now() - startTime;
      
      console.log('%c Next State:', 'color: #4CAF50; font-weight: bold;', nextState);
      console.log(`%c Duration: ${duration}ms`, 'color: #999;');
      console.groupEnd();
    }
    
    return result;
  };