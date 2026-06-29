import { VALIDATION_RULES, VACCINATION_SCHEDULE, NOTIFIABLE_DISEASES } from './constants';

/**
 * Validate immunization form data
 */
export const validateImmunization = (data) => {
  const errors = {};

  // Child name validation
  if (!data.childName || data.childName.trim().length < VALIDATION_RULES.CHILD_NAME_MIN_LENGTH) {
    errors.childName = `Child name must be at least ${VALIDATION_RULES.CHILD_NAME_MIN_LENGTH} characters`;
  } else if (data.childName.trim().length > VALIDATION_RULES.CHILD_NAME_MAX_LENGTH) {
    errors.childName = `Child name must not exceed ${VALIDATION_RULES.CHILD_NAME_MAX_LENGTH} characters`;
  }

  // Date of birth validation
  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const birthDate = new Date(data.dateOfBirth);
    const today = new Date();
    
    if (birthDate > today) {
      errors.dateOfBirth = 'Date of birth cannot be in the future';
    } else {
      const ageInYears = (today - birthDate) / (1000 * 60 * 60 * 24 * 365);
      if (ageInYears > VALIDATION_RULES.MAX_AGE_FOR_VACCINE) {
        errors.dateOfBirth = `Child must be under ${VALIDATION_RULES.MAX_AGE_FOR_VACCINE} years for routine immunization`;
      }
    }
  }

  // Gender validation
  if (!data.gender) {
    errors.gender = 'Gender is required';
  }

  // Vaccine type validation
  if (!data.vaccineType) {
    errors.vaccineType = 'Vaccine type is required';
  }

  // Dose number validation
  if (!data.doseNumber) {
    errors.doseNumber = 'Dose number is required';
  }

  // Batch number validation
  if (!data.batchNumber) {
    errors.batchNumber = 'Batch number is required';
  } else if (!VALIDATION_RULES.BATCH_NUMBER_REGEX.test(data.batchNumber)) {
    errors.batchNumber = 'Invalid batch number format (4-20 alphanumeric characters)';
  }

  // Date administered validation
  if (!data.dateAdministered) {
    errors.dateAdministered = 'Date administered is required';
  } else {
    const adminDate = new Date(data.dateAdministered);
    const today = new Date();
    
    if (adminDate > today) {
      errors.dateAdministered = 'Date administered cannot be in the future';
    }
    
    // Check if administered after birth
    if (data.dateOfBirth && adminDate < new Date(data.dateOfBirth)) {
      errors.dateAdministered = 'Date administered must be after date of birth';
    }
  }

  // Health worker name validation
  if (!data.administeredBy || data.administeredBy.trim().length < 2) {
    errors.administeredBy = 'Name of administering health worker is required';
  }

  // Phone validation (optional but must be valid if provided)
  if (data.phone && !VALIDATION_RULES.PHONE_REGEX.test(data.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  return errors;
};

/**
 * Validate maternal health form data
 */
export const validateMaternalHealth = (data) => {
  const errors = {};

  // Patient name validation
  if (!data.patientName || data.patientName.trim().length < 2) {
    errors.patientName = 'Patient name is required';
  }

  // Age validation
  if (data.age) {
    const age = parseInt(data.age);
    if (isNaN(age) || age < VALIDATION_RULES.AGE_MIN || age > VALIDATION_RULES.AGE_MAX) {
      errors.age = `Age must be between ${VALIDATION_RULES.AGE_MIN} and ${VALIDATION_RULES.AGE_MAX}`;
    }
  }

  // LMP validation
  if (!data.lmp) {
    errors.lmp = 'Last menstrual period date is required';
  } else {
    const lmpDate = new Date(data.lmp);
    const today = new Date();
    
    if (lmpDate > today) {
      errors.lmp = 'LMP cannot be in the future';
    } else {
      // Check if LMP is within reasonable range (not more than 10 months ago)
      const diffMonths = (today - lmpDate) / (1000 * 60 * 60 * 24 * 30);
      if (diffMonths > 10) {
        errors.lmp = 'LMP date seems too old. Please verify.';
      }
    }
  }

  // Gravida validation
  if (data.gravida) {
    const gravida = parseInt(data.gravida);
    if (isNaN(gravida) || gravida < 0 || gravida > 20) {
      errors.gravida = 'Invalid gravida value (0-20)';
    }
  }

  // Para validation
  if (data.para) {
    const para = parseInt(data.para);
    if (isNaN(para) || para < 0 || para > 20) {
      errors.para = 'Invalid para value (0-20)';
    }
    
    // Para should not exceed gravida
    if (data.gravida && para > parseInt(data.gravida)) {
      errors.para = 'Para cannot be greater than gravida';
    }
  }

  // Living children validation
  if (data.livingChildren) {
    const living = parseInt(data.livingChildren);
    if (isNaN(living) || living < 0 || living > 20) {
      errors.livingChildren = 'Invalid value for living children';
    }
  }

  // Blood pressure validation
  if (data.bloodPressure) {
    const bpRegex = /^(\d{2,3})\/(\d{2,3})$/;
    const match = data.bloodPressure.match(bpRegex);
    
    if (!match) {
      errors.bloodPressure = 'Invalid blood pressure format (e.g., 120/80)';
    } else {
      const systolic = parseInt(match[1]);
      const diastolic = parseInt(match[2]);
      
      if (systolic < VALIDATION_RULES.BP_SYSTOLIC_MIN || systolic > VALIDATION_RULES.BP_SYSTOLIC_MAX) {
        errors.bloodPressure = `Systolic must be between ${VALIDATION_RULES.BP_SYSTOLIC_MIN} and ${VALIDATION_RULES.BP_SYSTOLIC_MAX}`;
      }
      
      if (diastolic < VALIDATION_RULES.BP_DIASTOLIC_MIN || diastolic > VALIDATION_RULES.BP_DIASTOLIC_MAX) {
        errors.bloodPressure = `Diastolic must be between ${VALIDATION_RULES.BP_DIASTOLIC_MIN} and ${VALIDATION_RULES.BP_DIASTOLIC_MAX}`;
      }
      
      if (systolic <= diastolic) {
        errors.bloodPressure = 'Systolic must be greater than diastolic';
      }
    }
  }

  // Hemoglobin validation
  if (data.hemoglobin) {
    const hb = parseFloat(data.hemoglobin);
    if (isNaN(hb) || hb < VALIDATION_RULES.HEMOGLOBIN_MIN || hb > VALIDATION_RULES.HEMOGLOBIN_MAX) {
      errors.hemoglobin = `Hemoglobin must be between ${VALIDATION_RULES.HEMOGLOBIN_MIN} and ${VALIDATION_RULES.HEMOGLOBIN_MAX} g/dL`;
    }
  }

  return errors;
};

/**
 * Validate disease report form data
 */
export const validateDiseaseReport = (data) => {
  const errors = {};

  // Disease type validation
  if (!data.diseaseType) {
    errors.diseaseType = 'Disease type is required';
  }

  // Patient name validation
  if (!data.patientName || data.patientName.trim().length < 2) {
    errors.patientName = 'Patient name is required';
  }

  // Age validation
  if (data.age) {
    const age = parseInt(data.age);
    if (isNaN(age) || age < 0 || age > 150) {
      errors.age = 'Invalid age';
    }
  }

  // Gender validation
  if (!data.gender) {
    errors.gender = 'Gender is required';
  }

  // Date of onset validation
  if (!data.dateOfOnset) {
    errors.dateOfOnset = 'Date of onset is required';
  } else {
    const onsetDate = new Date(data.dateOfOnset);
    const today = new Date();
    
    if (onsetDate > today) {
      errors.dateOfOnset = 'Date of onset cannot be in the future';
    }
  }

  // Number of cases validation
  if (data.cases) {
    const cases = parseInt(data.cases);
    if (isNaN(cases) || cases < 1) {
      errors.cases = 'Number of cases must be at least 1';
    }
  }

  // Deaths validation
  if (data.deaths) {
    const deaths = parseInt(data.deaths);
    if (isNaN(deaths) || deaths < 0) {
      errors.deaths = 'Invalid number of deaths';
    }
    
    // Deaths should not exceed cases
    if (data.cases && deaths > parseInt(data.cases)) {
      errors.deaths = 'Deaths cannot exceed total cases';
    }
  }

  // Location validation
  if (!data.location) {
    errors.location = 'Location is required';
  }

  // Reported by validation
  if (!data.reportedBy || data.reportedBy.trim().length < 2) {
    errors.reportedBy = 'Reporter name is required';
  }

  return errors;
};

/**
 * Validate drug inventory form data
 */
export const validateInventory = (data) => {
  const errors = {};

  // Drug name validation
  if (!data.drugName || data.drugName.trim().length < 2) {
    errors.drugName = 'Drug name is required';
  }

  // Quantity validation
  if (data.quantity === '' || data.quantity === null || data.quantity === undefined) {
    errors.quantity = 'Quantity is required';
  } else {
    const quantity = parseInt(data.quantity);
    if (isNaN(quantity) || quantity < VALIDATION_RULES.QUANTITY_MIN) {
      errors.quantity = `Quantity must be at least ${VALIDATION_RULES.QUANTITY_MIN}`;
    } else if (quantity > VALIDATION_RULES.QUANTITY_MAX) {
      errors.quantity = `Quantity must not exceed ${VALIDATION_RULES.QUANTITY_MAX}`;
    }
  }

  // Unit validation
  if (!data.unit) {
    errors.unit = 'Unit is required';
  }

  // Batch number validation (optional but must be valid if provided)
  if (data.batchNumber && !VALIDATION_RULES.BATCH_NUMBER_REGEX.test(data.batchNumber)) {
    errors.batchNumber = 'Invalid batch number format';
  }

  // Expiry date validation
  if (data.expiryDate) {
    const expiryDate = new Date(data.expiryDate);
    const today = new Date();
    
    if (expiryDate < today) {
      errors.expiryDate = 'Drug has already expired';
    }
  }

  // Received date validation
  if (data.receivedDate) {
    const receivedDate = new Date(data.receivedDate);
    const today = new Date();
    
    if (receivedDate > today) {
      errors.receivedDate = 'Received date cannot be in the future';
    }
  }

  return errors;
};

/**
 * Validate facility assessment form data
 */
export const validateFacilityAssessment = (data) => {
  const errors = {};

  // Facility name validation
  if (!data.facilityName || data.facilityName.trim().length < 2) {
    errors.facilityName = 'Facility name is required';
  }

  // Facility type validation
  if (!data.facilityType) {
    errors.facilityType = 'Facility type is required';
  }

  // Assessment date validation
  if (!data.assessmentDate) {
    errors.assessmentDate = 'Assessment date is required';
  } else {
    const assessmentDate = new Date(data.assessmentDate);
    const today = new Date();
    
    if (assessmentDate > today) {
      errors.assessmentDate = 'Assessment date cannot be in the future';
    }
  }

  // Assessor name validation
  if (!data.assessorName || data.assessorName.trim().length < 2) {
    errors.assessorName = 'Assessor name is required';
  }

  // Rating validations (must be between 1 and 5)
  const ratingFields = [
    { field: 'infrastructure', label: 'Infrastructure rating' },
    { field: 'equipment', label: 'Equipment rating' },
    { field: 'staffing', label: 'Staffing rating' },
    { field: 'supplies', label: 'Supplies rating' },
    { field: 'sanitation', label: 'Sanitation rating' },
  ];

  ratingFields.forEach(({ field, label }) => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      const rating = parseInt(data[field]);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        errors[field] = `${label} must be between 1 and 5`;
      }
    }
  });

  // Staff count validation (if provided)
  if (data.staffCount) {
    const count = parseInt(data.staffCount);
    if (isNaN(count) || count < 0) {
      errors.staffCount = 'Invalid staff count';
    }
  }

  // Beds validation (if provided)
  if (data.beds) {
    const beds = parseInt(data.beds);
    if (isNaN(beds) || beds < 0) {
      errors.beds = 'Invalid number of beds';
    }
  }

  return errors;
};

