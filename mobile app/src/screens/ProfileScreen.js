import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthAPI } from '../api/auth';
import { updateProfile, logout } from '../store/actions/authActions';
import { LocationService } from '../services/LocationService';
import { BiometricService } from '../services/BiometricService';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    title: user?.title || '',
    facility: user?.facility || '',
    lga: user?.lga || '',
    state: user?.state || '',
    avatar: user?.avatar || null,
  });
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    checkBiometricStatus();
    getCurrentLocation();
  }, []);

  const checkBiometricStatus = async () => {
    const available = await BiometricService.isAvailable();
    setBiometricAvailable(available);
    if (available) {
      const enabled = await BiometricService.isEnabled();
      setBiometricEnabled(enabled);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentPosition();
      setCurrentLocation(location);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const handleImagePick = () => {
    launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
    }, (response) => {
      if (!response.didCancel && !response.error) {
        setProfileData(prev => ({
          ...prev,
          avatar: response.assets[0].uri,
        }));
      }
    });
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // In a real app, this would call an API
      dispatch(updateProfile(profileData));
      Alert.alert('Success', 'Profile updated successfully');
      setEditMode(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBiometric = async (value) => {
    try {
      if (value) {
        const result = await BiometricService.enable();
        if (result.success) {
          setBiometricEnabled(true);
          Alert.alert('Success', 'Biometric login enabled');
        } else {
          Alert.alert('Error', result.error || 'Failed to enable biometric login');
        }
      } else {
        await BiometricService.disable();
        setBiometricEnabled(false);
        Alert.alert('Success', 'Biometric login disabled');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => dispatch(logout()),
        },
      ]
    );
  };

  const InfoRow = ({ icon, label, value, editable, field }) => (
    <View style={styles.infoRow}>
      <Icon name={icon} size={20} color="#666" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        {editMode && editable ? (
          <TextInput
            style={styles.infoInput}
            value={value}
            onChangeText={(text) => handleInputChange(field, text)}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        ) : (
          <Text style={styles.infoValue}>{value || 'Not set'}</Text>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handleImagePick} disabled={!editMode}>
          <View style={styles.avatarContainer}>
            {profileData.avatar ? (
              <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profileData.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {editMode && (
              <View style={styles.avatarOverlay}>
                <Icon name="camera-alt" size={20} color="#fff" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <Text style={styles.userName}>{profileData.fullName || 'Health Worker'}</Text>
        <Text style={styles.userTitle}>{profileData.title || 'Field Worker'}</Text>
        <Text style={styles.userFacility}>{profileData.facility || 'Unknown Facility'}</Text>
      </View>

      {/* Edit/Save Button */}
      <View style={styles.actionBar}>
        {editMode ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setEditMode(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => setEditMode(true)}
          >
            <Icon name="edit" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <InfoRow
          icon="person"
          label="Full Name"
          value={profileData.fullName}
          editable={true}
          field="fullName"
        />
        <InfoRow
          icon="email"
          label="Email"
          value={profileData.email}
          editable={true}
          field="email"
        />
        <InfoRow
          icon="phone"
          label="Phone"
          value={profileData.phone}
          editable={true}
          field="phone"
        />
        <InfoRow
          icon="badge"
          label="Title"
          value={profileData.title}
          editable={true}
          field="title"
        />
      </View>

      {/* Work Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Work Information</Text>
        
        <InfoRow
          icon="local-hospital"
          label="Facility"
          value={profileData.facility}
          editable={true}
          field="facility"
        />
        <InfoRow
          icon="location-on"
          label="LGA"
          value={profileData.lga}
          editable={true}
          field="lga"
        />
        <InfoRow
          icon="map"
          label="State"
          value={profileData.state}
          editable={true}
          field="state"
        />
        
        {currentLocation && (
          <View style={styles.locationInfo}>
            <Icon name="gps-fixed" size={16} color="#4CAF50" />
            <Text style={styles.locationText}>
              Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      {/* Security Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        
        <TouchableOpacity style={styles.securityItem} onPress={handleChangePassword}>
          <Icon name="lock" size={20} color="#666" />
          <Text style={styles.securityText}>Change Password</Text>
          <Icon name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>

        {biometricAvailable && (
          <View style={styles.securityItem}>
            <Icon name="fingerprint" size={20} color="#666" />
            <Text style={styles.securityText}>Biometric Login</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: '#ddd', true: '#2196F3' }}
              thumbColor={biometricEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        )}
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <View style={styles.infoRow}>
          <Icon name="info" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Icon name="storage" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Database Version</Text>
            <Text style={styles.infoValue}>2.1.0</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Icon name="update" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>2024-01-15</Text>
          </View>
        </View>
      </View>

      {/* Sync Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Information</Text>
        
        <View style={styles.syncInfo}>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>Pending Sync</Text>
            <Text style={styles.syncValue}>0 items</Text>
          </View>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>Last Sync</Text>
            <Text style={styles.syncValue}>Never</Text>
          </View>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>Device ID</Text>
            <Text style={[styles.syncValue, styles.deviceId]}>PH-AI-2024-001</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileHeader: {
    backgroundColor: '#1976D2',
    padding: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userTitle: {
    fontSize: 14,
    color: '#BBDEFB',
    marginTop: 5,
  },
  userFacility: {
    fontSize: 12,
    color: '#90CAF9',
    marginTop: 3,
  },
  actionBar: {
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 0,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  infoInput: {
    fontSize: 16,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#2196F3',
    paddingVertical: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  syncInfo: {
    gap: 10,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncLabel: {
    fontSize: 14,
    color: '#666',
  },
  syncValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  deviceId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    gap: 10,
    elevation: 2,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 30,
  },
});

export default ProfileScreen;