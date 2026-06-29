import {
    FETCH_DASHBOARD_START,
    FETCH_DASHBOARD_SUCCESS,
    FETCH_DASHBOARD_FAILURE,
    FETCH_IMMUNIZATIONS_START,
    FETCH_IMMUNIZATIONS_SUCCESS,
    FETCH_IMMUNIZATIONS_FAILURE,
    SUBMIT_DATA_START,
    SUBMIT_DATA_SUCCESS,
    SUBMIT_DATA_FAILURE,
    SET_OFFLINE_DATA,
    CLEAR_DATA,
  } from '../actions/dataActions';
  
  const initialState = {
    dashboardData: null,
    immunizations: [],
    maternalRecords: [],
    diseaseReports: [],
    inventory: [],
    loading: {
      dashboard: false,
      immunizations: false,
      submitting: false,
    },
    error: null,
    offlineData: {},
    lastFetch: null,
  };
  
  const dataReducer = (state = initialState, action) => {
    switch (action.type) {
      case FETCH_DASHBOARD_START:
        return {
          ...state,
          loading: { ...state.loading, dashboard: true },
          error: null,
        };
  
      case FETCH_DASHBOARD_SUCCESS:
        return {
          ...state,
          loading: { ...state.loading, dashboard: false },
          dashboardData: action.payload,
          lastFetch: new Date().toISOString(),
          error: null,
        };
  
      case FETCH_DASHBOARD_FAILURE:
        return {
          ...state,
          loading: { ...state.loading, dashboard: false },
          error: action.payload,
        };
  
      case FETCH_IMMUNIZATIONS_START:
        return {
          ...state,
          loading: { ...state.loading, immunizations: true },
        };
  
      case FETCH_IMMUNIZATIONS_SUCCESS:
        return {
          ...state,
          loading: { ...state.loading, immunizations: false },
          immunizations: action.payload,
        };
  
      case FETCH_IMMUNIZATIONS_FAILURE:
        return {
          ...state,
          loading: { ...state.loading, immunizations: false },
          error: action.payload,
        };
  
      case SUBMIT_DATA_START:
        return {
          ...state,
          loading: { ...state.loading, submitting: true },
          error: null,
        };
  
      case SUBMIT_DATA_SUCCESS:
        const { dataType, data, synced } = action.payload;
        
        // Update relevant state based on data type
        const updatedState = { ...state };
        
        if (dataType === 'immunization') {
          updatedState.immunizations = [data, ...state.immunizations];
        } else if (dataType === 'maternal') {
          updatedState.maternalRecords = [data, ...state.maternalRecords];
        } else if (dataType === 'disease') {
          updatedState.diseaseReports = [data, ...state.diseaseReports];
        } else if (dataType === 'inventory') {
          const existingIndex = state.inventory.findIndex(i => i.id === data.id);
          if (existingIndex >= 0) {
            updatedState.inventory = [...state.inventory];
            updatedState.inventory[existingIndex] = data;
          } else {
            updatedState.inventory = [data, ...state.inventory];
          }
        }
        
        return {
          ...updatedState,
          loading: { ...state.loading, submitting: false },
          error: null,
        };
  
      case SUBMIT_DATA_FAILURE:
        return {
          ...state,
          loading: { ...state.loading, submitting: false },
          error: action.payload.error,
        };
  
      case SET_OFFLINE_DATA:
        return {
          ...state,
          offlineData: {
            ...state.offlineData,
            [action.payload.dataType]: action.payload.data,
          },
        };
  
      case CLEAR_DATA:
        return {
          ...initialState,
        };
  
      default:
        return state;
    }
  };
  
  export default dataReducer;