/**
 * Validate login form
 */
export const validateLogin = (username, password) => {
  const errors = {};

  if (!username || username.trim().length === 0) {
    errors.username = 'Username is required';
  }

  if (!password || password.length === 0) {
    errors.password = 'Password is required';
  }

  return errors;
};

/**
 * Validate password change
 */
export const validatePasswordChange = (currentPassword, newPassword, confirmPassword) => {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = 'Current password is required';
  }

  if (!newPassword) {
    errors.newPassword = 'New password is required';
  } else {
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      errors.newPassword = validation.errors.join('. ');
    }
  }

  if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password || password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`);
  }
  
  if (password && password.length > VALIDATION_RULES.PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`);
  }
  
  if (password && !/[A-Z]/.test(password)) {
    errors.push('Include at least one uppercase letter');
  }
  
  if (password && !/[a-z]/.test(password)) {
    errors.push('Include at least one lowercase letter');
  }
  
  if (password && !/\d/.test(password)) {
    errors.push('Include at least one number');
  }
  
  if (password && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Include at least one special character');
  }
  
  if (password && /(.)\1{2,}/.test(password)) {
    errors.push('Avoid repeated characters');
  }
  
  // Check for common passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'admin123',
    'letmein', 'welcome1', 'monkey123', 'dragon123',
  ];
  
  if (password && commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Choose a stronger password.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: errors.length === 0 
      ? (password.length >= 12 ? 'strong' : 'moderate')
      : 'weak',
  };
};

