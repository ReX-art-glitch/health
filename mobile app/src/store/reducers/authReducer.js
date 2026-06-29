import {
    AUTH_START,
    AUTH_SUCCESS,
    AUTH_FAILURE,
    LOGOUT,
    SET_USER,
    UPDATE_PROFILE,
    CLEAR_AUTH_ERROR,
    SET_BIOMETRIC_ENABLED,
    SET_LAST_LOGIN,
    TOKEN_REFRESHED,
    SESSION_EXPIRED,
  } from '../actions/authActions';
  
  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    lastLogin: null,
    biometricEnabled: false,
    sessionExpired: false,
    tokenRefreshing: false,
  };
  
  const authReducer = (state = initialState, action) => {
    switch (action.type) {
      case AUTH_START:
        return {
          ...state,
          loading: true,
          error: null,
          sessionExpired: false,
        };
  
      case AUTH_SUCCESS:
        return {
          ...state,
          loading: false,
          isAuthenticated: true,
          user: action.payload.user,
          token: action.payload.token || state.token,
          lastLogin: action.payload.lastLogin || new Date().toISOString(),
          error: null,
          sessionExpired: false,
          tokenRefreshing: false,
        };
  
      case AUTH_FAILURE:
        return {
          ...state,
          loading: false,
          isAuthenticated: false,
          user: null,
          token: null,
          error: action.payload,
        };
  
      case LOGOUT:
        return {
          ...initialState,
          loading: false,
        };
  
      case SET_USER:
        return {
          ...state,
          user: {
            ...state.user,
            ...action.payload,
          },
        };
  
      case UPDATE_PROFILE:
        return {
          ...state,
          user: {
            ...state.user,
            ...action.payload,
          },
        };
  
      case CLEAR_AUTH_ERROR:
        return {
          ...state,
          error: null,
        };
  
      case SET_BIOMETRIC_ENABLED:
        return {
          ...state,
          biometricEnabled: action.payload,
        };
  
      case SET_LAST_LOGIN:
        return {
          ...state,
          lastLogin: action.payload,
        };
  
      case TOKEN_REFRESHED:
        return {
          ...state,
          token: action.payload.token,
          tokenRefreshing: false,
          sessionExpired: false,
        };
  
      case SESSION_EXPIRED:
        return {
          ...state,
          sessionExpired: true,
        };
  
      case 'RESET_APP':
        return initialState;
  
      default:
        return state;
    }
  };
  
  export default authReducer;