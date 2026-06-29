import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const OfflineIndicator = ({ pendingSyncCount, onSyncPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Icon name="cloud-off" size={20} color="#FF9800" />
        <Text style={styles.text}>
          You are offline. {pendingSyncCount > 0 ? `${pendingSyncCount} items pending sync.` : ''}
        </Text>
      </View>
      
      {pendingSyncCount > 0 && (
        <TouchableOpacity style={styles.syncButton} onPress={onSyncPress}>
          <Text style={styles.syncText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  text: {
    color: '#E65100',
    fontSize: 13,
    flex: 1,
  },
  syncButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  syncText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OfflineIndicator;