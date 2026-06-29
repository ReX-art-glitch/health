// API Configuration
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:8000/api/v1'
  : 'https://api.publichealthai.com/api/v1';

export const API_TIMEOUT = 30000; // 30 seconds
export const UPLOAD_TIMEOUT = 60000; // 60 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000; // 1 second

// Sync Configuration
export const SYNC_CONFIG = {
  INTERVAL: 300000, // 5 minutes
  MAX_BATCH_SIZE: 50,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 60000, // 1 minute
  BACKGROUND_SYNC_INTERVAL: 900000, // 15 minutes
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  DEVICE_ID: 'deviceId',
  DEVICE_TOKEN: 'deviceToken',
  LAST_SYNC: 'lastSyncTime',
  PENDING_SYNC: 'pendingSync',
  SYNC_QUEUE: 'syncQueue',
  LOCAL_DATA: 'localData',
  LOCATION_TRACKING: 'locationTracking',
  APP_SETTINGS: 'appSettings',
  BIOMETRIC_CREDENTIALS: 'biometric_credentials',
  CACHED_DATA: 'cachedData',
  LAST_LOCATION: 'lastLocation',
};

// Location Configuration
export const LOCATION_CONFIG = {
  HIGH_ACCURACY: true,
  TIMEOUT: 15000,
  MAXIMUM_AGE: 10000,
  DISTANCE_FILTER: 10, // meters
  INTERVAL: 300000, // 5 minutes
  FASTEST_INTERVAL: 150000, // 2.5 minutes
};

// Vaccination Schedule (by age)
export const VACCINATION_SCHEDULE = {
  AT_BIRTH: {
    vaccines: ['BCG', 'OPV-0', 'HepB-0'],
    ageRange: { min: 0, max: 2 }, // weeks
    description: 'At Birth',
  },
  '6_WEEKS': {
    vaccines: ['OPV-1', 'Penta-1', 'PCV-1', 'Rota-1'],
    ageRange: { min: 6, max: 9 },
    description: '6 Weeks',
  },
  '10_WEEKS': {
    vaccines: ['OPV-2', 'Penta-2', 'PCV-2', 'Rota-2'],
    ageRange: { min: 10, max: 13 },
    description: '10 Weeks',
  },
  '14_WEEKS': {
    vaccines: ['OPV-3', 'Penta-3', 'PCV-3', 'IPV'],
    ageRange: { min: 14, max: 17 },
    description: '14 Weeks',
  },
  '9_MONTHS': {
    vaccines: ['Measles-1', 'Yellow Fever'],
    ageRange: { min: 39, max: 44 }, // weeks
    description: '9 Months',
  },
  '15_MONTHS': {
    vaccines: ['Measles-2', 'MMR'],
    ageRange: { min: 65, max: 78 },
    description: '15 Months',
  },
  '18_MONTHS': {
    vaccines: ['DPT-Booster', 'OPV-Booster'],
    ageRange: { min: 78, max: 91 },
    description: '18 Months',
  },
  '5_YEARS': {
    vaccines: ['DPT-Booster-2', 'OPV-Booster-2', 'MMR-2'],
    ageRange: { min: 260, max: 286 },
    description: '5 Years',
  },
};

// Notifiable Diseases
export const NOTIFIABLE_DISEASES = [
  'Cholera',
  'Measles',
  'Polio',
  'Yellow Fever',
  'Meningitis',
  'Lassa Fever',
  'Ebola',
  'COVID-19',
  'Malaria',
  'Tuberculosis',
  'HIV/AIDS',
  'Hepatitis B',
  'Hepatitis C',
  'Typhoid Fever',
  'Dysentery',
  'Pneumonia',
  'Diphtheria',
  'Tetanus',
  'Pertussis',
  'Influenza',
];

