import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LocationServiceClass {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.locationListeners = [];
    this.isTracking = false;
  }

  /**
   * Request location permissions
   */
  async requestPermissions() {
    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        Geolocation.requestAuthorization();
        resolve(true);
      });
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to tag health data with GPS coordinates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
      }
    }

    return false;
  }

  /**
   * Get current position
   */
  async getCurrentPosition(options = {}) {
    const hasPermission = await this.requestPermissions();
    
    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          
          this.currentLocation = location;
          this.notifyListeners(location);
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          ...options,
        }
      );
    });
  }

  /**
   * Start tracking location
   */
  async startTracking(interval = 300000) { // Default 5 minutes
    const hasPermission = await this.requestPermissions();
    
    if (!hasPermission) {
      return false;
    }

    if (this.isTracking) {
      return true;
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        };
        
        this.currentLocation = location;
        this.notifyListeners(location);
        
        // Save location for tracking
        this.saveLocationPoint(location);
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // meters
        interval: interval,
        fastestInterval: interval / 2,
      }
    );

    this.isTracking = true;
    return true;
  }

  /**
   * Stop tracking location
   */
  stopTracking() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  /**
   * Save location point
   */
  async saveLocationPoint(location) {
    try {
      const trackingData = await AsyncStorage.getItem('locationTracking');
      const points = trackingData ? JSON.parse(trackingData) : [];
      
      points.push({
        ...location,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 1000 points
      if (points.length > 1000) {
        points.splice(0, points.length - 1000);
      }

      await AsyncStorage.setItem('locationTracking', JSON.stringify(points));
    } catch (error) {
      console.error('Error saving location point:', error);
    }
  }

  /**
   * Get tracking history
   */
  async getTrackingHistory() {
    try {
      const data = await AsyncStorage.getItem('locationTracking');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get distance between two points
   */
  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(value) {
    return (value * Math.PI) / 180;
  }

  /**
   * Add location listener
   */
  addListener(callback) {
    this.locationListeners.push(callback);
    return () => {
      this.locationListeners = this.locationListeners.filter(
        cb => cb !== callback
      );
    };
  }

  /**
   * Notify listeners
   */
  notifyListeners(location) {
    this.locationListeners.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location listener:', error);
      }
    });
  }

  /**
   * Get last known location
   */
  getLastKnownLocation() {
    return this.currentLocation;
  }

  /**
   * Reverse geocode
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      const response = await fetch(url);
      const data = await response.json();
      
      return {
        address: data.display_name,
        lga: data.address?.county || data.address?.state_district,
        state: data.address?.state,
        country: data.address?.country,
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }
}

export const LocationService = new LocationServiceClass();