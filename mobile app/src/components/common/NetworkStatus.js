import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const NetworkStatus = ({ isOnline }) => {
  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Icon name="wifi-off" size={16} color="#fff" />
      <Text style={styles.text}>No Internet Connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 15,
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default NetworkStatus;