// Disease Categories
export const DISEASE_CATEGORIES = {
  VACCINE_PREVENTABLE: ['Measles', 'Polio', 'Yellow Fever', 'Diphtheria', 'Tetanus', 'Pertussis', 'Hepatitis B'],
  WATERBORNE: ['Cholera', 'Typhoid Fever', 'Dysentery', 'Hepatitis A'],
  VECTORBORNE: ['Malaria', 'Yellow Fever', 'Dengue'],
  RESPIRATORY: ['Tuberculosis', 'Pneumonia', 'COVID-19', 'Influenza'],
  HEMORRHAGIC: ['Ebola', 'Lassa Fever', 'Marburg'],
  SEXUALLY_TRANSMITTED: ['HIV/AIDS', 'Hepatitis B', 'Hepatitis C', 'Syphilis'],
};

// Drug Categories
export const DRUG_CATEGORIES = [
  'Vaccines',
  'Antibiotics',
  'Antimalarials',
  'Analgesics',
  'Antipyretics',
  'Antihypertensives',
  'Antidiabetics',
  'Anthelmintics',
  'Antifungals',
  'Antivirals',
  'ORS',
  'Vitamins',
  'Minerals',
  'Family Planning',
  'Oxytocics',
  'Anesthetics',
  'Antiseptics',
  'Disinfectants',
  'Other',
];

// Drug Storage Conditions
export const STORAGE_CONDITIONS = [
  { value: 'room_temperature', label: 'Room Temperature (15-25°C)', icon: 'thermostat' },
  { value: 'refrigerated', label: 'Refrigerated (2-8°C)', icon: 'ac-unit' },
  { value: 'frozen', label: 'Frozen (-20°C)', icon: 'severe-cold' },
  { value: 'cold_chain', label: 'Cold Chain (2-8°C)', icon: 'ac-unit' },
  { value: 'cool_dry_place', label: 'Cool Dry Place', icon: 'dry' },
  { value: 'protected_from_light', label: 'Protected from Light', icon: 'dark-mode' },
];

// Drug Units
export const DRUG_UNITS = [
  'doses',
  'vials',
  'tablets',
  'capsules',
  'bottles',
  'ampoules',
  'tubes',
  'packs',
  'kits',
  'sachets',
  'syringes',
  'units',
  'boxes',
  'strips',
  'liters',
  'milliliters',
];

// Facility Types
export const FACILITY_TYPES = [
  'Primary Health Centre',
  'Secondary Health Centre',
  'General Hospital',
  'Teaching Hospital',
  'Private Clinic',
  'Maternity Home',
  'Dispensary',
  'Health Post',
  'Community Health Centre',
  'Comprehensive Health Centre',
  'Federal Medical Centre',
  'Specialist Hospital',
];

// Facility Services
export const FACILITY_SERVICES = [
  'Outpatient',
  'Inpatient',
  'Maternity',
  'Immunization',
  'Family Planning',
  'Laboratory',
  'Pharmacy',
  'Emergency',
  'Surgery',
  'Pediatrics',
  'Antenatal',
  'Postnatal',
  'HIV Testing',
  'HIV Treatment',
  'TB Treatment',
  'Malaria Treatment',
  'Nutrition',
  'Mental Health',
  'Dental',
  'Eye Care',
  'Radiology',
  'Ultrasound',
];

// Power Supply Options
export const POWER_OPTIONS = [
  'National Grid',
  'Generator',
  'Solar',
  'Inverter',
  'Battery',
  'None',
];

// Water Supply Options
export const WATER_OPTIONS = [
  'Piped Water',
  'Borehole',
  'Well',
  'Rainwater Harvesting',
  'Water Tanker',
  'None',
];

// Blood Groups
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// HIV Status
export const HIV_STATUS = ['Positive', 'Negative', 'Unknown', 'Not Tested'];

// Severity Levels
export const SEVERITY_LEVELS = [
  { value: 'mild', label: 'Mild', color: '#4CAF50' },
  { value: 'moderate', label: 'Moderate', color: '#FF9800' },
  { value: 'severe', label: 'Severe', color: '#f44336' },
  { value: 'critical', label: 'Critical', color: '#d32f2f' },
];

// Case Status
export const CASE_STATUS = [
  'suspected',
  'probable',
  'confirmed',
  'discarded',
  'recovered',
  'deceased',
];

