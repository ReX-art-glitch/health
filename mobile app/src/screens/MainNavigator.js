import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ImmunizationScreen from '../screens/ImmunizationScreen';
import MaternalHealthScreen from '../screens/MaternalHealthScreen';
import DiseaseSurveillanceScreen from '../screens/DiseaseSurveillanceScreen';
import DrugInventoryScreen from '../screens/DrugInventoryScreen';
import FacilityAssessmentScreen from '../screens/FacilityAssessmentScreen';
import SyncScreen from '../screens/SyncScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainTabs = () => {
  const { pendingSync } = useSelector(state => state.sync);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'dashboard';
              break;
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
            case 'Sync':
              iconName = 'sync';
              break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Immunization" component={ImmunizationScreen} />
      <Tab.Screen name="Maternal" component={MaternalHealthScreen} />
      <Tab.Screen name="Diseases" component={DiseaseSurveillanceScreen} />
      <Tab.Screen name="Inventory" component={DrugInventoryScreen} />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{
          tabBarBadge: pendingSync > 0 ? pendingSync : null,
          tabBarBadgeStyle: {
            backgroundColor: '#f44336',
            fontSize: 10,
          },
        }}
      />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FacilityAssessment"
        component={FacilityAssessmentScreen}
        options={{
          title: 'Facility Assessment',
          headerStyle: { backgroundColor: '#9C27B0' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          headerStyle: { backgroundColor: '#2196F3' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: '#2196F3' },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;