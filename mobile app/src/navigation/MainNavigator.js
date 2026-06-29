import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, DIMENSIONS } from '../utils/constants';

// Screen imports
import HomeScreen from '../screens/HomeScreen';
import ImmunizationScreen from '../screens/ImmunizationScreen';
import MaternalHealthScreen from '../screens/MaternalHealthScreen';
import DiseaseSurveillanceScreen from '../screens/DiseaseSurveillanceScreen';
import DrugInventoryScreen from '../screens/DrugInventoryScreen';
import FacilityAssessmentScreen from '../screens/FacilityAssessmentScreen';
import SyncScreen from '../screens/SyncScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Sub-screens
import PregnancyDetailsScreen from '../screens/PregnancyDetailsScreen';
import ANCVisitScreen from '../screens/ANCVisitScreen';
import ReferralScreen from '../screens/ReferralScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import SupportScreen from '../screens/SupportScreen';
import VaccinationDetailsScreen from '../screens/VaccinationDetailsScreen';
import DiseaseDetailsScreen from '../screens/DiseaseDetailsScreen';
import DrugDetailsScreen from '../screens/DrugDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Custom Tab Bar Icon component
const TabIcon = ({ name, focused, color, size, badge }) => (
  <View style={styles.tabIconContainer}>
    <Icon name={name} size={size} color={color} />
    {badge > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    )}
  </View>
);

// Main Tab Navigator
const MainTabs = () => {
  const { pendingSync } = useSelector(state => state.sync);
  const { dashboardData } = useSelector(state => state.data);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let badge = 0;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'dashboard' : 'dashboard';
              break;
            case 'Immunization':
              iconName = focused ? 'vaccines' : 'vaccines';
              badge = dashboardData?.dueVaccinations || 0;
              break;
            case 'Maternal':
              iconName = focused ? 'pregnant-woman' : 'pregnant-woman';
              badge = dashboardData?.highRiskPregnancies || 0;
              break;
            case 'Diseases':
              iconName = focused ? 'coronavirus' : 'coronavirus';
              break;
            case 'Inventory':
              iconName = focused ? 'inventory' : 'inventory';
              badge = dashboardData?.lowStockItems || 0;
              break;
            case 'Sync':
              iconName = focused ? 'sync' : 'sync';
              badge = pendingSync || 0;
              break;
          }

          return (
            <TabIcon
              name={iconName}
              focused={focused}
              color={color}
              size={size}
              badge={badge}
            />
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 85 : 65,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            activeOpacity={0.7}
            style={[props.style, styles.tabButton]}
          />
        ),
        headerShown: false,
        lazy: true,
        lazyPlaceholder: () => (
          <View style={styles.lazyLoader}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ),
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Immunization" 
        component={ImmunizationScreen}
        options={{ tabBarLabel: 'Vaccines' }}
      />
      <Tab.Screen 
        name="Maternal" 
        component={MaternalHealthScreen}
        options={{ tabBarLabel: 'Maternal' }}
      />
      <Tab.Screen 
        name="Diseases" 
        component={DiseaseSurveillanceScreen}
        options={{ tabBarLabel: 'Diseases' }}
      />
      <Tab.Screen 
        name="Inventory" 
        component={DrugInventoryScreen}
        options={{ tabBarLabel: 'Inventory' }}
      />
      <Tab.Screen 
        name="Sync" 
        component={SyncScreen}
        options={{ tabBarLabel: 'Sync' }}
      />
    </Tab.Navigator>
  );
};

// Main Stack Navigator (contains tabs and additional screens)
const MainNavigator = () => {
  const { user } = useSelector(state => state.auth);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerBackTitleVisible: false,
        headerShadowVisible: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      {/* Main Tabs */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={({ navigation }) => ({
          headerShown: true,
          headerTitle: 'Public Health AI',
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Icon name="person" size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Icon name="settings" size={24} color="#fff" />
              </TouchableOpacity>
              {user?.notifications > 0 && (
                <TouchableOpacity style={styles.headerButton}>
                  <Icon name="notifications" size={24} color="#fff" />
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>
                      {user.notifications > 9 ? '9+' : user.notifications}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ),
        })}
      />

      {/* Facility Assessment */}
      <Stack.Screen
        name="FacilityAssessment"
        component={FacilityAssessmentScreen}
        options={{
          title: 'Facility Assessment',
          headerStyle: { backgroundColor: COLORS.facility },
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Icon name="help-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Profile & Settings */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {/* Edit profile */}}
            >
              <Icon name="edit" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />

      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          title: 'Change Password',
        }}
      />

      {/* Maternal Health Sub-screens */}
      <Stack.Screen
        name="PregnancyDetails"
        component={PregnancyDetailsScreen}
        options={{
          title: 'Pregnancy Details',
          headerStyle: { backgroundColor: COLORS.maternal },
        }}
      />

      <Stack.Screen
        name="ANCVisit"
        component={ANCVisitScreen}
        options={{
          title: 'ANC Visit',
          headerStyle: { backgroundColor: COLORS.maternal },
        }}
      />

      <Stack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{
          title: 'Patient Referral',
          headerStyle: { backgroundColor: COLORS.warning },
        }}
      />

      {/* Immunization Sub-screens */}
      <Stack.Screen
        name="VaccinationDetails"
        component={VaccinationDetailsScreen}
        options={{
          title: 'Vaccination Details',
          headerStyle: { backgroundColor: COLORS.vaccination },
        }}
      />

      {/* Disease Sub-screens */}
      <Stack.Screen
        name="DiseaseDetails"
        component={DiseaseDetailsScreen}
        options={{
          title: 'Disease Details',
          headerStyle: { backgroundColor: COLORS.disease },
        }}
      />

      {/* Inventory Sub-screens */}
      <Stack.Screen
        name="DrugDetails"
        component={DrugDetailsScreen}
        options={{
          title: 'Drug Details',
          headerStyle: { backgroundColor: COLORS.inventory },
        }}
      />

      {/* Legal Screens */}
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{
          title: 'Terms of Service',
        }}
      />

      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{
          title: 'Privacy Policy',
        }}
      />

      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{
          title: 'Help & Support',
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabButton: {
    paddingTop: 5,
  },
  lazyLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MainNavigator;