// Risk Factors (Maternal)
export const MATERNAL_RISK_FACTORS = [
  'Previous C-section',
  'Multiple Pregnancy',
  'Age < 18 or > 35',
  'Hypertension',
  'Diabetes',
  'Anemia',
  'Previous Preterm Birth',
  'Previous Stillbirth',
  'Malpresentation',
  'Antepartum Hemorrhage',
  'Pregnancy-Induced Hypertension',
  'Pre-eclampsia',
  'Eclampsia',
  'Placenta Previa',
  'Placental Abruption',
  'Previous Postpartum Hemorrhage',
  'Rh Incompatibility',
  'Other',
];

// Symptoms List
export const COMMON_SYMPTOMS = [
  'Fever',
  'Cough',
  'Headache',
  'Diarrhea',
  'Vomiting',
  'Nausea',
  'Rash',
  'Fatigue',
  'Muscle Pain',
  'Joint Pain',
  'Shortness of Breath',
  'Loss of Taste/Smell',
  'Sore Throat',
  'Runny Nose',
  'Abdominal Pain',
  'Chest Pain',
  'Bleeding',
  'Jaundice',
  'Convulsions',
  'Loss of Appetite',
  'Weight Loss',
  'Night Sweats',
  'Swelling',
  'Dizziness',
  'Confusion',
];

// Gender Options
export const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

// Assessment Ratings
export const RATING_LEVELS = [
  { value: 1, label: 'Poor', color: '#f44336', icon: 'sentiment-very-dissatisfied' },
  { value: 2, label: 'Fair', color: '#FF9800', icon: 'sentiment-dissatisfied' },
  { value: 3, label: 'Average', color: '#FFC107', icon: 'sentiment-neutral' },
  { value: 4, label: 'Good', color: '#8BC34A', icon: 'sentiment-satisfied' },
  { value: 5, label: 'Excellent', color: '#4CAF50', icon: 'sentiment-very-satisfied' },
];

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  DATETIME: 'DD/MM/YYYY HH:mm',
  TIME: 'HH:mm',
  SHORT: 'DD/MM/YY',
  LONG: 'DD MMMM YYYY',
  MONTH_YEAR: 'MMMM YYYY',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INITIAL_PAGE: 1,
};

// File Upload Limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES_PER_UPLOAD: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

// Validation Rules
export const VALIDATION_RULES = {
  CHILD_NAME_MIN_LENGTH: 2,
  CHILD_NAME_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  PHONE_REGEX: /^\+?[\d\s-]{10,15}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  BATCH_NUMBER_REGEX: /^[A-Za-z0-9-]{4,20}$/,
  MIN_AGE_FOR_VACCINE: 0,
  MAX_AGE_FOR_VACCINE: 5, // years
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  HEMOGLOBIN_MIN: 3,
  HEMOGLOBIN_MAX: 25,
  BP_SYSTOLIC_MIN: 60,
  BP_SYSTOLIC_MAX: 250,
  BP_DIASTOLIC_MIN: 30,
  BP_DIASTOLIC_MAX: 150,
  TEMPERATURE_MIN: 35,
  TEMPERATURE_MAX: 43,
  WEIGHT_MIN: 0.5,
  WEIGHT_MAX: 300,
  HEIGHT_MIN: 20,
  HEIGHT_MAX: 250,
  AGE_MIN: 0,
  AGE_MAX: 150,
  QUANTITY_MIN: 0,
  QUANTITY_MAX: 999999,
};

// App Colors
export const COLORS = {
  primary: '#1976D2',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',
  accent: '#FF4081',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#9E9E9E',
  grayLight: '#F5F5F5',
  grayMedium: '#E0E0E0',
  grayDark: '#616161',
  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  error: '#F44336',
  errorLight: '#FFEBEE',
  info: '#2196F3',
  infoLight: '#E3F2FD',
  
  // Status colors
  vaccination: '#4CAF50',
  maternal: '#E91E63',
  disease: '#FF9800',
  inventory: '#2196F3',
  facility: '#9C27B0',
  sync: '#607D8B',
  
  // Severity colors
  critical: '#d32f2f',
  severe: '#f44336',
  moderate: '#FF9800',
  mild: '#4CAF50',
  
  // Stock status
  stockCritical: '#f44336',
  stockLow: '#FF9800',
  stockNormal: '#4CAF50',
  stockOverstocked: '#2196F3',
  
  // Text colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textHint: '#BDBDBD',
  textDisabled: '#9E9E9E',
  textWhite: '#FFFFFF',
};

// Chart Colors
export const CHART_COLORS = {
  primary: '#2196F3',
  secondary: '#FF9800',
  success: '#4CAF50',
  danger: '#F44336',
  purple: '#9C27B0',
  teal: '#009688',
  indigo: '#3F51B5',
  pink: '#E91E63',
  lime: '#CDDC39',
  blueGray: '#607D8B',
  deepOrange: '#FF5722',
  amber: '#FFC107',
  lightGreen: '#8BC34A',
  cyan: '#00BCD4',
  
  palette: [
    '#2196F3', '#FF9800', '#4CAF50', '#F44336',
    '#9C27B0', '#009688', '#3F51B5', '#E91E63',
    '#CDDC39', '#607D8B', '#FF5722', '#00BCD4',
  ],
};

// Dimensions
export const DIMENSIONS = {
  HEADER_HEIGHT: 56,
  TAB_BAR_HEIGHT: 60,
  INPUT_HEIGHT: 48,
  BUTTON_HEIGHT: 48,
  ICON_SIZE_SMALL: 16,
  ICON_SIZE_MEDIUM: 24,
  ICON_SIZE_LARGE: 32,
  AVATAR_SIZE_SMALL: 40,
  AVATAR_SIZE_MEDIUM: 64,
  AVATAR_SIZE_LARGE: 100,
  BORDER_RADIUS_SMALL: 4,
  BORDER_RADIUS_MEDIUM: 8,
  BORDER_RADIUS_LARGE: 16,
  BORDER_RADIUS_XL: 24,
  PADDING_SMALL: 8,
  PADDING_MEDIUM: 16,
  PADDING_LARGE: 24,
  MARGIN_SMALL: 8,
  MARGIN_MEDIUM: 16,
  MARGIN_LARGE: 24,
};

// Animation Durations
export const ANIMATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  AUTH_ERROR: 'Authentication failed. Please login again.',
  VALIDATION_ERROR: 'Please check the form for errors.',
  PERMISSION_DENIED: 'Permission denied. You do not have access to this feature.',
  LOCATION_DISABLED: 'Location services are disabled. Please enable them to continue.',
  CAMERA_DENIED: 'Camera permission is required for document scanning.',
  STORAGE_FULL: 'Storage is full. Please free up some space.',
  SYNC_FAILED: 'Data sync failed. Your changes are saved locally.',
  OFFLINE_MODE: 'You are currently offline. Changes will sync when connected.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  DATA_SAVED: 'Data saved successfully.',
  DATA_SYNCED: 'Data synced successfully.',
  RECORD_CREATED: 'Record created successfully.',
  RECORD_UPDATED: 'Record updated successfully.',
  RECORD_DELETED: 'Record deleted successfully.',
  SYNC_COMPLETE: 'All data synced successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  REPORT_SUBMITTED: 'Report submitted successfully.',
  ASSESSMENT_SUBMITTED: 'Assessment submitted successfully.',
};

// Languages
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

// App Metadata
export const APP_METADATA = {
  NAME: 'Public Health AI',
  VERSION: '1.0.0',
  BUILD: '1',
  PACKAGE_NAME: 'com.publichealthai.mobile',
  BUNDLE_ID: 'com.publichealthai.mobile',
  DEVELOPER: 'Public Health AI Team',
  WEBSITE: 'https://publichealthai.com',
  SUPPORT_EMAIL: 'support@publichealthai.com',
  PRIVACY_POLICY: 'https://publichealthai.com/privacy',
  TERMS_OF_SERVICE: 'https://publichealthai.com/terms',
};