/**
 * Validate email
 */
export const validateEmail = (email) => {
  if (!email) return false;
  return VALIDATION_RULES.EMAIL_REGEX.test(email);
};

/**
 * Validate phone number
 */
export const validatePhone = (phone) => {
  if (!phone) return true; // Phone is optional
  return VALIDATION_RULES.PHONE_REGEX.test(phone);
};

/**
 * Validate GPS coordinates
 */
export const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (isNaN(lat) || lat < -90 || lat > 90) return false;
  if (isNaN(lng) || lng < -180 || lng > 180) return false;
  
  return true;
};

/**
 * Validate if vaccine is age-appropriate
 */
export const isVaccineAgeAppropriate = (vaccineType, birthDate, administrationDate) => {
  if (!vaccineType || !birthDate) return true; // Can't validate without data
  
  const birth = new Date(birthDate);
  const adminDate = administrationDate ? new Date(administrationDate) : new Date();
  
  // Calculate age in weeks at administration
  const diffTime = adminDate - birth;
  const ageInWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  
  // Check against schedule
  for (const [period, schedule] of Object.entries(VACCINATION_SCHEDULE)) {
    if (schedule.vaccines.some(v => vaccineType.includes(v) || v.includes(vaccineType))) {
      const { min, max } = schedule.ageRange;
      if (ageInWeeks >= min && ageInWeeks <= max) {
        return true;
      }
      // Also check if it's acceptable to give the vaccine later
      if (ageInWeeks > max && ageInWeeks <= max + 8) {
        return { valid: true, isCatchUp: true, message: 'This is a catch-up vaccination' };
      }
    }
  }
  
  return false;
};

