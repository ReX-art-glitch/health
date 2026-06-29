/**
 * Format date to display string
 */
export const formatDate = (date, format = 'default') => {
    if (!date) return '';
    
    const d = new Date(date);
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        });
      
      case 'long':
        return d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      
      case 'datetime':
        return d.toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      
      case 'time':
        return d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
      
      case 'relative':
        return getRelativeTime(d);
      
      default:
        return d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
    }
  };
  
  /**
   * Get relative time string
   */
  const getRelativeTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
  
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  };
  
  /**
   * Format number with commas
   */
  export const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  /**
   * Format percentage
   */
  export const formatPercentage = (value, decimals = 1) => {
    if (value === null || value === undefined) return '0%';
    return `${Number(value).toFixed(decimals)}%`;
  };
  
  /**
   * Format phone number
   */
  export const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    
    return phone;
  };
  
  /**
   * Format file size
   */
  export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  /**
   * Truncate text
   */
  export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  /**
   * Capitalize first letter
   */
  export const capitalize = (text) => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };
  
  /**
   * Format name
   */
  export const formatName = (firstName, lastName) => {
    if (!firstName && !lastName) return '';
    return `${firstName || ''} ${lastName || ''}`.trim();
  };
  
  /**
   * Format address
   */
  export const formatAddress = (address) => {
    if (!address) return '';
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
  };
  
  /**
   * Format blood pressure
   */
  export const formatBloodPressure = (systolic, diastolic) => {
    if (!systolic && !diastolic) return '';
    return `${systolic || '--'}/${diastolic || '--'} mmHg`;
  };
  
  /**
   * Format hemoglobin
   */
  export const formatHemoglobin = (value) => {
    if (!value) return '';
    return `${value} g/dL`;
  };
  
  /**
   * Format weight
   */
  export const formatWeight = (value, unit = 'kg') => {
    if (!value) return '';
    return `${value} ${unit}`;
  };
  
  /**
   * Format height
   */
  export const formatHeight = (value, unit = 'cm') => {
    if (!value) return '';
    return `${value} ${unit}`;
  };
  
  /**
   * Format temperature
   */
  export const formatTemperature = (value, unit = '°C') => {
    if (!value) return '';
    return `${value}${unit}`;
  };
  
  /**
   * Format duration
   */
  export const formatDuration = (minutes) => {
    if (!minutes) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };