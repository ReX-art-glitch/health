import ReactNativeBiometrics from 'react-native-biometrics';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Platform } from 'react-native';

class BiometricServiceClass {
  constructor() {
    this.biometrics = new ReactNativeBiometrics();
    this.biometricType = null;
  }

  /**
   * Check if biometric authentication is available
   */
  async isAvailable() {
    try {
      const { available, biometryType } = await this.biometrics.isSensorAvailable();
      
      if (available) {
        this.biometricType = biometryType;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Biometric availability check error:', error);
      return false;
    }
  }

  /**
   * Get biometric type
   */
  getBiometricType() {
    if (!this.biometricType) return null;
    
    const types = {
      'TouchID': 'Fingerprint',
      'FaceID': 'Face Recognition',
      'Biometrics': 'Biometric',
    };
    
    return types[this.biometricType] || 'Biometric';
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate() {
    try {
      const { success } = await this.biometrics.simplePrompt({
        promptMessage: 'Authenticate to continue',
        cancelButtonText: 'Cancel',
      });

      if (success) {
        // Get stored credentials
        const credentials = await this.getStoredCredentials();
        
        return {
          success: true,
          ...credentials,
        };
      }

      return {
        success: false,
        error: 'Authentication cancelled',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create biometric key
   */
  async createKeys() {
    try {
      const { publicKey } = await this.biometrics.createKeys();
      return publicKey;
    } catch (error) {
      console.error('Error creating biometric keys:', error);
      return null;
    }
  }

  /**
   * Delete biometric keys
   */
  async deleteKeys() {
    try {
      await this.biometrics.deleteKeys();
      return true;
    } catch (error) {
      console.error('Error deleting biometric keys:', error);
      return false;
    }
  }

  /**
   * Check if biometric keys exist
   */
  async biometricKeysExist() {
    try {
      const { keysExist } = await this.biometrics.biometricKeysExist();
      return keysExist;
    } catch (error) {
      return false;
    }
  }

  /**
   * Store credentials for biometric login
   */
  async storeCredentials(username, password) {
    try {
      await EncryptedStorage.setItem(
        'biometric_credentials',
        JSON.stringify({ username, password })
      );
      return true;
    } catch (error) {
      console.error('Error storing credentials:', error);
      return false;
    }
  }

  /**
   * Get stored credentials
   */
  async getStoredCredentials() {
    try {
      const credentials = await EncryptedStorage.getItem('biometric_credentials');
      return credentials ? JSON.parse(credentials) : null;
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  }

  /**
   * Delete stored credentials
   */
  async deleteCredentials() {
    try {
      await EncryptedStorage.removeItem('biometric_credentials');
      return true;
    } catch (error) {
      console.error('Error deleting credentials:', error);
      return false;
    }
  }

  /**
   * Check if biometric login is enabled
   */
  async isEnabled() {
    try {
      const credentials = await this.getStoredCredentials();
      const keysExist = await this.biometricKeysExist();
      return !!(credentials && keysExist);
    } catch (error) {
      return false;
    }
  }

  /**
   * Enable biometric login
   */
  async enable() {
    try {
      const keys = await this.createKeys();
      if (keys) {
        return { success: true };
      }
      return { success: false, error: 'Failed to create biometric keys' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable biometric login
   */
  async disable() {
    try {
      await this.deleteKeys();
      await this.deleteCredentials();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const BiometricService = new BiometricServiceClass();