/**
 * Validate form data object
 */
export const validateForm = (data, validationRules) => {
  const errors = {};
  
  Object.keys(validationRules).forEach(field => {
    const rules = validationRules[field];
    const value = data[field];
    
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors[field] = rules.requiredMessage || `${field} is required`;
      return;
    }
    
    if (value && rules.min !== undefined && value.length < rules.min) {
      errors[field] = rules.minMessage || `Minimum ${rules.min} characters required`;
    }
    
    if (value && rules.max !== undefined && value.length > rules.max) {
      errors[field] = rules.maxMessage || `Maximum ${rules.max} characters allowed`;
    }
    
    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.patternMessage || 'Invalid format';
    }
    
    if (value && rules.custom && !rules.custom(value)) {
      errors[field] = rules.customMessage || 'Invalid value';
    }
  });
  
  return errors;
};

/**
 * Check if form has errors
 */
export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

/**
 * Check if form is valid
 */
export const isValid = (errors) => {
  return Object.keys(errors).length === 0;
};

/**
 * Clear field error
 */
export const clearFieldError = (errors, field) => {
  const newErrors = { ...errors };
  delete newErrors[field];
  return newErrors;
};

/**
 * Get first error message
 */
export const getFirstError = (errors) => {
  const keys = Object.keys(errors);
  if (keys.length === 0) return null;
  return errors[keys[0]];
};

/**
 * Validate referral form
 */
export const validateReferral = (data) => {
  const errors = {};

  if (!data.patientId) {
    errors.patientId = 'Patient ID is required';
  }

  if (!data.referringFacility) {
    errors.referringFacility = 'Referring facility is required';
  }

  if (!data.receivingFacility) {
    errors.receivingFacility = 'Receiving facility is required';
  }

  if (!data.reason || data.reason.trim().length < 10) {
    errors.reason = 'Referral reason is required (minimum 10 characters)';
  }

  if (!data.urgency) {
    errors.urgency = 'Urgency level is required';
  }

  return errors;
};

/**
 * Validate ANC visit form
 */
export const validateANCVisit = (data) => {
  const errors = {};

  if (!data.visitDate) {
    errors.visitDate = 'Visit date is required';
  }

  if (data.bloodPressure) {
    const bpRegex = /^(\d{2,3})\/(\d{2,3})$/;
    if (!bpRegex.test(data.bloodPressure)) {
      errors.bloodPressure = 'Invalid blood pressure format';
    }
  }

  if (data.fundalHeight) {
    const fh = parseFloat(data.fundalHeight);
    if (isNaN(fh) || fh < 0 || fh > 50) {
      errors.fundalHeight = 'Invalid fundal height (0-50 cm)';
    }
  }

  if (data.fetalHeartRate) {
    const fhr = parseInt(data.fetalHeartRate);
    if (isNaN(fhr) || fhr < 60 || fhr > 200) {
      errors.fetalHeartRate = 'Invalid fetal heart rate (60-200 bpm)';
    }
  }

  return errors;
};

/**
 * Validate delivery record
 */
export const validateDelivery = (data) => {
  const errors = {};

  if (!data.deliveryDate) {
    errors.deliveryDate = 'Delivery date is required';
  }

  if (!data.deliveryMode) {
    errors.deliveryMode = 'Delivery mode is required';
  }

  if (!data.outcome) {
    errors.outcome = 'Delivery outcome is required';
  }

  if (data.birthWeight) {
    const weight = parseFloat(data.birthWeight);
    if (isNaN(weight) || weight < 0.5 || weight > 7) {
      errors.birthWeight = 'Invalid birth weight (0.5-7 kg)';
    }
  }

  return errors;
};

/**
 * Validate child registration
 */
export const validateChildRegistration = (data) => {
  const errors = {};

  if (!data.childName || data.childName.trim().length < 2) {
    errors.childName = 'Child name is required';
  }

  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  }

  if (!data.gender) {
    errors.gender = 'Gender is required';
  }

  if (data.birthWeight) {
    const weight = parseFloat(data.birthWeight);
    if (isNaN(weight) || weight < 0.5 || weight > 7) {
      errors.birthWeight = 'Invalid birth weight';
    }
  }

  return errors;
};

/**
 * Sanitize input string (remove potentially dangerous characters)
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove SQL injection patterns
  sanitized = sanitized.replace(/['"\\;]/g, '');
  
  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

/**
 * Validate and sanitize all form fields
 */
export const sanitizeFormData = (data) => {
  const sanitized = {};
  
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string') {
      sanitized[key] = sanitizeInput(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  });
  
  return sanitized;
};