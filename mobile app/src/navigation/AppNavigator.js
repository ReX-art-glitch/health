import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { checkAuthStatus } from '../store/actions/authActions';
import { updatePendingCount } from '../store/actions/syncActions';
import { OfflineStorage } from '../services/OfflineStorage';
import { COLORS } from '../utils/constants';

const Stack = createNativeStackNavigator();

// Custom navigation theme
const AppLightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: '#f5f5f5',
    card: '#ffffff',
    text: '#212121',
    border: '#e0e0e0',
    notification: COLORS.error,
  },
};

const AppDarkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primaryLight,
    background: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    border: '#333333',
    notification: COLORS.error,
  },
};

// Navigation linking configuration
const linking = {
  prefixes: ['phai://', 'https://app.publichealthai.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          ForgotPassword: 'forgot-password',
        },
      },
      Main: {
        screens: {
          MainTabs: {
            screens: {
              Home: 'home',
              Immunization: 'immunization',
              Maternal: 'maternal',
              Diseases: 'diseases',
              Inventory: 'inventory',
              Sync: 'sync',
            },
          },
          FacilityAssessment: 'facility-assessment',
          Profile: 'profile',
          Settings: 'settings',
          PregnancyDetails: 'pregnancy/:id',
          ANCVisit: 'anc-visit/:pregnancyId',
          Referral: 'referral/:patientId',
          ChangePassword: 'change-password',
          Terms: 'terms',
          Privacy: 'privacy',
          Support: 'support',
        },
      },
    },
  },
};

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading: authLoading } = useSelector(state => state.auth);
  const [initializing, setInitializing] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    initializeApp();
    
    // Subscribe to network changes
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Check authentication status
      await dispatch(checkAuthStatus());
      
      // Check pending sync count
      const pendingCount = await OfflineStorage.getPendingSyncCount();
      dispatch(updatePendingCount(pendingCount));
      
      // Load app settings (dark mode, etc.)
      await loadAppSettings();
      
      // Check network state
      const netState = await NetInfo.fetch();
      setIsOnline(netState.isConnected && netState.isInternetReachable);
      
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setInitializing(false);
    }
  };

  const loadAppSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('appSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setIsDarkMode(parsed.darkMode || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Show loading screen while initializing
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          backgroundColor={COLORS.primary}
          barStyle="light-content"
        />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <ActivityIndicator 
          size="small" 
          color={COLORS.gray} 
          style={styles.secondaryLoader}
        />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={isDarkMode ? AppDarkTheme : AppLightTheme}
      linking={linking}
      fallback={
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      }
      onStateChange={(state) => {
        // Log navigation state changes for analytics
        if (__DEV__) {
          console.log('Navigation state changed:', state?.routes[state?.routes.length - 1]?.name);
        }
      }}
      onReady={() => {
        // Navigation is ready
        console.log('Navigation container ready');
      }}
    >
      <StatusBar
        backgroundColor={COLORS.primary}
        barStyle="light-content"
        translucent={false}
      />
      
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#f5f5f5' },
          // Global screen options
          gestureEnabled: true,
          animationDuration: 200,
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen 
            name="Main" 
            component={MainNavigator}
            options={{
              animation: 'fade',
            }}
          />
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator}
            options={{
              animation: 'slide_from_right',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  secondaryLoader: {
    marginTop: 10,
  },
});

export default AppNavigator;