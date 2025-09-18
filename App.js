import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PendingApprovalScreen from './src/screens/PendingApprovalScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import { colors } from './src/constants/colors';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { I18nProvider } from './src/context/I18nContext';
import { simplePushNotificationService } from './src/services/simplePushNotificationService';
import { setupNotificationListeners } from './src/services/pushNotificationService';
import { setupSimpleFirebaseListener } from './src/services/simpleFirebaseListener';
import FCMService from './src/services/fcmService';

const Stack = createStackNavigator();

// Main Navigation Component
function Navigation() {
  const { isAuthenticated, isApproved, isPending, isRejected, initializing, user } = useAuth();

  // Setup push notifications when user is authenticated
  useEffect(() => {
    let cleanupNotificationListeners;
    let cleanupFirebaseListener;

    const initializePushNotifications = async () => {
      if (isAuthenticated && user?.uid && isApproved) {
        try {
          // Initialize FCM Service for true push notifications
          const fcmInitialized = await FCMService.initialize(user.uid);
          
          if (fcmInitialized) {
            // Test FCM notification
            setTimeout(() => {
              FCMService.sendTestNotification();
            }, 2000);
          }

          // Also register for push notifications using simple service (Expo Go compatible)
          const result = await simplePushNotificationService.registerForPushNotifications();

          // Setup notification listeners for the app
          cleanupNotificationListeners = setupNotificationListeners();
          
          // Setup Firebase notification listener for web admin panel notifications
          cleanupFirebaseListener = setupSimpleFirebaseListener(user.uid);
          
        } catch (error) {
          console.error('Error initializing notifications:', error);
        }
      }
    };

    initializePushNotifications();

    // Cleanup function
    return () => {
      if (cleanupNotificationListeners) {
        cleanupNotificationListeners();
      }
      if (cleanupFirebaseListener && typeof cleanupFirebaseListener === 'function') {
        cleanupFirebaseListener();
      }
    };
  }, [isAuthenticated, user?.uid, isApproved]);

  // Show loading screen while checking authentication state
  if (initializing) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      {!isAuthenticated ? (
        // Auth screens
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        </>
      ) : isPending || isRejected ? (
        // Pending approval screen
        <Stack.Screen 
          name="PendingApproval" 
          component={PendingApprovalScreen} 
        />
      ) : (
        // Main app screens for approved users
        <>
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabNavigator}
          />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationScreen}
            options={{
              presentation: 'modal',
              animationTypeForReplace: 'push',
            }}
          />
          <Stack.Screen 
            name="AdminPanel" 
            component={AdminPanelScreen}
            options={{
              presentation: 'modal',
              animationTypeForReplace: 'push',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <NotificationProvider>
          <NavigationContainer>
            <StatusBar style="dark" backgroundColor={colors.background} />
            <Navigation />
          </NavigationContainer>
        </NotificationProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
