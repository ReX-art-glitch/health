import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import ImmunizationScreen from './screens/ImmunizationScreen';
import MaternalHealthScreen from './screens/MaternalHealthScreen';
import DiseaseSurveillanceScreen from './screens/DiseaseSurveillanceScreen';
import DrugInventoryScreen from './screens/DrugInventoryScreen';
import FacilityAssessmentScreen from './screens/FacilityAssessmentScreen';
import SyncScreen from './screens/SyncScreen';

const Tab = createBottomTabNavigator();

const App = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        syncOfflineData();
      }
    });

    // Check pending sync items
    checkPendingSync();

    return () => unsubscribe();
  }, []);

  const checkPendingSync = async () => {
    try {
      const pendingData = await AsyncStorage.getItem('pendingSync');
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        setPendingSync(parsed.length);
      }
    } catch (error) {
      console.error('Error checking pending sync:', error);
    }
  };

  const syncOfflineData = async () => {
    try {
      const pendingData = await AsyncStorage.getItem('pendingSync');
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        
        for (const item of parsed) {
          try {
            await API.syncData(item);
          } catch (error) {
            console.error('Sync error:', error);
          }
        }
        
        await AsyncStorage.removeItem('pendingSync');
        setPendingSync(0);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;
            switch (route.name) {
              case 'Immunization':
                iconName = 'vaccines';
                break;
              case 'Maternal':
                iconName = 'pregnant-woman';
                break;
              case 'Diseases':
                iconName = 'coronavirus';
                break;
              case 'Inventory':
                iconName = 'inventory';
                break;
              case 'Facility':
                iconName = 'local-hospital';
                break;
              case 'Sync':
                iconName = 'sync';
                break;
            }
            return <Icon name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Immunization" component={ImmunizationScreen} />
        <Tab.Screen name="Maternal" component={MaternalHealthScreen} />
        <Tab.Screen name="Diseases" component={DiseaseSurveillanceScreen} />
        <Tab.Screen name="Inventory" component={DrugInventoryScreen} />
        <Tab.Screen name="Facility" component={FacilityAssessmentScreen} />
        <Tab.Screen 
          name="Sync" 
          component={SyncScreen}
          options={{
            tabBarBadge: pendingSync > 0 ? pendingSync : null
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;