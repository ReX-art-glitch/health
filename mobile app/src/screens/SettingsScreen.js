import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API_BASE_URL, SYNC_INTERVAL } from '../utils/constants';

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    syncOnWifi: true,
    syncInterval: '300000', // 5 minutes
    autoSync: true,
    notificationsEnabled: true,
    locationTracking: false,
    dataSaver: false,
    darkMode: false,
    language: 'en',
    serverUrl: API_BASE_URL,
  });
  const [showServerModal, setShowServerModal] = useState(false);
  const [tempServerUrl, setTempServerUrl] = useState('');
  const [cacheSize, setCacheSize] = useState('0 MB');
  const [dataUsage, setDataUsage] = useState({
    today: '0 MB',
    thisMonth: '0 MB',
    total: '0 MB',
  });

  useEffect(() => {
    loadSettings();
    calculateCacheSize();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleToggle = (setting) => {
    const newSettings = { ...settings, [setting]: !settings[setting] };
    saveSettings(newSettings);
  };

  const handleSyncIntervalChange = () => {
    Alert.alert(
      'Sync Interval',
      'How often should data sync?',
      [
        { text: '5 minutes', onPress: () => saveSettings({ ...settings, syncInterval: '300000' }) },
        { text: '15 minutes', onPress: () => saveSettings({ ...settings, syncInterval: '900000' }) },
        { text: '30 minutes', onPress: () => saveSettings({ ...settings, syncInterval: '1800000' }) },
        { text: '1 hour', onPress: () => saveSettings({ ...settings, syncInterval: '3600000' }) },
        { text: 'Manual only', onPress: () => saveSettings({ ...settings, syncInterval: '0' }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      'Language',
      'Select your preferred language',
      [
        { text: 'English', onPress: () => saveSettings({ ...settings, language: 'en' }) },
        { text: 'French', onPress: () => saveSettings({ ...settings, language: 'fr' }) },
        { text: 'Swahili', onPress: () => saveSettings({ ...settings, language: 'sw' }) },
        { text: 'Hausa', onPress: () => saveSettings({ ...settings, language: 'ha' }) },
        { text: 'Yoruba', onPress: () => saveSettings({ ...settings, language: 'yo' }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleServerUrlSave = () => {
    if (tempServerUrl.trim()) {
      saveSettings({ ...settings, serverUrl: tempServerUrl.trim() });
      setShowServerModal(false);
      Alert.alert('Success', 'Server URL updated. Restart app for changes to take effect.');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and downloaded files. Pending sync data will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            // Clear cache implementation
            Alert.alert('Success', 'Cache cleared successfully');
            calculateCacheSize();
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('appSettings');
            loadSettings();
            Alert.alert('Success', 'Settings reset to defaults');
          },
        },
      ]
    );
  };

  const calculateCacheSize = async () => {
    // Simulate cache size calculation
    setCacheSize('24.5 MB');
    setDataUsage({
      today: '12.3 MB',
      thisMonth: '156.7 MB',
      total: '1.2 GB',
    });
  };

  const getSyncIntervalText = (interval) => {
    switch (interval) {
      case '300000': return '5 minutes';
      case '900000': return '15 minutes';
      case '1800000': return '30 minutes';
      case '3600000': return '1 hour';
      case '0': return 'Manual only';
      default: return '5 minutes';
    }
  };

  const getLanguageText = (code) => {
    const languages = {
      en: 'English',
      fr: 'French',
      sw: 'Swahili',
      ha: 'Hausa',
      yo: 'Yoruba',
    };
    return languages[code] || 'English';
  };

  const SettingItem = ({ icon, title, subtitle, value, onPress, type = 'info' }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <Icon name={icon} size={24} color="#666" />
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {type === 'toggle' ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#ddd', true: '#2196F3' }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      ) : type === 'value' ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : (
        <Icon name="chevron-right" size={20} color="#ccc" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Sync Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Settings</Text>
        
        <SettingItem
          icon="wifi"
          title="Sync on WiFi Only"
          subtitle="Only sync when connected to WiFi"
          value={settings.syncOnWifi}
          onPress={() => handleToggle('syncOnWifi')}
          type="toggle"
        />
        
        <SettingItem
          icon="sync"
          title="Auto Sync"
          subtitle="Automatically sync data in background"
          value={settings.autoSync}
          onPress={() => handleToggle('autoSync')}
          type="toggle"
        />
        
        <SettingItem
          icon="timer"
          title="Sync Interval"
          subtitle="How often to sync data"
          value={getSyncIntervalText(settings.syncInterval)}
          onPress={handleSyncIntervalChange}
          type="value"
        />
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <SettingItem
          icon="notifications"
          title="Push Notifications"
          subtitle="Receive alerts and reminders"
          value={settings.notificationsEnabled}
          onPress={() => handleToggle('notificationsEnabled')}
          type="toggle"
        />
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        
        <SettingItem
          icon="gps-fixed"
          title="Location Tracking"
          subtitle="Track location for data tagging"
          value={settings.locationTracking}
          onPress={() => handleToggle('locationTracking')}
          type="toggle"
        />
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        
        <SettingItem
          icon="dark-mode"
          title="Dark Mode"
          subtitle="Use dark theme"
          value={settings.darkMode}
          onPress={() => handleToggle('darkMode')}
          type="toggle"
        />
        
        <SettingItem
          icon="language"
          title="Language"
          subtitle="App display language"
          value={getLanguageText(settings.language)}
          onPress={handleLanguageChange}
          type="value"
        />
      </View>

      {/* Data & Storage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Storage</Text>
        
        <SettingItem
          icon="data-saver-on"
          title="Data Saver"
          subtitle="Reduce data usage"
          value={settings.dataSaver}
          onPress={() => handleToggle('dataSaver')}
          type="toggle"
        />
        
        <View style={styles.settingItem}>
          <Icon name="storage" size={24} color="#666" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Cache Size</Text>
            <Text style={styles.settingSubtitle}>{cacheSize}</Text>
          </View>
          <TouchableOpacity onPress={handleClearCache}>
            <Text style={styles.clearCacheText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dataUsage}>
          <Text style={styles.dataUsageTitle}>Data Usage</Text>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Today</Text>
            <Text style={styles.dataValue}>{dataUsage.today}</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>This Month</Text>
            <Text style={styles.dataValue}>{dataUsage.thisMonth}</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Total</Text>
            <Text style={styles.dataValue}>{dataUsage.total}</Text>
          </View>
        </View>
      </View>

      {/* Server Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Configuration</Text>
        
        <SettingItem
          icon="dns"
          title="Server URL"
          subtitle={settings.serverUrl}
          onPress={() => {
            setTempServerUrl(settings.serverUrl);
            setShowServerModal(true);
          }}
        />
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <SettingItem
          icon="info"
          title="Version"
          value="1.0.0"
          type="value"
        />
        
        <SettingItem
          icon="description"
          title="Terms of Service"
          onPress={() => navigation.navigate('Terms')}
        />
        
        <SettingItem
          icon="privacy-tip"
          title="Privacy Policy"
          onPress={() => navigation.navigate('Privacy')}
        />
        
        <SettingItem
          icon="help"
          title="Help & Support"
          onPress={() => navigation.navigate('Support')}
        />
      </View>

      {/* Reset */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#f44336' }]}>Danger Zone</Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={handleResetSettings}>
          <Icon name="restore" size={20} color="#f44336" />
          <Text style={styles.dangerText}>Reset All Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />

      {/* Server URL Modal */}
      <Modal
        visible={showServerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Server URL</Text>
            <Text style={styles.modalSubtitle}>
              Enter the API server URL. Include the protocol (http/https) and port if needed.
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={tempServerUrl}
              onChangeText={setTempServerUrl}
              placeholder="https://api.example.com:8000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowServerModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleServerUrlSave}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
  },
  clearCacheText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  dataUsage: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  dataUsageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
  },
  dataValue: {
    fontSize: 14,
    color: '#333',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    gap: 8,
  },
  dangerText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#2196F3',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;